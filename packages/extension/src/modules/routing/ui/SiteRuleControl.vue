<script setup lang="ts">
import { browserVerdict, compileDomainRules, ruleMatchKey, type BrowserAction, type BrowserVerdict } from '@vdp/shared'
import { computed, ref, watch } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useActiveTab } from '@/common/browser/useActiveTab'
import { useRouting } from '../composables/useRouting'
import { setSiteRules, type SiteMatch } from '../model/rules'

const props = defineProps<{
  /** Что сейчас важнее правил (например, режим вкладки) — показывается вместо итога правил. */
  override?: string | null
  /** Сайты, к которым обращалась вкладка (сайт страницы первым) — для области «все домены вкладки». */
  tabSites?: readonly string[]
}>()

/** Область правила: один домен с поддоменами, точный хост или все сайты вкладки. */
type Scope = { kind: 'one'; match: SiteMatch } | { kind: 'all'; sites: readonly string[] }
type Choice = BrowserAction | 'rules'

const HINT_SITES = 5

const { tab: site } = useActiveTab()
const { browserRules, coreRules, defaultAction } = useRouting()

const scopes = computed<{ scope: Scope; label: string }[]>(() => {
  if (!site.value) return []
  const { host, domain } = site.value
  const result: { scope: Scope; label: string }[] = []
  if (domain) {
    result.push({ scope: { kind: 'one', match: { type: 'suffix', value: domain } }, label: ru.routing.site.scopeDomain(domain) })
  }
  result.push({ scope: { kind: 'one', match: { type: 'exact', value: host } }, label: ru.routing.site.scopeHost(host) })
  // Последней — чтобы при появлении новых доменов выбранная область не съезжала.
  const sites = props.tabSites ?? []
  if (sites.length > 1) result.push({ scope: { kind: 'all', sites }, label: ru.routing.site.scopeAll(sites.length) })
  return result
})

const ruleByKey = computed(() => new Map(browserRules.value.map((r) => [ruleMatchKey(r.match), r.action])))

// По умолчанию — точный хост, если для него уже есть правило, иначе регистрируемый домен.
const scopeIndex = ref(0)
watch(
  scopes,
  (list) => {
    const exactIndex = list.findIndex((s) => s.scope.kind === 'one' && s.scope.match.type === 'exact')
    const exact = list[exactIndex]?.scope
    const hasExactRule = exact?.kind === 'one' && ruleByKey.value.has(ruleMatchKey(exact.match))
    scopeIndex.value = hasExactRule ? exactIndex : 0
  },
  { once: true },
)

const scope = computed(() => scopes.value[scopeIndex.value]?.scope ?? null)

/** Правила, которые ставит область: для «всех доменов» — по правилу на каждый сайт. */
const scopeMatches = computed<SiteMatch[]>(() => {
  const current = scope.value
  if (!current) return []
  return current.kind === 'one' ? [current.match] : current.sites.map((value) => ({ type: 'suffix', value }))
})

/** Нажатая кнопка; null — у доменов области разные правила. */
const choice = computed<Choice | null>(() => {
  const choices = new Set(scopeMatches.value.map((match) => ruleByKey.value.get(ruleMatchKey(match)) ?? 'rules'))
  return choices.size === 1 ? [...choices][0]! : null
})

function verdictLabel(verdict: BrowserVerdict): string {
  return verdict === 'core' ? ru.routing.site.effective.auto : ru.routing.site.effective[verdict]
}

const effective = computed(() => {
  if (props.override) return props.override
  if (!site.value || !scope.value) return null
  const context = {
    domainRules: compileDomainRules(browserRules.value),
    hasCoreRules: coreRules.value.length > 0,
    defaultAction: defaultAction.value,
  }
  const hosts = scope.value.kind === 'all' ? scope.value.sites : [site.value.host]
  const verdicts = new Set(hosts.map((host) => browserVerdict(host, context)))
  return verdicts.size === 1 ? verdictLabel([...verdicts][0]!) : ru.routing.site.effectiveMixed
})

const allHint = computed(() => {
  const current = scope.value
  if (current?.kind !== 'all') return null
  const shown = current.sites.slice(0, HINT_SITES).join(', ')
  return ru.routing.site.allHint(shown, current.sites.length - HINT_SITES)
})

const choices: { value: Choice; label: string }[] = [
  { value: 'proxy', label: ru.routing.action.proxy },
  { value: 'direct', label: ru.routing.action.direct },
  { value: 'rules', label: ru.routing.site.byRules },
]

function choose(value: Choice) {
  if (!scopeMatches.value.length) return
  void setSiteRules(scopeMatches.value, value === 'rules' ? null : value)
}
</script>

<template>
  <section class="site">
    <h2 class="site__title">{{ ru.routing.site.title }}</h2>
    <p v-if="!site" class="site__muted">{{ ru.routing.site.unavailable }}</p>
    <template v-else>
      <select v-model="scopeIndex" class="site__scope">
        <option v-for="(item, index) in scopes" :key="item.label" :value="index">{{ item.label }}</option>
      </select>
      <div class="segmented" role="group">
        <button
          v-for="item in choices"
          :key="item.value"
          type="button"
          class="segmented__item"
          :aria-pressed="choice === item.value"
          @click="choose(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
      <p class="site__muted">{{ ru.routing.site.now }}: {{ effective }}</p>
      <p v-if="allHint" class="site__muted">{{ allHint }}</p>
    </template>
  </section>
</template>

<style scoped>
.site {
  display: grid;
  gap: 6px;
}

.site__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.site__scope {
  padding: 4px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
}

.site__muted {
  margin: 0;
  color: var(--muted);
  font-size: 12px;
}

.segmented {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  border: 1px solid var(--border);
  border-radius: 6px;
  overflow: hidden;
}

.segmented__item {
  padding: 6px 4px;
  border: 0;
  border-left: 1px solid var(--border);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.segmented__item:first-child {
  border-left: 0;
}

.segmented__item[aria-pressed='true'] {
  background: var(--accent);
  color: var(--accent-text);
}
</style>
