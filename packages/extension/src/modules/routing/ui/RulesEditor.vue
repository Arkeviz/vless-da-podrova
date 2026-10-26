<script setup lang="ts">
import { ru } from '@/common/i18n/ru'
import { useRouting } from '../composables/useRouting'
import { moveCoreRule, removeRule, setDefaultAction } from '../model/rules'
import BrowserRuleList from './BrowserRuleList.vue'
import CoreRuleList from './CoreRuleList.vue'
import DefaultActionSelect from './DefaultActionSelect.vue'
import RuleForm from './RuleForm.vue'

const { browserRules, coreRules, defaultAction } = useRouting()
</script>

<template>
  <div class="editor">
    <RuleForm />

    <section class="editor__section">
      <h3 class="editor__title">{{ ru.routing.browserTitle }}</h3>
      <p class="editor__hint">{{ ru.routing.browserHint }}</p>
      <BrowserRuleList :rules="browserRules" @remove="removeRule" />
    </section>

    <section class="editor__section">
      <h3 class="editor__title">{{ ru.routing.coreTitle }}</h3>
      <p class="editor__hint">{{ ru.routing.coreHint }}</p>
      <CoreRuleList :rules="coreRules" @remove="removeRule" @move="moveCoreRule" />
    </section>

    <DefaultActionSelect :value="defaultAction" @change="setDefaultAction" />
  </div>
</template>

<style scoped>
.editor {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 24px;
}

.editor__section {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.editor__title {
  margin: 0;
  font-size: 15px;
}

.editor__hint {
  margin: 0;
  color: var(--muted);
}
</style>
