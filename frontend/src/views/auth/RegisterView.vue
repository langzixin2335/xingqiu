<template>
  <div class="auth-page">
    <Starfield :star-count="36" />
    <div class="auth-container">
      <div class="brand-logo">✦ SHINING PLANET ✦</div>
      <h1 class="auth-title">加入<span>闪耀星球</span></h1>
      <p class="auth-subtitle">注册账号，开启属于你的成长旅程</p>
      <div class="divider"></div>

      <form class="auth-form" @submit.prevent="handleRegister">
        <div class="input-group">
          <label class="input-label">昵称</label>
          <input
            v-model="nickname"
            type="text"
            class="input-field"
            placeholder="你的星球昵称"
            required
          />
        </div>
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
          <label class="input-label">验证码</label>
          <div class="sms-row">
            <input
              v-model="smsCode"
              type="text"
              class="input-field"
              placeholder="6位验证码"
              maxlength="6"
              required
            />
            <button
              type="button"
              class="btn btn-outline sms-btn"
              :disabled="smsCooldown > 0 || sendingSms"
              @click="handleSendSms"
            >
              {{ smsCooldown > 0 ? `${smsCooldown}s` : '获取验证码' }}
            </button>
          </div>
        </div>
        <div class="input-group">
          <label class="input-label">密码</label>
          <input
            v-model="password"
            type="password"
            class="input-field"
            placeholder="至少6位密码"
            minlength="6"
            required
          />
        </div>
        <label class="agree-row">
          <input v-model="agreed" type="checkbox" />
          <span>我已阅读并同意《用户协议》和《隐私政策》</span>
        </label>
        <p v-if="error" class="error-text">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="loading || !agreed">
          {{ loading ? '注册中...' : '注册并登录' }}
        </button>
      </form>

      <p class="auth-footer">
        已有账号？
        <router-link to="/auth/login">去登录</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Starfield from '../../components/Starfield.vue'
import { useUserStore } from '../../stores/user'
import '../../assets/styles/auth.css'

const router = useRouter()
const userStore = useUserStore()

const nickname = ref('')
const phone = ref('')
const smsCode = ref('')
const password = ref('')
const agreed = ref(false)
const loading = ref(false)
const sendingSms = ref(false)
const smsCooldown = ref(0)
const error = ref('')

let cooldownTimer = null

async function handleSendSms() {
  if (!/^1\d{10}$/.test(phone.value)) {
    error.value = '请输入正确的手机号'
    return
  }
  error.value = ''
  sendingSms.value = true
  try {
    await userStore.sendSmsCode(phone.value)
    smsCooldown.value = 60
    cooldownTimer = setInterval(() => {
      smsCooldown.value -= 1
      if (smsCooldown.value <= 0) clearInterval(cooldownTimer)
    }, 1000)
  } catch (e) {
    error.value = e.response?.data?.detail || '验证码发送失败'
  } finally {
    sendingSms.value = false
  }
}

async function handleRegister() {
  if (!agreed.value) return
  error.value = ''
  loading.value = true
  try {
    await userStore.register({
      nickname: nickname.value,
      phone: phone.value,
      sms_code: smsCode.value,
      password: password.value,
    })
    router.push('/onboarding/welcome')
  } catch (e) {
    error.value = e.response?.data?.detail || '注册失败，请稍后重试'
  } finally {
    loading.value = false
  }
}
</script>
