<script setup lang="ts">
import type { DefaultAction } from '@vdp/shared'
import { ru } from '@/common/i18n/ru'

defineProps<{
  value: DefaultAction
}>()

const emit = defineEmits<{
  change: [value: DefaultAction]
}>()

const options: DefaultAction[] = ['proxy', 'direct']
</script>

<template>
  <fieldset class="default">
    <legend class="default__title">{{ ru.routing.defaultTitle }}</legend>
    <label v-for="option in options" :key="option" class="default__option">
      <input type="radio" name="default-action" :checked="value === option" @change="emit('change', option)" />
      {{ ru.routing.action[option] }}
    </label>
  </fieldset>
</template>

<style scoped>
.default {
  display: flex;
  gap: 16px;
  margin: 0;
  padding: 0;
  border: 0;
}

.default__title {
  float: left;
  margin-right: 8px;
  padding: 0;
  font-weight: 600;
}

.default__option {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
</style>
