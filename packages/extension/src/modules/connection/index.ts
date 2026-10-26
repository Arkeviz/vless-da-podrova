/**
 * Подключение: связь с нативным хелпером, запуск ядра, направление трафика браузера в ядро.
 * Фон вызывает startConnectionService(), popup показывает ConnectionPanel.
 */
export { startConnectionService } from './background/service'
export { default as ConnectionPanel } from './ui/ConnectionPanel.vue'
