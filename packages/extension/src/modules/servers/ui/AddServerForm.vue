<script setup lang="ts">
import { ref } from 'vue'
import { ru } from '@/common/i18n/ru'
import { addServersFromText, type AddServersResult } from '../model/servers'

const text = ref('')
const result = ref<AddServersResult | null>(null)
const busy = ref(false)

async function submit() {
  busy.value = true
  try {
    result.value = await addServersFromText(text.value)
    // Оставляем в поле только строки, которые не удалось добавить.
    text.value = result.value.errors.map((e) => e.line).join('\n')
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="add-form" @submit.prevent="submit">
    <textarea
      v-model="text"
      class="add-form__input"
      rows="2"
      spellcheck="false"
      :placeholder="ru.servers.addPlaceholder"
    />
    <button class="button" type="submit" :disabled="busy || !text.trim()">
      {{ ru.servers.add }}
    </button>
    <p v-if="result?.added" class="add-form__note">{{ ru.servers.added(result.added) }}</p>
    <ul v-if="result?.errors.length" class="add-form__errors">
      <li v-for="error in result.errors" :key="error.line">{{ error.message }}</li>
    </ul>
  </form>
</template>

<style scoped>
.add-form {
  display: grid;
  gap: 6px;
}

.add-form__input {
  width: 100%;
  resize: vertical;
  font: 12px/1.4 var(--font-mono);
  padding: 6px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--surface);
  color: var(--text);
}

.add-form__note {
  margin: 0;
  color: var(--ok);
}

.add-form__errors {
  margin: 0;
  padding-left: 16px;
  color: var(--danger);
}
</style>
