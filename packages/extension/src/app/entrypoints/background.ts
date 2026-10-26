import { defineBackground } from 'wxt/utils/define-background'
import { startConnectionService } from '@/modules/connection'
import { startIndicator } from '@/modules/indicator'
import { startSubscriptionUpdater } from '@/modules/servers'

export default defineBackground(() => {
  startConnectionService()
  startSubscriptionUpdater()
  startIndicator()
})
