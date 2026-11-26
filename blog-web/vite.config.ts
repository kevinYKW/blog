import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({ mode }) => {
  const { BLOG_API_TARGET } = loadEnv(mode, '.', 'BLOG_')
  return {
    plugins: [vue()],
    server: {
      host: '127.0.0.1',
      proxy: { '/api': BLOG_API_TARGET || 'http://127.0.0.1:8000' },
    },
  }
})
