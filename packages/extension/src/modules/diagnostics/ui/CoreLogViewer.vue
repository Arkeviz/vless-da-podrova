<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ru } from '@/common/i18n/ru'
import { requestCoreLog } from '@/modules/connection'

const lines = ref<string[]>([])
const copied = ref(false)

async function refresh() {
  lines.value = await requestCoreLog()
}

async function copy() {
  await navigator.clipboard.writeText(lines.value.join('\n'))
  copied.value = true
  setTimeout(() => (copied.value = false), 1500)
}

onMounted(refresh)
</script>

<template>
  <div class="log">
    <div class="log__actions">
      <button class="button" type="button" @click="refresh">{{ ru.diagnostics.refresh }}</button>
      <button class="button" type="button" :disabled="!lines.length" @click="copy">
        {{ copied ? ru.diagnostics.copied : ru.diagnostics.copy }}
      </button>
    </div>
    <p v-if="!lines.length" class="log__empty">{{ ru.diagnostics.logEmpty }}</p>
    <pre v-else class="log__text">{{ lines.join('\n') }}</pre>
  </div>
</template>

<style scoped>
.log {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.log__actions {
  display: flex;
  gap: 8px;
}

.log__empty {
  margin: 0;
  color: var(--muted);
}

.log__text {
  margin: 0;
  max-height: 360px;
  overflow: auto;
  padding: 10px;
  border-radius: 6px;
  background: var(--surface);
  font: 12px/1.5 var(--font-mono);
  white-space: pre-wrap;
  word-break: break-all;
}
</style>
