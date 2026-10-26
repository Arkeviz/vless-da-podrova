<script setup lang="ts">
import type { Rule } from '@vdp/shared'
import { ref, type DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import RuleRow from './RuleRow.vue'

defineProps<{
  rules: DeepReadonly<Rule[]>
}>()

const emit = defineEmits<{
  remove: [id: string]
  move: [id: string, toIndex: number]
}>()

const draggedId = ref<string | null>(null)
const dropIndex = ref<number | null>(null)

function onDragStart(event: DragEvent, id: string) {
  draggedId.value = id
  event.dataTransfer?.setData('text/plain', id)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

function onDragOver(event: DragEvent, index: number) {
  if (!draggedId.value) return
  event.preventDefault()
  dropIndex.value = index
}

function onDrop(index: number) {
  if (draggedId.value) emit('move', draggedId.value, index)
  onDragEnd()
}

function onDragEnd() {
  draggedId.value = null
  dropIndex.value = null
}
</script>

<template>
  <p v-if="!rules.length" class="empty">{{ ru.routing.emptyList }}</p>
  <ol v-else class="list">
    <li
      v-for="(rule, index) in rules"
      :key="rule.id"
      class="list__item"
      :class="{
        'list__item--dragged': rule.id === draggedId,
        'list__item--drop': index === dropIndex && rule.id !== draggedId,
      }"
      draggable="true"
      @dragstart="onDragStart($event, rule.id)"
      @dragover="onDragOver($event, index)"
      @drop.prevent="onDrop(index)"
      @dragend="onDragEnd"
    >
      <RuleRow :rule="rule" @remove="emit('remove', rule.id)">
        <template #before>
          <span class="handle" :title="ru.routing.dragHint">⋮⋮</span>
          <span class="index">{{ index + 1 }}</span>
        </template>
        <template #after>
          <button
            class="icon-button"
            type="button"
            :title="ru.routing.moveUp"
            :disabled="index === 0"
            @click="emit('move', rule.id, index - 1)"
          >
            ↑
          </button>
          <button
            class="icon-button"
            type="button"
            :title="ru.routing.moveDown"
            :disabled="index === rules.length - 1"
            @click="emit('move', rule.id, index + 1)"
          >
            ↓
          </button>
        </template>
      </RuleRow>
    </li>
  </ol>
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

.list__item {
  border-radius: 6px;
  outline: 2px solid transparent;
}

.list__item--dragged {
  opacity: 0.4;
}

.list__item--drop {
  outline-color: var(--accent);
}

.handle {
  cursor: grab;
  color: var(--muted);
  user-select: none;
}

.index {
  width: 20px;
  color: var(--muted);
  text-align: right;
}

.empty {
  margin: 0;
  color: var(--muted);
}
</style>
