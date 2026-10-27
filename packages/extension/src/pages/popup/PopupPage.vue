<script setup lang="ts">
import { computed } from 'vue'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { ConnectionPanel, useConnection } from '@/modules/connection'
import { TrafficBar, useLatency } from '@/modules/diagnostics'
import { SiteRuleControl } from '@/modules/routing'
import { ServersSection, useServers } from '@/modules/servers'
import { TabDomainsSection, useActiveTabSites } from '@/modules/tab-domains'
import { TabModeToggle, useActiveTabMode } from '@/modules/tab-mode'

const { hasSelection } = useServers()
const { latency, canTest, testAll } = useLatency()
const { status } = useConnection()
const proxyOn = computed(() => status.value.state === 'on')
const { enabled: tabModeOn } = useActiveTabMode()
const siteOverride = computed(() => (tabModeOn.value ? ru.routing.site.overriddenByTabMode : null))
const { sites: tabSites } = useActiveTabSites()

function openOptions() {
  void browser.runtime.openOptionsPage()
}
</script>

<template>
  <main class="popup">
    <header class="popup__header">
      <h1 class="popup__title">{{ ru.appName }}</h1>
      <button class="link-button" type="button" @click="openOptions">{{ ru.options.open }}</button>
    </header>
    <ConnectionPanel :can-enable="hasSelection" />
    <TrafficBar />
    <TabModeToggle :proxy-on="proxyOn" />
    <SiteRuleControl :override="siteOverride" :tab-sites="tabSites" />
    <TabDomainsSection />
    <ServersSection :latency="latency" :can-test-latency="canTest !== null" @test-latency="testAll" />
  </main>
</template>

<style scoped>
.popup {
  display: grid;
  gap: 14px;
  padding: 12px;
}

.popup__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.popup__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
</style>
