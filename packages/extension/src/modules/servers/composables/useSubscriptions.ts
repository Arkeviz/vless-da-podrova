import { useStorageItem } from '@/common/storage/useStorageItem'
import { subscriptionsItem } from '../model/storage'

export function useSubscriptions() {
  const { value: subscriptions } = useStorageItem(subscriptionsItem)
  return { subscriptions }
}
