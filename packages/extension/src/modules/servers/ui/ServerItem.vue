<script setup lang="ts">
import { computed } from 'vue'
import type { DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import type { StoredServer } from '../model/storage'

const props = defineProps<{
  server: DeepReadonly<StoredServer>
  selected: boolean
}>()

const emit = defineEmits<{
  select: []
  remove: []
}>()

const details = computed(() => {
  const { address, port, transport, security } = props.server.server
  return `${address}:${port} · ${transport.type} · ${security.type}`
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
    <button class="server__remove" type="button" :title="ru.servers.remove" @click="emit('remove')">
      ×
    </button>
  </li>
</template>

<style scoped>
.server {
  display: flex;
  align-items: center;
  gap: 4px;
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

.server__remove {
  border: 0;
  background: none;
  color: var(--muted);
  font-size: 16px;
  cursor: pointer;
}

.server__remove:hover {
  color: var(--danger);
}
</style>
