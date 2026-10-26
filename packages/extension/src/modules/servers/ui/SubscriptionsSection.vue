<script setup lang="ts">
import { ru } from '@/common/i18n/ru'
import { useSubscriptions } from '../composables/useSubscriptions'
import SubscriptionForm from './SubscriptionForm.vue'
import SubscriptionItem from './SubscriptionItem.vue'

const { subscriptions } = useSubscriptions()
</script>

<template>
  <div class="subscriptions">
    <SubscriptionForm />
    <p v-if="!subscriptions.length" class="subscriptions__empty">{{ ru.subscriptions.emptyList }}</p>
    <ul v-else class="subscriptions__list">
      <SubscriptionItem v-for="subscription in subscriptions" :key="subscription.id" :subscription="subscription" />
    </ul>
  </div>
</template>

<style scoped>
.subscriptions {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.subscriptions__empty {
  margin: 0;
  color: var(--muted);
}

.subscriptions__list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 6px;
}
</style>
