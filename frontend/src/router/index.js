import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { Capacitor } from '@capacitor/core'
import { useUserStore } from '../stores/user'
import { hasPassedWelcome } from '../utils/welcomeSession'

const routes = [
  { path: '/', redirect: '/welcome' },
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('../views/WelcomeView.vue'),
    // 所有人（含已登录）打开 App 都先看欢迎页
  },
  {
    path: '/auth/login',
    name: 'Login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/register',
    name: 'Register',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { guest: true },
  },
  {
    path: '/auth/wechat/callback',
    name: 'WechatCallback',
    component: () => import('../views/auth/WechatCallbackView.vue'),
    meta: { guest: true },
  },
  // 旧引导页入口：欢迎页已前移，此处直接进入五行选择
  { path: '/onboarding/welcome', redirect: '/onboarding/wuxing-select' },
  {
    path: '/onboarding/wuxing-select',
    name: 'WuxingSelect',
    component: () => import('../views/WuxingSelectView.vue'),
    meta: { requiresAuth: true, onboarding: true },
  },
  {
    path: '/onboarding/plan-create',
    name: 'PlanCreate',
    component: () => import('../views/PlanCreateView.vue'),
    meta: { requiresAuth: true, onboarding: true },
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('../views/MainHomeView.vue'),
    meta: { requiresAuth: true },
  },
]

// 本地 assets 壳用 hash；App 若加载线上 H5（与浏览器同域）则用 history，与已验证稳定的 H5 一致
const useHashRouter =
  Capacitor.isNativePlatform() &&
  !/\.dongme\.me$/i.test(window.location.hostname || '')

const router = createRouter({
  history: useHashRouter ? createWebHashHistory() : createWebHistory(),
  routes,
})

function getOnboardingRoute(step) {
  const map = {
    welcome: '/onboarding/wuxing-select',
    personality: '/onboarding/wuxing-select',
    plan: '/onboarding/plan-create',
    done: '/home',
  }
  return map[step] || '/onboarding/wuxing-select'
}

router.beforeEach(async (to, _from, next) => {
  const userStore = useUserStore()

  if (userStore.token && !userStore.user) {
    try {
      await Promise.race([
        userStore.fetchMe(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('me-timeout')), 8000)),
      ])
    } catch {
      // 弱网/服务器忙时不阻塞进入页面，避免 App 卡死感
    }
  }

  // 欢迎页对所有人开放（含已登录）
  if (to.path === '/welcome') {
    return next()
  }

  // 本会话尚未点过「欢迎回家」：需登录的页面先回欢迎页
  if (to.meta.requiresAuth && !hasPassedWelcome()) {
    if (!userStore.isLoggedIn) {
      return next({ path: '/welcome', query: { redirect: to.fullPath } })
    }
    return next('/welcome')
  }

  if (to.meta.guest && userStore.isLoggedIn) {
    if (!hasPassedWelcome()) return next('/welcome')
    const step = userStore.onboardingStep
    if (step === 'done') return next('/home')
    return next(getOnboardingRoute(step))
  }

  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    // 未登录且已过欢迎页时，进登录；否则先欢迎页
    if (hasPassedWelcome()) {
      return next({ path: '/auth/login', query: { redirect: to.fullPath } })
    }
    return next({ path: '/welcome', query: { redirect: to.fullPath } })
  }

  if (to.meta.requiresAuth && userStore.isLoggedIn && to.meta.onboarding) {
    const step = userStore.onboardingStep
    if (step === 'done') return next('/home')
  }

  if (to.path === '/home' && userStore.isLoggedIn && userStore.onboardingStep !== 'done') {
    return next(getOnboardingRoute(userStore.onboardingStep))
  }

  next()
})

export default router
