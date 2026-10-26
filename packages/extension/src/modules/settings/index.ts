/**
 * Настройки защиты и сети: WebRTC, удалённый DNS, kill-switch, уведомления, адрес DoH.
 * Потребители: connection (применение), настройки (UI), backup.
 */
import { settingsItem } from './model/settings'
export type { Settings } from './model/settings'
export { getSettings, settingsItem, watchSettings } from './model/settings'
export { useSettings } from './composables/useSettings'
export { default as SettingsPanel } from './ui/SettingsPanel.vue'

/** Настройки защиты и сети — входят в резервную копию. */
export const backupItems = [settingsItem]
