<script setup lang="ts">
import { RuleValidationError } from '@vdp/shared'
import { computed, ref } from 'vue'
import { ru } from '@/common/i18n/ru'
import { useTabMode } from '../composables/useTabMode'
import {
  addIgnoredDomain,
  forgetSite,
  learnedToRules,
  removeIgnoredDomain,
  removeLearnedDomain,
  setAlwaysForSite,
} from '../model/tab-mode'
import DomainChips from './DomainChips.vue'

const { alwaysSites, learned, ignore } = useTabMode()

const learnedSites = computed(() =>
  Object.entries(learned.value)
    .filter(([, domains]) => domains.length)
    .sort(([a], [b]) => a.localeCompare(b)),
)

const ignoreInput = ref('')
const ignoreError = ref<string | null>(null)

async function addIgnore() {
  ignoreError.value = null
  try {
    await addIgnoredDomain(ignoreInput.value)
    ignoreInput.value = ''
  } catch (error) {
    if (!(error instanceof RuleValidationError)) throw error
    ignoreError.value = error.message
  }
}
</script>

<template>
  <div class="settings">
    <section class="settings__block">
      <h3 class="settings__title">{{ ru.tabMode.alwaysTitle }}</h3>
      <p class="settings__hint">{{ ru.tabMode.alwaysHint }}</p>
      <p v-if="!alwaysSites.length" class="settings__hint">{{ ru.tabMode.alwaysEmpty }}</p>
      <DomainChips v-else :domains="alwaysSites" @remove="(site) => setAlwaysForSite(site, false)" />
    </section>

    <section class="settings__block">
      <h3 class="settings__title">{{ ru.tabMode.learnedTitle }}</h3>
      <p class="settings__hint">{{ ru.tabMode.learnedHint }}</p>
      <p v-if="!learnedSites.length" class="settings__hint">{{ ru.tabMode.learnedEmpty }}</p>
      <ul v-else class="settings__sites">
        <li v-for="[site, domains] in learnedSites" :key="site" class="site">
          <div class="site__header">
            <strong>{{ site }}</strong>
            <span class="site__actions">
              <button class="button" type="button" @click="learnedToRules(site)">{{ ru.tabMode.toRules }}</button>
              <button class="button" type="button" @click="forgetSite(site)">{{ ru.tabMode.forget }}</button>
            </span>
          </div>
          <DomainChips :domains="domains" @remove="(domain) => removeLearnedDomain(site, domain)" />
        </li>
      </ul>
    </section>

    <section class="settings__block">
      <h3 class="settings__title">{{ ru.tabMode.ignoreTitle }}</h3>
      <p class="settings__hint">{{ ru.tabMode.ignoreHint }}</p>
      <form class="settings__form" @submit.prevent="addIgnore">
        <input v-model="ignoreInput" class="field" spellcheck="false" :placeholder="ru.tabMode.ignorePlaceholder" />
        <button class="button" type="submit" :disabled="!ignoreInput.trim()">{{ ru.tabMode.ignoreAdd }}</button>
      </form>
      <p v-if="ignoreError" class="settings__error">{{ ignoreError }}</p>
      <DomainChips v-if="ignore.length" :domains="ignore" @remove="removeIgnoredDomain" />
    </section>
  </div>
</template>

<style scoped>
.settings {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 20px;
}

.settings__block {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.settings__title {
  margin: 0;
  font-size: 15px;
}

.settings__hint {
  margin: 0;
  color: var(--muted);
}

.settings__error {
  margin: 0;
  color: var(--danger);
}

.settings__form {
  display: flex;
  gap: 8px;
}

.settings__sites {
  margin: 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 8px;
}

.site {
  display: grid;
  gap: 6px;
  padding: 10px 12px;
  border-radius: 6px;
  background: var(--surface);
}

.site__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.site__actions {
  display: flex;
  gap: 8px;
}
</style>
