<script setup lang="ts">
import { computed } from 'vue'
import { ru } from '@/common/i18n/ru'
import { formatBytes, formatSpeed } from '@/common/utilities/format'
import { useActiveServer } from '../composables/useActiveServer'
import { useTraffic } from '../composables/useTraffic'

const { speed, totals } = useTraffic()
const { activeServerName } = useActiveServer()

const totalsLabel = computed(() =>
  totals.value
    ? `${ru.diagnostics.total} ↑ ${formatBytes(totals.value.uploadTotal)} ↓ ${formatBytes(totals.value.downloadTotal)}`
    : null,
)
</script>

<template>
  <div v-if="speed || activeServerName" class="traffic">
    <span v-if="speed" class="traffic__speed">↑ {{ formatSpeed(speed.up) }} ↓ {{ formatSpeed(speed.down) }}</span>
    <span v-if="totalsLabel" class="traffic__muted">{{ totalsLabel }}</span>
    <span v-if="activeServerName" class="traffic__muted">{{ ru.diagnostics.autoServer(activeServerName) }}</span>
  </div>
</template>

<style scoped>
.traffic {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
}

.traffic__speed {
  font-variant-numeric: tabular-nums;
}

.traffic__muted {
  color: var(--muted);
}
</style>
