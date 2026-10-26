/**
 * Иконка расширения: круг цвета состояния с белой «V». Рисуется попиксельно (без canvas),
 * чтобы одной функцией получать и ImageData в фоне, и PNG для манифеста при сборке.
 * Файл без импортов — его напрямую запускает скрипт генерации PNG.
 */

export type IconState = 'off' | 'connecting' | 'on' | 'error'

export const ICON_COLORS: Record<IconState, readonly [number, number, number]> = {
  off: [138, 143, 152],
  connecting: [212, 136, 6],
  on: [31, 157, 85],
  error: [209, 52, 58],
}

const SAMPLES = 4
const CIRCLE_RADIUS = 0.47
const V_POINTS: readonly [number, number][] = [
  [0.3, 0.33],
  [0.5, 0.7],
  [0.7, 0.33],
]

/** RGBA-пиксели иконки size×size. */
export function renderIcon(
  size: number,
  color: readonly [number, number, number],
): Uint8ClampedArray<ArrayBuffer> {
  const pixels = new Uint8ClampedArray(size * size * 4)
  // На маленьких размерах линия не тоньше ~1 пикселя.
  const halfWidth = Math.max(0.075, 0.9 / size)

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let covered = 0
      let white = 0
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const px = (x + (sx + 0.5) / SAMPLES) / size
          const py = (y + (sy + 0.5) / SAMPLES) / size
          if ((px - 0.5) ** 2 + (py - 0.5) ** 2 > CIRCLE_RADIUS ** 2) continue
          covered++
          if (distanceToV(px, py) <= halfWidth) white++
        }
      }
      if (!covered) continue

      const total = SAMPLES * SAMPLES
      const whiteShare = white / covered
      const offset = (y * size + x) * 4
      pixels[offset] = Math.round(color[0] + (255 - color[0]) * whiteShare)
      pixels[offset + 1] = Math.round(color[1] + (255 - color[1]) * whiteShare)
      pixels[offset + 2] = Math.round(color[2] + (255 - color[2]) * whiteShare)
      pixels[offset + 3] = Math.round((255 * covered) / total)
    }
  }
  return pixels
}

function distanceToV(x: number, y: number): number {
  let best = Infinity
  for (let i = 0; i < V_POINTS.length - 1; i++) {
    const [ax, ay] = V_POINTS[i]!
    const [bx, by] = V_POINTS[i + 1]!
    best = Math.min(best, distanceToSegment(x, y, ax, ay, bx, by))
  }
  return best
}

function distanceToSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(x - (ax + t * dx), y - (ay + t * dy))
}
