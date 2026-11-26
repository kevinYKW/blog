<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ApiError, errorMessage, request } from './api'
import { setAccessToken } from './session'

const route = useRoute()
const router = useRouter()
const username = ref('')
const password = ref('')
const error = ref(typeof route.query.error === 'string' ? route.query.error : '')
const busy = ref(false)

async function login() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    const session = await request<{ access_token: string; user: { role: string } }>('/auth/login', {
      method: 'POST', body: { username: username.value, password: password.value },
    })
    setAccessToken(session.access_token)
    if (session.user.role !== 'admin') {
      try {
        await request('/auth/logout', { method: 'POST' })
      } finally {
        setAccessToken('')
      }
      error.value = '当前账号没有管理权限。'
      return
    }
    const next = typeof route.query.next === 'string' ? route.query.next : ''
    const allowed = next.startsWith('/admin/') && router.resolve(next).meta.admin
    await router.replace(allowed ? next : '/admin/articles')
  } catch (failure) {
    error.value = failure instanceof ApiError && failure.status === 401 ? '用户名或密码错误。' : errorMessage(failure)
  } finally {
    password.value = ''
    busy.value = false
  }
}
</script>

<template>
  <section class="reading">
    <form class="login-form" @submit.prevent="login">
      <h1>管理登录</h1>
      <label>用户名 <input v-model.trim="username" autocomplete="username" required maxlength="64" :disabled="busy"></label>
      <label>密码 <input v-model="password" type="password" autocomplete="current-password" required :disabled="busy"></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button class="primary" :disabled="busy">{{ busy ? '正在登录…' : '登录' }}</button>
    </form>
  </section>
</template>
