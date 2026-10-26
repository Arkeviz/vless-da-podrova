import { describe, expect, it } from 'vitest'
import { buildSingboxConfig, DEFAULT_DOH_URL, type BuildConfigInput } from './singbox'
import type { VlessServer } from './vless'

const realityServer: VlessServer = {
  name: 'Дом',
  address: '203.0.113.10',
  port: 443,
  uuid: '3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  flow: 'xtls-rprx-vision',
  transport: { type: 'tcp' },
  security: {
    type: 'reality',
    sni: 'www.microsoft.com',
    fingerprint: 'chrome',
    publicKey: 'PUBKEY',
    shortId: 'ab12',
  },
}

const ports = { auto: 20001, proxy: 20002, clashApi: 20003 }

function build(overrides: Partial<BuildConfigInput> = {}) {
  return buildSingboxConfig({
    servers: [{ tag: 'srv-a', server: realityServer }],
    selection: { mode: 'manual', tag: 'srv-a' },
    ports,
    clashApiSecret: 'secret',
    dohUrl: DEFAULT_DOH_URL,
    ...overrides,
  })
}

const outbounds = (config: Record<string, unknown>) => config.outbounds as Record<string, unknown>[]

describe('buildSingboxConfig', () => {
  it('собирает конфиг для reality + vision', () => {
    expect(build()).toMatchInlineSnapshot(`
      {
        "dns": {
          "final": "doh",
          "servers": [
            {
              "path": "/dns-query",
              "server": "1.1.1.1",
              "tag": "doh",
              "type": "https",
            },
          ],
        },
        "experimental": {
          "clash_api": {
            "external_controller": "127.0.0.1:20003",
            "secret": "secret",
          },
        },
        "inbounds": [
          {
            "listen": "127.0.0.1",
            "listen_port": 20001,
            "tag": "in-auto",
            "type": "mixed",
          },
          {
            "listen": "127.0.0.1",
            "listen_port": 20002,
            "tag": "in-proxy",
            "type": "mixed",
          },
        ],
        "log": {
          "level": "info",
          "timestamp": true,
        },
        "outbounds": [
          {
            "default": "srv-a",
            "interrupt_exist_connections": true,
            "outbounds": [
              "srv-a",
            ],
            "tag": "proxy",
            "type": "selector",
          },
          {
            "flow": "xtls-rprx-vision",
            "server": "203.0.113.10",
            "server_port": 443,
            "tag": "srv-a",
            "tls": {
              "enabled": true,
              "reality": {
                "enabled": true,
                "public_key": "PUBKEY",
                "short_id": "ab12",
              },
              "server_name": "www.microsoft.com",
              "utls": {
                "enabled": true,
                "fingerprint": "chrome",
              },
            },
            "type": "vless",
            "uuid": "3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
          },
          {
            "tag": "direct",
            "type": "direct",
          },
        ],
        "route": {
          "default_domain_resolver": "doh",
          "final": "proxy",
          "rules": [
            {
              "action": "route",
              "inbound": [
                "in-proxy",
              ],
              "outbound": "proxy",
            },
          ],
        },
      }
    `)
  })

  it('режим «авто» — группа urltest из всех серверов', () => {
    const config = build({
      servers: [
        { tag: 'srv-a', server: realityServer },
        { tag: 'srv-b', server: { ...realityServer, address: '198.51.100.7' } },
      ],
      selection: { mode: 'auto' },
    })
    expect(outbounds(config)[0]).toEqual({
      type: 'urltest',
      tag: 'proxy',
      outbounds: ['srv-a', 'srv-b'],
      url: 'https://www.gstatic.com/generate_204',
      interval: '3m',
      tolerance: 50,
      interrupt_exist_connections: true,
    })
    expect(outbounds(config).map((o) => o.tag)).toEqual(['proxy', 'srv-a', 'srv-b', 'direct'])
  })

  it('отклоняет выбор несуществующего сервера и пустой список', () => {
    expect(() => build({ selection: { mode: 'manual', tag: 'srv-x' } })).toThrow()
    expect(() => build({ servers: [] })).toThrow()
  })

  it('добавляет bootstrap-резолвер, если DoH задан доменом', () => {
    expect(build({ dohUrl: 'https://dns.google:8443/resolve' }).dns).toEqual({
      servers: [
        {
          type: 'https',
          tag: 'doh',
          server: 'dns.google',
          server_port: 8443,
          path: '/resolve',
          domain_resolver: 'bootstrap',
        },
        { type: 'local', tag: 'bootstrap' },
      ],
      final: 'doh',
    })
  })

  it('собирает ws + tls транспорт', () => {
    const config = build({
      servers: [
        {
          tag: 'srv-a',
          server: {
            ...realityServer,
            flow: undefined,
            transport: { type: 'ws', path: '/ws', host: 'h.example.com', maxEarlyData: 2048 },
            security: { type: 'tls', alpn: [], allowInsecure: false },
          },
        },
      ],
    })
    const vless = outbounds(config)[1]
    expect(vless).toMatchObject({
      tls: { enabled: true, server_name: '203.0.113.10' },
      transport: {
        type: 'ws',
        path: '/ws',
        headers: { Host: 'h.example.com' },
        max_early_data: 2048,
        early_data_header_name: 'Sec-WebSocket-Protocol',
      },
    })
    expect(vless).not.toHaveProperty('flow')
  })

  it('отклоняет DoH не по https', () => {
    expect(() => build({ dohUrl: 'http://1.1.1.1' })).toThrow()
  })
})

