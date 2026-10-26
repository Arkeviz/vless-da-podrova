<script setup lang="ts">
import { ref, watch } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useSettings } from '../composables/useSettings'
import { DEFAULT_SETTINGS, updateSettings, validateDohUrl, type Settings } from '../model/settings'

type Flag = keyof { [K in keyof Settings as Settings[K] extends boolean ? K : never]: true }

const { settings, loaded } = useSettings()

const flags: Flag[] = ['webrtcProtection', 'remoteDns', 'killSwitch', 'notifyOnFailure']

const doh = ref('')
const dohError = ref<string | null>(null)
const dohSaved = ref(false)

watch(loaded, () => (doh.value = settings.value.dohUrl), { once: true })

function toggle(flag: Flag, event: Event) {
  void updateSettings({ [flag]: (event.target as HTMLInputElement).checked })
}

async function saveDoh(value = doh.value) {
  dohError.value = null
  try {
    const dohUrl = validateDohUrl(value)
    await updateSettings({ dohUrl })
    doh.value = dohUrl
    dohSaved.value = true
    setTimeout(() => (dohSaved.value = false), 1500)
  } catch (error) {
    dohError.value = (error as Error).message
  }
}
</script>

<template>
  <div class="settings">
    <label v-for="flag in flags" :key="flag" class="flag">
      <input type="checkbox" :checked="settings[flag]" @change="toggle(flag, $event)" />
      <span class="flag__text">
        <strong>{{ ru.settings.flags[flag].title }}</strong>
        <span class="flag__hint">{{ ru.settings.flags[flag].hint }}</span>
      </span>
    </label>

    <form class="doh" @submit.prevent="saveDoh()">
      <label class="doh__label" for="doh-url">{{ ru.settings.doh }}</label>
      <div class="doh__row">
        <input id="doh-url" v-model="doh" class="field doh__input" spellcheck="false" />
        <button class="button" type="submit" :disabled="doh === settings.dohUrl">
          {{ dohSaved ? ru.settings.saved : ru.settings.save }}
        </button>
        <button
          class="button"
          type="button"
          :disabled="settings.dohUrl === DEFAULT_SETTINGS.dohUrl"
          @click="saveDoh(DEFAULT_SETTINGS.dohUrl)"
        >
          {{ ru.settings.reset }}
        </button>
      </div>
      <span class="flag__hint">{{ ru.settings.dohHint }}</span>
      <p v-if="dohError" class="doh__error">{{ dohError }}</p>
    </form>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 14px;
}

.flag {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.flag input {
  margin-top: 3px;
}

.flag__text {
  display: grid;
  gap: 2px;
}

.flag__hint {
  color: var(--muted);
  font-size: 13px;
}

.doh {
  display: grid;
  gap: 6px;
}

.doh__label {
  font-weight: 600;
}

.doh__row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.doh__input {
  flex: 1;
  min-width: 240px;
  font-family: var(--font-mono);
}

.doh__error {
  margin: 0;
  color: var(--danger);
}
</style>
