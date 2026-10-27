/**
 * Кадрирование native messaging: 4 байта длины (uint32, порядок байт платформы - на Windows LE)
 * и UTF-8 JSON.
 */

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Chrome не принимает сообщения от хоста больше 1 МБ. */
const MAX_OUTGOING_MESSAGE_BYTES = 1024 * 1024

export function encodeNativeMessage(message: unknown): Uint8Array {
  const body = encoder.encode(JSON.stringify(message))
  if (body.length > MAX_OUTGOING_MESSAGE_BYTES) {
    throw new Error(`Сообщение слишком большое: ${body.length} байт`)
  }
  const frame = new Uint8Array(4 + body.length)
  new DataView(frame.buffer).setUint32(0, body.length, true)
  frame.set(body, 4)
  return frame
}

export class NativeMessageDecoder {
  private buffer = new Uint8Array(0)

  /** Добавляет пришедший кусок и возвращает все полностью собранные сообщения. */
  push(chunk: Uint8Array): unknown[] {
    const merged = new Uint8Array(this.buffer.length + chunk.length)
    merged.set(this.buffer)
    merged.set(chunk, this.buffer.length)
    this.buffer = merged

    const messages: unknown[] = []
    while (this.buffer.length >= 4) {
      const length = new DataView(this.buffer.buffer, this.buffer.byteOffset).getUint32(0, true)
      if (this.buffer.length < 4 + length) break
      const body = this.buffer.subarray(4, 4 + length)
      messages.push(JSON.parse(decoder.decode(body)))
      this.buffer = this.buffer.slice(4 + length)
    }
    return messages
  }
}
