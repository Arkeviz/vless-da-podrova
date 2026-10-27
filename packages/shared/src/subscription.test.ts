import { describe, expect, it } from 'vitest'
import { decodeProfileTitle, parseSubscription, parseUserInfo } from './subscription'

const UUID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'
const linkA = `vless://${UUID}@a.example.com:443?security=reality&pbk=K&sni=x.com#%D0%90`
const linkB = `vless://${UUID}@b.example.com:443?type=ws&security=tls#B`
const plain = [linkA, 'vmess://eyJ2IjoiMiJ9', '', linkB, `vless://${UUID}@c.example.com:443?type=xhttp#C`, linkA].join('\r\n')

const base64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)))

describe('parseSubscription', () => {
  it('разбирает plain-список: VLESS - в серверы, остальное пропускает', () => {
    const result = parseSubscription(plain)
    expect(result.servers.map((s) => s.server.name)).toEqual(['А', 'B'])
    expect(result.skipped).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]!.message).toMatch(/xhttp/)
  })

  it('разбирает base64 с переносами строк', () => {
    const encoded = base64(plain).replace(/(.{60})/g, '$1\n')
    expect(parseSubscription(encoded).servers).toHaveLength(2)
  })

  it('разбирает URL-safe base64 без паддинга', () => {
    const encoded = base64(linkA).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    expect(parseSubscription(encoded).servers[0]!.link).toBe(linkA)
  })

  it('пустая подписка - пустой результат', () => {
    expect(parseSubscription('')).toEqual({ servers: [], errors: [], skipped: 0 })
  })
})

describe('заголовки подписки', () => {
  it('subscription-userinfo', () => {
    expect(parseUserInfo('upload=1024; download=2048; total=10737418240; expire=1767225600')).toEqual({
      upload: 1024,
      download: 2048,
      total: 10737418240,
      expire: 1767225600,
    })
    expect(parseUserInfo('upload=0; download=5; total=0; expire=0')).toMatchObject({ total: 0, expire: null })
    expect(parseUserInfo(null)).toBeNull()
    expect(parseUserInfo('garbage')).toBeNull()
  })

  it('profile-title', () => {
    expect(decodeProfileTitle('Мой VPN')).toBe('Мой VPN')
    expect(decodeProfileTitle(`base64:${base64('Мой VPN')}`)).toBe('Мой VPN')
    expect(decodeProfileTitle('  ')).toBeNull()
  })
})
