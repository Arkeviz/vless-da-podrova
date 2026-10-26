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

/** Набор доменов, совпадающих вместе с поддоменами. Ключи — домены, значения — true (для PAC). */
export type DomainSet = Record<string, true>

export function toDomainSet(domains: Iterable<string>): DomainSet {
  const set: DomainSet = {}
  for (const domain of domains) set[domain] = true
  return set
}

/** Совпадает ли хост или один из его родительских доменов с набором. Самодостаточна — для PAC. */
export function matchDomainSet(rawHost: string, set: DomainSet): boolean {
  var candidate = rawHost.toLowerCase().replace(/\.$/, '')
  while (true) {
    if (Object.prototype.hasOwnProperty.call(set, candidate)) return true
    var dot = candidate.indexOf('.')
    if (dot === -1) return false
    candidate = candidate.slice(dot + 1)
  }
}

/**
 * Куда браузер отправляет запрос: мимо ядра, во вход `proxy` или во вход `auto`.
 * `forcedProxy` — домены режима «вкладка через прокси» (Chromium): важнее любых правил.
 */
export function resolveBrowserRoute(host: string, table: DomainRuleTable, forcedProxy: DomainSet = {}): BrowserRoute {
  if (isBypassedHost(host)) return 'direct'
  if (matchDomainSet(host, forcedProxy)) return 'proxy'
  return matchDomainRules(host, table) ?? 'auto'
}

export interface PacInput {
  /** Порт входа `auto` ядра: трафик идёт через правила ядра. */
  autoPort: number
  /** Порт входа `proxy` ядра: всегда VLESS. */
  proxyPort: number
  domainRules: DomainRuleTable
  forcedProxy?: DomainSet
  /**
   * true (по умолчанию) — SOCKS5: Chrome передаёт ядру имя хоста, DNS резолвит ядро.
   * false — SOCKS4: имя резолвит браузер системным DNS.
   */
  remoteDns?: boolean
}

export function buildPacScript({
  autoPort,
  proxyPort,
  domainRules,
  forcedProxy = {},
  remoteDns = true,
}: PacInput): string {
  const scheme = remoteDns ? 'SOCKS5' : 'SOCKS'
  const proxy = `'${scheme} 127.0.0.1:${proxyPort}'`
  return [
    `var isBypassedHost = ${isBypassedHost.toString()};`,
    `var matchDomainSet = ${matchDomainSet.toString()};`,
    `var matchDomainRules = ${matchDomainRules.toString()};`,
    `var FORCED = ${JSON.stringify(forcedProxy)};`,
    `var RULES = ${JSON.stringify(domainRules)};`,
    'function FindProxyForURL(url, host) {',
    "  if (isBypassedHost(host)) return 'DIRECT';",
    `  if (matchDomainSet(host, FORCED)) return ${proxy};`,
    '  var action = matchDomainRules(host, RULES);',
    "  if (action === 'direct') return 'DIRECT';",
    `  if (action === 'proxy') return ${proxy};`,
    `  return '${scheme} 127.0.0.1:${autoPort}';`,
    '}',
  ].join('\n')
}

/** Порт, на котором заведомо никто не слушает: соединение через него сразу отклоняется. */
export const KILL_SWITCH_PORT = 1

/**
 * Kill-switch: всё, кроме localhost и локальной сети, отправляется в несуществующий прокси.
 * Без DIRECT в списке Chrome не откатывается на прямое соединение — сайты не открываются.
 */
export function buildKillSwitchPacScript(): string {
  return [
    `var isBypassedHost = ${isBypassedHost.toString()};`,
    'function FindProxyForURL(url, host) {',
    "  if (isBypassedHost(host)) return 'DIRECT';",
    `  return 'SOCKS5 127.0.0.1:${KILL_SWITCH_PORT}';`,
    '}',
  ].join('\n')
}

/** Как пойдёт запрос к хосту: «core» — решают правила ядра, браузер заранее не знает. */
export type BrowserVerdict = 'proxy' | 'direct' | 'core'

export interface VerdictContext {
  domainRules: DomainRuleTable
  forcedProxy?: DomainSet
  /** Есть ли правила ядра: без них всё, что не решил браузер, идёт по действию по умолчанию. */
  hasCoreRules: boolean
  defaultAction: 'proxy' | 'direct'
}

export function browserVerdict(host: string, context: VerdictContext): BrowserVerdict {
  const route = resolveBrowserRoute(host, context.domainRules, context.forcedProxy)
  if (route !== 'auto') return route
  return context.hasCoreRules ? 'core' : context.defaultAction
}
