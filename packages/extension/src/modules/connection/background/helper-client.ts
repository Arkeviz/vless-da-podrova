import {
  isHelperEvent,
  NATIVE_HOST_NAME,
  type HelperCommand,
  type HelperCommands,
  type HelperEvent,
  type HelperResponse,
} from '@vdp/shared'
import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'

// Больше, чем ожидание готовности ядра в хелпере (30 с).
const CALL_TIMEOUT_MS = 45_000

type Port = ReturnType<typeof browser.runtime.connectNative>

interface Handlers {
  onEvent(event: HelperEvent): void
  /** Хелпер отключился не по нашей инициативе. */
  onDisconnect(message: string): void
}

interface Pending {
  resolve(result: unknown): void
  reject(error: Error): void
  timer: ReturnType<typeof setTimeout>
}

export class HelperClient {
  private nextId = 1
  private readonly pending = new Map<number, Pending>()
  private closed = false

  private constructor(
    private readonly port: Port,
    handlers: Handlers,
  ) {
    port.onMessage.addListener((message: unknown) => {
      if (isHelperEvent(message)) {
        handlers.onEvent(message)
        return
      }
      const response = message as HelperResponse
      const pending = this.pending.get(response.id)
      if (!pending) return
      this.pending.delete(response.id)
      clearTimeout(pending.timer)
      if (response.ok) pending.resolve(response.result)
      else pending.reject(new Error(response.error))
    })

    port.onDisconnect.addListener((p) => {
      const reason = describeDisconnect(
        (p as { error?: { message?: string } }).error?.message ?? browser.runtime.lastError?.message,
      )
      this.close(reason)
      handlers.onDisconnect(reason)
    })
  }

  static connect(handlers: Handlers): HelperClient {
    return new HelperClient(browser.runtime.connectNative(NATIVE_HOST_NAME), handlers)
  }

  call<K extends HelperCommand>(
    type: K,
    params: HelperCommands[K]['params'],
  ): Promise<HelperCommands[K]['result']> {
    if (this.closed) return Promise.reject(new Error(ru.errors.helperDisconnected))

    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(ru.errors.timeout))
      }, CALL_TIMEOUT_MS)
      this.pending.set(id, {
        resolve: resolve as (result: unknown) => void,
        reject,
        timer,
      })
      this.port.postMessage({ id, type, ...params })
    })
  }

  disconnect(): void {
    if (this.closed) return
    this.close(ru.errors.helperDisconnected)
    this.port.disconnect()
  }

  private close(reason: string) {
    this.closed = true
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error(reason))
    }
    this.pending.clear()
  }
}

function describeDisconnect(message: string | undefined): string {
  // Chrome: "Specified native messaging host not found."; Firefox: "No such native application …".
  if (message && /not found|no such native application/i.test(message)) {
    return ru.errors.helperNotInstalled
  }
  return message ? `${ru.errors.helperDisconnected}: ${message}` : ru.errors.helperDisconnected
}
