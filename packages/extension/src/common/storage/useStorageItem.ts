import { onScopeDispose, readonly, shallowRef, type DeepReadonly, type Ref } from 'vue'
import type { WxtStorageItem } from 'wxt/utils/storage'

/** Реактивное отражение элемента WXT storage: начальное чтение + подписка на изменения. */
export function useStorageItem<T>(item: WxtStorageItem<T, Record<string, unknown>>): {
  value: Readonly<Ref<DeepReadonly<T>>>
  loaded: Readonly<Ref<boolean>>
} {
  const value = shallowRef(item.fallback)
  const loaded = shallowRef(false)

  void item.getValue().then((stored) => {
    value.value = stored
    loaded.value = true
  })
  const unwatch = item.watch((next) => {
    value.value = next
  })
  onScopeDispose(unwatch)

  return { value: readonly(value) as Readonly<Ref<DeepReadonly<T>>>, loaded: readonly(loaded) }
}
