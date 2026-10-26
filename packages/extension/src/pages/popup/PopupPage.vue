<script setup lang="ts">
import { computed } from 'vue'
import { ru } from '@/common/i18n/ru'
import { ConnectionPanel } from '@/modules/connection'
import { ServersSection, useServers } from '@/modules/servers'

const { selected } = useServers()
const canEnable = computed(() => selected.value !== null)
</script>

<template>
  <main class="popup">
    <h1 class="popup__title">{{ ru.appName }}</h1>
    <ConnectionPanel :can-enable="canEnable" />
    <ServersSection />
  </main>
</template>

<style scoped>
.popup {
  display: grid;
  gap: 14px;
  padding: 12px;
}

.popup__title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
</style>
