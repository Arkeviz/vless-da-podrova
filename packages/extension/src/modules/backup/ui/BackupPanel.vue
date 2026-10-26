<script setup lang="ts">
import { ref } from 'vue'
import { ru } from '@/common/i18n/ru'
import { backupFileName, BackupError, exportBackup, importBackup } from '../model/backup'

const fileInput = ref<HTMLInputElement | null>(null)
const message = ref<{ kind: 'ok' | 'error'; text: string } | null>(null)

async function download() {
  const backup = await exportBackup()
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName()
  link.click()
  URL.revokeObjectURL(url)
}

async function onFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  message.value = null
  if (!window.confirm(ru.backup.confirmImport)) return
  try {
    const sections = await importBackup(await file.text())
    message.value = { kind: 'ok', text: ru.backup.imported(sections) }
  } catch (error) {
    if (!(error instanceof BackupError)) throw error
    message.value = { kind: 'error', text: error.message }
  }
}
</script>

<template>
  <div class="backup">
    <p class="backup__hint">{{ ru.backup.hint }}</p>
    <p class="backup__warning">{{ ru.backup.secretsWarning }}</p>
    <div class="backup__actions">
      <button class="button" type="button" @click="download">{{ ru.backup.export }}</button>
      <button class="button" type="button" @click="fileInput?.click()">{{ ru.backup.import }}</button>
      <input ref="fileInput" class="backup__file" type="file" accept="application/json,.json" @change="onFile" />
    </div>
    <p v-if="message" :class="message.kind === 'ok' ? 'backup__ok' : 'backup__error'">{{ message.text }}</p>
  </div>
</template>

<style scoped>
.backup {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.backup__hint,
.backup__warning,
.backup__ok,
.backup__error {
  margin: 0;
}

.backup__hint {
  color: var(--muted);
}

.backup__warning {
  color: var(--warn);
}

.backup__ok {
  color: var(--ok);
}

.backup__error {
  color: var(--danger);
}

.backup__actions {
  display: flex;
  gap: 8px;
}

.backup__file {
  display: none;
}
</style>
