/**
 * Маршрутизация: правила браузера (домены proxy/direct) и ядра (block, IP, rule-set'ы),
 * действие по умолчанию, кнопка «этот сайт».
 * Потребители: connection (снимок правил для PAC и конфига ядра), popup, настройки.
 */
import { browserRulesItem, coreRulesItem, defaultActionItem } from './model/storage'
export type { RoutingSnapshot } from './model/rules'
export { addRule, getRoutingSnapshot, setSiteRule, watchRouting } from './model/rules'
export { useRouting } from './composables/useRouting'
export { default as SiteRuleControl } from './ui/SiteRuleControl.vue'
export { default as RulesEditor } from './ui/RulesEditor.vue'

/** Правила и действие по умолчанию - входят в резервную копию. */
export const backupItems = [browserRulesItem, coreRulesItem, defaultActionItem]
