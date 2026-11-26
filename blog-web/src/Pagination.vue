<script setup lang="ts">
defineProps<{ page: number; pages: number }>()
defineEmits<{ change: [page: number] }>()
</script>

<template>
  <nav v-if="pages > 1" class="pagination" aria-label="分页">
    <button :disabled="page <= 1" @click="$emit('change', page - 1)">上一页</button>
    <span>第 {{ page }} / {{ pages }} 页</span>
    <button :disabled="page >= pages" @click="$emit('change', page + 1)">下一页</button>
  </nav>
</template>
