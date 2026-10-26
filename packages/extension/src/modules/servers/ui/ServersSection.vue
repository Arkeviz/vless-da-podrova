<script setup lang="ts">
import { computed } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useServers } from '../composables/useServers'
import type { ServerLatency } from '../model/latency'
import { removeServer, selectServer } from '../model/servers'
import { AUTO_SELECTION } from '../model/storage'
import AddServerForm from './AddServerForm.vue'
import ServerList from './ServerList.vue'

withDefaults(
  defineProps<{
    /** Задержки по id сервера. */
    latency?: Readonly<Record<string, ServerLatency>>
    /** Можно ли сейчас замерить задержку (ядро запущено). */
    canTestLatency?: boolean
  }>(),
  { latency: () => ({}), canTestLatency: false },
)

const emit = defineEmits<{
  testLatency: [ids: string[]]
}>()

const { manual, subscriptions, all, selectedId, isAuto } = useServers()

const nonEmptySubscriptions = computed(() => subscriptions.value.filter((s) => s.servers.length))
</script>

<template>
  <section class="section">
    <header class="section__header">
      <h2 class="section__title">{{ ru.servers.title }}</h2>
      <button
        v-if="all.length"
        class="link-button"
        type="button"
        :disabled="!canTestLatency"
        :title="canTestLatency ? '' : ru.servers.latencyHint"
        @click="emit('testLatency', all.map((s) => s.id))"
      >
        {{ ru.servers.testLatency }}
      </button>
    </header>

    <p v-if="!all.length" class="section__empty">{{ ru.servers.empty }}</p>

    <div v-else class="section__scroll">
      <label v-if="all.length > 1" class="auto" :class="{ 'auto--selected': isAuto }">
        <input type="radio" name="server" :checked="isAuto" @change="selectServer(AUTO_SELECTION)" />
        <span class="auto__text">
          <span>{{ ru.servers.auto }}</span>
          <span class="auto__hint">{{ ru.servers.autoHint(all.length) }}</span>
        </span>
      </label>

      <ServerList
        v-if="manual.length"
        :title="nonEmptySubscriptions.length ? ru.servers.manualGroup : undefined"
        :servers="manual"
        :selected-id="selectedId"
        :latency="latency"
        removable
        @select="selectServer"
        @remove="removeServer"
      />
      <ServerList
        v-for="subscription in nonEmptySubscriptions"
        :key="subscription.id"
        :title="subscription.name"
        :servers="subscription.servers"
        :selected-id="selectedId"
        :latency="latency"
        :removable="false"
        @select="selectServer"
      />
    </div>

    <AddServerForm />
  </section>
</template>

<style scoped>
.section {
  display: grid;
  gap: 8px;
}

.section__header {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.section__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}

.section__empty {
  margin: 0;
  color: var(--muted);
}

.section__scroll {
  display: grid;
  gap: 4px;
  max-height: 280px;
  overflow-y: auto;
}

.auto {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
}

.auto--selected {
  background: var(--surface-strong);
}

.auto__text {
  display: grid;
}

.auto__hint {
  color: var(--muted);
  font-size: 11px;
}
</style>
