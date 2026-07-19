<template>
  <div class="auth-page">
    <Starfield :star-count="36" />
    <div class="auth-container">
      <div class="brand-logo">✦ SHINING PLANET ✦</div>
      <h1 class="auth-title">加入<span>闪耀星球</span></h1>
      <p class="auth-subtitle">开发测试环境：请点击【微信一键登录】即可</p>
      <div class="divider"></div>

      <div class="auth-divider"><span>一键登录</span></div>

      <AuthOauthApps :loading-id="oauthLoading" @select="handleOauthSelect" />
      <p v-if="error" class="error-text" style="margin-top: 12px">{{ error }}</p>

      <p class="auth-footer">
        已有账号？
        <router-link to="/auth/login">去登录</router-link>
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

const oauthLoading = ref('')
const error = ref('')

function isWechatBrowser() {
  return /MicroMessenger/i.test(navigator.userAgent)
}

function redirectAfterAuth() {
  const redirect = route.query.redirect
  if (redirect) {
    router.push(String(redirect))
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
    redirectAfterAuth()
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
</script>
