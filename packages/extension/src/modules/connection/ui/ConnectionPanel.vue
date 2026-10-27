<script setup lang="ts">
import { computed } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useConnection } from '../composables/useConnection'

const props = defineProps<{
  /** Есть ли выбранный сервер - без него включать нечего. */
  canEnable: boolean
}>()

const { enabled, status, setEnabled, reconnect } = useConnection()

const stateLabel = computed(() => ru.connection.state[status.value.state])

const details = computed(() => {
  const current = status.value
  switch (current.state) {
    case 'connecting':
      return current.serverName
    case 'on':
      return `${ru.connection.via} ${current.serverName} · ${ru.connection.core} ${current.coreVersion ?? '?'}`
    default:
      return null
  }
})

const errorMessage = computed(() => (status.value.state === 'error' ? status.value.message : null))
const blocked = computed(() => status.value.state === 'error' && status.value.blocked === true)
const toggleDisabled = computed(() => !enabled.value && !props.canEnable)
</script>

<template>
  <section class="panel">
    <div class="panel__status">
      <span class="dot" :class="`dot--${status.state}`" />
      <div class="panel__text">
        <strong>{{ stateLabel }}</strong>
        <span v-if="details" class="panel__details">{{ details }}</span>
      </div>
      <button
        class="button"
        :class="{ 'button--primary': !enabled }"
        type="button"
        :disabled="toggleDisabled"
        @click="setEnabled(!enabled)"
      >
        {{ enabled ? ru.connection.disable : ru.connection.enable }}
      </button>
    </div>

    <p v-if="toggleDisabled" class="panel__hint">{{ ru.connection.noServer }}</p>

    <div v-if="errorMessage" class="panel__error">
      <p>{{ errorMessage }}</p>
      <p v-if="blocked"><strong>{{ ru.notifications.failureBlocked }}</strong></p>
      <button class="button" type="button" @click="reconnect">{{ ru.connection.reconnect }}</button>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 8px;
}

.panel__status {
  display: flex;
  align-items: center;
  gap: 10px;
}

.panel__text {
  flex: 1;
  min-width: 0;
  display: grid;
}

.panel__details {
  color: var(--muted);
  font-size: 11px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.panel__hint {
  margin: 0;
  color: var(--muted);
}

.panel__error {
  display: grid;
  gap: 6px;
  justify-items: start;
  padding: 8px;
  border-radius: 6px;
  background: var(--danger-bg);
  color: var(--danger);
}

.panel__error p {
  margin: 0;
  white-space: pre-wrap;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--muted);
}

.dot--on {
  background: var(--ok);
}

.dot--connecting {
  background: var(--warn);
}

.dot--error {
  background: var(--danger);
}
</style>
