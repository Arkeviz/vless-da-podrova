/**
 * Подключение: связь с нативным хелпером, запуск ядра, направление трафика браузера в ядро.
 * Фон вызывает startConnectionService(), popup показывает ConnectionPanel,
 * диагностика читает статус (порты и секрет Clash API) и лог ядра.
 */
export type { ConnectionStatus } from './model/storage'
export { connectionStatusItem } from './model/storage'
export { requestCoreLog } from './model/core-log'
export { startConnectionService } from './background/service'
export { useConnection } from './composables/useConnection'
export { default as ConnectionPanel } from './ui/ConnectionPanel.vue'
