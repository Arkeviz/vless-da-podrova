import { matchDomainRules, type DomainRuleTable } from './rules'

/**
 * Решение «мимо прокси» для localhost и локальной сети.
 * Функция самодостаточна (без внешних ссылок): её исходник встраивается в PAC-скрипт.
 */
export function isBypassedHost(rawHost: string): boolean {
  var host = rawHost.toLowerCase().replace(/^\[(.*)\]$/, '$1')
  if (host.indexOf('.') === -1 && host.indexOf(':') === -1) return true
  if (host === 'localhost' || /\.localhost$/.test(host)) return true

  var v4 = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host)
  if (v4) {
    var a = Number(v4[1])
    var b = Number(v4[2])
    return (
      a === 127 ||
      a === 10 ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 169 && b === 254)
    )
  }

  if (host.indexOf(':') !== -1) {
    return host === '::1' || /^f[cd][0-9a-f]{2}:/.test(host) || /^fe[89ab][0-9a-f]:/.test(host)
  }

  return false
}

export type BrowserRoute = 'direct' | 'proxy' | 'auto'

/** Куда браузер отправляет запрос: мимо ядра, во вход `proxy` или во вход `auto`. */
export function resolveBrowserRoute(host: string, table: DomainRuleTable): BrowserRoute {
  if (isBypassedHost(host)) return 'direct'
  return matchDomainRules(host, table) ?? 'auto'
}

export interface PacInput {
  /** Порт входа `auto` ядра: трафик идёт через правила ядра. */
  autoPort: number
  /** Порт входа `proxy` ядра: всегда VLESS. */
  proxyPort: number
  domainRules: DomainRuleTable
}

export function buildPacScript({ autoPort, proxyPort, domainRules }: PacInput): string {
  // SOCKS5 в Chrome передаёт прокси имя хоста — DNS резолвится на стороне ядра.
  return [
    `var isBypassedHost = ${isBypassedHost.toString()};`,
    `var matchDomainRules = ${matchDomainRules.toString()};`,
    `var RULES = ${JSON.stringify(domainRules)};`,
    'function FindProxyForURL(url, host) {',
    "  if (isBypassedHost(host)) return 'DIRECT';",
    '  var action = matchDomainRules(host, RULES);',
    "  if (action === 'direct') return 'DIRECT';",
    `  if (action === 'proxy') return 'SOCKS5 127.0.0.1:${proxyPort}';`,
    `  return 'SOCKS5 127.0.0.1:${autoPort}';`,
    '}',
  ].join('\n')
}
