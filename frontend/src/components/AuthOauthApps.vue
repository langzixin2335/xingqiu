<template>
  <div class="oauth-apps">
    <button
      v-for="app in apps"
      :key="app.id"
      type="button"
      class="oauth-app-btn"
      :class="[`oauth-app-btn--${app.id}`, { loading: loadingId === app.id }]"
      :disabled="!!loadingId"
      :aria-label="app.name"
      @click="$emit('select', app.id)"
    >
      <span class="oauth-app-icon" aria-hidden="true">
        <img :src="app.logo" :alt="app.name" />
      </span>
      <span class="oauth-app-name">{{ app.name }}</span>
    </button>
  </div>
</template>

<script setup>
defineProps({
  loadingId: { type: String, default: '' },
})

defineEmits(['select'])

const apps = [
  { id: 'wechat', name: '微信', logo: '/images/brands/wechat.svg' },
  { id: 'weibo', name: '微博', logo: '/images/brands/weibo.svg' },
  { id: 'xhs', name: '小红书', logo: '/images/brands/xiaohongshu.svg' },
  { id: 'smzdm', name: '值得买', logo: '/images/brands/smzdm-logo.png' },
]
</script>
