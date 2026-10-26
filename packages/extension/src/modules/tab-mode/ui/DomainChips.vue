<script setup lang="ts">
import { ru } from '@/common/i18n/ru'

defineProps<{
  domains: readonly string[]
}>()

const emit = defineEmits<{
  remove: [domain: string]
}>()
</script>

<template>
  <ul class="chips">
    <li v-for="domain in domains" :key="domain" class="chip">
      <span class="chip__text">{{ domain }}</span>
      <button class="icon-button" type="button" :title="ru.tabMode.remove" @click="emit('remove', domain)">×</button>
    </li>
  </ul>
</template>

<style scoped>
.chips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.chip {
  display: flex;
  align-items: center;
  gap: 2px;
  max-width: 100%;
  padding: 2px 4px 2px 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  font: 12px var(--font-mono);
}

.chip__text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
