<script setup lang="ts">
import { browserVerdict, compileDomainRules, ruleMatchKey, type BrowserAction } from '@vdp/shared'
import { computed, ref, watch } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useActiveTab } from '@/common/browser/useActiveTab'
import { useRouting } from '../composables/useRouting'
import { setSiteRule } from '../model/rules'

const props = defineProps<{
  /** Что сейчас важнее правил (например, режим вкладки) — показывается вместо итога правил. */
  override?: string | null
}>()

type Scope = { type: 'suffix' | 'exact'; value: string }
type Choice = BrowserAction | 'rules'

const { tab: site } = useActiveTab()
const { browserRules, coreRules, defaultAction } = useRouting()

const scopes = computed<{ scope: Scope; label: string }[]>(() => {
  if (!site.value) return []
  const { host, domain } = site.value
  const result: { scope: Scope; label: string }[] = []
  if (domain) result.push({ scope: { type: 'suffix', value: domain }, label: ru.routing.site.scopeDomain(domain) })
  result.push({ scope: { type: 'exact', value: host }, label: ru.routing.site.scopeHost(host) })
  return result
})

const ruleByKey = computed(() => new Map(browserRules.value.map((r) => [ruleMatchKey(r.match), r.action])))

// По умолчанию — точный хост, если для него уже есть правило, иначе регистрируемый домен.
const scopeIndex = ref(0)
watch(
  scopes,
  (list) => {
    const exactIndex = list.findIndex((s) => s.scope.type === 'exact')
    const hasExactRule = exactIndex !== -1 && ruleByKey.value.has(ruleMatchKey(list[exactIndex]!.scope))
    scopeIndex.value = hasExactRule ? exactIndex : 0
  },
  { once: true },
)

const scope = computed(() => scopes.value[scopeIndex.value]?.scope ?? null)
const choice = computed<Choice>(() => (scope.value ? (ruleByKey.value.get(ruleMatchKey(scope.value)) ?? 'rules') : 'rules'))

const effective = computed(() => {
  if (props.override) return props.override
  if (!site.value) return null
  const verdict = browserVerdict(site.value.host, {
    domainRules: compileDomainRules(browserRules.value),
    hasCoreRules: coreRules.value.length > 0,
    defaultAction: defaultAction.value,
  })
  return verdict === 'core' ? ru.routing.site.effective.auto : ru.routing.site.effective[verdict]
})

const choices: { value: Choice; label: string }[] = [
  { value: 'proxy', label: ru.routing.action.proxy },
  { value: 'direct', label: ru.routing.action.direct },
  { value: 'rules', label: ru.routing.site.byRules },
]

function choose(value: Choice) {
  if (!scope.value) return
  void setSiteRule(scope.value, value === 'rules' ? null : value)
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
