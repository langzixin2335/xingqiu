<script setup>
import { onMounted, ref } from 'vue'
import client from '../api/client'

const stats = ref(null)
const loading = ref(true)

const tierLabels = {
  free: '免费会员',
  basic: '基础会员',
  premium: '高级会员',
  vip: 'VIP',
}

onMounted(async () => {
  try {
    const { data } = await client.get('/admin/dashboard/stats')
    stats.value = data
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div>
    <h2 class="page-title">仪表盘</h2>
    <div v-if="loading" class="empty">加载中…</div>
    <template v-else-if="stats">
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-value">{{ stats.user_count }}</div>
          <div class="stat-label">注册用户</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.plan_count }}</div>
          <div class="stat-label">成长计划</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.task_count }}</div>
          <div class="stat-label">任务总数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.completed_tasks }}</div>
          <div class="stat-label">已完成任务</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.post_count }}</div>
          <div class="stat-label">社区动态</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.product_count }}</div>
          <div class="stat-label">能量产品</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.order_count }}</div>
          <div class="stat-label">支付订单</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.paid_order_count }}</div>
          <div class="stat-label">已支付订单</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.push_device_count }}</div>
          <div class="stat-label">推送设备</div>
        </div>
      </div>

      <div class="card" style="margin-top: 24px">
        <h3 class="section-title">会员分布</h3>
        <div v-if="Object.keys(stats.member_tiers).length" class="tier-list">
          <div v-for="(count, tier) in stats.member_tiers" :key="tier" class="tier-row">
            <span class="badge">{{ tierLabels[tier] || tier }}</span>
            <span class="tier-count">{{ count }} 人</span>
          </div>
        </div>
        <div v-else class="empty">暂无会员数据</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 20px;
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--gold-light);
  line-height: 1;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}

.section-title {
  font-size: 15px;
  color: var(--gold-light);
  margin-bottom: 16px;
}

.tier-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.tier-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.tier-row:last-child {
  border-bottom: none;
}

.tier-count {
  color: var(--text-muted);
  font-size: 14px;
}
</style>
