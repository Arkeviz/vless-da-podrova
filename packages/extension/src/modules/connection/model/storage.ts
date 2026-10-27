import type { CorePorts } from '@vdp/shared'
import { storage } from 'wxt/utils/storage'

/** Желаемое состояние, которое задаёт пользователь. Восстанавливается при старте браузера. */
export const proxyEnabledItem = storage.defineItem<boolean>('local:proxyEnabled', {
  fallback: false,
})

export type ConnectionStatus =
  | { state: 'off' }
  | { state: 'connecting'; serverName: string }
  | {
      state: 'on'
      /** Выбранный сервер; в режиме «авто» - название группы. */
      serverName: string
      mode: 'manual' | 'auto'
      since: number
      coreVersion: string | null
      ports: CorePorts
      /** Секрет Clash API этого запуска ядра - для диагностики в попапе и настройках. */
      clashApiSecret: string
    }
  | {
      state: 'error'
      message: string
      /** Kill-switch: трафик заблокирован до переподключения. */
      blocked?: boolean
    }

/** Фактическое состояние - пишет только фоновый сервис. */
export const connectionStatusItem = storage.defineItem<ConnectionStatus>('local:connectionStatus', {
  fallback: { state: 'off' },
})

/** Случайный ID этой установки расширения: у каждого браузера свой файл кэша ядра. */
export const instanceIdItem = storage.defineItem<string>('local:instanceId', {
  init: () => crypto.randomUUID(),
})

export const RECONNECT_MESSAGE = 'connection:reconnect'
export const CORE_LOG_MESSAGE = 'connection:core-log'
