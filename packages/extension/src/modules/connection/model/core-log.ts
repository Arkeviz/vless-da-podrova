import { browser } from 'wxt/browser'
import { CORE_LOG_MESSAGE } from './storage'

/** Последние строки лога ядра - их держит хелпер, спрашиваем через фон. */
export async function requestCoreLog(): Promise<string[]> {
  const response = (await browser.runtime.sendMessage({ type: CORE_LOG_MESSAGE })) as
    | { lines: string[] }
    | undefined
  return response?.lines ?? []
}
