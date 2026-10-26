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

export interface PacInput {
  /** Порт входа `auto` ядра. */
  autoPort: number
}

export function buildPacScript({ autoPort }: PacInput): string {
  // SOCKS5 в Chrome передаёт прокси имя хоста — DNS резолвится на стороне ядра.
  return [
    `var isBypassedHost = ${isBypassedHost.toString()};`,
    'function FindProxyForURL(url, host) {',
    "  if (isBypassedHost(host)) return 'DIRECT';",
    `  return 'SOCKS5 127.0.0.1:${autoPort}';`,
    '}',
  ].join('\n')
}
