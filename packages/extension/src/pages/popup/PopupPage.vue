<script setup lang="ts">
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'
import { ConnectionPanel } from '@/modules/connection'
import { TrafficBar, useLatency } from '@/modules/diagnostics'
import { SiteRuleControl } from '@/modules/routing'
import { ServersSection, useServers } from '@/modules/servers'

const { hasSelection } = useServers()
const { latency, canTest, testAll } = useLatency()

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
    <SiteRuleControl />
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
