import { describe, expect, it } from 'vitest'
import { ICON_COLORS, renderIcon } from './icon'

const pixel = (pixels: Uint8ClampedArray, size: number, x: number, y: number) =>
  Array.from(pixels.slice((y * size + x) * 4, (y * size + x) * 4 + 4))

describe('renderIcon', () => {
  const size = 32
  const pixels = renderIcon(size, ICON_COLORS.on)

  it('угол прозрачный', () => {
    expect(pixel(pixels, size, 0, 0)[3]).toBe(0)
  })

  it('фон круга - цвет состояния', () => {
    expect(pixel(pixels, size, 16, 4)).toEqual([...ICON_COLORS.on, 255])
  })

  it('на линии «V» - белый', () => {
    expect(pixel(pixels, size, 16, 21)).toEqual([255, 255, 255, 255])
  })
})
