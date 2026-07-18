<script setup>
import { onMounted, ref } from 'vue'
import client from '../api/client'

const orders = ref([])
const loading = ref(true)
const statusFilter = ref('')
const search = ref('')

const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'pending', label: '待支付' },
  { value: 'paid', label: '已支付' },
  { value: 'cancelled', label: '已取消' },
  { value: 'refunded', label: '已退款' },
]

const statusLabels = Object.fromEntries(statusOptions.filter((o) => o.value).map((o) => [o.value, o.label]))

async function load() {
  loading.value = true
  try {
    const { data } = await client.get('/admin/orders', {
      params: { status: statusFilter.value, q: search.value },
    })
    orders.value = data
  } finally {
    loading.value = false
  }
}

async function updateStatus(order, status) {
  if (!confirm(`确定将订单 ${order.order_no} 标记为「${statusLabels[status]}」？`)) return
  const { data } = await client.patch(`/admin/orders/${order.id}`, { status })
  const idx = orders.value.findIndex((o) => o.id === order.id)
  if (idx !== -1) orders.value[idx] = data
}

function formatDate(d) {
  return d ? new Date(d).toLocaleString('zh-CN') : '—'
}

function formatAmount(amount) {
  return `¥${amount}`
}

onMounted(load)
</script>

<template>
  <div>
    <h2 class="page-title">订单管理</h2>
    <div class="toolbar">
      <select v-model="statusFilter" class="select" @change="load">
        <option v-for="opt in statusOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
      </select>
      <input v-model="search" class="input" style="max-width: 240px" placeholder="订单号 / 手机号 / 昵称" @keyup.enter="load" />
      <button class="btn btn-primary" @click="load">搜索</button>
    </div>

    <div class="card table-wrap">
      <div v-if="loading" class="empty">加载中…</div>
      <table v-else-if="orders.length">
        <thead>
          <tr>
            <th>订单号</th>
            <th>用户</th>
            <th>目标会员</th>
            <th>金额</th>
            <th>状态</th>
            <th>微信流水号</th>
            <th>创建时间</th>
            <th>支付时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="o in orders" :key="o.id">
            <td class="mono">{{ o.order_no }}</td>
            <td>
              <div>{{ o.user_nickname }}</div>
              <div class="sub">{{ o.user_phone }}</div>
            </td>
            <td><span class="badge">{{ o.target_tier }}</span></td>
            <td>{{ formatAmount(o.amount) }}</td>
            <td>
              <span class="badge" :class="'status-' + o.status">{{ statusLabels[o.status] || o.status }}</span>
            </td>
            <td class="mono sub">{{ o.transaction_id || '—' }}</td>
            <td>{{ formatDate(o.created_at) }}</td>
            <td>{{ formatDate(o.paid_at) }}</td>
            <td>
              <button v-if="o.status === 'pending'" class="btn btn-ghost btn-sm" @click="updateStatus(o, 'paid')">标记已付</button>
              <button v-if="o.status === 'pending'" class="btn btn-danger btn-sm" style="margin-left: 4px" @click="updateStatus(o, 'cancelled')">取消</button>
              <span v-if="o.status !== 'pending'" class="sub">—</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="empty">暂无订单</div>
    </div>
  </div>
</template>

<style scoped>
.mono {
  font-family: ui-monospace, monospace;
  font-size: 12px;
}

.sub {
  font-size: 12px;
  color: var(--text-muted);
}

.status-pending {
  background: rgba(255, 193, 7, 0.15);
  color: #ffc107;
}

.status-paid {
  background: rgba(74, 222, 128, 0.15);
  color: var(--success);
}

.status-cancelled,
.status-refunded {
  background: rgba(231, 76, 111, 0.12);
  color: var(--danger);
}
</style>
