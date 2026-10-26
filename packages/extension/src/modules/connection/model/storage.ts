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
      serverName: string
      since: number
      coreVersion: string | null
      ports: CorePorts
    }
  | { state: 'error'; message: string }

/** Фактическое состояние — пишет только фоновый сервис. */
export const connectionStatusItem = storage.defineItem<ConnectionStatus>('local:connectionStatus', {
  fallback: { state: 'off' },
})

export const RECONNECT_MESSAGE = 'connection:reconnect'
