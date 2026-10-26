<script setup lang="ts">
import type { Rule } from '@vdp/shared'
import { computed, type DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import { describeMatch } from '../model/format'

const props = defineProps<{
  rule: DeepReadonly<Rule>
}>()

const emit = defineEmits<{
  remove: []
}>()

const description = computed(() => describeMatch(props.rule.match as Rule['match']))
</script>

<template>
  <div class="row">
    <slot name="before" />
    <span class="row__kind">{{ description.kind }}</span>
    <span class="row__value" :title="description.value">
      {{ description.value }}
      <small v-if="description.extra" class="row__extra">{{ description.extra }}</small>
    </span>
    <span class="row__action" :class="`row__action--${rule.action}`">{{ ru.routing.action[rule.action] }}</span>
    <slot name="after" />
    <button class="icon-button" type="button" :title="ru.routing.remove" @click="emit('remove')">×</button>
  </div>
</template>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  background: var(--surface);
}

.row__kind {
  flex: 0 0 170px;
  color: var(--muted);
}

.row__value {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
}

.row__extra {
  margin-left: 6px;
  color: var(--muted);
  font-family: var(--font-ui);
}

.row__action {
  flex: 0 0 auto;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  background: var(--surface-strong);
}

.row__action--proxy {
  color: var(--accent);
}

.row__action--direct {
  color: var(--ok);
}

.row__action--block {
  color: var(--danger);
}
</style>
