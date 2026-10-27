/**
 * Домены вкладки: к каким хостам обращалась вкладка с последней загрузки страницы,
 * как каждый из них идёт сейчас и быстрые правила «домен и поддомены».
 * Потребители: фон (сбор), popup (просмотр; сайты вкладки — для «Этот сайт» → «все домены вкладки»).
 */
export { startTabDomains } from './background/collector'
export { useActiveTabSites } from './composables/useActiveTabSites'
export { default as TabDomainsSection } from './ui/TabDomainsSection.vue'
