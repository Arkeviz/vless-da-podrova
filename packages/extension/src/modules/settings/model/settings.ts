import { DEFAULT_DOH_URL } from '@vdp/shared'
import { storage } from 'wxt/utils/storage'
import { ru } from '@/common/i18n/ru'

export interface Settings {
  /** WebRTC не раскрывает реальный IP: только через прокси (пока прокси включён). */
  webrtcProtection: boolean
  /** DNS резолвит ядро (SOCKS5 с именем хоста), а не системный DNS браузера. */
  remoteDns: boolean
  /** Если ядро упало - блокировать трафик, а не открывать сайты напрямую. */
  killSwitch: boolean
  /** Системное уведомление, когда подключение неожиданно оборвалось. */
  notifyOnFailure: boolean
  /** DoH-сервер ядра для `direct` и сопоставления IP-правил. */
  dohUrl: string
}

export const DEFAULT_SETTINGS: Settings = {
  webrtcProtection: true,
  remoteDns: true,
  killSwitch: false,
  notifyOnFailure: true,
  dohUrl: DEFAULT_DOH_URL,
}

export const settingsItem = storage.defineItem<Partial<Settings>>('local:settings', { fallback: {} })

/** Сохранённые настройки поверх значений по умолчанию (новые поля получают умолчание). */
export async function getSettings(): Promise<Settings> {
  return { ...DEFAULT_SETTINGS, ...(await settingsItem.getValue()) }
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await settingsItem.setValue({ ...(await settingsItem.getValue()), ...patch })
}

export function watchSettings(callback: () => void): () => void {
  return settingsItem.watch(callback)
}

export function validateDohUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw.trim())
  } catch {
    throw new Error(ru.settings.dohInvalid)
  }
  if (url.protocol !== 'https:') throw new Error(ru.settings.dohInvalid)
  return url.toString()
}
