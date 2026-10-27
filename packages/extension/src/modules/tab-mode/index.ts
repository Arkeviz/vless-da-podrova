/**
 * Режим «вкладка через прокси»: весь трафик вкладки - в VLESS, важнее любых правил.
 * Firefox - точно по tabId; Chromium - обучение доменам вкладки (PAC не знает о вкладках).
 * Потребители: фон (жизненный цикл и обучение), connection (что отдать в PAC / onRequest),
 * indicator (бейдж T), popup (переключатель), настройки (выученные домены).
 */
import { alwaysSitesItem, learnedDomainsItem, learnIgnoreItem } from './model/storage'
export type { TabModeState } from './model/tab-mode'
export { getTabModeState, setTabMode, watchTabMode } from './model/tab-mode'
export { startTabMode } from './background/controller'
export { useActiveTabMode } from './composables/useActiveTabMode'
export { useTabMode } from './composables/useTabMode'
export { default as TabModeToggle } from './ui/TabModeToggle.vue'
export { default as TabModeSettings } from './ui/TabModeSettings.vue'

/** Сайты «всегда», выученные домены и игнор (вкладки в режиме - нет: их id не переживают перезапуск) - входят в резервную копию. */
export const backupItems = [alwaysSitesItem, learnedDomainsItem, learnIgnoreItem]
