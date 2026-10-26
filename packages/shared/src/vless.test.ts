import { describe, expect, it } from 'vitest'
import { parseVlessLink, VlessParseError } from './vless'

const UUID = '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f'

describe('parseVlessLink', () => {
  it('разбирает reality + vision', () => {
    const server = parseVlessLink(
      `vless://${UUID}@203.0.113.10:443?type=tcp&security=reality&pbk=PUBKEY&fp=firefox` +
        `&sni=www.microsoft.com&sid=ab12&flow=xtls-rprx-vision&encryption=none#%D0%94%D0%BE%D0%BC`,
    )
    expect(server).toEqual({
      name: 'Дом',
      address: '203.0.113.10',
      port: 443,
      uuid: UUID,
      flow: 'xtls-rprx-vision',
      transport: { type: 'tcp' },
      security: {
        type: 'reality',
        sni: 'www.microsoft.com',
        fingerprint: 'firefox',
        publicKey: 'PUBKEY',
        shortId: 'ab12',
      },
    })
  })

  it('подставляет fingerprint chrome и пустой short id для reality', () => {
    const server = parseVlessLink(`vless://${UUID}@example.com:443?security=reality&pbk=K&sni=a.com`)
    expect(server.security).toMatchObject({ fingerprint: 'chrome', shortId: '' })
  })

  it('называет сервер адресом, если имени нет', () => {
    expect(parseVlessLink(`vless://${UUID}@example.com:8443`).name).toBe('example.com:8443')
  })

  it('разбирает ws + tls с early data', () => {
    const server = parseVlessLink(
      `vless://${UUID}@cdn.example.com:443?type=ws&security=tls&host=ws.example.com` +
        `&path=%2Fws%3Fed%3D2048&sni=ws.example.com&alpn=h2,http/1.1`,
    )
    expect(server.transport).toEqual({
      type: 'ws',
      path: '/ws',
      host: 'ws.example.com',
      maxEarlyData: 2048,
    })
    expect(server.security).toEqual({
      type: 'tls',
      sni: 'ws.example.com',
      alpn: ['h2', 'http/1.1'],
      allowInsecure: false,
    })
  })

  it('разбирает grpc', () => {
    const server = parseVlessLink(`vless://${UUID}@example.com:443?type=grpc&serviceName=svc&security=tls`)
    expect(server.transport).toEqual({ type: 'grpc', serviceName: 'svc' })
  })

  it('убирает скобки у IPv6', () => {
    expect(parseVlessLink(`vless://${UUID}@[2001:db8::1]:443`).address).toBe('2001:db8::1')
  })

  it.each([
    ['не vless', `vmess://${UUID}@example.com:443`],
    ['плохой uuid', 'vless://not-a-uuid@example.com:443'],
    ['нет порта', `vless://${UUID}@example.com`],
    ['xhttp', `vless://${UUID}@example.com:443?type=xhttp`],
    ['reality без pbk', `vless://${UUID}@example.com:443?security=reality&sni=a.com`],
    ['vision без tls', `vless://${UUID}@example.com:443?flow=xtls-rprx-vision`],
    ['шифрование', `vless://${UUID}@example.com:443?encryption=mlkem768x25519plus`],
  ])('отклоняет: %s', (_, link) => {
    expect(() => parseVlessLink(link)).toThrow(VlessParseError)
  })
})
