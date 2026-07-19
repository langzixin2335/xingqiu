<template>
  <div class="legacy-page legacy-page--welcome">
    <Starfield :star-count="40" :shooting-stars="0" />
    <!-- 星空背景 -->
        <!-- 中心星球 -->
        <div class="planet-container">
            <div class="planet"></div>
        </div>
    
        <!-- 欢迎内容 -->
        <div class="welcome-container">
            <div class="brand-logo">✦ SHINING PLANET ✦</div>
    
            <div class="welcome-title">
                <div class="welcome-greeting">
                    欢迎回到<br><span>属于你的闪耀星球</span>
                </div>
                <div class="welcome-subtitle">
                    <p>在这里，你将遇见更好的自己</p>
                    <p>开启属于你的星际成长之旅</p>
                </div>
            </div>
    
            <div class="divider"></div>
    
            <button class="welcome-btn" onclick="enterApp()">
                欢迎回家
            </button>
        </div>
    
        
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Starfield from '../components/Starfield.vue'
import { initWelcomeView } from '../assets/scripts/welcome-page.js'
import '../assets/styles/welcome.css'

const router = useRouter()
let cleanup = null

onMounted(() => {
  cleanup = initWelcomeView(router)
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})
</script>
