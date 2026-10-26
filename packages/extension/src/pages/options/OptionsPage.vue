<script setup lang="ts">
import { ru } from '@/common/i18n/ru'
import { BackupPanel } from '@/modules/backup'
import { DiagnosticsPanel } from '@/modules/diagnostics'
import { RulesEditor } from '@/modules/routing'
import { SubscriptionsSection } from '@/modules/servers'
import { SettingsPanel } from '@/modules/settings'
import { TabModeSettings } from '@/modules/tab-mode'
</script>

<template>
  <main class="options">
    <h1 class="options__title">{{ ru.options.title }}</h1>

    <section class="options__section">
      <h2 class="options__heading">{{ ru.subscriptions.title }}</h2>
      <SubscriptionsSection />
    </section>

    <section class="options__section">
      <h2 class="options__heading">{{ ru.options.rules }}</h2>
      <RulesEditor />
    </section>

    <section class="options__section">
      <h2 class="options__heading">{{ ru.options.tabMode }}</h2>
      <TabModeSettings />
    </section>

    <section class="options__section">
      <h2 class="options__heading">{{ ru.settings.title }}</h2>
      <SettingsPanel />
    </section>

    <section class="options__section">
      <h2 class="options__heading">{{ ru.backup.title }}</h2>
      <BackupPanel />
    </section>

    <section class="options__section">
      <h2 class="options__heading">{{ ru.diagnostics.title }}</h2>
      <DiagnosticsPanel />
    </section>
  </main>
</template>

<style scoped>
.options {
  max-width: 920px;
  margin: 0 auto;
  padding: 24px 16px 48px;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 32px;
}

.options__title {
  margin: 0;
  font-size: 20px;
}

.options__section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.options__heading {
  margin: 0;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border);
  font-size: 17px;
}
</style>
