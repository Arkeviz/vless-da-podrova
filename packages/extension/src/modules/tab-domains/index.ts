/**
 * Домены вкладки: к каким хостам обращалась вкладка с последней загрузки страницы,
 * как каждый из них идёт сейчас и быстрые правила «домен и поддомены».
 * Потребители: фон (сбор), popup (просмотр).
 */
export { startTabDomains } from './background/collector'
export { default as TabDomainsSection } from './ui/TabDomainsSection.vue'
