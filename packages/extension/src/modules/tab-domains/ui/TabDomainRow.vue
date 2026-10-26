<script setup lang="ts">
import type { BrowserAction } from '@vdp/shared'
import { computed, ref } from 'vue'
import { ru } from '@/common/i18n/ru'
import type { DomainGroup } from '../model/groups'

const props = defineProps<{
  group: DomainGroup
  /** Правило браузера «домен и поддомены» для сайта группы; null — нет. */
  rule: BrowserAction | null
}>()

const emit = defineEmits<{
  setRule: [action: BrowserAction | null]
}>()

const expanded = ref(false)
/** Подпись под сайтом: единственный хост — сам хост, несколько — их число (раскрываются кликом). */
const hostsLabel = computed(() => {
  const { hosts, site } = props.group
  if (hosts.length > 1) return ru.tabDomains.hosts(hosts.length)
  return hosts[0] !== site ? hosts[0] : null
})
const expandable = computed(() => props.group.hosts.length > 1)

function onChange(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  emit('setRule', value === 'rules' ? null : (value as BrowserAction))
}
</script>

<template>
  <li class="row">
    <div class="row__main">
      <button
        class="row__site"
        type="button"
        :title="group.hosts.join('\n')"
        :disabled="!expandable"
        @click="expanded = !expanded"
      >
        <span class="row__name">{{ group.site }}</span>
        <span v-if="hostsLabel" class="row__hosts">{{ hostsLabel }}</span>
      </button>
      <span class="verdict" :class="`verdict--${group.verdict}`">{{ ru.tabDomains.verdict[group.verdict] }}</span>
      <select class="row__rule" :value="rule ?? 'rules'" :title="ru.tabDomains.ruleTitle" @change="onChange">
        <option value="rules">{{ ru.routing.site.byRules }}</option>
        <option value="proxy">{{ ru.routing.action.proxy }}</option>
        <option value="direct">{{ ru.routing.action.direct }}</option>
      </select>
    </div>
    <ul v-if="expanded" class="row__list">
      <li v-for="host in group.hosts" :key="host">{{ host }}</li>
    </ul>
  </li>
</template>

<style scoped>
.row {
  display: grid;
  gap: 2px;
  padding: 3px 0;
}

.row__main {
  display: flex;
  align-items: center;
  gap: 6px;
}

.row__site {
  flex: 1;
  min-width: 0;
  display: grid;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.row__site:disabled {
  cursor: default;
}

.row__name,
.row__hosts {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row__name {
  font-family: var(--font-mono);
  font-size: 12px;
}

.row__hosts {
  color: var(--muted);
  font-size: 11px;
}

.row__rule {
  flex: 0 0 auto;
  max-width: 110px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: 11px;
}

.row__list {
  margin: 0 0 4px;
  padding-left: 12px;
  list-style: none;
  color: var(--muted);
  font: 11px/1.5 var(--font-mono);
  word-break: break-all;
}

.verdict {
  flex: 0 0 auto;
  padding: 1px 6px;
  border-radius: 10px;
  background: var(--surface-strong);
  font-size: 11px;
  color: var(--muted);
}

.verdict--proxy {
  color: var(--accent);
}

.verdict--direct {
  color: var(--ok);
}

.verdict--tab {
  color: var(--tab-mode);
}
</style>
