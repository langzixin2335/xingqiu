<template>
  <div class="auth-page">
    <Starfield :star-count="36" />
    <div class="auth-container">
      <div class="brand-logo">✦ SHINING PLANET ✦</div>
      <h1 class="auth-title">欢迎回到<span>闪耀星球</span></h1>
      <p class="auth-subtitle">开发测试环境：请点击【微信一键登录】即可</p>
      <div class="divider"></div>

      <form class="auth-form" @submit.prevent="handleLogin">
        <div class="input-group">
          <label class="input-label">手机号</label>
          <input
            v-model="phone"
            type="tel"
            class="input-field"
            placeholder="请输入手机号"
            maxlength="11"
            required
          />
        </div>
        <div class="input-group">
          <label class="input-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input-field"
            placeholder="请输入密码"
            required
          />
        </div>
        <p v-if="error" class="error-text">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>

      <div class="auth-divider"><span>或一键登录</span></div>

      <AuthOauthApps :loading-id="oauthLoading" @select="handleOauthSelect" />

      <p class="auth-footer">
        还没有账号？
        <router-link to="/auth/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Starfield from '../../components/Starfield.vue'
import AuthOauthApps from '../../components/AuthOauthApps.vue'
import { useUserStore } from '../../stores/user'
import api from '../../api'
import '../../assets/styles/auth.css'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const phone = ref('')
const password = ref('')
const loading = ref(false)
const oauthLoading = ref('')
const error = ref('')

function isWechatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent)
}

function redirectAfterLogin() {
  const redirect = route.query.redirect
  if (redirect) {
    router.push(redirect)
  } else if (userStore.onboardingStep === 'done') {
    router.push('/home')
  } else {
    const map = {
      welcome: '/onboarding/wuxing-select',
      personality: '/onboarding/wuxing-select',
      plan: '/onboarding/plan-create',
    }
    router.push(map[userStore.onboardingStep] || '/onboarding/wuxing-select')
  }
}

async function handleWechatLogin() {
  error.value = ''
  oauthLoading.value = 'wechat'
  try {
    const { data } = await api.get('/auth/wechat/auth-url')
    if (data.url && isWechatBrowser()) {
      window.location.href = data.url
      return
    }
    await userStore.wechatLogin('dev')
    redirectAfterLogin()
  } catch (e) {
    error.value = e.response?.data?.detail || '微信登录失败'
  } finally {
    oauthLoading.value = ''
  }
}

async function handleOauthSelect(id) {
  if (id === 'wechat') {
    await handleWechatLogin()
    return
  }
  const names = { weibo: '微博', xhs: '小红书', smzdm: '值得买' }
  error.value = `${names[id] || '该'}登录即将开放，请先使用微信`
}

async function handleLogin() {
  error.value = ''
  loading.value = true
  try {
    await userStore.login(phone.value, password.value)
    redirectAfterLogin()
  } catch (e) {
    error.value = e.response?.data?.detail || '登录失败，请检查手机号和密码'
  } finally {
    loading.value = false
  }
}
</script>
