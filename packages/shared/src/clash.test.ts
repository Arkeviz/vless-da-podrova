import { afterEach, describe, expect, it, vi } from 'vitest'
import { ClashApiError, clashDelay, clashSelect, clashTraffic } from './clash'

const endpoint = { port: 9090, secret: 's3cret' }

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Clash API', () => {
  it('переключает селектор с авторизацией', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)
    await clashSelect(endpoint, 'proxy', 'srv-b')
    expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:9090/proxies/proxy', {
      method: 'PUT',
      body: '{"name":"srv-b"}',
      headers: { Authorization: 'Bearer s3cret', 'Content-Type': 'application/json' },
    })
  })

  it('возвращает текст ошибки ядра', async () => {
    vi.stubGlobal('fetch', async () => new Response('{"message":"Timeout"}', { status: 504 }))
    await expect(clashDelay(endpoint, 'srv-a', { url: 'https://x', timeoutMs: 1000 })).rejects.toEqual(
      new ClashApiError('Timeout', 504),
    )
  })

  it('читает поток трафика, разрезанный на произвольные куски', async () => {
    const chunks = ['{"up":1,"do', 'wn":2}\n{"up":3,"down":4}\n', '{"up":5,"down":6}\n']
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk))
        controller.close()
      },
    })
    vi.stubGlobal('fetch', async () => new Response(body))
    const samples = []
    for await (const sample of clashTraffic(endpoint, new AbortController().signal)) samples.push(sample)
    expect(samples).toEqual([
      { up: 1, down: 2 },
      { up: 3, down: 4 },
      { up: 5, down: 6 },
    ])
  })
})
