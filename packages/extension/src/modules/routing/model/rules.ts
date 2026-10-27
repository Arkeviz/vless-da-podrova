import {
  isBrowserRule,
  normalizeRuleMatch,
  ruleMatchKey,
  type BrowserAction,
  type BrowserRule,
  type DefaultAction,
  type DomainMatchType,
  type Rule,
  type RuleAction,
  type RuleMatchInput,
} from '@vdp/shared'
import { browserRulesItem, coreRulesItem, defaultActionItem } from './storage'

export interface RoutingSnapshot {
  browserRules: BrowserRule[]
  coreRules: Rule[]
  defaultAction: DefaultAction
}

export async function getRoutingSnapshot(): Promise<RoutingSnapshot> {
  const [browserRules, coreRules, defaultAction] = await Promise.all([
    browserRulesItem.getValue(),
    coreRulesItem.getValue(),
    defaultActionItem.getValue(),
  ])
  return { browserRules, coreRules, defaultAction }
}

export function watchRouting(callback: () => void): () => void {
  const unwatchers = [browserRulesItem, coreRulesItem, defaultActionItem].map((item) =>
    item.watch(callback),
  )
  return () => unwatchers.forEach((unwatch) => unwatch())
}

/**
 * Добавляет правило в нужный список: доменные proxy/direct - в браузер, остальное - в ядро.
 * Правило с тем же условием заменяется. Бросает RuleValidationError на некорректный ввод.
 */
export async function addRule(input: RuleMatchInput, action: RuleAction): Promise<void> {
  const rule: Rule = { id: crypto.randomUUID(), match: normalizeRuleMatch(input), action }
  if (isBrowserRule(rule)) {
    await browserRulesItem.setValue(upsert(await browserRulesItem.getValue(), rule))
  } else {
    await coreRulesItem.setValue(upsert(await coreRulesItem.getValue(), rule))
  }
}

function upsert<T extends Rule>(rules: T[], rule: T): T[] {
  const key = ruleMatchKey(rule.match)
  const index = rules.findIndex((r) => ruleMatchKey(r.match) === key)
  if (index === -1) return [...rules, rule]
  return rules.map((r, i) => (i === index ? { ...rule, id: r.id } : r))
}

export async function removeRule(id: string): Promise<void> {
  await browserRulesItem.setValue((await browserRulesItem.getValue()).filter((r) => r.id !== id))
  await coreRulesItem.setValue((await coreRulesItem.getValue()).filter((r) => r.id !== id))
}

export async function moveCoreRule(id: string, toIndex: number): Promise<void> {
  const rules = [...(await coreRulesItem.getValue())]
  const from = rules.findIndex((r) => r.id === id)
  if (from === -1) return
  const [rule] = rules.splice(from, 1)
  rules.splice(Math.max(0, Math.min(toIndex, rules.length)), 0, rule!)
  await coreRulesItem.setValue(rules)
}

export function setDefaultAction(action: DefaultAction): Promise<void> {
  return defaultActionItem.setValue(action)
}

export type SiteMatch = { type: Extract<DomainMatchType, 'exact' | 'suffix'>; value: string }

/** Правило кнопки «этот сайт»: action = null снимает правило («по правилам»). */
export function setSiteRule(match: SiteMatch, action: BrowserAction | null): Promise<void> {
  return setSiteRules([match], action)
}

/**
 * То же для нескольких доменов сразу (например, всех доменов вкладки) - одной записью,
 * чтобы прокси браузера переприменился один раз, а не на каждый домен.
 */
export async function setSiteRules(matches: readonly SiteMatch[], action: BrowserAction | null): Promise<void> {
  const keys = new Set(matches.map(ruleMatchKey))
  const rest = (await browserRulesItem.getValue()).filter((r) => !keys.has(ruleMatchKey(r.match)))
  const added = action ? matches.map((match) => ({ id: crypto.randomUUID(), match, action })) : []
  await browserRulesItem.setValue([...rest, ...added])
}
