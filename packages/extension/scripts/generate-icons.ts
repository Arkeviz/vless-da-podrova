/**
 * Генерирует PNG-иконки манифеста из той же функции, что рисует иконку в фоне.
 * Запуск: pnpm --filter @vdp/extension icons
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crc32, deflateSync } from 'node:zlib'
import { ICON_COLORS, renderIcon } from '../../shared/src/icon.ts'

const SIZES = [16, 32, 48, 128]
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'app', 'public', 'icon')

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size: number, rgba: Uint8ClampedArray): Buffer {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header[8] = 8 // бит на канал
  header[9] = 6 // RGBA

  // Каждая строка начинается с байта фильтра 0 (без фильтра).
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    Buffer.from(rgba.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

mkdirSync(outDir, { recursive: true })
for (const size of SIZES) {
  writeFileSync(join(outDir, `${size}.png`), encodePng(size, renderIcon(size, ICON_COLORS.on)))
}
console.log(`Иконки: ${SIZES.join(', ')} → ${outDir}`)
