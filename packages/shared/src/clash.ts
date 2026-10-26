/**
 * Минимальный клиент Clash API sing-box: переключение сервера, задержки, трафик.
 * Слушает 127.0.0.1 на случайном порту, секрет меняется при каждом запуске ядра.
 */

export interface ClashEndpoint {
  port: number
  secret: string
}

export class ClashApiError extends Error {
  override name = 'ClashApiError'

  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

async function request(endpoint: ClashEndpoint, path: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(`http://127.0.0.1:${endpoint.port}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${endpoint.secret}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let message = text
    try {
      message = (JSON.parse(text) as { message?: string }).message ?? text
    } catch {
      // Не JSON — оставляем как есть.
    }
    throw new ClashApiError(message || `HTTP ${response.status}`, response.status)
  }
  return response
}

/** Переключает выход-селектор `group` на `name`. */
export async function clashSelect(endpoint: ClashEndpoint, group: string, name: string): Promise<void> {
  await request(endpoint, `/proxies/${encodeURIComponent(group)}`, {
    method: 'PUT',
    body: JSON.stringify({ name }),
  })
}

/** Какой сервер сейчас выбран в группе (для urltest — самый быстрый). */
export async function clashGroupNow(endpoint: ClashEndpoint, group: string): Promise<string | null> {
  const response = await request(endpoint, `/proxies/${encodeURIComponent(group)}`)
  return ((await response.json()) as { now?: string }).now ?? null
}

/** Задержка до `url` через выход `name`, мс. Бросает ClashApiError при таймауте/ошибке. */
export async function clashDelay(
  endpoint: ClashEndpoint,
  name: string,
  options: { url: string; timeoutMs: number },
): Promise<number> {
  const query = new URLSearchParams({ url: options.url, timeout: String(options.timeoutMs) })
  const response = await request(endpoint, `/proxies/${encodeURIComponent(name)}/delay?${query}`)
  return ((await response.json()) as { delay: number }).delay
}

export interface TrafficSample {
  /** Байт в секунду. */
  up: number
  down: number
}

/** Поток замеров скорости раз в секунду, пока не отменён signal. */
export async function* clashTraffic(
  endpoint: ClashEndpoint,
  signal: AbortSignal,
): AsyncGenerator<TrafficSample> {
  const response = await request(endpoint, '/traffic', { signal })
  const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
  let buffer = ''
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += value
      let newline: number
      while ((newline = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newline).trim()
        buffer = buffer.slice(newline + 1)
        if (line) yield JSON.parse(line) as TrafficSample
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export interface TrafficTotals {
  uploadTotal: number
  downloadTotal: number
}

export async function clashTrafficTotals(endpoint: ClashEndpoint): Promise<TrafficTotals> {
  const response = await request(endpoint, '/connections')
  const { uploadTotal, downloadTotal } = (await response.json()) as TrafficTotals
  return { uploadTotal, downloadTotal }
}
