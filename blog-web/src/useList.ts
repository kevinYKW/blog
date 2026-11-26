import { computed, ref, shallowRef, watch, type WatchSource } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage, request, type Page } from './api'

export function useList<T>(resource: string, filters: WatchSource<Record<string, string>>) {
  const route = useRoute()
  const router = useRouter()
  const page = computed(() => {
    const number = Number(route.query.page)
    return Number.isSafeInteger(number) && number > 0 ? number : 1
  })
  const data = shallowRef<Page<T>>()
  const pending = ref(true)
  const error = ref('')
  const revision = ref(0)
  const pages = computed(() => {
    const pager = data.value?.pager
    return pager ? Math.max(1, Math.ceil(pager.total_rows / pager.page_size)) : 1
  })
  function changePage(value: number) {
    return router.push({ query: { ...route.query, page: value > 1 ? String(value) : undefined } })
  }
  watch([page, filters, revision], async ([currentPage, currentFilters], _, onCleanup) => {
    const controller = new AbortController()
    onCleanup(() => controller.abort())
    pending.value = true
    error.value = ''
    const query = new URLSearchParams({ ...currentFilters, page: String(currentPage), page_size: '10' })
    try {
      const result = await request<Page<T>>(`/${resource}?${query}`, { signal: controller.signal })
      if (controller.signal.aborted) return
      data.value = result
      if (currentPage > pages.value) {
        await router.replace({ query: { ...route.query, page: pages.value > 1 ? String(pages.value) : undefined } })
      }
    } catch (failure) {
      if (!controller.signal.aborted) error.value = errorMessage(failure)
    } finally {
      if (!controller.signal.aborted) pending.value = false
    }
  }, { immediate: true })
  return { page, pages, data, pending, error, changePage, reload: () => revision.value++ }
}
