import { ref } from 'vue'

const storageKey = 'blog.accessToken'
export const accessToken = ref(sessionStorage.getItem(storageKey) || '')

export function setAccessToken(value: string) {
  accessToken.value = value
  if (value) sessionStorage.setItem(storageKey, value)
  else sessionStorage.removeItem(storageKey)
}
