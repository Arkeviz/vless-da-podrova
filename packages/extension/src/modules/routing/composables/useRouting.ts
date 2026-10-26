import { useStorageItem } from '@/common/storage/useStorageItem'
import { browserRulesItem, coreRulesItem, defaultActionItem } from '../model/storage'

export function useRouting() {
  const { value: browserRules } = useStorageItem(browserRulesItem)
  const { value: coreRules } = useStorageItem(coreRulesItem)
  const { value: defaultAction } = useStorageItem(defaultActionItem)
  return { browserRules, coreRules, defaultAction }
}
