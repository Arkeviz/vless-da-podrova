<script setup lang="ts">
import { ru } from '@/common/i18n/ru'
import { RulesEditor } from '@/modules/routing'
</script>

<template>
  <main class="options">
    <h1 class="options__title">{{ ru.options.title }}</h1>
    <RulesEditor />
  </main>
</template>

<style scoped>
.options {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.options__title {
  margin: 0;
  font-size: 20px;
}
</style>
