<script setup lang="ts">
import { computed } from 'vue'
import type { DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import type { ServerLatency } from '../model/latency'
import type { StoredServer } from '../model/storage'

const props = defineProps<{
  server: DeepReadonly<StoredServer>
  selected: boolean
  removable: boolean
  latency?: ServerLatency
}>()

const emit = defineEmits<{
  select: []
  remove: []
}>()

const details = computed(() => {
  const { address, port, transport, security } = props.server.server
  return `${address}:${port} · ${transport.type} · ${security.type}`
})

const latencyLabel = computed(() => {
  const latency = props.latency
  if (latency === undefined) return null
  if (latency === 'testing') return '…'
  if (latency === 'error') return ru.servers.latencyError
  return ru.servers.ms(latency)
})

const latencyClass = computed(() => {
  const latency = props.latency
  if (latency === 'error') return 'latency--bad'
  if (typeof latency !== 'number') return ''
  return latency < 300 ? 'latency--good' : latency < 800 ? 'latency--ok' : 'latency--bad'
})
</script>

<template>
  <li class="server" :class="{ 'server--selected': selected }">
    <label class="server__main">
      <input type="radio" name="server" :checked="selected" @change="emit('select')" />
      <span class="server__text">
        <span class="server__name">{{ server.server.name }}</span>
        <span class="server__details">{{ details }}</span>
      </span>
    </label>
    <span v-if="latencyLabel" class="latency" :class="latencyClass">{{ latencyLabel }}</span>
    <button
      v-if="removable"
      class="icon-button"
      type="button"
      :title="ru.servers.remove"
      @click="emit('remove')"
    >
      ×
    </button>
  </li>
</template>

<style scoped>
.server {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  border-radius: 6px;
}

.server--selected {
  background: var(--surface-strong);
}

.server__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.server__text {
  min-width: 0;
  display: grid;
}

.server__name,
.server__details {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.server__details {
  color: var(--muted);
  font-size: 11px;
}

.latency {
  flex: 0 0 auto;
  font-size: 11px;
  color: var(--muted);
}

.latency--good {
  color: var(--ok);
}

.latency--ok {
  color: var(--warn);
}

.latency--bad {
  color: var(--danger);
}
</style>
