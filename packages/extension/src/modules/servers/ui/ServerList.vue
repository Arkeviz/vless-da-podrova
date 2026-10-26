<script setup lang="ts">
import type { DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import type { StoredServer } from '../model/storage'
import ServerItem from './ServerItem.vue'

defineProps<{
  servers: DeepReadonly<StoredServer[]>
  selectedId: string | null
}>()

const emit = defineEmits<{
  select: [id: string]
  remove: [id: string]
}>()
</script>

<template>
  <p v-if="!servers.length" class="empty">{{ ru.servers.empty }}</p>
  <ul v-else class="list">
    <ServerItem
      v-for="server in servers"
      :key="server.id"
      :server="server"
      :selected="server.id === selectedId"
      @select="emit('select', server.id)"
      @remove="emit('remove', server.id)"
    />
  </ul>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 2px;
}

.empty {
  margin: 0;
  color: var(--muted);
}
</style>
