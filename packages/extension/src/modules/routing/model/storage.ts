import type { BrowserRule, DefaultAction, Rule } from '@vdp/shared'
import { storage } from 'wxt/utils/storage'

/** Доменные правила proxy/direct — исполняет браузер. Порядок не важен: решает специфичность. */
export const browserRulesItem = storage.defineItem<BrowserRule[]>('local:browserRules', {
  fallback: [],
})

/** Правила ядра — порядок важен, срабатывает первое совпадение. */
export const coreRulesItem = storage.defineItem<Rule[]>('local:coreRules', { fallback: [] })

export const defaultActionItem = storage.defineItem<DefaultAction>('local:defaultAction', {
  fallback: 'proxy',
})
