import { browser } from 'wxt/browser'
import { updateDueSubscriptions } from './subscriptions'

const ALARM = 'subscriptions-update'
const CHECK_PERIOD_MINUTES = 30

/** Фон: раз в полчаса обновляет подписки, у которых истёк интервал, и сразу при старте. */
export function startSubscriptionUpdater(): void {
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === ALARM) void updateDueSubscriptions()
  })
  void browser.alarms.get(ALARM).then((existing) => {
    if (!existing) browser.alarms.create(ALARM, { periodInMinutes: CHECK_PERIOD_MINUTES })
  })
  void updateDueSubscriptions()
}
