<script setup lang="ts">
import type { DeepReadonly } from 'vue'
import type { ServerLatency } from '../model/latency'
import type { StoredServer } from '../model/storage'
import ServerItem from './ServerItem.vue'

defineProps<{
  title?: string
  servers: DeepReadonly<StoredServer[]>
  selectedId: string | null
  removable: boolean
  latency: Readonly<Record<string, ServerLatency>>
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
}>()
</script>

<template>
  <div class="group">
    <h3 v-if="title" class="group__title">{{ title }}</h3>
    <ul class="group__list">
      <ServerItem
        v-for="server in servers"
        :key="server.id"
        :server="server"
        :selected="server.id === selectedId"
        :removable="removable"
        :latency="latency[server.id]"
        @select="emit('select', server.id)"
        @remove="emit('remove', server.id)"
      />
    </ul>
  </div>
</template>

<style scoped>
.group {
  display: grid;
  gap: 2px;
}

.group__title {
  margin: 4px 8px 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--muted);
}

.group__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;
}
</style>
