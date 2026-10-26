import type { SubscriptionUserInfo, VlessServer } from '@vdp/shared'
import { storage } from 'wxt/utils/storage'

export interface StoredServer {
  id: string
  /** Исходная ссылка — для экспорта и поиска дублей. */
  link: string
  server: VlessServer
}

export interface Subscription {
  id: string
  url: string
  name: string
  /** Имя задал пользователь — не перезаписывать его заголовком profile-title. */
  customName: boolean
  updateIntervalHours: number
  lastUpdated: number | null
  lastError: string | null
  userInfo: SubscriptionUserInfo | null
  /** Серверы подписки перезаписываются при обновлении; id сохраняется по ссылке. */
  servers: StoredServer[]
}

/** Особое значение выбора: группа urltest из всех серверов. */
export const AUTO_SELECTION = 'auto'

/** Ручные серверы, добавленные по ссылкам. */
export const serversItem = storage.defineItem<StoredServer[]>('local:servers', { fallback: [] })

export const subscriptionsItem = storage.defineItem<Subscription[]>('local:subscriptions', {
  fallback: [],
})

/** id выбранного сервера или AUTO_SELECTION. */
export const selectedServerIdItem = storage.defineItem<string | null>('local:selectedServerId', {
  fallback: null,
})
