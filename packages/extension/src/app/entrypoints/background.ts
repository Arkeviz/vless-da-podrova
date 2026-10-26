import { defineBackground } from 'wxt/utils/define-background'
import { startConnectionService } from '@/modules/connection'

export default defineBackground(() => {
  startConnectionService()
})
