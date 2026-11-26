<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { coverUrl, errorMessage, formatDate, request, type Article } from './api'
import { useList } from './useList'
import Pagination from './Pagination.vue'

const props = defineProps<{ admin: boolean }>()
const route = useRoute()
const router = useRouter()
const title = computed(() => typeof route.query.title === 'string' ? route.query.title : '')
const state = computed(() => props.admin && ['0', '1'].includes(String(route.query.state)) ? String(route.query.state) : '')
const search = ref('')
watch(title, value => search.value = value, { immediate: true })

const filters = computed(() => {
  const values: Record<string, string> = { title: title.value }
  if (!props.admin) values.state = '1'
  else if (state.value) values.state = state.value
  return values
})
const { page, pages, data, pending, error, changePage, reload } = useList<Omit<Article, 'content'>>(props.admin ? 'admin/articles' : 'articles', filters)
const busy = ref(false)
const actionError = ref('')

function applyFilters(nextState = state.value) {
  return router.push({ query: { title: search.value.trim() || undefined, state: nextState || undefined } })
}

async function mutate(article: Omit<Article, 'content'>, remove = false) {
  if (busy.value || (remove && !window.confirm(`删除「${article.title}」？`))) return
  busy.value = true
  actionError.value = ''
  try {
    const path = `/articles/${article.id}`
    if (remove) await request(path, { method: 'DELETE' })
    else await request(path + '/state', { method: 'PATCH', body: { state: article.state ? 0 : 1 } })
    reload()
  } catch (failure) {
    actionError.value = errorMessage(failure)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <section :class="admin ? 'workspace' : 'feed'">
    <template v-if="!admin">
      <div class="hero">
        <div class="hero-inner">
          <div class="hero-mark" aria-hidden="true"><span></span><i></i><span></span></div>
          <h1>开发笔记<span>。</span></h1>
          <p>记下途中学到的事。</p>
        </div>
      </div>
    </template>
    <div :class="{ 'feed-inner': !admin }">
      <div class="section-head" :class="{ 'feed-head': !admin }">
        <h1 v-if="admin">文章管理</h1>
        <h2 v-else class="journal-heading">
          <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.4">
            <path d="M12 6c-2.6-2-5.4-2.4-9-1v13c3.6-1.4 6.4-1 9 1 2.6-2 5.4-2.4 9-1V5c-3.6-1.4-6.4-1-9 1Zm0 0v13"/>
          </svg>
          文章
        </h2>
        <RouterLink v-if="admin" class="button primary" to="/admin/articles/new">新建文章</RouterLink>
        <form class="toolbar" :class="{ 'public-search': !admin }" @submit.prevent="applyFilters()">
          <input v-model="search" type="search" placeholder="搜索文章标题" aria-label="搜索文章标题" maxlength="100">
          <select v-if="admin" :value="state" aria-label="文章状态" @change="applyFilters(($event.target as HTMLSelectElement).value)">
            <option value="">全部状态</option><option value="1">已发布</option><option value="0">草稿</option>
          </select>
          <button type="submit">搜索</button>
        </form>
      </div>
      <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
      <p v-if="pending" class="notice" role="status">正在加载文章…</p>
      <div v-else-if="error" class="notice error" role="alert">{{ error }} <button @click="reload">重试</button></div>
      <p v-else-if="!data?.list.length" class="notice">{{ title ? '没有找到匹配的文章。' : '暂无文章。' }}</p>
      <div v-else-if="admin" class="table-wrap">
        <table>
          <thead><tr><th>标题</th><th>状态</th><th>最后修改</th><th>操作</th></tr></thead>
          <tbody>
            <tr v-for="article in data.list" :key="article.id">
              <td><RouterLink :to="'/admin/articles/' + article.id + '/edit'">{{ article.title }}</RouterLink></td>
              <td><span class="status" :class="{ enabled: article.state === 1 }">{{ article.state ? '已发布' : '草稿' }}</span></td>
              <td>{{ formatDate(article.modified_on) || '—' }}</td>
              <td class="table-actions">
                <RouterLink :to="'/admin/articles/' + article.id + '/edit'">编辑</RouterLink>
                <button class="text-button" :disabled="busy" @click="mutate(article)">{{ article.state ? '撤回' : '发布' }}</button>
                <button class="text-button danger" :disabled="busy" @click="mutate(article, true)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="posts">
        <article v-for="article in data.list" :key="article.id" class="post">
          <div>
            <p class="metadata">{{ [formatDate(article.created_on), article.created_by].filter(Boolean).join(' · ') }}</p>
            <h3><RouterLink :to="{ path: '/articles/' + article.id, query: { title: route.query.title, page: route.query.page } }">{{ article.title }}</RouterLink></h3>
            <p v-if="article.desc" class="summary">{{ article.desc }}</p>
          </div>
          <img v-if="coverUrl(article.cover_image_url)" :src="coverUrl(article.cover_image_url)" alt="" loading="lazy">
        </article>
      </div>
      <Pagination v-if="!pending && !error" :page="page" :pages="pages" @change="changePage" />
    </div>
  </section>
</template>
