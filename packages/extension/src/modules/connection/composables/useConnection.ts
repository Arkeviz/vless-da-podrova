import { browser } from 'wxt/browser'
import { useStorageItem } from '@/common/storage/useStorageItem'
import { connectionStatusItem, proxyEnabledItem, RECONNECT_MESSAGE } from '../model/storage'

export function useConnection() {
  const { value: enabled } = useStorageItem(proxyEnabledItem)
  const { value: status } = useStorageItem(connectionStatusItem)

  function setEnabled(value: boolean) {
    return proxyEnabledItem.setValue(value)
  }

  function reconnect() {
    return browser.runtime.sendMessage({ type: RECONNECT_MESSAGE })
  }

  return { enabled, status, setEnabled, reconnect }
}
