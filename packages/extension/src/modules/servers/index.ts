/**
 * Серверы: ручные (по ссылкам) и из подписок, выбор активного или «авто».
 * Потребители: popup и настройки (UI), connection (пул серверов для ядра),
 * diagnostics (теги серверов для замера задержки), фон (обновление подписок).
 */
export type { StoredServer } from './model/storage'
export type { ServerLatency } from './model/latency'
export type { ServerPool } from './model/servers'
export { getServerPool, serverTag, watchServers } from './model/servers'
export { startSubscriptionUpdater } from './model/updater'
export { useServers } from './composables/useServers'
export { default as ServersSection } from './ui/ServersSection.vue'
export { default as SubscriptionsSection } from './ui/SubscriptionsSection.vue'
