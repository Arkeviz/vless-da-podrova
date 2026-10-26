import type { VlessServer } from '@vdp/shared'
import { storage } from 'wxt/utils/storage'

export interface StoredServer {
  id: string
  /** Исходная ссылка — для экспорта и поиска дублей. */
  link: string
  server: VlessServer
}

export const serversItem = storage.defineItem<StoredServer[]>('local:servers', { fallback: [] })

export const selectedServerIdItem = storage.defineItem<string | null>('local:selectedServerId', {
  fallback: null,
})
