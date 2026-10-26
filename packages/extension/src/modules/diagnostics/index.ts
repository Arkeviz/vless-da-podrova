/**
 * Диагностика через Clash API ядра: задержки серверов, трафик, текущий сервер в режиме «авто»,
 * лог ядра. Потребители: popup и настройки.
 */
export { useLatency } from './composables/useLatency'
export { default as TrafficBar } from './ui/TrafficBar.vue'
export { default as DiagnosticsPanel } from './ui/DiagnosticsPanel.vue'
