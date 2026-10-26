/**
 * Правила маршрутизации. Доменные правила `proxy`/`direct` исполняет браузер (мгновенно),
 * остальные — ядро по порядку списка. Доменные правила браузера всегда приоритетнее правил ядра.
 */

export type DomainMatchType = 'exact' | 'suffix' | 'keyword'
export type RuleAction = 'proxy' | 'direct' | 'block'
export type BrowserAction = Exclude<RuleAction, 'block'>
export type DefaultAction = BrowserAction
export type RuleSetFormat = 'binary' | 'source'

export type RuleMatch =
  | { type: DomainMatchType; value: string }
  | { type: 'ip'; value: string }
  | { type: 'ruleSet'; url: string; format: RuleSetFormat; updateIntervalHours: number }

export type RuleMatchType = RuleMatch['type']

export interface Rule {
  id: string
  match: RuleMatch
  action: RuleAction
}

export interface BrowserRule extends Rule {
  match: { type: DomainMatchType; value: string }
  action: BrowserAction
}

export function isBrowserRule(rule: Rule): rule is BrowserRule {
  return rule.action !== 'block' && isDomainMatch(rule.match)
}

export function isDomainMatch(match: RuleMatch): match is { type: DomainMatchType; value: string } {
  return match.type === 'exact' || match.type === 'suffix' || match.type === 'keyword'
}

export class RuleValidationError extends Error {
  override name = 'RuleValidationError'
}

export const DEFAULT_RULE_SET_UPDATE_HOURS = 24

export type RuleMatchInput =
  | { type: DomainMatchType | 'ip'; value: string }
  | { type: 'ruleSet'; url: string; format?: RuleSetFormat; updateIntervalHours?: number }

/** Проверяет и нормализует пользовательский ввод. */
export function normalizeRuleMatch(input: RuleMatchInput): RuleMatch {
  switch (input.type) {
    case 'exact':
    case 'suffix':
      return { type: input.type, value: normalizeDomain(input.value) }
    case 'keyword': {
      const value = input.value.trim().toLowerCase()
      if (!value) throw new RuleValidationError('Укажите ключевое слово')
      // Браузер передаёт хосты в punycode — кириллическое слово никогда не совпадёт.
      if (!/^[a-z0-9.-]+$/.test(value)) {
        throw new RuleValidationError('Ключевое слово может содержать только латиницу, цифры, точку и дефис')
      }
      return { type: 'keyword', value }
    }
    case 'ip':
      return { type: 'ip', value: normalizeCidr(input.value) }
    case 'ruleSet':
      return normalizeRuleSet(input)
  }
}

export function normalizeDomain(raw: string): string {
  const value = raw
    .trim()
    .toLowerCase()
    .replace(/^\*?\./, '')
    .replace(/\.$/, '')
  if (!value) throw new RuleValidationError('Укажите домен')
  if (/[\s/:?#@]/.test(value)) throw new RuleValidationError(`Некорректный домен: ${raw}`)

  let hostname: string
  try {
    // Заодно переводит IDN (пример.рф) в punycode — так хосты видит браузер.
    hostname = new URL(`http://${value}/`).hostname
  } catch {
    throw new RuleValidationError(`Некорректный домен: ${raw}`)
  }
  return hostname
}

export function normalizeCidr(raw: string): string {
  const value = raw.trim().toLowerCase()
  const [address = '', prefix, ...rest] = value.split('/')
  if (rest.length) throw new RuleValidationError(`Некорректный IP/CIDR: ${raw}`)

  const isV4 = /^\d{1,3}(\.\d{1,3}){3}$/.test(address) && address.split('.').every((o) => Number(o) <= 255)
  const isV6 = !isV4 && /^[0-9a-f:]+$/.test(address) && address.includes(':') && isValidIpv6(address)
  if (!isV4 && !isV6) throw new RuleValidationError(`Некорректный IP/CIDR: ${raw}`)

  const maxPrefix = isV4 ? 32 : 128
  if (prefix === undefined) return `${address}/${maxPrefix}`
  if (!/^\d{1,3}$/.test(prefix) || Number(prefix) > maxPrefix) {
    throw new RuleValidationError(`Некорректная длина префикса: ${raw}`)
  }
  return `${address}/${Number(prefix)}`
}

function isValidIpv6(address: string): boolean {
  try {
    new URL(`http://[${address}]/`)
    return true
  } catch {
    return false
  }
}

function normalizeRuleSet(input: Extract<RuleMatchInput, { type: 'ruleSet' }>): RuleMatch {
  let url: URL
  try {
    url = new URL(input.url.trim())
  } catch {
    throw new RuleValidationError('Некорректный URL rule-set')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new RuleValidationError('URL rule-set должен начинаться с http:// или https://')
  }

  const format = input.format ?? guessRuleSetFormat(url.pathname)
  if (!format) {
    throw new RuleValidationError('Не удалось определить формат rule-set по URL — выберите его вручную')
  }

  const hours = input.updateIntervalHours ?? DEFAULT_RULE_SET_UPDATE_HOURS
  if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 30) {
    throw new RuleValidationError('Интервал обновления — от 1 до 720 часов')
  }
  return { type: 'ruleSet', url: url.toString(), format, updateIntervalHours: hours }
}

export function guessRuleSetFormat(pathname: string): RuleSetFormat | null {
  if (/\.srs$/i.test(pathname)) return 'binary'
  if (/\.json$/i.test(pathname)) return 'source'
  return null
}

/** Два правила с одинаковым условием считаются одним и тем же правилом. */
export function ruleMatchKey(match: RuleMatch): string {
  return match.type === 'ruleSet' ? `ruleSet:${match.url}` : `${match.type}:${match.value}`
}

/** Компактная таблица доменных правил браузера — встраивается в PAC как JSON. */
export interface DomainRuleTable {
  exact: Record<string, BrowserAction>
  suffix: Record<string, BrowserAction>
  keyword: [string, BrowserAction][]
}

export function compileDomainRules(rules: readonly Rule[]): DomainRuleTable {
  const table: DomainRuleTable = { exact: {}, suffix: {}, keyword: [] }
  for (const rule of rules) {
    if (!isBrowserRule(rule)) continue
    const { type, value } = rule.match
    if (type === 'keyword') {
      if (!table.keyword.some(([keyword]) => keyword === value)) table.keyword.push([value, rule.action])
    } else if (!(value in table[type])) {
      table[type][value] = rule.action
    }
  }
  return table
}

/**
 * Решение доменных правил браузера: точный хост → самый длинный суффикс → ключевое слово.
 * Функция самодостаточна: её исходник встраивается в PAC-скрипт.
 */
export function matchDomainRules(rawHost: string, table: DomainRuleTable): BrowserAction | null {
  var host = rawHost.toLowerCase().replace(/\.$/, '')
  if (Object.prototype.hasOwnProperty.call(table.exact, host)) return table.exact[host]!

  var candidate = host
  while (true) {
    if (Object.prototype.hasOwnProperty.call(table.suffix, candidate)) return table.suffix[candidate]!
    var dot = candidate.indexOf('.')
    if (dot === -1) break
    candidate = candidate.slice(dot + 1)
  }

  for (var i = 0; i < table.keyword.length; i++) {
    var entry = table.keyword[i]!
    if (host.indexOf(entry[0]) !== -1) return entry[1]
  }
  return null
}
