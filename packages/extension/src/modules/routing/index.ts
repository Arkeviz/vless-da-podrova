/**
 * Маршрутизация: правила браузера (домены proxy/direct) и ядра (block, IP, rule-set'ы),
 * действие по умолчанию, кнопка «этот сайт».
 * Потребители: connection (снимок правил для PAC и конфига ядра), popup, настройки.
 */
export type { RoutingSnapshot } from './model/rules'
export { getRoutingSnapshot, watchRouting } from './model/rules'
export { default as SiteRuleControl } from './ui/SiteRuleControl.vue'
export { default as RulesEditor } from './ui/RulesEditor.vue'
