import { describe, expect, it } from 'vitest'
import {
  compileDomainRules,
  isBrowserRule,
  matchDomainRules,
  normalizeCidr,
  normalizeDomain,
  normalizeRuleMatch,
  RuleValidationError,
  type Rule,
} from './rules'

describe('normalizeDomain', () => {
  it.each([
    ['YouTube.com', 'youtube.com'],
    ['  *.twitch.tv ', 'twitch.tv'],
    ['.example.com.', 'example.com'],
    ['пример.рф', 'xn--e1afmkfd.xn--p1ai'],
  ])('%s → %s', (input, expected) => expect(normalizeDomain(input)).toBe(expected))

  it.each(['', 'https://youtube.com', 'a b.com', 'host:80', 'a/b'])('отклоняет «%s»', (input) => {
    expect(() => normalizeDomain(input)).toThrow(RuleValidationError)
  })
})

describe('normalizeCidr', () => {
  it.each([
    ['1.2.3.4', '1.2.3.4/32'],
    ['10.0.0.0/8', '10.0.0.0/8'],
    ['2001:DB8::/32', '2001:db8::/32'],
    ['::1', '::1/128'],
  ])('%s → %s', (input, expected) => expect(normalizeCidr(input)).toBe(expected))

  it.each(['256.1.1.1', '1.2.3.4/33', '1.2.3', 'example.com', '1.2.3.4/8/1', 'gggg::1'])(
    'отклоняет %s',
    (input) => expect(() => normalizeCidr(input)).toThrow(RuleValidationError),
  )
})

describe('normalizeRuleMatch', () => {
  it('определяет формат rule-set по расширению', () => {
    expect(normalizeRuleMatch({ type: 'ruleSet', url: 'https://x.org/geosite-ru.srs' })).toEqual({
      type: 'ruleSet',
      url: 'https://x.org/geosite-ru.srs',
      format: 'binary',
      updateIntervalHours: 24,
    })
    expect(normalizeRuleMatch({ type: 'ruleSet', url: 'https://x.org/list.json', updateIntervalHours: 6 }))
      .toMatchObject({ format: 'source', updateIntervalHours: 6 })
  })

  it('требует формат, если расширение непонятное', () => {
    expect(() => normalizeRuleMatch({ type: 'ruleSet', url: 'https://x.org/list' })).toThrow(RuleValidationError)
    expect(normalizeRuleMatch({ type: 'ruleSet', url: 'https://x.org/list', format: 'source' })).toMatchObject({
      format: 'source',
    })
  })

  it('отклоняет кириллическое ключевое слово', () => {
    expect(() => normalizeRuleMatch({ type: 'keyword', value: 'яндекс' })).toThrow(RuleValidationError)
  })
})

const rule = (id: string, match: Rule['match'], action: Rule['action']): Rule => ({ id, match, action })

describe('доменные правила браузера', () => {
  const rules: Rule[] = [
    rule('1', { type: 'suffix', value: 'youtube.com' }, 'proxy'),
    rule('2', { type: 'exact', value: 'music.youtube.com' }, 'direct'),
    rule('3', { type: 'suffix', value: 'googlevideo.com' }, 'proxy'),
    rule('4', { type: 'keyword', value: 'twitch' }, 'proxy'),
    rule('5', { type: 'suffix', value: 'ads.example.com' }, 'direct'),
    rule('6', { type: 'suffix', value: 'example.com' }, 'proxy'),
    rule('7', { type: 'suffix', value: 'blocked.com' }, 'block'),
    rule('8', { type: 'ip', value: '1.1.1.1/32' }, 'proxy'),
  ]
  const table = compileDomainRules(rules)

  it('в браузер попадают только доменные proxy/direct', () => {
    expect(rules.filter(isBrowserRule).map((r) => r.id)).toEqual(['1', '2', '3', '4', '5', '6'])
  })

  it.each([
    ['youtube.com', 'proxy'],
    ['www.youtube.com', 'proxy'],
    ['music.youtube.com', 'direct'],
    ['rr1.sn-abc.googlevideo.com', 'proxy'],
    ['static-cdn.twitch-cdn.net', 'proxy'],
    ['a.ads.example.com', 'direct'],
    ['www.example.com', 'proxy'],
    ['notyoutube.com', null],
    ['blocked.com', null],
    ['YOUTUBE.COM.', 'proxy'],
  ])('%s → %s', (host, expected) => expect(matchDomainRules(host, table)).toBe(expected))

  it('первое правило с тем же условием побеждает', () => {
    const duplicated = compileDomainRules([
      rule('a', { type: 'suffix', value: 'x.com' }, 'direct'),
      rule('b', { type: 'suffix', value: 'x.com' }, 'proxy'),
    ])
    expect(matchDomainRules('x.com', duplicated)).toBe('direct')
  })
})
