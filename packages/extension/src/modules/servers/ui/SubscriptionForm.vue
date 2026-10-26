<script setup lang="ts">
import { ref } from 'vue'
import { ru } from '@/common/i18n/ru'
import { addSubscription, requestSubscriptionAccess, validateSubscriptionUrl } from '../model/subscriptions'

const url = ref('')
const name = ref('')
const busy = ref(false)
const error = ref<string | null>(null)

async function submit() {
  error.value = null
  let validUrl: string
  try {
    validUrl = validateSubscriptionUrl(url.value)
  } catch (e) {
    error.value = (e as Error).message
    return
  }

  busy.value = true
  try {
    // Запрос доступа — первым await: браузер разрешает его только в ответ на клик.
    if (!(await requestSubscriptionAccess(validUrl))) {
      error.value = ru.subscriptions.accessDenied
      return
    }
    const subscription = await addSubscription(validUrl, name.value)
    if (subscription.lastError) error.value = subscription.lastError
    url.value = ''
    name.value = ''
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <div class="form__row">
      <input
        v-model="url"
        class="field form__url"
        spellcheck="false"
        :placeholder="ru.subscriptions.urlPlaceholder"
      />
      <input v-model="name" class="field form__name" :placeholder="ru.subscriptions.namePlaceholder" />
      <button class="button button--primary" type="submit" :disabled="busy || !url.trim()">
        {{ busy ? ru.subscriptions.updating : ru.subscriptions.add }}
      </button>
    </div>
    <p v-if="error" class="form__error">{{ error }}</p>
  </form>
</template>

<style scoped>
.form {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.form__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.form__url {
  flex: 2;
  min-width: 240px;
  font-family: var(--font-mono);
}

.form__name {
  flex: 1;
  min-width: 160px;
}

.form__error {
  margin: 0;
  color: var(--danger);
}
</style>
