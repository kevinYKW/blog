<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { ApiError, coverUrl, errorMessage, formatDate, request, type Article } from './api'
import { renderMarkdown } from './markdown'

const route = useRoute()
const article = ref<Article>()
const pending = ref(true)
const error = ref('')
const revision = ref(0)
const tocOpen = ref(false)
const markdown = computed(() => renderMarkdown(article.value?.content || ''))

watch([() => route.params.id, revision], async ([id], _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  tocOpen.value = false
  article.value = undefined
  error.value = ''
  pending.value = true
  try {
    const result = await request<Article>(`/articles/${encodeURIComponent(String(id))}`, { signal: controller.signal })
    if (result.state !== 1) throw new ApiError(404, '文章不存在。')
    if (!controller.signal.aborted) article.value = result
  } catch (failure) {
    if (controller.signal.aborted) return
    error.value = failure instanceof ApiError && [400, 404].includes(failure.status) ? '文章不存在。' : errorMessage(failure)
  } finally {
    if (!controller.signal.aborted) pending.value = false
  }
}, { immediate: true })

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView()
}
</script>

<template>
  <article class="reading">
    <RouterLink class="back-link" :to="{ path: '/', query: { title: route.query.title, page: route.query.page } }">返回文章列表</RouterLink>
    <p v-if="pending" class="notice" role="status">正在加载正文…</p>
    <div v-else-if="error" class="notice error" role="alert">
      {{ error }} <button v-if="error !== '文章不存在。'" @click="revision++">重试</button>
    </div>
    <template v-else-if="article">
      <header class="article-header">
        <h1>{{ article.title }}</h1>
        <p class="metadata">{{ [formatDate(article.created_on), article.created_by].filter(Boolean).join(' · ') }}</p>
        <p v-if="article.desc" class="lede">{{ article.desc }}</p>
        <img v-if="coverUrl(article.cover_image_url)" :src="coverUrl(article.cover_image_url)" alt="">
      </header>
      <div class="article-body" :class="{ 'with-toc': markdown.headings.length >= 3 }">
        <nav v-if="markdown.headings.length >= 3" class="toc" :class="{ 'toc-open': tocOpen }" aria-label="文章目录">
          <strong>目录</strong>
          <button class="toc-toggle" type="button" :aria-expanded="tocOpen" aria-controls="article-toc" @click="tocOpen = !tocOpen">目录</button>
          <ul id="article-toc"><li v-for="heading in markdown.headings" :key="heading.id" :class="{ nested: heading.level === 'H3' }">
            <a :href="'#' + heading.id" @click.prevent="scrollToHeading(heading.id)">{{ heading.text }}</a>
          </li></ul>
        </nav>
        <div class="prose" v-html="markdown.html"></div>
      </div>
    </template>
  </article>
</template>
