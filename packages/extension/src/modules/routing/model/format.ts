import type { RuleMatch } from '@vdp/shared'
import { ru } from '@/common/i18n/ru'

export function describeMatch(match: RuleMatch): { kind: string; value: string; extra?: string } {
  const kind = ru.routing.matchType[match.type]
  if (match.type === 'ruleSet') {
    return { kind, value: match.url, extra: ru.routing.updateEvery(match.updateIntervalHours) }
  }
  return { kind, value: match.value }
}
