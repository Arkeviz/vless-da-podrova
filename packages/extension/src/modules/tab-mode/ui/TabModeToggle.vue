<script setup lang="ts">
import { computed, ref } from 'vue'
import { browser } from 'wxt/browser'
import { useActiveTab } from '@/common/browser/useActiveTab'
import { ru } from '@/common/i18n/ru'
import { siteOf } from '@/common/utilities/site'
import { useTabMode } from '../composables/useTabMode'
import { setAlwaysForSite, setTabMode } from '../model/tab-mode'

defineProps<{
  /** Прокси включён и подключён - иначе режиму нечего делать. */
  proxyOn: boolean
}>()

const isFirefox = import.meta.env.FIREFOX

const { tab } = useActiveTab()
const { tabIds, alwaysSites, learned } = useTabMode()
const error = ref<string | null>(null)

const site = computed(() => (tab.value ? siteOf(tab.value.host) : null))
const enabled = computed(() => tab.value !== null && tabIds.value.includes(tab.value.id))
const always = computed(() => site.value !== null && alwaysSites.value.includes(site.value))
const learnedCount = computed(() => (site.value ? (learned.value[site.value]?.length ?? 0) : 0))

async function toggle() {
  if (!tab.value) return
  error.value = null
  const next = !enabled.value
  // Chromium: без доступа к сайтам webRequest не видит запросы вкладки.
  // Запрос - первым await, пока жест пользователя ещё действует.
  if (next && !isFirefox) {
    const granted = await browser.permissions.request({ origins: ['https://*/*', 'http://*/*'] })
    if (!granted) {
      error.value = ru.tabMode.accessDenied
      return
    }
  }
  await setTabMode(tab.value.id, next)
}

function toggleAlways() {
  if (site.value) void setAlwaysForSite(site.value, !always.value)
}

function reload() {
  if (tab.value) void browser.tabs.reload(tab.value.id)
}
</script>

<template>
  <section v-if="tab && site" class="tab-mode" :class="{ 'tab-mode--on': enabled }">
    <label class="tab-mode__switch">
      <input type="checkbox" role="switch" :checked="enabled" @change="toggle" />
      <span class="tab-mode__label">
        <strong>{{ ru.tabMode.toggle }}</strong>
        <span class="tab-mode__muted">{{ ru.tabMode.toggleHint }}</span>
      </span>
    </label>

    <label class="tab-mode__always">
      <input type="checkbox" :checked="always" @change="toggleAlways" />
      {{ ru.tabMode.always(site) }}
    </label>

    <template v-if="enabled">
      <p v-if="!proxyOn" class="tab-mode__muted">{{ ru.tabMode.proxyOff }}</p>
      <p v-else-if="!isFirefox" class="tab-mode__muted">
        {{ ru.tabMode.learning(learnedCount) }}
        <button class="link-button" type="button" @click="reload">{{ ru.tabMode.reload }}</button>
      </p>
    </template>
    <p v-if="error" class="tab-mode__error">{{ error }}</p>
  </section>
</template>

<style scoped>
.tab-mode {
  display: grid;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: 8px;
}

.tab-mode--on {
  border-color: var(--tab-mode);
  background: var(--tab-mode-bg);
}

.tab-mode__switch {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;
}

.tab-mode__switch input {
  margin-top: 3px;
}

.tab-mode__label {
  display: grid;
}

.tab-mode__always {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-left: 22px;
  font-size: 12px;
  cursor: pointer;
}

.tab-mode__muted {
  margin: 0;
  color: var(--muted);
  font-size: 11px;
}

.tab-mode__error {
  margin: 0;
  color: var(--danger);
  font-size: 12px;
}
</style>
