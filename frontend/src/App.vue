<template>
  <router-view />

  <div
    v-if="updateInfo"
    class="app-update-overlay"
    @click.self="onDismiss"
  >
    <div class="app-update-card" role="dialog" aria-labelledby="appUpdateTitle">
      <div id="appUpdateTitle" class="app-update-title">发现新版本</div>
      <p class="app-update-meta">
        {{ updateInfo.localVersion || `v${updateInfo.localCode}` }}
        →
        {{ updateInfo.latest_version }}
      </p>
      <p class="app-update-text">{{ updateInfo.message }}</p>
      <div class="app-update-actions">
        <button
          v-if="!updateInfo.force"
          type="button"
          class="app-update-btn secondary"
          @click="onDismiss"
        >
          稍后
        </button>
        <button type="button" class="app-update-btn primary" @click="onUpdate">
          立即更新
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { checkAppUpdate, openUpdateUrl, snoozeAppUpdate } from './utils/appUpdate'

const updateInfo = ref(null)

onMounted(() => {
  const run = () => {
    checkAppUpdate()
      .then((info) => {
        if (info) updateInfo.value = info
      })
      .catch(() => {})
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 3500 })
  } else {
    setTimeout(run, 1800)
  }
})

function onDismiss() {
  if (!updateInfo.value || updateInfo.value.force) return
  snoozeAppUpdate()
  updateInfo.value = null
}

function onUpdate() {
  const url = updateInfo.value?.download_url
  if (url) openUpdateUrl(url)
}
</script>

<style>
.app-update-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.72);
}

.app-update-card {
  width: 100%;
  max-width: 340px;
  padding: 24px 22px 20px;
  border-radius: 20px;
  border: 1px solid rgba(212, 185, 106, 0.4);
  background:
    radial-gradient(ellipse at top, rgba(212, 185, 106, 0.16), transparent 55%),
    linear-gradient(160deg, #1c1a28 0%, #14141e 55%, #1a1524 100%);
  text-align: center;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}

.app-update-title {
  font-size: 18px;
  font-weight: 600;
  color: #f3efe6;
  margin-bottom: 8px;
}

.app-update-meta {
  font-size: 13px;
  color: #d4b96a;
  margin-bottom: 12px;
}

.app-update-text {
  font-size: 14px;
  line-height: 1.55;
  color: rgba(243, 239, 230, 0.78);
  margin-bottom: 20px;
}

.app-update-actions {
  display: flex;
  gap: 10px;
}

.app-update-btn {
  flex: 1;
  border: none;
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}

.app-update-btn.primary {
  background: linear-gradient(135deg, #d4b96a, #c4a14f);
  color: #1a1520;
}

.app-update-btn.secondary {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(243, 239, 230, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.12);
}
</style>
