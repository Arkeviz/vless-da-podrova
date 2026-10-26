<script setup lang="ts">
import { ru } from '@/common/i18n/ru'
import { useServers } from '../composables/useServers'
import { removeServer, selectServer } from '../model/servers'
import AddServerForm from './AddServerForm.vue'
import ServerList from './ServerList.vue'

const { servers, selectedId } = useServers()
</script>

<template>
  <section class="section">
    <h2 class="section__title">{{ ru.servers.title }}</h2>
    <ServerList
      :servers="servers"
      :selected-id="selectedId"
      @select="selectServer"
      @remove="removeServer"
    />
    <AddServerForm />
  </section>
</template>

<style scoped>
.section {
  display: grid;
  gap: 8px;
}

.section__title {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--muted);
}
</style>
