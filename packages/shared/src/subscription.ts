import { parseVlessLink, VlessParseError, type VlessServer } from './vless'

export interface ParsedSubscription {
  servers: { link: string; server: VlessServer }[]
  errors: { line: string; message: string }[]
  /** Ссылки других протоколов (vmess://, trojan://…) — расширение работает только с VLESS. */
  skipped: number
}

/** Тело подписки: base64 (обычный или URL-safe) либо plain-текст, по ссылке на строку. */
export function parseSubscription(body: string): ParsedSubscription {
  const result: ParsedSubscription = { servers: [], errors: [], skipped: 0 }
  const seen = new Set<string>()

  for (const line of decodeSubscriptionBody(body)) {
    if (!/^vless:\/\//i.test(line)) {
      if (/^[a-z][a-z0-9+.-]*:\/\//i.test(line)) result.skipped++
      continue
    }
    if (seen.has(line)) continue
    seen.add(line)
    try {
      result.servers.push({ link: line, server: parseVlessLink(line) })
    } catch (error) {
      if (!(error instanceof VlessParseError)) throw error
      result.errors.push({ line, message: error.message })
    }
  }
  return result
}

export function decodeSubscriptionBody(body: string): string[] {
  const trimmed = body.trim()
  const text = !trimmed.includes('://') && /^[A-Za-z0-9+/=_\-\s]+$/.test(trimmed)
    ? decodeBase64(trimmed)
    : trimmed
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function decodeBase64(value: string): string {
  const normalized = value.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4)
  let binary: string
  try {
    binary = atob(padded)
  } catch {
    throw new Error('Подписка не похожа ни на base64, ни на список ссылок')
  }
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)))
}

/** Заголовок `subscription-userinfo`: upload=…; download=…; total=…; expire=… */
export interface SubscriptionUserInfo {
  upload: number
  download: number
  /** 0 — без лимита. */
  total: number
  /** Unix-время в секундах; null — бессрочно. */
  expire: number | null
}

export function parseUserInfo(header: string | null): SubscriptionUserInfo | null {
  if (!header) return null
  const values = new Map<string, number>()
  for (const part of header.split(';')) {
    const [key, raw] = part.split('=').map((s) => s.trim())
    const value = Number(raw)
    if (key && raw && Number.isFinite(value)) values.set(key.toLowerCase(), value)
  }
  if (!values.size) return null
  const expire = values.get('expire')
  return {
    upload: values.get('upload') ?? 0,
    download: values.get('download') ?? 0,
    total: values.get('total') ?? 0,
    expire: expire ? expire : null,
  }
}

/** Заголовок `profile-title`: обычный текст или `base64:…`. */
export function decodeProfileTitle(header: string | null): string | null {
  if (!header) return null
  const value = header.trim()
  if (!value) return null
  if (value.toLowerCase().startsWith('base64:')) {
    try {
      return decodeBase64(value.slice('base64:'.length)).trim() || null
    } catch {
      return null
    }
  }
  return value
}
