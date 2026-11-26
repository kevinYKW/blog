import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import ArticleList from './ArticleList.vue'
import ArticleDetail from './ArticleDetail.vue'
import ArticleEditor from './ArticleEditor.vue'
import TagList from './TagList.vue'
import NotFound from './NotFound.vue'
import Login from './Login.vue'
import { errorMessage, request } from './api'
import { accessToken, setAccessToken } from './session'
import './style.css'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: ArticleList, props: { admin: false } },
    { path: '/articles/:id', component: ArticleDetail },
    { path: '/login', component: Login },
    { path: '/admin', redirect: '/admin/articles' },
    { path: '/admin/articles', component: ArticleList, props: { admin: true }, meta: { admin: true } },
    { path: '/admin/articles/new', component: ArticleEditor, meta: { admin: true } },
    { path: '/admin/articles/:id/edit', component: ArticleEditor, meta: { admin: true } },
    { path: '/admin/tags', component: TagList, meta: { admin: true } },
    { path: '/:pathMatch(.*)*', component: NotFound },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.path !== from.path) return { top: 0 }
  },
})

router.beforeEach(async to => {
  if (!to.meta.admin) return
  const login = { path: '/login', query: { next: to.fullPath } }
  if (!accessToken.value) return login
  try {
    const user = await request<{ role: string }>('/auth/me')
    if (user.role === 'admin') return
    setAccessToken('')
    return { ...login, query: { ...login.query, error: '当前账号没有管理权限。' } }
  } catch (failure) {
    if (!accessToken.value) return login
    return { ...login, query: { ...login.query, error: errorMessage(failure) } }
  }
})

createApp(App).use(router).mount('#app')
