export type VlessTransport =
  | { type: 'tcp' }
  | { type: 'ws'; path: string; host?: string; maxEarlyData?: number }
  | { type: 'httpupgrade'; path: string; host?: string }
  | { type: 'http'; path: string; host: string[] }
  | { type: 'grpc'; serviceName: string }

export type VlessSecurity =
  | { type: 'none' }
  | { type: 'tls'; sni?: string; fingerprint?: string; alpn: string[]; allowInsecure: boolean }
  | { type: 'reality'; sni: string; fingerprint: string; publicKey: string; shortId: string }

export type VlessFlow = 'xtls-rprx-vision'

export interface VlessServer {
  name: string
  address: string
  port: number
  uuid: string
  flow?: VlessFlow
  transport: VlessTransport
  security: VlessSecurity
}

export class VlessParseError extends Error {
  override name = 'VlessParseError'
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const DEFAULT_FINGERPRINT = 'chrome'

export function parseVlessLink(link: string): VlessServer {
  const raw = link.trim()
  if (!raw.toLowerCase().startsWith('vless://')) {
    throw new VlessParseError('Ссылка должна начинаться с vless://')
  }

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new VlessParseError('Не удалось разобрать ссылку')
  }

  const uuid = decodeURIComponent(url.username)
  if (!UUID_RE.test(uuid)) {
    throw new VlessParseError('Некорректный UUID')
  }

  const address = url.hostname.replace(/^\[(.*)\]$/, '$1')
  if (!address) {
    throw new VlessParseError('Не указан адрес сервера')
  }

  const port = Number(url.port)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new VlessParseError('Некорректный порт')
  }

  const params = url.searchParams
  const get = (key: string): string | undefined => {
    const value = params.get(key)
    return value === null || value === '' ? undefined : value
  }

  const encryption = get('encryption')
  if (encryption !== undefined && encryption !== 'none') {
    throw new VlessParseError(`Шифрование «${encryption}» не поддерживается`)
  }

  const flow = parseFlow(get('flow'))
  const transport = parseTransport(get)
  const security = parseSecurity(get)

  if (flow && (transport.type !== 'tcp' || security.type === 'none')) {
    throw new VlessParseError('Flow xtls-rprx-vision работает только с tcp + tls/reality')
  }

  const name = url.hash ? safeDecode(url.hash.slice(1)).trim() : ''

  return {
    name: name || `${address}:${port}`,
    address,
    port,
    uuid: uuid.toLowerCase(),
    ...(flow ? { flow } : {}),
    transport,
    security,
  }
}

function parseFlow(flow: string | undefined): VlessFlow | undefined {
  if (flow === undefined) return undefined
  if (flow === 'xtls-rprx-vision') return flow
  throw new VlessParseError(`Flow «${flow}» не поддерживается`)
}

function parseTransport(get: (key: string) => string | undefined): VlessTransport {
  const type = get('type') ?? 'tcp'
  const host = get('host')
  const path = get('path') ?? '/'

  switch (type) {
    case 'tcp':
    case 'raw': {
      const headerType = get('headerType')
      if (headerType !== undefined && headerType !== 'none') {
        throw new VlessParseError(`Заголовок tcp «${headerType}» не поддерживается`)
      }
      return { type: 'tcp' }
    }
    case 'ws': {
      const { path: cleanPath, earlyData } = splitEarlyData(path)
      return {
        type: 'ws',
        path: cleanPath,
        ...(host ? { host } : {}),
        ...(earlyData ? { maxEarlyData: earlyData } : {}),
      }
    }
    case 'httpupgrade':
      return { type: 'httpupgrade', path, ...(host ? { host } : {}) }
    case 'http':
    case 'h2':
      return { type: 'http', path, host: host ? host.split(',').map((h) => h.trim()) : [] }
    case 'grpc':
      return { type: 'grpc', serviceName: get('serviceName') ?? '' }
    default:
      throw new VlessParseError(`Транспорт «${type}» не поддерживается`)
  }
}

function parseSecurity(get: (key: string) => string | undefined): VlessSecurity {
  const security = get('security') ?? 'none'

  switch (security) {
    case 'none':
      return { type: 'none' }
    case 'tls': {
      const sni = get('sni')
      const fingerprint = get('fp')
      const alpn = get('alpn')
      return {
        type: 'tls',
        ...(sni ? { sni } : {}),
        ...(fingerprint ? { fingerprint } : {}),
        alpn: alpn ? alpn.split(',').map((a) => a.trim()) : [],
        allowInsecure: get('allowInsecure') === '1' || get('allowInsecure') === 'true',
      }
    }
    case 'reality': {
      const publicKey = get('pbk')
      if (!publicKey) throw new VlessParseError('Для reality нужен публичный ключ (pbk)')
      const sni = get('sni')
      if (!sni) throw new VlessParseError('Для reality нужен SNI (sni)')
      return {
        type: 'reality',
        sni,
        fingerprint: get('fp') ?? DEFAULT_FINGERPRINT,
        publicKey,
        shortId: get('sid') ?? '',
      }
    }
    default:
      throw new VlessParseError(`Security «${security}» не поддерживается`)
  }
}

/** Xray-клиенты передают early data в path как `?ed=2048`. */
function splitEarlyData(path: string): { path: string; earlyData?: number } {
  const match = /^(.*?)\?ed=(\d+)$/.exec(path)
  if (!match) return { path }
  return { path: match[1] || '/', earlyData: Number(match[2]) }
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
