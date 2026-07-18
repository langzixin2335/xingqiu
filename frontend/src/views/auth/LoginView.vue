<template>
  <div class="auth-page">
    <Starfield :star-count="36" />
    <div class="auth-container">
      <div class="brand-logo">✦ SHINING PLANET ✦</div>
      <h1 class="auth-title">欢迎回到<span>闪耀星球</span></h1>
      <p class="auth-subtitle">登录你的账号，继续星际成长之旅</p>
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

      <div class="auth-divider"><span>或</span></div>

      <button
        type="button"
        class="btn btn-wechat"
        :disabled="wxLoading"
        @click="handleWechatLogin"
      >
        {{ wxLoading ? '跳转中...' : '微信一键登录' }}
      </button>
      <p v-if="wxHint" class="wx-hint">{{ wxHint }}</p>

      <p class="auth-footer">
        还没有账号？
        <router-link to="/auth/register">立即注册</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Starfield from '../../components/Starfield.vue'
import { useUserStore } from '../../stores/user'
import api from '../../api'
import '../../assets/styles/auth.css'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const phone = ref('')
const password = ref('')
const loading = ref(false)
const wxLoading = ref(false)
const error = ref('')
const wxHint = ref('')

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
      welcome: '/onboarding/welcome',
      personality: '/onboarding/wuxing-select',
      plan: '/onboarding/plan-create',
    }
    router.push(map[userStore.onboardingStep] || '/onboarding/welcome')
  }
}

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/wechat/auth-url')
    if (data.dev_mode) {
      wxHint.value = '开发环境：将使用模拟微信登录'
    } else if (!isWechatBrowser()) {
      wxHint.value = '微信登录请在微信内打开'
    }
  } catch {
    wxHint.value = ''
  }
})

async function handleWechatLogin() {
  error.value = ''
  wxLoading.value = true
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
    wxLoading.value = false
  }
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
