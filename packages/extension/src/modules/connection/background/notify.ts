import { browser } from 'wxt/browser'
import { ru } from '@/common/i18n/ru'

const NOTIFICATION_ID = 'connection-failure'

export async function notifyFailure(message: string, blocked: boolean): Promise<void> {
  await browser.notifications.create(NOTIFICATION_ID, {
    type: 'basic',
    iconUrl: browser.runtime.getURL('/icon/128.png'),
    title: ru.notifications.failureTitle,
    message: `${message}\n${blocked ? ru.notifications.failureBlocked : ru.notifications.failureOpen}`,
  })
}
