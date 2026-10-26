<script setup lang="ts">
import { computed, ref, type DeepReadonly } from 'vue'
import { ru } from '@/common/i18n/ru'
import { formatBytes, formatDate, formatDateTime } from '@/common/utilities/format'
import type { Subscription } from '../model/storage'
import { removeSubscription, setSubscriptionInterval, updateSubscription } from '../model/subscriptions'

const props = defineProps<{
  subscription: DeepReadonly<Subscription>
}>()

const INTERVALS = [1, 3, 6, 12, 24, 48, 168]

const updating = ref(false)

const meta = computed(() => {
  const { servers, lastUpdated, userInfo } = props.subscription
  const parts = [
    ru.subscriptions.servers(servers.length),
    lastUpdated ? ru.subscriptions.updatedAt(formatDateTime(lastUpdated)) : ru.subscriptions.neverUpdated,
  ]
  if (userInfo) {
    const used = formatBytes(userInfo.upload + userInfo.download)
    parts.push(ru.subscriptions.traffic(used, userInfo.total ? formatBytes(userInfo.total) : null))
    if (userInfo.expire) parts.push(ru.subscriptions.expires(formatDate(userInfo.expire * 1000)))
  }
  return parts.join(' · ')
})

async function update() {
  updating.value = true
  try {
    await updateSubscription(props.subscription.id)
  } finally {
    updating.value = false
  }
}

function changeInterval(event: Event) {
  void setSubscriptionInterval(props.subscription.id, Number((event.target as HTMLSelectElement).value))
}
</script>

<template>
  <li class="item">
    <div class="item__main">
      <strong class="item__name">{{ subscription.name }}</strong>
      <span class="item__url" :title="subscription.url">{{ subscription.url }}</span>
      <span class="item__meta">{{ meta }}</span>
      <span v-if="subscription.lastError" class="item__error">{{ subscription.lastError }}</span>
    </div>
    <label class="item__interval">
      {{ ru.subscriptions.interval }}
      <select class="field" :value="subscription.updateIntervalHours" @change="changeInterval">
        <option v-for="hours in INTERVALS" :key="hours" :value="hours">{{ ru.subscriptions.hours(hours) }}</option>
      </select>
    </label>
    <button class="button" type="button" :disabled="updating" @click="update">
      {{ updating ? ru.subscriptions.updating : ru.subscriptions.update }}
    </button>
    <button
      class="icon-button"
      type="button"
      :title="ru.subscriptions.remove"
      @click="removeSubscription(subscription.id)"
    >
      ×
    </button>
  </li>
</template>

<style scoped>
.item {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--surface);
}

.item__main {
  flex: 1;
  min-width: 260px;
  display: grid;
  gap: 2px;
}

.item__url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: 12px var(--font-mono);
  color: var(--muted);
}

.item__meta {
  font-size: 12px;
  color: var(--muted);
}

.item__error {
  font-size: 12px;
  color: var(--danger);
}

.item__interval {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--muted);
}
</style>
