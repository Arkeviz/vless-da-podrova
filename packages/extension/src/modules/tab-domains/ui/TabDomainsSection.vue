<script setup lang="ts">
import { ruleMatchKey, type BrowserAction } from '@vdp/shared'
import { computed, onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'
import { useActiveTab } from '@/common/browser/useActiveTab'
import { ru } from '@/common/i18n/ru'
import { setSiteRule, useRouting } from '@/modules/routing'
import { useTabDomains } from '../composables/useTabDomains'
import TabDomainRow from './TabDomainRow.vue'

const ALL_SITES = ['https://*/*', 'http://*/*']
const isFirefox = import.meta.env.FIREFOX

const { tab } = useActiveTab()
const { groups, hostCount } = useTabDomains(tab)
const { browserRules } = useRouting()

// Chromium видит запросы вкладок, только если выдан доступ к сайтам; Firefox — всегда.
const hasAccess = ref(isFirefox)
const justGranted = ref(false)

onMounted(async () => {
  if (!isFirefox) hasAccess.value = await browser.permissions.contains({ origins: ALL_SITES })
})

async function requestAccess() {
  hasAccess.value = await browser.permissions.request({ origins: ALL_SITES })
  justGranted.value = hasAccess.value
}

const ruleBySite = computed(
  () => new Map(browserRules.value.map((rule) => [ruleMatchKey(rule.match), rule.action])),
)

function ruleFor(site: string): BrowserAction | null {
  return ruleBySite.value.get(ruleMatchKey({ type: 'suffix', value: site })) ?? null
}

function setRule(site: string, action: BrowserAction | null) {
  void setSiteRule({ type: 'suffix', value: site }, action)
}

function reload() {
  if (tab.value) void browser.tabs.reload(tab.value.id)
}
</script>

<template>
  <details v-if="tab" class="domains">
    <summary class="domains__summary">
      {{ ru.tabDomains.title }}
      <span v-if="hasAccess" class="domains__count">{{ ru.tabDomains.count(groups.length, hostCount) }}</span>
    </summary>

    <div v-if="!hasAccess" class="domains__notice">
      <p>{{ ru.tabDomains.needAccess }}</p>
      <button class="button" type="button" @click="requestAccess">{{ ru.tabDomains.grant }}</button>
    </div>

    <template v-else>
      <p v-if="justGranted || !groups.length" class="domains__notice">
        {{ ru.tabDomains.empty }}
        <button class="link-button" type="button" @click="reload">{{ ru.tabMode.reload }}</button>
      </p>
      <ul v-if="groups.length" class="domains__list">
        <TabDomainRow
          v-for="group in groups"
          :key="group.site"
          :group="group"
          :rule="ruleFor(group.site)"
          @set-rule="(action) => setRule(group.site, action)"
        />
      </ul>
    </template>
  </details>
</template>

<style scoped>
.domains {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 6px 10px;
}

.domains[open] {
  padding-bottom: 10px;
}

.domains__summary {
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.domains__count {
  margin-left: 6px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
}

.domains__notice {
  margin: 8px 0 0;
  display: grid;
  gap: 6px;
  justify-items: start;
  color: var(--muted);
  font-size: 12px;
}

.domains__notice p {
  margin: 0;
}

.domains__list {
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;
  max-height: 240px;
  overflow-y: auto;
}
</style>
