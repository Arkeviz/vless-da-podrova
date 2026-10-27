import { isBrowserRule, type DefaultAction, type Rule } from './rules'
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

/** Сервер в конфиге ядра: тег выхода стабилен, пока сервер существует. */
export interface CoreServer {
  tag: string
  server: VlessServer
}

/**
 * Выход `proxy` - переключатель (selector) между всеми серверами или группа urltest.
 * Ручной выбор меняется через Clash API без перезапуска ядра.
 */
export type ServerSelection = { mode: 'manual'; tag: string } | { mode: 'auto' }

export const URL_TEST_URL = 'https://www.gstatic.com/generate_204'

export interface BuildConfigInput {
  servers: readonly CoreServer[]
  selection: ServerSelection
  ports: CorePorts
  clashApiSecret: string
  dohUrl: string
  /** Правила, которые исполняет ядро, в порядке приоритета. Правила браузера отбрасываются. */
  rules?: readonly Rule[]
  defaultAction?: DefaultAction
  /** Файл кэша rule-set'ов. Свой у каждого браузера: два ядра не могут делить один файл. */
  cacheFilePath?: string
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
  const {
    servers,
    selection,
    ports,
    clashApiSecret,
    dohUrl,
    rules = [],
    defaultAction = 'proxy',
    cacheFilePath,
    logLevel = 'info',
  } = input
  if (!servers.length) throw new Error('Нет серверов для конфига ядра')
  const coreRules = rules.filter((rule) => !isBrowserRule(rule))
  const ruleSets = buildRuleSets(coreRules)

  return {
    log: { level: logLevel, timestamp: true },
    dns: buildDns(dohUrl),
    inbounds: [
      { type: 'mixed', tag: TAG.inAuto, listen: '127.0.0.1', listen_port: ports.auto },
      { type: 'mixed', tag: TAG.inProxy, listen: '127.0.0.1', listen_port: ports.proxy },
    ],
    outbounds: [
      buildProxyGroup(servers, selection),
      ...servers.map(({ tag, server }) => buildVlessOutbound(server, tag)),
      { type: 'direct', tag: TAG.direct },
    ],
    route: {
      rules: [
        { inbound: [TAG.inProxy], action: 'route', outbound: TAG.proxy },
        ...buildRouteRules(coreRules),
      ],
      ...(ruleSets.length ? { rule_set: ruleSets } : {}),
      final: defaultAction === 'proxy' ? TAG.proxy : TAG.direct,
      default_domain_resolver: TAG.dns,
    },
    experimental: {
      clash_api: {
        external_controller: `127.0.0.1:${ports.clashApi}`,
        secret: clashApiSecret,
      },
      ...(ruleSets.length && cacheFilePath
        ? { cache_file: { enabled: true, path: cacheFilePath } }
        : {}),
    },
  }
}

function buildProxyGroup(servers: readonly CoreServer[], selection: ServerSelection): Json {
  const tags = servers.map((s) => s.tag)
  if (selection.mode === 'auto') {
    return {
      type: 'urltest',
      tag: TAG.proxy,
      outbounds: tags,
      url: URL_TEST_URL,
      interval: '3m',
      tolerance: 50,
      interrupt_exist_connections: true,
    }
  }
  if (!tags.includes(selection.tag)) throw new Error(`Сервер ${selection.tag} не найден`)
  return {
    type: 'selector',
    tag: TAG.proxy,
    outbounds: tags,
    default: selection.tag,
    // При смене сервера открытые соединения рвутся и переподключаются уже через новый.
    interrupt_exist_connections: true,
  }
}

function ruleSetTag(rule: Rule): string {
  return `rs-${rule.id}`
}

function buildRouteRules(rules: readonly Rule[]): Json[] {
  const result: Json[] = []
  let resolved = false

  for (const rule of rules) {
    const { match } = rule
    // IP-условиям нужен адрес, а браузер присылает домен - резолвим один раз,
    // прямо перед первым правилом, которому он нужен (rule-set может содержать IP).
    if (!resolved && (match.type === 'ip' || match.type === 'ruleSet')) {
      result.push({ action: 'resolve' })
      resolved = true
    }

    const condition: Json =
      match.type === 'exact'
        ? { domain: [match.value] }
        : match.type === 'suffix'
          ? { domain_suffix: [match.value] }
          : match.type === 'keyword'
            ? { domain_keyword: [match.value] }
            : match.type === 'ip'
              ? { ip_cidr: [match.value] }
              : { rule_set: [ruleSetTag(rule)] }

    const action: Json =
      rule.action === 'block'
        ? { action: 'reject' }
        : { action: 'route', outbound: rule.action === 'proxy' ? TAG.proxy : TAG.direct }

    result.push({ ...condition, ...action })
  }
  return result
}

function buildRuleSets(rules: readonly Rule[]): Json[] {
  return rules.flatMap((rule) =>
    rule.match.type === 'ruleSet'
      ? [
          {
            type: 'remote',
            tag: ruleSetTag(rule),
            format: rule.match.format,
            url: rule.match.url,
            update_interval: `${rule.match.updateIntervalHours}h`,
            // Списки качаются через VLESS: источник может быть заблокирован.
            http_client: { detour: TAG.proxy },
          },
        ]
      : [],
  )
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

  // Домен DoH-сервера нужно чем-то разрезолвить - системным DNS, один раз.
  doh.domain_resolver = TAG.dnsBootstrap
  return {
    servers: [doh, { type: 'local', tag: TAG.dnsBootstrap }],
    final: TAG.dns,
  }
}

function buildVlessOutbound(server: VlessServer, tag: string): Json {
  const outbound: Json = {
    type: 'vless',
    tag,
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
