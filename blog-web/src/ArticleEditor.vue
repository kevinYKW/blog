<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute, useRouter } from 'vue-router'
import { coverUrl, errorMessage, request, type Article, type ArticleInput } from './api'
import { renderMarkdown } from './markdown'

const route = useRoute()
const router = useRouter()
const blank = () => ({ title: '', desc: '', cover_image_url: '', content: '' })
const fields = reactive<ArticleInput>(blank())
const id = computed(() => route.params.id ? String(route.params.id) : '')
const state = ref<0 | 1>(0)
const saved = ref('')
const pending = ref(false)
const busy = ref(false)
const loadError = ref('')
const actionError = ref('')
const notice = ref('')
const revision = ref(0)
const tab = ref('edit')
const preview = computed(() => renderMarkdown(fields.content).html)
const dirty = computed(() => JSON.stringify(fields) !== saved.value)

watch([id, revision], async ([currentId], _, onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())
  Object.assign(fields, blank())
  saved.value = JSON.stringify(fields)
  state.value = 0
  loadError.value = actionError.value = notice.value = ''
  pending.value = Boolean(currentId)
  if (!currentId) return
  try {
    const article = await request<Article>(`/admin/articles/${encodeURIComponent(currentId)}`, { signal: controller.signal })
    if (controller.signal.aborted) return
    const { title, desc, cover_image_url, content } = article
    Object.assign(fields, { title, desc, cover_image_url, content })
    state.value = article.state
    saved.value = JSON.stringify(fields)
  } catch (failure) {
    if (!controller.signal.aborted) loadError.value = errorMessage(failure)
  } finally {
    if (!controller.signal.aborted) pending.value = false
  }
}, { immediate: true })

function canLeave() {
  return !busy.value && (!dirty.value || window.confirm('有未保存的修改，确定离开？'))
}
onBeforeRouteLeave(canLeave)
onBeforeRouteUpdate((to, from) => to.params.id === from.params.id || canLeave())

function beforeUnload(event: BeforeUnloadEvent) {
  if (!dirty.value && !busy.value) return
  event.preventDefault()
  event.returnValue = ''
}
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onUnmounted(() => window.removeEventListener('beforeunload', beforeUnload))

async function save(nextState: 0 | 1) {
  if (busy.value) return
  actionError.value = notice.value = ''
  if (!fields.title.trim() || !fields.content.trim()) {
    actionError.value = '请填写标题和正文。'
    return
  }
  if (fields.cover_image_url && !coverUrl(fields.cover_image_url)) {
    actionError.value = '请填写有效的 HTTP 或 HTTPS 封面 URL。'
    return
  }
  busy.value = true
  let newId: number | undefined
  try {
    if (id.value) {
      const path = `/articles/${encodeURIComponent(id.value)}`
      await request(path, { method: 'PUT', body: fields })
      saved.value = JSON.stringify(fields)
      if (state.value !== nextState) {
        try {
          await request(path + '/state', { method: 'PATCH', body: { state: nextState } })
          state.value = nextState
        } catch (failure) {
          actionError.value = '正文已保存，状态更新失败。' + errorMessage(failure)
          return
        }
      }
      notice.value = nextState ? '文章已发布。' : '草稿已保存。'
    } else {
      const article = await request<Article>('/articles', { method: 'POST', body: { ...fields, state: nextState } })
      newId = article.id
      saved.value = JSON.stringify(fields)
    }
  } catch (failure) {
    actionError.value = errorMessage(failure)
  } finally {
    busy.value = false
  }
  if (newId) await router.replace('/admin/articles/' + newId + '/edit')
}
</script>

<template>
  <section class="workspace">
    <RouterLink class="back-link" to="/admin/articles">返回文章管理</RouterLink>
    <div class="section-head">
      <h1><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.35">
        <path d="M4 20 16 8m-9 9c-2-8 5-13 13-13 0 8-5 15-13 13Zm3-3h5m-2-3V8"/>
      </svg>{{ id ? '编辑文章' : '新建文章' }}</h1>
      <span v-if="id && !pending && !loadError" class="status" :class="{ enabled: state }">{{ state ? '已发布' : '草稿' }}</span>
    </div>
    <p v-if="pending" class="notice" role="status">正在加载文章…</p>
    <div v-else-if="loadError" class="notice error" role="alert">{{ loadError }} <button @click="revision++">重试</button></div>
    <form v-else class="editor-form" @submit.prevent="save(state)">
      <fieldset :disabled="busy">
        <label>标题 <input v-model.trim="fields.title" required maxlength="100"></label>
        <label>摘要 <textarea v-model.trim="fields.desc" rows="2" maxlength="255"></textarea></label>
        <label>封面 URL <input v-model.trim="fields.cover_image_url" type="url" maxlength="255" placeholder="https://"></label>
        <img v-if="coverUrl(fields.cover_image_url)" class="cover-preview" :src="coverUrl(fields.cover_image_url)" alt="封面预览">
        <div class="editor-tabs">
          <button type="button" :aria-pressed="tab === 'edit'" @click="tab = 'edit'">编辑</button>
          <button type="button" :aria-pressed="tab === 'preview'" @click="tab = 'preview'">预览</button>
        </div>
        <div class="editor-grid" :class="{ 'show-preview': tab === 'preview' }">
          <label class="editor-input">正文（Markdown） <textarea v-model="fields.content" rows="16"></textarea></label>
          <div class="editor-preview"><strong>正文预览</strong><div class="prose" v-html="preview"></div></div>
        </div>
      </fieldset>
      <p v-if="actionError" class="notice error" role="alert">{{ actionError }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <div class="form-actions">
        <button v-if="!state" :disabled="busy" type="submit">保存草稿</button>
        <button class="primary" :disabled="busy" type="button" @click="save(1)">{{ state ? '保存更新' : '发布' }}</button>
        <span v-if="busy" role="status">正在保存…</span>
      </div>
    </form>
  </section>
</template>
