import type { WxtStorageItem } from 'wxt/utils/storage'
import { ru } from '@/common/i18n/ru'
import { backupItems as routingItems } from '@/modules/routing'
import { backupItems as serverItems } from '@/modules/servers'
import { backupItems as settingsItems } from '@/modules/settings'
import { backupItems as tabModeItems } from '@/modules/tab-mode'

const BACKUP_APP = 'vless-da-podrova'
const BACKUP_VERSION = 1

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: string
  /** Ключ элемента storage (local:servers…) → значение. */
  data: Record<string, unknown>
}

export class BackupError extends Error {
  override name = 'BackupError'
}

type AnyItem = WxtStorageItem<unknown, Record<string, unknown>>

/** Что входит в копию - каждый модуль объявляет сам в своём public API. */
export const allBackupItems = [...serverItems, ...routingItems, ...tabModeItems, ...settingsItems] as AnyItem[]

export async function exportBackup(now = new Date()): Promise<BackupFile> {
  const entries = await Promise.all(allBackupItems.map(async (item) => [item.key, await item.getValue()] as const))
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    data: Object.fromEntries(entries),
  }
}

/** Проверяет файл и возвращает данные только для известных ключей. */
export function parseBackup(text: string, knownKeys: readonly string[]): Record<string, unknown> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new BackupError(ru.backup.notJson)
  }
  const file = parsed as Partial<BackupFile> | null
  if (!file || typeof file !== 'object' || file.app !== BACKUP_APP) throw new BackupError(ru.backup.wrongApp)
  if (typeof file.version !== 'number' || file.version > BACKUP_VERSION) throw new BackupError(ru.backup.newerVersion)
  if (!file.data || typeof file.data !== 'object') throw new BackupError(ru.backup.noData)

  const known = new Set(knownKeys)
  const data = Object.fromEntries(
    Object.entries(file.data).filter(([key, value]) => known.has(key) && value !== undefined && value !== null),
  )
  if (!Object.keys(data).length) throw new BackupError(ru.backup.noData)
  return data
}

/** Заменяет данные из файла; разделы, которых в файле нет, остаются как были. */
export async function importBackup(text: string): Promise<number> {
  const data = parseBackup(
    text,
    allBackupItems.map((item) => item.key),
  )
  for (const item of allBackupItems) {
    if (item.key in data) await item.setValue(data[item.key])
  }
  return Object.keys(data).length
}

export function backupFileName(now = new Date()): string {
  return `vless-da-podrova-${now.toISOString().slice(0, 10)}.json`
}
