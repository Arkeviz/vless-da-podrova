import type { VlessServer } from './vless'

export interface CorePorts {
  /** Вход, трафик которого идёт через правила ядра. */
  auto: number
  /** Вход, трафик которого всегда идёт через VLESS. */
  proxy: number
  clashApi: number
}

export const CORE_PORT_COUNT = 3

export type CoreLogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface BuildConfigInput {
  server: VlessServer
  ports: CorePorts
  clashApiSecret: string
  dohUrl: string
  logLevel?: CoreLogLevel
}

export const DEFAULT_DOH_URL = 'https://1.1.1.1/dns-query'

export const TAG = {
  inAuto: 'in-auto',
  inProxy: 'in-proxy',
  proxy: 'proxy',
  direct: 'direct',
  dns: 'doh',
  dnsBootstrap: 'bootstrap',
} as const

type Json = Record<string, unknown>

export function buildSingboxConfig(input: BuildConfigInput): Json {
  const { server, ports, clashApiSecret, dohUrl, logLevel = 'info' } = input

  return {
    log: { level: logLevel, timestamp: true },
    dns: buildDns(dohUrl),
    inbounds: [
      { type: 'mixed', tag: TAG.inAuto, listen: '127.0.0.1', listen_port: ports.auto },
      { type: 'mixed', tag: TAG.inProxy, listen: '127.0.0.1', listen_port: ports.proxy },
    ],
    outbounds: [buildVlessOutbound(server), { type: 'direct', tag: TAG.direct }],
    route: {
      rules: [{ inbound: [TAG.inProxy], action: 'route', outbound: TAG.proxy }],
      final: TAG.proxy,
      default_domain_resolver: TAG.dns,
    },
    experimental: {
      clash_api: {
        external_controller: `127.0.0.1:${ports.clashApi}`,
        secret: clashApiSecret,
      },
    },
  }
}

function buildDns(dohUrl: string): Json {
  let url: URL
  try {
    url = new URL(dohUrl)
  } catch {
    throw new Error(`Некорректный адрес DoH: ${dohUrl}`)
  }
  if (url.protocol !== 'https:') {
    throw new Error('Адрес DoH должен начинаться с https://')
  }

  const host = url.hostname.replace(/^\[(.*)\]$/, '$1')
  const doh: Json = {
    type: 'https',
    tag: TAG.dns,
    server: host,
    ...(url.port ? { server_port: Number(url.port) } : {}),
    ...(url.pathname && url.pathname !== '/' ? { path: url.pathname } : {}),
  }

  if (isIpAddress(host)) {
    return { servers: [doh], final: TAG.dns }
  }

  // Домен DoH-сервера нужно чем-то разрезолвить — системным DNS, один раз.
  doh.domain_resolver = TAG.dnsBootstrap
  return {
    servers: [doh, { type: 'local', tag: TAG.dnsBootstrap }],
    final: TAG.dns,
  }
}

export function buildVlessOutbound(server: VlessServer): Json {
  const outbound: Json = {
    type: 'vless',
    tag: TAG.proxy,
    server: server.address,
    server_port: server.port,
    uuid: server.uuid,
  }
  if (server.flow) outbound.flow = server.flow

  const tls = buildTls(server)
  if (tls) outbound.tls = tls

  const transport = buildTransport(server)
  if (transport) outbound.transport = transport

  return outbound
}

function buildTls(server: VlessServer): Json | undefined {
  const { security } = server
  switch (security.type) {
    case 'none':
      return undefined
    case 'tls':
      return {
        enabled: true,
        server_name: security.sni ?? server.address,
        ...(security.allowInsecure ? { insecure: true } : {}),
        ...(security.alpn.length ? { alpn: security.alpn } : {}),
        ...(security.fingerprint
          ? { utls: { enabled: true, fingerprint: security.fingerprint } }
          : {}),
      }
    case 'reality':
      return {
        enabled: true,
        server_name: security.sni,
        utls: { enabled: true, fingerprint: security.fingerprint },
        reality: { enabled: true, public_key: security.publicKey, short_id: security.shortId },
      }
  }
}

function buildTransport(server: VlessServer): Json | undefined {
  const { transport } = server
  switch (transport.type) {
    case 'tcp':
      return undefined
    case 'ws':
      return {
        type: 'ws',
        path: transport.path,
        ...(transport.host ? { headers: { Host: transport.host } } : {}),
        ...(transport.maxEarlyData
          ? {
              max_early_data: transport.maxEarlyData,
              early_data_header_name: 'Sec-WebSocket-Protocol',
            }
          : {}),
      }
    case 'httpupgrade':
      return {
        type: 'httpupgrade',
        path: transport.path,
        ...(transport.host ? { host: transport.host } : {}),
      }
    case 'http':
      return {
        type: 'http',
        path: transport.path,
        ...(transport.host.length ? { host: transport.host } : {}),
      }
    case 'grpc':
      return { type: 'grpc', service_name: transport.serviceName }
  }
}

function isIpAddress(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')
}
