<script setup lang="ts">
import {
  DEFAULT_RULE_SET_UPDATE_HOURS,
  RuleValidationError,
  type RuleAction,
  type RuleMatchInput,
  type RuleMatchType,
  type RuleSetFormat,
} from '@vdp/shared'
import { computed, ref, watch } from 'vue'
import { ru } from '@/common/i18n/ru'
import { addRule } from '../model/rules'

const matchTypes: RuleMatchType[] = ['suffix', 'exact', 'keyword', 'ip', 'ruleSet']
const actions: RuleAction[] = ['proxy', 'direct', 'block']

const type = ref<RuleMatchType>('suffix')
const value = ref('')
const format = ref<RuleSetFormat | 'auto'>('auto')
const updateHours = ref(DEFAULT_RULE_SET_UPDATE_HOURS)
const action = ref<RuleAction>('proxy')
const error = ref<string | null>(null)

const isRuleSet = computed(() => type.value === 'ruleSet')

watch([type, value], () => {
  error.value = null
})

function buildInput(): RuleMatchInput {
  if (type.value === 'ruleSet') {
    return {
      type: 'ruleSet',
      url: value.value,
      ...(format.value === 'auto' ? {} : { format: format.value }),
      updateIntervalHours: Number(updateHours.value),
    }
  }
  return { type: type.value, value: value.value }
}

async function submit() {
  try {
    await addRule(buildInput(), action.value)
    value.value = ''
  } catch (e) {
    if (!(e instanceof RuleValidationError)) throw e
    error.value = e.message
  }
}
</script>

<template>
  <form class="form" @submit.prevent="submit">
    <div class="form__row">
      <select v-model="type" class="field">
        <option v-for="t in matchTypes" :key="t" :value="t">{{ ru.routing.matchType[t] }}</option>
      </select>
      <input
        v-model="value"
        class="field form__value"
        spellcheck="false"
        :placeholder="ru.routing.placeholder[type]"
      />
      <select v-model="action" class="field">
        <option v-for="a in actions" :key="a" :value="a">{{ ru.routing.action[a] }}</option>
      </select>
      <button class="button button--primary" type="submit" :disabled="!value.trim()">
        {{ ru.routing.add }}
      </button>
    </div>
    <div v-if="isRuleSet" class="form__row">
      <select v-model="format" class="field">
        <option value="auto">{{ ru.routing.format.auto }}</option>
        <option value="binary">{{ ru.routing.format.binary }}</option>
        <option value="source">{{ ru.routing.format.source }}</option>
      </select>
      <label class="form__label">
        {{ ru.routing.updateHours }}
        <input v-model.number="updateHours" class="field form__hours" type="number" min="1" max="720" />
      </label>
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
  align-items: center;
}

.form__value {
  flex: 1;
  min-width: 200px;
  font-family: var(--font-mono);
}

.form__label {
  display: flex;
  gap: 6px;
  align-items: center;
  color: var(--muted);
}

.form__hours {
  width: 80px;
}

.form__error {
  margin: 0;
  color: var(--danger);
}
</style>
