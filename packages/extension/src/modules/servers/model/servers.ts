import { parseVlessLink, VlessParseError } from '@vdp/shared'
import { ru } from '@/common/i18n/ru'
import { selectedServerIdItem, serversItem, type StoredServer } from './storage'

export interface AddServersResult {
  added: number
  errors: { line: string; message: string }[]
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
  const servers = (await serversItem.getValue()).filter((s) => s.id !== id)
  await serversItem.setValue(servers)
  if ((await selectedServerIdItem.getValue()) === id) {
    await selectedServerIdItem.setValue(servers[0]?.id ?? null)
  }
}

export function selectServer(id: string): Promise<void> {
  return selectedServerIdItem.setValue(id)
}

export async function getSelectedServer(): Promise<StoredServer | null> {
  const [servers, selectedId] = await Promise.all([
    serversItem.getValue(),
    selectedServerIdItem.getValue(),
  ])
  return servers.find((s) => s.id === selectedId) ?? null
}

/** Вызывает callback при смене выбранного сервера или изменении списка. */
export function watchSelectedServer(callback: () => void): () => void {
  const unwatchServers = serversItem.watch(callback)
  const unwatchSelected = selectedServerIdItem.watch(callback)
  return () => {
    unwatchServers()
    unwatchSelected()
  }
}
