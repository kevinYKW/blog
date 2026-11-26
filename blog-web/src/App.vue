<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage, request } from './api'
import { accessToken, setAccessToken } from './session'
const route = useRoute()
const router = useRouter()
const logoutError = ref('')
const loggingOut = ref(false)

watch(accessToken, token => {
  if (!token && route.meta.admin && !loggingOut.value) {
    void router.replace({ path: '/login', query: { next: route.fullPath } })
  }
})

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  logoutError.value = ''
  try {
    const left = await router.push('/login')
    if (left) return
    await request('/auth/logout', { method: 'POST' })
    setAccessToken('')
  } catch (failure) {
    logoutError.value = errorMessage(failure)
    await router.replace('/admin/articles')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <header class="site-header">
    <div class="bar">
      <RouterLink to="/" class="brand"><svg viewBox="0 0 28 28" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.3">
        <circle cx="14" cy="14" r="11"/><path d="m18.8 9.2-2.4 7.2-7.2 2.4 2.4-7.2 7.2-2.4Z"/><path d="M14 1v4m0 18v4M1 14h4m18 0h4"/>
      </svg> 开发笔记</RouterLink>
      <nav aria-label="主导航">
        <RouterLink to="/">文章</RouterLink>
        <RouterLink to="/admin/articles">管理</RouterLink>
      </nav>
    </div>
  </header>
  <main v-if="route.meta.admin" class="admin-shell">
    <nav class="admin-nav" aria-label="后台导航">
      <RouterLink to="/admin/articles" :class="{ active: route.path.startsWith('/admin/articles') }">文章管理</RouterLink>
      <RouterLink to="/admin/tags">标签管理</RouterLink>
      <button :disabled="loggingOut" @click="logout">退出登录</button>
    </nav>
    <div class="admin-main">
      <p v-if="logoutError" class="notice error" role="alert">{{ logoutError }}</p>
      <RouterView />
    </div>
  </main>
  <main v-else><RouterView /></main>
  <footer class="site-footer">开发笔记</footer>
</template>
