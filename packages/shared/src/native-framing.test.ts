import { describe, expect, it } from 'vitest'
import { encodeNativeMessage, NativeMessageDecoder } from './native-framing'

describe('native messaging framing', () => {
  it('кодирует длину little-endian', () => {
    const frame = encodeNativeMessage({ a: 'б' })
    const body = '{"a":"б"}'
    expect(new DataView(frame.buffer).getUint32(0, true)).toBe(new TextEncoder().encode(body).length)
  })

  it('собирает сообщения из произвольно нарезанных кусков', () => {
    const frames = [encodeNativeMessage({ id: 1 }), encodeNativeMessage({ id: 2, text: 'привет' })]
    const all = new Uint8Array(frames[0]!.length + frames[1]!.length)
    all.set(frames[0]!)
    all.set(frames[1]!, frames[0]!.length)

    const decoder = new NativeMessageDecoder()
    const received: unknown[] = []
    for (let i = 0; i < all.length; i += 3) {
      received.push(...decoder.push(all.subarray(i, i + 3)))
    }
    expect(received).toEqual([{ id: 1 }, { id: 2, text: 'привет' }])
  })
})
