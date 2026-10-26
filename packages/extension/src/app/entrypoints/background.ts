import { defineBackground } from 'wxt/utils/define-background'
import { startConnectionService } from '@/modules/connection'
import { startIndicator } from '@/modules/indicator'
import { startSubscriptionUpdater } from '@/modules/servers'
import { startTabDomains } from '@/modules/tab-domains'
import { startTabMode } from '@/modules/tab-mode'

export default defineBackground(() => {
  startConnectionService()
  startSubscriptionUpdater()
  startIndicator()
  startTabMode()
  startTabDomains()
})
