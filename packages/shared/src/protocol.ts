/**
 * Протокол между расширением и нативным хелпером (native messaging).
 * Хелпер «тупой»: всю логику и конфиг ядра формирует расширение.
 */

export const NATIVE_HOST_NAME = 'com.vless_da_podrova.helper'
export const PROTOCOL_VERSION = 1

export interface HelperCommands {
  hello: {
    params: Record<string, never>
    result: { protocolVersion: number; helperVersion: string; coreVersion: string | null }
  }
  allocatePorts: {
    params: { count: number }
    result: { ports: number[] }
  }
  start: {
    /** `readinessPort` — порт, который должен начать принимать соединения после старта ядра. */
    params: { config: unknown; readinessPort: number }
    result: { pid: number }
  }
  stop: {
    params: Record<string, never>
    result: Record<string, never>
  }
  status: {
    params: Record<string, never>
    result: { running: boolean; pid: number | null; startedAt: number | null }
  }
  log: {
    params: { lines?: number }
    result: { lines: string[] }
  }
}

export type HelperCommand = keyof HelperCommands

export type HelperRequest = {
  [K in HelperCommand]: { id: number; type: K } & HelperCommands[K]['params']
}[HelperCommand]

export type HelperResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string }

export type HelperEvent = {
  type: 'event'
  event: 'core-exited'
  code: number | null
  logTail: string[]
}

export type HelperOutgoing = HelperResponse | HelperEvent

export function isHelperEvent(message: unknown): message is HelperEvent {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'event'
  )
}
