import { browser } from 'wxt/browser'

let applied: boolean | null = null

/**
 * WebRTC без прямых UDP-соединений в обход прокси — реальный IP не утекает.
 * Включается только пока прокси подключён: без прокси защищать нечего, а звонки бы ломались.
 */
export async function setWebrtcProtection(enabled: boolean): Promise<void> {
  if (applied === enabled) return
  const setting = browser.privacy.network.webRTCIPHandlingPolicy
  if (enabled) await setting.set({ value: 'disable_non_proxied_udp' })
  else await setting.clear({})
  applied = enabled
}
