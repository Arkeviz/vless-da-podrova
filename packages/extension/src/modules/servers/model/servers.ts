import { parseVlessLink, VlessParseError } from '@vdp/shared'
import { ru } from '@/common/i18n/ru'
import {
  AUTO_SELECTION,
  selectedServerIdItem,
  serversItem,
  subscriptionsItem,
  type StoredServer,
} from './storage'

export interface AddServersResult {
  added: number
  errors: { line: string; message: string }[]
}

/** Тег выхода сервера в конфиге ядра — общий контракт ядра, Clash API и диагностики. */
export function serverTag(id: string): string {
  return `srv-${id}`
}

/** Все серверы: сначала ручные, затем по подпискам. */
export function collectServers<T>(
  manual: readonly T[],
  subscriptions: readonly { readonly servers: readonly T[] }[],
): T[] {
  return [...manual, ...subscriptions.flatMap((s) => s.servers)]
}

export async function getAllServers(): Promise<StoredServer[]> {
  const [manual, subscriptions] = await Promise.all([serversItem.getValue(), subscriptionsItem.getValue()])
  return collectServers(manual, subscriptions)
}

/** Добавляет серверы из текста: по одной ссылке на строку. */
export async function addServersFromText(text: string): Promise<AddServersResult> {
  const servers = await serversItem.getValue()
  const knownLinks = new Set(servers.map((s) => s.link))
  const added: StoredServer[] = []
  const errors: AddServersResult['errors'] = []

  for (const line of text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)) {
    if (knownLinks.has(line)) {
      errors.push({ line, message: ru.servers.duplicate })
      continue
    }
    try {
      added.push({ id: crypto.randomUUID(), link: line, server: parseVlessLink(line) })
      knownLinks.add(line)
    } catch (error) {
      if (!(error instanceof VlessParseError)) throw error
      errors.push({ line, message: error.message })
    }
  }

  if (added.length) {
    await serversItem.setValue([...servers, ...added])
    if (!(await selectedServerIdItem.getValue())) {
      await selectedServerIdItem.setValue(added[0]!.id)
    }
  }

  return { added: added.length, errors }
}

export async function removeServer(id: string): Promise<void> {
  await serversItem.setValue((await serversItem.getValue()).filter((s) => s.id !== id))
  await ensureValidSelection()
}

export function selectServer(id: string): Promise<void> {
  return selectedServerIdItem.setValue(id)
}

/** Если выбранный сервер исчез, выбирает первый доступный (или снимает выбор). */
export async function ensureValidSelection(): Promise<void> {
  const [servers, selectedId] = await Promise.all([getAllServers(), selectedServerIdItem.getValue()])
  if (selectedId === AUTO_SELECTION && servers.length) return
  if (servers.some((s) => s.id === selectedId)) return
  await selectedServerIdItem.setValue(servers[0]?.id ?? null)
}

export type ServerPool =
  | { mode: 'manual'; servers: StoredServer[]; selected: StoredServer }
  | { mode: 'auto'; servers: StoredServer[] }

/** Все серверы и выбор для запуска ядра; null — запускать не с чем. */
export async function getServerPool(): Promise<ServerPool | null> {
  const [servers, selectedId] = await Promise.all([getAllServers(), selectedServerIdItem.getValue()])
  if (!servers.length) return null
  if (selectedId === AUTO_SELECTION) return { mode: 'auto', servers }
  const selected = servers.find((s) => s.id === selectedId)
  return selected ? { mode: 'manual', servers, selected } : null
}

/** Вызывает callback при смене выбора или изменении любого списка серверов. */
export function watchServers(callback: () => void): () => void {
  const unwatchers = [serversItem, subscriptionsItem, selectedServerIdItem].map((item) =>
    item.watch(callback),
  )
  return () => unwatchers.forEach((unwatch) => unwatch())
}
