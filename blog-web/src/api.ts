import { accessToken, setAccessToken } from './session'

export interface ArticleInput {
  title: string
  desc: string
  content: string
  cover_image_url: string
}

export interface Article extends ArticleInput {
  id: number
  state: 0 | 1
  created_by: string
  created_on: number
  modified_on: number
}

export interface Tag {
  id: number
  name: string
  state: 0 | 1
}

export interface Page<T> {
  list: T[]
  pager: { page: number; page_size: number; total_rows: number }
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message)
  }
}

export async function request<T>(
  path: string,
  options: { method?: string; body?: object; signal?: AbortSignal } = {},
): Promise<T> {
  const protectedRequest = path.startsWith('/admin/') || path === '/auth/me' ||
    path === '/auth/logout' || Boolean(options.method && options.method !== 'GET' && path !== '/auth/login')
  const token = protectedRequest ? accessToken.value : ''
  const headers = new Headers()
  if (options.body) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', 'Bearer ' + token)
  const response = await fetch('/api/v1' + path, {
    method: options.method,
    signal: options.signal,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!response.ok) {
    if (response.status === 401 && token && token === accessToken.value) setAccessToken('')
    const error = await response.json().catch(() => null)
    const detail = error?.details?.join('，')
    throw new ApiError(response.status, detail || error?.msg || `请求失败（${response.status}）`)
  }
  return response.json()
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError ? error.message : '无法连接博客服务，请稍后重试。'
}

export function coverUrl(value: string) {
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : ''
  } catch {
    return ''
  }
}

export function formatDate(seconds: number) {
  return seconds ? new Intl.DateTimeFormat('zh-CN', { dateStyle: 'medium' }).format(seconds * 1000) : ''
}
