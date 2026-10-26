/**
 * Серверы: хранение VLESS-серверов, добавление по ссылкам, выбор активного.
 * Потребители: popup (UI), connection (выбранный сервер для запуска ядра).
 */
export type { StoredServer } from './model/storage'
export { getSelectedServer, watchSelectedServer } from './model/servers'
export { useServers } from './composables/useServers'
export { default as ServersSection } from './ui/ServersSection.vue'
