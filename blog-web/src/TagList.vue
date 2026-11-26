<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { errorMessage, request, type Tag } from './api'
import { useList } from './useList'
import Pagination from './Pagination.vue'

const route = useRoute()
const router = useRouter()
const name = computed(() => typeof route.query.name === 'string' ? route.query.name : '')
const state = computed(() => route.query.state === '0' ? '0' : '1')
const search = ref('')
watch(name, value => search.value = value, { immediate: true })
const filters = computed(() => ({ name: name.value, state: state.value }))
const { page, pages, data, pending, error, changePage, reload } = useList<Tag>('admin/tags', filters)
const dialog = ref<HTMLDialogElement>()
const input = ref<HTMLInputElement>()
const tagName = ref('')
const editing = ref<Tag>()
const busy = ref(false)
const actionError = ref('')

function applyFilters(nextState = state.value) {
  return router.push({ query: { name: search.value.trim() || undefined, state: nextState === '0' ? '0' : undefined } })
}

async function open(tag?: Tag) {
  editing.value = tag
  tagName.value = tag?.name || ''
  actionError.value = ''
  dialog.value?.showModal()
  await nextTick()
  input.value?.focus()
}

async function mutate(path: string, method: string, body?: object) {
  if (busy.value) return
  busy.value = true
  actionError.value = ''
  try {
    await request(path, { method, body })
    dialog.value?.close()
    reload()
  } catch (failure) {
    actionError.value = errorMessage(failure)
  } finally {
    busy.value = false
  }
}

function save() {
  if (!tagName.value) return
  const tag = editing.value
  void mutate(tag ? `/tags/${tag.id}` : '/tags', tag ? 'PUT' : 'POST',
    tag ? { name: tagName.value } : { name: tagName.value, state: Number(state.value) })
}

function remove(tag: Tag) {
  if (window.confirm(`删除标签「${tag.name}」？`)) void mutate(`/tags/${tag.id}`, 'DELETE')
}
</script>

<template>
  <section class="workspace">
    <div class="section-head"><h1>标签管理</h1><button class="primary" :disabled="busy" @click="open()">新建标签</button></div>
    <div class="tabs" aria-label="标签状态">
      <button :aria-pressed="state === '1'" @click="applyFilters('1')">启用</button>
      <button :aria-pressed="state === '0'" @click="applyFilters('0')">停用</button>
    </div>
    <form class="toolbar" @submit.prevent="applyFilters()">
      <input v-model="search" type="search" placeholder="搜索标签名称" aria-label="搜索标签名称" maxlength="100">
      <button>搜索</button>
    </form>
    <p v-if="actionError && !dialog?.open" role="alert" class="notice error">{{ actionError }}</p>
    <p v-if="pending" role="status" class="notice">正在加载标签…</p>
    <div v-else-if="error" role="alert" class="notice error">{{ error }} <button @click="reload">重试</button></div>
    <p v-else-if="!data?.list.length" class="notice">暂无符合条件的标签。</p>
    <div v-else class="table-wrap">
      <table>
        <thead><tr><th>名称</th><th>状态</th><th>操作</th></tr></thead>
        <tbody><tr v-for="tag in data.list" :key="tag.id">
          <td>{{ tag.name }}</td>
          <td><span class="status" :class="{ enabled: tag.state }">{{ tag.state ? '启用' : '停用' }}</span></td>
          <td class="table-actions">
            <button class="text-button" :disabled="busy" @click="open(tag)">改名</button>
            <button class="text-button" :disabled="busy" @click="mutate('/tags/' + tag.id + '/state', 'PATCH', { state: tag.state ? 0 : 1 })">{{ tag.state ? '停用' : '启用' }}</button>
            <button class="text-button danger" :disabled="busy" @click="remove(tag)">删除</button>
          </td>
        </tr></tbody>
      </table>
    </div>
    <Pagination v-if="!pending && !error" :page="page" :pages="pages" @change="changePage" />
    <dialog ref="dialog" aria-labelledby="tag-dialog-title" @close="actionError = ''" @cancel="busy && $event.preventDefault()">
      <form @submit.prevent="save">
        <h2 id="tag-dialog-title">{{ editing ? '修改标签' : '新建标签' }}</h2>
        <label>名称 <input ref="input" v-model.trim="tagName" :disabled="busy" required maxlength="100"></label>
        <p v-if="actionError" role="alert" class="error">{{ actionError }}</p>
        <div class="form-actions">
          <button type="button" :disabled="busy" @click="dialog?.close()">取消</button>
          <button class="primary" :disabled="busy" type="submit">保存</button>
        </div>
      </form>
    </dialog>
  </section>
</template>
