<script setup lang="ts">
import { computed } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useConnection } from '@/modules/connection'
import CoreLogViewer from './CoreLogViewer.vue'
import TrafficBar from './TrafficBar.vue'

const { status } = useConnection()

const rows = computed(() => {
  const current = status.value
  const result: [string, string][] = [[ru.diagnostics.state, ru.connection.state[current.state]]]
  if (current.state === 'on') {
    result.push(
      [ru.diagnostics.server, current.serverName],
      [ru.diagnostics.core, current.coreVersion ?? '?'],
      [ru.diagnostics.ports, `${current.ports.auto} / ${current.ports.proxy} / ${current.ports.clashApi}`],
    )
  }
  if (current.state === 'error') result.push([ru.connection.state.error, current.message])
  return result
})
</script>

<template>
  <div class="diagnostics">
    <dl class="diagnostics__table">
      <template v-for="[label, value] in rows" :key="label">
        <dt>{{ label }}</dt>
        <dd>{{ value }}</dd>
      </template>
    </dl>
    <TrafficBar />
    <h3 class="diagnostics__title">{{ ru.diagnostics.log }}</h3>
    <CoreLogViewer />
  </div>
</template>

<style scoped>
.diagnostics {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.diagnostics__table {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  gap: 4px 16px;
  margin: 0;
}

.diagnostics__table dt {
  color: var(--muted);
}

.diagnostics__table dd {
  margin: 0;
  white-space: pre-wrap;
}

.diagnostics__title {
  margin: 0;
  font-size: 15px;
}
</style>