describe('правила ядра', () => {
  const config = build({
    defaultAction: 'direct',
    cacheFilePath: 'cache-abc.db',
    rules: [
      { id: 'b1', match: { type: 'suffix', value: 'twitch.tv' }, action: 'proxy' },
      { id: 'c1', match: { type: 'suffix', value: 'ads.com' }, action: 'block' },
      {
        id: 'c2',
        match: { type: 'ruleSet', url: 'https://x.org/ru.srs', format: 'binary', updateIntervalHours: 12 },
        action: 'direct',
      },
      { id: 'c3', match: { type: 'ip', value: '91.108.4.0/22' }, action: 'proxy' },
      { id: 'c4', match: { type: 'keyword', value: 'tracker' }, action: 'block' },
    ],
  })
  const route = config.route as Record<string, unknown>

  it('исполняет только правила ядра, по порядку, с resolve перед первым IP/rule-set', () => {
    expect(route.rules).toEqual([
      { inbound: ['in-proxy'], action: 'route', outbound: 'proxy' },
      { domain_suffix: ['ads.com'], action: 'reject' },
      { action: 'resolve' },
      { rule_set: ['rs-c2'], action: 'route', outbound: 'direct' },
      { ip_cidr: ['91.108.4.0/22'], action: 'route', outbound: 'proxy' },
      { domain_keyword: ['tracker'], action: 'reject' },
    ])
  })

  it('действие по умолчанию — final', () => {
    expect(route.final).toBe('direct')
  })

  it('описывает rule-set и включает кэш', () => {
    expect(route.rule_set).toEqual([
      {
        type: 'remote',
        tag: 'rs-c2',
        format: 'binary',
        url: 'https://x.org/ru.srs',
        update_interval: '12h',
        http_client: { detour: 'proxy' },
      },
    ])
    expect((config.experimental as Record<string, unknown>).cache_file).toEqual({
      enabled: true,
      path: 'cache-abc.db',
    })
  })

  it('без rule-set нет ни rule_set, ни кэша', () => {
    const plain = build({ cacheFilePath: 'x.db' })
    expect(plain.route).not.toHaveProperty('rule_set')
    expect(plain.experimental).not.toHaveProperty('cache_file')
  })
})
