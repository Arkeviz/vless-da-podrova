<script setup lang="ts">
import type { BrowserRule } from '@vdp/shared'
import type { DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import RuleRow from './RuleRow.vue'

defineProps<{
  rules: DeepReadonly<BrowserRule[]>
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()
</script>

<template>
  <p v-if="!rules.length" class="empty">{{ ru.routing.emptyList }}</p>
  <ul v-else class="list">
    <li v-for="rule in rules" :key="rule.id">
      <RuleRow :rule="rule" @remove="emit('remove', rule.id)" />
    </li>
  </ul>
</template>

<style scoped>
.list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 4px;
}

.empty {
  margin: 0;
  color: var(--muted);
}
</style>
