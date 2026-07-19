import api from '../../api'
import { isNativeApp, takeTaskPhoto } from '../../utils/camera.js'
import {
  createCompanionSpeechRecognition,
  getCompanion,
  pickCompanionCheckinLine,
  speakCompanionText,
  stopCompanionSpeech,
} from '../../utils/companion.js'
import { decodeEncourageTitle, scheduleRemindersFromApi } from '../../utils/notifications.js'
import { initPushNotifications, unregisterPushNotifications } from '../../utils/push.js'
import { showToast } from '../../utils/ui.js'
import { useUserStore } from '../../stores/user'
import {
  renderBadges,
  renderCommunity,
  renderGrowthReport,
  renderMember,
  renderPlanets,
  renderPlanPhases,
  renderProducts,
  renderProgress,
  renderRewards,
  renderStreak,
  renderTasks,
  renderWeekendReview,
  syncMonthlyGrowthReportGate,
} from './home-render.js'
import {
  getCurrentAvatarLook,
  previewAvatarLook,
  refreshAvatarLook,
  renderDressPreviewFigure,
  setCurrentAvatarLook,
  syncAvatarLookFromPersonality,
  updateAvatarPanel,
} from './avatar-character.js'
import {
  ACCESSORIES,
  ACCENT_SWATCHES,
  AURAS,
  CHARACTERS,
  HAIR_SWATCHES,
  LOOK_PRESETS,
  OUTFIT_SWATCHES,
  PETS,
  SKIN_SWATCHES,
  characterIdFromPersonality,
  findPresetId,
  lookForCharacter,
  normalizeLook,
  saveAvatarLook,
} from './avatar-look.js'

let displayedBadges = []
let currentCategory = 'all'
let currentSubcategory = 'recommended'
let dashboardData = null
let inviteShareText = ''
let dailySummaryShownToday = false
let pendingCompleteTaskId = null
let pendingLightPlanetType = null
let lightPromptShownFor = null
let fireworksTimer = null
let fireworksRaf = null
/** 当前点击/停留的今日行动，驱动中心人物动作 */
let focusedTaskId = null
let communityAutoScrollTimer = null
let communityResumeTimer = null
/** 0=默认约4行 / 1=15行 / 2=20行 */
let communityExpandLevel = 0
let communityScrollBound = false
/** 点击某条行动分享后暂停自动滚动，改由用户手动滑动 */
let communityScrollPausedByUser = false

const COMMUNITY_LIMIT_BY_LEVEL = [10, 15, 20]

const PLANET_FRAGMENT_NAME = {
  survival: '生存星球',
  money: '赚钱星球',
  beauty: '好看星球',
  fun: '好玩星球',
  flow: '心流星球',
}

function flashPlanet(planetType) {
  const planet = document.querySelector(`.planet[data-planet-type="${planetType}"]`)
  if (!planet) return
  planet.classList.add('planet-flash')
  setTimeout(() => planet.classList.remove('planet-flash'), 1200)
}

function showUnlockToast(items, prefix) {
  if (!items?.length) return
  const names = items.map((i) => `${i.icon || '🏆'} ${i.name}`).join('\n')
  setTimeout(() => alert(`${prefix}\n\n${names}`), 300)
}

let activeFireworksCanvasId = 'fireworksCanvas'

function stopFireworks() {
  if (fireworksTimer) {
    clearTimeout(fireworksTimer)
    fireworksTimer = null
  }
  if (fireworksRaf) {
    cancelAnimationFrame(fireworksRaf)
    fireworksRaf = null
  }
  ;['fireworksCanvas', 'pandoraFireworksCanvas'].forEach((id) => {
    const canvas = document.getElementById(id)
    if (canvas) {
      const ctx = canvas.getContext('2d')
      ctx?.clearRect(0, 0, canvas.width, canvas.height)
    }
  })
}

function startFireworks(canvasId = 'fireworksCanvas') {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  stopFireworks()
  activeFireworksCanvasId = canvasId
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const resize = () => {
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()

  const particles = []
  const colors = ['#D4B96A', '#E8C55A', '#FF8A80', '#82B1FF', '#B388FF', '#69F0AE']

  const burst = () => {
    const x = Math.random() * window.innerWidth * 0.8 + window.innerWidth * 0.1
    const y = Math.random() * window.innerHeight * 0.45 + 40
    const count = 28 + Math.floor(Math.random() * 18)
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count
      const speed = 1.5 + Math.random() * 3.5
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 1.5 + Math.random() * 2,
      })
    }
  }

  for (let i = 0; i < 3; i++) burst()
  const burstInterval = setInterval(burst, 450)

  const tick = () => {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.04
      p.life -= 0.016
      if (p.life <= 0) {
        particles.splice(i, 1)
        continue
      }
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    fireworksRaf = requestAnimationFrame(tick)
  }
  fireworksRaf = requestAnimationFrame(tick)

  fireworksTimer = setTimeout(() => {
    clearInterval(burstInterval)
    setTimeout(stopFireworks, 1800)
  }, 3200)
}

function showDailySummary(effects) {
  if (!effects?.all_complete_today || dailySummaryShownToday) return
  dailySummaryShownToday = true
  const overlay = document.getElementById('dailySummaryOverlay')
  const textEl = document.getElementById('giftFragmentText')
  if (!overlay) return
  const fragment = effects.energy_fragment
  const planetName =
    fragment?.planet_name ||
    PLANET_FRAGMENT_NAME[effects.planet_type] ||
    '闪耀星球'
  if (textEl) textEl.textContent = `${planetName}能量碎片 ×1`
  overlay.classList.remove('hidden')
  startFireworks()
}

const PANDORA_REWARDS = [
  { icon: '🎓', title: '线上课限时3天体验券' },
  { icon: '🏕️', title: '线下训练营9折折扣券' },
]

function showPandoraBox(planetType) {
  pendingLightPlanetType = planetType
  const nameEl = document.getElementById('pandoraPlanetName')
  if (nameEl) nameEl.textContent = PLANET_FRAGMENT_NAME[planetType] || '闪耀星球'
  document.getElementById('pandoraBoxOverlay')?.classList.remove('hidden')
}

function celebrateWithCompanion() {
  const userStore = useUserStore()
  const companion = getCompanion(userStore.personality)
  const line = pickCompanionCheckinLine(userStore.personality)
  showToast(`${companion.name}：${line}`, { duration: 2600 })
}

function handleTaskEffects(effects) {
  if (!effects) return
  if (effects.planet_type) flashPlanet(effects.planet_type)
  // 成长总览进度按五星球完成率均值，不因单日任务完成率覆盖
  if (dashboardData) {
    if (effects.streak) {
      dashboardData.streak = effects.streak
      renderStreak(effects.streak)
    }
    renderProgress(dashboardData)
  }
  celebrateWithCompanion()
  showUnlockToast(effects.badges_unlocked, '🎖️ 解锁新勋章')
  showUnlockToast(effects.rewards_unlocked, '🎁 解锁新奖励')
  if (effects.rewards_unlocked?.length) {
    loadDashboard()
  }
  showDailySummary(effects)
  // 满 7 碎片后由星球旁「点亮」按钮操作，不再强弹窗
}

function updateProgress() {
  // 今日行动右侧已改为「每日完成曲线」入口，进度文案不再更新
}

function drawCompletionChart(canvasId = 'completionChartModal') {
  const canvas = document.getElementById(canvasId)
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const dpr = window.devicePixelRatio || 1
  const rect = canvas.getBoundingClientRect()
  const width = rect.width || 320
  const height = rect.height || 160
  canvas.width = width * dpr
  canvas.height = height * dpr
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const padding = { top: 20, right: 20, bottom: 10, left: 30 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const data = window.__weeklyCompletion || [60, 80, 40, 100, 75, 90, 66]

  ctx.clearRect(0, 0, width, height)
  ctx.strokeStyle = 'rgba(255,255,255,0.05)'
  ctx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(width - padding.right, y)
    ctx.stroke()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.font = '10px sans-serif'
  ctx.textAlign = 'right'
  for (let i = 0; i <= 4; i++) {
    const y = padding.top + (chartH / 4) * i
    ctx.fillText(`${100 - i * 25}%`, padding.left - 6, y + 3)
  }

  const points = data.map((val, i) => ({
    x: padding.left + (chartW / (data.length - 1)) * i,
    y: padding.top + chartH - (val / 100) * chartH,
  }))

  ctx.beginPath()
  ctx.moveTo(points[0].x, padding.top + chartH)
  points.forEach((p) => ctx.lineTo(p.x, p.y))
  ctx.lineTo(points[points.length - 1].x, padding.top + chartH)
  ctx.closePath()
  const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH)
  gradient.addColorStop(0, 'rgba(212, 185, 106, 0.3)')
  gradient.addColorStop(1, 'rgba(212, 185, 106, 0.02)')
  ctx.fillStyle = gradient
  ctx.fill()

  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  points.forEach((p) => ctx.lineTo(p.x, p.y))
  ctx.strokeStyle = '#d4b96a'
  ctx.lineWidth = 2
  ctx.stroke()

  points.forEach((p, i) => {
    ctx.beginPath()
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#d4b96a'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2)
    ctx.fillStyle = '#0a0a0f'
    ctx.fill()
    ctx.fillStyle = '#d4b96a'
    ctx.font = 'bold 11px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(`${data[i]}%`, p.x, p.y - 10)
  })
}

function filterProducts() {
  document.querySelectorAll('.product-card').forEach((card) => {
    const matchCategory = currentCategory === 'all' || card.dataset.category === currentCategory
    const matchSubcategory =
      currentSubcategory === 'all' || card.dataset.subcategory === currentSubcategory
    card.style.display = matchCategory && matchSubcategory ? 'block' : 'none'
  })
}

async function loadDashboard() {
  try {
    const { data } = await api.get('/home/dashboard')
    dashboardData = data
    const tasks = data.tasks || []
    if (
      focusedTaskId != null &&
      !tasks.some((t) => String(t.id) === String(focusedTaskId))
    ) {
      focusedTaskId = null
    }
    if (focusedTaskId == null && tasks.length) {
      const firstOpen = tasks.find((t) => !t.completed) || tasks[0]
      focusedTaskId = firstOpen?.id ?? null
    }
    // 首页中心人物：默认=五行所选；用户换装锁定后不再覆盖
    const personality = data.user?.personality || useUserStore().personality
    if (personality) {
      const userStore = useUserStore()
      if (userStore.personality !== personality) {
        userStore.setPersonality?.(personality)
      }
      syncAvatarLookFromPersonality(personality)
    }
    renderPlanets(data.planets, tasks, focusedTaskId)
    renderTasks(tasks, {
      focusTaskId: focusedTaskId,
      onFocusTask: (taskId) => {
        focusedTaskId = taskId
        updateAvatarPanel(dashboardData?.tasks || [], focusedTaskId)
      },
    })
    renderPlanPhases(
      data.plan_phases,
      data.core_goal,
      data.plans || [],
      data.active_plan_id
    )
    renderStreak(data.streak)
    renderWeekendReview(data.weekend_review)
    renderCommunity(data.posts, {
      limit: COMMUNITY_LIMIT_BY_LEVEL[communityExpandLevel] || 10,
    })
    renderProducts(data.products)
    renderBadges(data.badges)
    renderRewards(data.rewards)
    renderMember(data.user)
    renderProgress(data)
    setTimeout(() => {
      document.querySelectorAll('.dimension-bar-fill').forEach((bar) => {
        const width = bar.style.width
        bar.style.width = '0'
        setTimeout(() => {
          bar.style.width = width
        }, 100)
      })
    }, 300)
  } catch (err) {
    console.warn('加载首页数据失败，使用静态演示数据', err)
  }
}

function stopCommunityAutoScroll() {
  if (communityAutoScrollTimer != null) {
    clearInterval(communityAutoScrollTimer)
    communityAutoScrollTimer = null
  }
}

function clearCommunityResumeTimer() {
  if (communityResumeTimer != null) {
    clearTimeout(communityResumeTimer)
    communityResumeTimer = null
  }
}

/** 点击某条分享：暂停自动滚动，直到展开/收起行数时再恢复 */
function pauseCommunityAutoScrollByUser() {
  communityScrollPausedByUser = true
  clearCommunityResumeTimer()
  stopCommunityAutoScroll()
}

function pauseCommunityAutoScrollTemporarily() {
  if (communityScrollPausedByUser) return
  stopCommunityAutoScroll()
  clearCommunityResumeTimer()
  communityResumeTimer = setTimeout(() => {
    startCommunityAutoScroll()
  }, 2800)
}

function startCommunityAutoScroll() {
  stopCommunityAutoScroll()
  if (communityScrollPausedByUser) return
  const feed = document.getElementById('communityFeed')
  if (!feed) return
  if (feed.scrollHeight <= feed.clientHeight + 4) return

  // 比原先慢一倍（40ms → 80ms）
  communityAutoScrollTimer = setInterval(() => {
    const el = document.getElementById('communityFeed')
    if (!el || communityScrollPausedByUser) return
    const max = el.scrollHeight - el.clientHeight
    if (max <= 0) return
    if (el.scrollTop >= max - 1) {
      el.scrollTop = 0
    } else {
      el.scrollTop += 1
    }
  }, 80)
}

function bindCommunityFeedInteractions() {
  const feed = document.getElementById('communityFeed')
  if (!feed || communityScrollBound) return
  communityScrollBound = true
  const pauseTemp = () => pauseCommunityAutoScrollTemporarily()
  feed.addEventListener('wheel', pauseTemp, { passive: true })
  feed.addEventListener('touchstart', pauseTemp, { passive: true })
  feed.addEventListener('click', (e) => {
    const post = e.target.closest('.community-post')
    if (!post) return
    pauseCommunityAutoScrollByUser()
    feed.querySelectorAll('.community-post.is-focused').forEach((el) => {
      el.classList.remove('is-focused')
    })
    post.classList.add('is-focused')
  })
}

function syncCommunityExpandUi() {
  const wrap = document.getElementById('communityFeedWrap')
  const upBtn = document.getElementById('communityExpandUpBtn')
  const downBtn = document.getElementById('communityExpandDownBtn')
  if (wrap) wrap.dataset.expandLevel = String(communityExpandLevel)
  if (upBtn) upBtn.hidden = communityExpandLevel <= 0
  if (downBtn) downBtn.hidden = communityExpandLevel >= 2
}

function applyCommunityExpandLevel() {
  communityScrollPausedByUser = false
  syncCommunityExpandUi()
  const limit = COMMUNITY_LIMIT_BY_LEVEL[communityExpandLevel] || 10
  renderCommunity(dashboardData?.posts || [], { limit })
  startCommunityAutoScroll()
}

export function initMainHomeView(router) {
  // 页面重挂载后恢复滚动绑定标记
  communityScrollBound = false
  communityExpandLevel = 0
  communityScrollPausedByUser = false
  window.setupCommunityFeedScroll = () => {
    bindCommunityFeedInteractions()
    syncCommunityExpandUi()
    startCommunityAutoScroll()
  }

  // 中心人物默认跟随五行人格所选战士
  syncAvatarLookFromPersonality(useUserStore().personality)

  loadDashboard()

  // App 内不再显示下载入口
  if (isNativeApp()) {
    document.querySelector('.app-download-card')?.classList.add('hidden')
  }

  // 延后初始化原生通知/推送，避免冷启动抢内存导致闪退
  const deferNative = () => {
    scheduleRemindersFromApi().catch(() => {})
    initPushNotifications().catch(() => {})
  }
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(deferNative, { timeout: 4000 })
  } else {
    setTimeout(deferNative, 2500)
  }

  window.logoutApp = async () => {
    if (confirm('确定要退出登录吗？')) {
      await unregisterPushNotifications()
      useUserStore().logout()
      router.push('/welcome')
    }
  }

  window.switchTab = (tabName) => {
    document.querySelectorAll('.tab-content').forEach((el) => el.classList.remove('active'))
    document.getElementById(`tab-${tabName}`)?.classList.add('active')
    document.querySelectorAll('.tab-item').forEach((el) => el.classList.remove('active'))
    event.currentTarget?.classList.add('active')

    const titles = {
      plan: '我的<span>星际旅程</span>',
      energy: '能量<span>中心</span>',
      reward: '成长<span>奖励</span>',
      member: '会员<span>中心</span>',
    }
    const subtitles = {
      plan: '在闪耀星球，每一天都是成长',
      energy: '成长的路上，有我陪你一起走',
      reward: '记录成长，奖励自己',
      member: '专属权益，助力成长',
    }
    const pageTitle = document.getElementById('pageTitle')
    const pageSubtitle = document.getElementById('pageSubtitle')
    if (pageTitle) pageTitle.innerHTML = titles[tabName]
    if (pageSubtitle) pageSubtitle.textContent = subtitles[tabName]

  }

  window.openDailyCompletionCurve = () => {
    const overlay = document.getElementById('dailyCurveOverlay')
    if (!overlay) return
    overlay.classList.remove('hidden')
    // 等弹层显示后再量尺寸绘制，与成长奖励同款曲线
    requestAnimationFrame(() => {
      setTimeout(() => drawCompletionChart('completionChartModal'), 40)
    })
  }

  window.closeDailyCompletionCurve = () => {
    document.getElementById('dailyCurveOverlay')?.classList.add('hidden')
  }

  const PLANET_QUOTE_LABEL = {
    survival: '生存',
    money: '赚钱',
    beauty: '好看',
    fun: '好玩',
    flow: '心流',
  }

  function todayKey() {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function quoteSeenStorageKey() {
    return `growth_quote_seen_${todayKey()}`
  }

  function hasSeenTodayGrowthQuote() {
    try {
      return localStorage.getItem(quoteSeenStorageKey()) === '1'
    } catch {
      return false
    }
  }

  function markTodayGrowthQuoteSeen() {
    try {
      localStorage.setItem(quoteSeenStorageKey(), '1')
    } catch {
      /* ignore */
    }
    document.getElementById('dailyQuoteDot')?.classList.add('hidden')
  }

  function pickStableDailyPhrase(phrases, salt = '') {
    const list = (phrases || []).map((p) => String(p || '').trim()).filter(Boolean)
    if (!list.length) return '今天也值得被温柔对待'
    if (list.length === 1) return list[0]
    const key = `${todayKey()}::${salt}`
    let hash = 0
    for (let i = 0; i < key.length; i += 1) {
      hash = (hash * 31 + key.charCodeAt(i)) >>> 0
    }
    return list[hash % list.length]
  }

  function syncDailyQuoteDot(hasReminders) {
    const dot = document.getElementById('dailyQuoteDot')
    if (!dot) return
    const show = !!hasReminders && !hasSeenTodayGrowthQuote()
    dot.classList.toggle('hidden', !show)
  }

  async function loadTodayGrowthQuotes() {
    const companion = getCompanion(useUserStore().personality)
    try {
      const { data } = await api.get('/reminders')
      const reminders = Array.isArray(data) ? data : []
      syncDailyQuoteDot(reminders.length > 0)
      if (!reminders.length) {
        return {
          empty: true,
          html: `<div class="daily-quote-empty">还没有设置成长语录。<br>去制定计划时写下「每日爱的鼓励」，明天就能在这里查收啦。</div>`,
        }
      }
      const cards = reminders.map((r) => {
        const decoded = decodeEncourageTitle(r.title)
        const text = pickStableDailyPhrase(decoded.phrases, String(r.id || r.title || ''))
        const planet = PLANET_QUOTE_LABEL[r.time_type] || '成长'
        const time = r.remind_time || ''
        return `
          <div class="daily-quote-card">
            <div class="daily-quote-meta">
              <img src="${companion.avatar}" alt="">
              <span>${companion.display || companion.name}</span>
              <span>· ${planet}</span>
              ${time ? `<span>· ${time}</span>` : ''}
            </div>
            <div class="daily-quote-text">「${String(text)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')}」</div>
          </div>`
      })
      return { empty: false, html: cards.join('') }
    } catch {
      syncDailyQuoteDot(false)
      return {
        empty: true,
        html: `<div class="daily-quote-empty">暂时没能取到语录，稍后再试一次吧。</div>`,
      }
    }
  }

  window.openTodayGrowthQuote = async () => {
    const body = document.getElementById('dailyQuoteBody')
    const overlay = document.getElementById('dailyQuoteOverlay')
    if (!overlay || !body) return
    body.innerHTML = `<div class="daily-quote-empty">正在为你翻开今日那一页…</div>`
    overlay.classList.remove('hidden')
    const result = await loadTodayGrowthQuotes()
    body.innerHTML = result.html
    if (!result.empty) markTodayGrowthQuoteSeen()
  }

  window.closeTodayGrowthQuote = () => {
    document.getElementById('dailyQuoteOverlay')?.classList.add('hidden')
  }

  // 进入首页时预检红点
  loadTodayGrowthQuotes().catch(() => {})

  window.confirmTaskComplete = (btn) => {
    const taskItem = btn.closest('.task-item')
    const taskId = taskItem?.dataset.task
    if (!taskId || taskItem.classList.contains('completed')) return
    pendingCompleteTaskId = taskId
    const preview = document.getElementById('taskPhotoPreview')
    if (preview) {
      preview.classList.add('hidden')
      preview.innerHTML = ''
    }
    document.getElementById('taskPhotoOverlay')?.classList.remove('hidden')
  }

  window.closeTaskPhotoModal = () => {
    pendingCompleteTaskId = null
    document.getElementById('taskPhotoOverlay')?.classList.add('hidden')
    const input = document.getElementById('taskPhotoInput')
    if (input) input.value = ''
  }

  async function finishTaskWithPhoto() {
    const taskId = pendingCompleteTaskId
    if (!taskId) return
    try {
      const { data } = await api.post(`/tasks/${taskId}/complete-photo`)
      closeTaskPhotoModal()
      handleTaskEffects(data.effects)
      await loadDashboard()
      updateProgress()
    } catch (err) {
      alert(err.response?.data?.detail || '完成失败，请稍后重试')
    }
  }

  window.captureTaskPhoto = async () => {
    if (!pendingCompleteTaskId) return

    if (isNativeApp()) {
      try {
        const photoPath = await takeTaskPhoto()
        if (!photoPath) return
        const preview = document.getElementById('taskPhotoPreview')
        if (preview) {
          preview.innerHTML = `<img src="${photoPath}" alt="打卡照片">`
          preview.classList.remove('hidden')
        }
        await finishTaskWithPhoto()
      } catch (err) {
        alert(err.message || '无法打开相机，请检查权限设置')
      }
      return
    }

    const input = document.getElementById('taskPhotoInput')
    if (!input) {
      await finishTaskWithPhoto()
      return
    }
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      const url = URL.createObjectURL(file)
      const preview = document.getElementById('taskPhotoPreview')
      if (preview) {
        preview.innerHTML = `<img src="${url}" alt="打卡照片">`
        preview.classList.remove('hidden')
      }
      await finishTaskWithPhoto()
    }
    input.click()
  }

  window.toggleTaskSocial = (btn) => {
    const detail = btn.closest('.task-social')?.querySelector('.task-social-detail')
    if (!detail) return
    detail.style.display = detail.style.display === 'none' ? 'block' : 'none'
  }

  window.likeTaskPost = async (btn) => {
    const postId = btn.dataset.postId
    const countEl = btn.querySelector('.action-count')
    const detail = btn.closest('.task-social')?.querySelector('.task-social-detail')
    if (detail) detail.style.display = 'block'
    try {
      const { data } = await api.post(`/community/posts/${postId}/like`)
      btn.classList.toggle('liked', data.liked)
      if (countEl) countEl.textContent = data.likes_count
      const usersEl = detail?.querySelector('.task-like-users')
      if (usersEl && data.liked) {
        // 刷新后由 loadDashboard 回填完整点赞名单
      }
      await loadDashboard()
      const refreshed = document.querySelector(`.task-social[data-post-id="${postId}"] .task-social-detail`)
      if (refreshed) refreshed.style.display = 'block'
    } catch {
      let count = parseInt(countEl?.textContent || '0', 10)
      if (btn.classList.contains('liked')) {
        btn.classList.remove('liked')
        if (countEl) countEl.textContent = Math.max(0, count - 1)
      } else {
        btn.classList.add('liked')
        if (countEl) countEl.textContent = count + 1
      }
    }
  }

  window.shareTask = async (btn) => {
    const taskItem = btn.closest('.task-item')
    const taskTitle = taskItem?.querySelector('.task-title')?.textContent?.trim()
    const timeType = taskItem?.dataset.timeType || 'survival'
    if (!taskTitle) return
    try {
      const { data } = await api.post('/invitations', {
        task_title: taskTitle,
        time_type: timeType,
      })
      inviteShareText = data.share_text
      const textEl = document.getElementById('inviteShareText')
      if (textEl) textEl.textContent = data.share_text
      document.getElementById('inviteModalOverlay')?.classList.remove('hidden')
    } catch {
      inviteShareText = `✨ 邀请你一起在闪耀星球打卡！\n任务：${taskTitle}\n一起坚持，共同成长！`
      const textEl = document.getElementById('inviteShareText')
      if (textEl) textEl.textContent = inviteShareText
      document.getElementById('inviteModalOverlay')?.classList.remove('hidden')
    }
  }

  window.closeInviteModal = () => {
    document.getElementById('inviteModalOverlay')?.classList.add('hidden')
  }

  window.copyInviteText = async () => {
    try {
      await navigator.clipboard.writeText(inviteShareText)
      alert('邀约文案已复制，快去分享给好友吧！')
    } catch {
      alert(inviteShareText)
    }
  }

  window.acceptInviteCode = async () => {
    const code = document.getElementById('inviteCodeInput')?.value?.trim()
    if (!code) {
      alert('请输入邀约码')
      return
    }
    try {
      const { data } = await api.post(`/invitations/${code}/accept`)
      alert(`已应约！与 ${data.inviter_name} 一起打卡「${data.task_title}」`)
      closeInviteModal()
    } catch (e) {
      alert(e.response?.data?.detail || '应约失败，请检查邀约码')
    }
  }

  window.closeDailySummary = () => {
    stopFireworks()
    document.getElementById('dailySummaryOverlay')?.classList.add('hidden')
  }

  window.lightPlanetNow = async (planetType) => {
    if (!planetType) return
    const btn = document.querySelector(
      `.planet[data-planet-type="${planetType}"] .planet-light-btn`
    )
    if (btn) {
      btn.disabled = true
      btn.textContent = '点亮中'
    }
    try {
      await api.post(`/home/planets/${planetType}/light`)
      flashPlanet(planetType)
      await loadDashboard()
      showPandoraBox(planetType)
    } catch (err) {
      alert(err.response?.data?.detail || '点亮失败，请稍后重试')
    } finally {
      if (btn) {
        btn.disabled = false
        btn.textContent = '点亮'
      }
    }
  }

  window.closePandoraLater = () => {
    document.getElementById('pandoraBoxOverlay')?.classList.add('hidden')
  }

  window.openPandoraNow = () => {
    document.getElementById('pandoraBoxOverlay')?.classList.add('hidden')
    const reward = PANDORA_REWARDS[Math.floor(Math.random() * PANDORA_REWARDS.length)]
    const textEl = document.getElementById('pandoraRewardText')
    const iconEl = document.getElementById('pandoraRewardIcon')
    if (textEl) textEl.textContent = reward.title
    if (iconEl) iconEl.textContent = reward.icon
    document.getElementById('pandoraRewardOverlay')?.classList.remove('hidden')
    startFireworks('pandoraFireworksCanvas')
  }

  window.closePandoraReward = () => {
    stopFireworks()
    document.getElementById('pandoraRewardOverlay')?.classList.add('hidden')
  }

  window.openReflectionInput = () => {
    stopFireworks()
    document.getElementById('dailySummaryOverlay')?.classList.add('hidden')
    document.getElementById('reflectionModalOverlay')?.classList.remove('hidden')
  }

  window.closeReflectionModal = () => {
    document.getElementById('reflectionModalOverlay')?.classList.add('hidden')
    const input = document.getElementById('reflectionInput')
    if (input) input.value = ''
  }

  window.submitReflection = async () => {
    const input = document.getElementById('reflectionInput')
    const content = input?.value?.trim()
    if (!content) {
      alert('请先写下你的感悟')
      return
    }
    try {
      await api.post('/community/reflection', { content })
      closeReflectionModal()
      alert('感悟已发布到星球社区 ✨')
      loadDashboard()
    } catch {
      alert('发布失败，请稍后重试')
    }
  }

  window.openWeekendReview = () => {
    if (!dashboardData?.weekend_review) return
    const overlay = document.getElementById('weekendSummaryOverlay')
    if (!overlay) return

    const review = dashboardData.weekend_review
    const modalTitle = document.getElementById('weekendSummaryModalTitle')
    if (modalTitle) {
      modalTitle.textContent = review.title || (review.period === 'current' ? '本周总结' : '上周总结')
    }

    const planets = dashboardData.planets || []
    const types = ['survival', 'money', 'beauty', 'fun', 'flow']
    const rates = types.map((type) => {
      const p = planets.find((item) => item.planet_type === type)
      const maxLevel = p?.max_level || 7
      const level = Math.min(Math.max(0, Number(p?.level) || 0), maxLevel)
      return maxLevel ? Math.round((level / maxLevel) * 100) : 0
    })
    const overall = Math.round(rates.reduce((a, b) => a + b, 0) / (rates.length || 1))
    renderGrowthReport(
      {
        ...dashboardData,
        // 报告头部周期文案对齐复盘周
        _weekendPeriodLabel: review.week_label || '',
        _weekendPeriodTitle: review.period === 'current' ? '本周' : '上周',
        streak: {
          ...(dashboardData.streak || {}),
          // 复盘卡片以该周完成数补充说明（连续打卡仍用当前 streak）
        },
      },
      overall,
      'weekendGrowthReport',
    )

    overlay.classList.remove('hidden')
    const scroll = overlay.querySelector('.weekend-summary-scroll')
    if (scroll) scroll.scrollTop = 0
  }

  window.closeWeekendReview = () => {
    document.getElementById('weekendSummaryOverlay')?.classList.add('hidden')
  }

  window.unlockMonthlyGrowthReport = () => {
    try {
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      localStorage.setItem(`sp_monthly_growth_report_${ym}`, '1')
    } catch {
      /* ignore */
    }
    syncMonthlyGrowthReportGate()
    document.getElementById('growthTemplateReport')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }

  window.closeMonthlyGrowthReport = () => {
    try {
      const now = new Date()
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      localStorage.removeItem(`sp_monthly_growth_report_${ym}`)
    } catch {
      /* ignore */
    }
    syncMonthlyGrowthReportGate()
    document.getElementById('growthReportGate')?.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest',
    })
  }

  window.expandCommunityFeed = () => {
    if (communityExpandLevel >= 2) return
    communityExpandLevel += 1
    applyCommunityExpandLevel()
  }

  window.shrinkCommunityFeed = () => {
    if (communityExpandLevel <= 0) return
    communityExpandLevel -= 1
    applyCommunityExpandLevel()
  }

  window.likePost = async (btn) => {
    const postId = btn.dataset.postId
    const countEl = btn.querySelector('.action-count')
    try {
      const { data } = await api.post(`/community/posts/${postId}/like`)
      if (data.liked) {
        btn.classList.add('liked')
      } else {
        btn.classList.remove('liked')
      }
      countEl.textContent = data.likes_count
    } catch {
      let count = parseInt(countEl.textContent, 10)
      if (btn.classList.contains('liked')) {
        btn.classList.remove('liked')
        countEl.textContent = count - 1
      } else {
        btn.classList.add('liked')
        countEl.textContent = count + 1
      }
    }
  }

  window.toggleComment = (btn) => {
    const root = btn.closest('.community-post') || btn.closest('.task-social')
    const commentSection =
      root?.querySelector('.comment-section') || root?.querySelector('.task-social-detail')
    if (!commentSection) return
    commentSection.style.display = commentSection.style.display === 'none' ? 'block' : 'none'
  }

  window.sharePost = async (userName, taskName) => {
    try {
      const { data } = await api.post('/invitations', {
        task_title: taskName,
        time_type: 'survival',
      })
      inviteShareText = data.share_text
      const textEl = document.getElementById('inviteShareText')
      if (textEl) textEl.textContent = data.share_text
      document.getElementById('inviteModalOverlay')?.classList.remove('hidden')
    } catch {
      alert(`分享动态\n\n${userName} 完成了「${taskName}」`)
    }
  }

  window.submitComment = (e, input) => {
    if (e.key === 'Enter') {
      window.sendComment(input.nextElementSibling)
    }
  }

  window.sendComment = async (btn) => {
    const inputArea = btn.closest('.comment-input-area')
    const input = inputArea?.querySelector('.comment-input')
    const text = input?.value.trim()
    if (!text) return

    const postId = btn.dataset.postId
    try {
      const { data } = await api.post(`/community/posts/${postId}/comments`, { content: text })
      const commentList = inputArea?.parentElement?.querySelector('.comment-list')
      const newComment = document.createElement('div')
      newComment.className = 'comment-item'
      newComment.innerHTML = `<span class="comment-user">${data.author_name}：</span><span class="comment-text">${data.content}</span>`
      commentList?.appendChild(newComment)
      input.value = ''
      const root = btn.closest('.community-post') || btn.closest('.task-social')
      const countEl =
        root?.querySelector('.post-action:nth-child(2) .action-count') ||
        root?.querySelectorAll('.task-social-btn .action-count')?.[1]
      if (countEl) countEl.textContent = parseInt(countEl.textContent, 10) + 1
    } catch {
      const commentList = inputArea?.parentElement?.querySelector('.comment-list')
      const newComment = document.createElement('div')
      newComment.className = 'comment-item'
      newComment.innerHTML = `<span class="comment-user">我：</span><span class="comment-text">${text}</span>`
      commentList?.appendChild(newComment)
      input.value = ''
    }
  }

  window.showUpgradeInfo = (tier) => {
    const info = {
      萌芽: '萌芽会员 ¥87/季度\n\n适合刚开始自我成长之旅的你。',
      星耀: '星耀会员 ¥297/季度\n\n适合认真投入成长的你。',
      女王: '星球女王 ¥897/季度\n\n适合追求极致成长的你。',
    }
    alert(info[tier] || '会员详情')
  }

  window.upgradeTier = async (targetTier) => {
    const diff = targetTier === '星球女王' ? 600 : 210
    const confirmMsg =
      `补差价升级确认\n\n目标会员：${targetTier}\n补差价：¥${diff}/季度\n\n是否确认升级？`
    if (!confirm(confirmMsg)) return
    try {
      const { data: order } = await api.post('/member/create-order', { target_tier: targetTier })

      if (order.dev_mode) {
        const { data } = await api.post('/member/confirm-order', { order_no: order.order_no })
        const levelEl = document.getElementById('memberLevel')
        if (levelEl) levelEl.textContent = `🌟 ${data.member_tier}会员`
        alert(`🎉 升级成功！\n\n你已升级为「${data.member_tier}」会员！`)
        return
      }

      if (order.pay_params && typeof WeixinJSBridge !== 'undefined') {
        WeixinJSBridge.invoke(
          'getBrandWCPayRequest',
          order.pay_params,
          async (res) => {
            if (res.err_msg === 'get_brand_wcpay_request:ok') {
              const { data } = await api.post('/member/confirm-order', { order_no: order.order_no })
              const levelEl = document.getElementById('memberLevel')
              if (levelEl) levelEl.textContent = `🌟 ${data.member_tier}会员`
              alert(`🎉 支付成功！已升级为「${data.member_tier}」会员`)
            } else {
              alert('支付已取消')
            }
          },
        )
      } else {
        alert(order.message || '请在微信内打开完成支付')
      }
    } catch (e) {
      alert(e.response?.data?.detail || '升级失败，请稍后重试')
    }
  }

  window.toggleBadgeDisplay = async (el, icon, name) => {
    if (el.classList.contains('locked')) return
    const badgeId = el.dataset.badgeId
    try {
      const { data } = await api.post(`/badges/${badgeId}/toggle-display`)
      const indicator = el.querySelector('.badge-display-indicator')
      if (data.displayed) {
        el.classList.add('displayed')
        if (indicator) indicator.style.display = 'block'
        displayedBadges.push({ icon, name })
      } else {
        el.classList.remove('displayed')
        if (indicator) indicator.style.display = 'none'
        displayedBadges = displayedBadges.filter((b) => b.name !== name)
      }
    } catch (e) {
      alert(e.response?.data?.detail || '操作失败')
    }
  }

  const TIME_GOAL_STATUS_KEY = 'sp_time_goal_status'
  const TIME_GOAL_NAMES = {
    survival: '生存时间',
    money: '赚钱时间',
    beauty: '好看时间',
    fun: '好玩时间',
    flow: '心流时间',
  }
  let activeTimeGoalType = null

  window.getTimeGoalStatusMap = () => {
    try {
      const raw = localStorage.getItem(TIME_GOAL_STATUS_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  function setTimeGoalStatus(type, status) {
    const map = window.getTimeGoalStatusMap()
    map[type] = status
    localStorage.setItem(TIME_GOAL_STATUS_KEY, JSON.stringify(map))
    if (dashboardData) renderProgress(dashboardData)
    if (activeTimeGoalType === type) syncTimeGoalModalActions(type)
  }

  function findTimeGoalText(type) {
    const phases = dashboardData?.plan_phases || []
    const matched = phases.filter((p) => p.time_type === type)
    if (!matched.length) return ''
    return matched
      .map((p) => {
        const label = p.phase_label ? `【${p.phase_label}】` : ''
        const action = p.action ? `\n行动：${p.action}` : ''
        return `${label}${p.title || ''}${action}`
      })
      .join('\n\n')
  }

  function syncTimeGoalModalActions(type) {
    const status = window.getTimeGoalStatusMap()[type] || 'active'
    const statusEl = document.getElementById('timeGoalModalStatus')
    const pauseBtn = document.getElementById('timeGoalPauseBtn')
    const updateBtn = document.getElementById('timeGoalUpdateBtn')
    const abandonBtn = document.getElementById('timeGoalAbandonBtn')

    if (statusEl) {
      statusEl.textContent =
        status === 'paused' ? '当前状态：已暂停' : status === 'abandoned' ? '当前状态：已放弃' : ''
    }
    if (pauseBtn) {
      if (status === 'paused') {
        pauseBtn.textContent = '恢复目标'
        pauseBtn.disabled = false
        pauseBtn.onclick = () => window.resumeTimeGoal()
      } else {
        pauseBtn.textContent = '暂停目标'
        pauseBtn.disabled = status === 'abandoned'
        pauseBtn.onclick = () => window.pauseTimeGoal()
      }
    }
    if (updateBtn) updateBtn.disabled = false
    if (abandonBtn) abandonBtn.disabled = status === 'abandoned'
  }

  window.closeTimeGoalModal = () => {
    document.getElementById('timeGoalModalOverlay')?.classList.add('hidden')
    activeTimeGoalType = null
  }

  window.viewTimeGoal = (type) => {
    activeTimeGoalType = type
    const name = TIME_GOAL_NAMES[type] || '该时间'
    const text = findTimeGoalText(type)
    const titleEl = document.getElementById('timeGoalModalTitle')
    const bodyEl = document.getElementById('timeGoalModalBody')
    if (titleEl) titleEl.textContent = `${name}本期目标`
    if (bodyEl) {
      bodyEl.textContent = text || '暂未设置具体目标，可点击下方「更新目标」去完善计划。'
    }
    syncTimeGoalModalActions(type)
    document.getElementById('timeGoalModalOverlay')?.classList.remove('hidden')
  }

  window.updateTimeGoal = () => {
    const type = activeTimeGoalType
    if (!type) return
    const name = TIME_GOAL_NAMES[type] || '该时间'
    if (!confirm(`将前往计划页更新「${name}」目标，是否继续？`)) return
    window.closeTimeGoalModal()
    router.push('/onboarding/plan-create')
  }

  window.switchHomePlan = async (planId) => {
    if (!planId || String(planId) === String(dashboardData?.active_plan_id)) return
    try {
      await api.post(`/plans/${planId}/activate`)
      if (dashboardData?.plans) {
        dashboardData.plans = dashboardData.plans.map((p) => ({
          ...p,
          is_active: p.id === planId,
        }))
        dashboardData.active_plan_id = planId
        const active = dashboardData.plans.find((p) => p.id === planId)
        dashboardData.plan_phases = active?.phases || []
        dashboardData.core_goal = active?.core_goal || dashboardData.core_goal
        renderPlanPhases(
          dashboardData.plan_phases,
          dashboardData.core_goal,
          dashboardData.plans,
          planId
        )
      } else {
        await loadDashboard()
      }
    } catch (e) {
      showToast(e?.response?.data?.detail || '切换计划失败')
    }
  }

  window.addAnotherPlan = () => {
    router.push('/onboarding/plan-create')
  }

  window.deleteHomePlan = async (planId) => {
    if (!planId) return
    if (!confirm('确认删除这条计划？相关每日任务与提醒也会一并移除。')) return
    try {
      await api.delete(`/plans/${planId}`)
      showToast('计划已删除')
      await loadDashboard()
    } catch (e) {
      showToast(e?.response?.data?.detail || '删除失败')
    }
  }

  window.pauseTimeGoal = () => {
    const type = activeTimeGoalType
    if (!type) return
    const name = TIME_GOAL_NAMES[type] || '该时间'
    if (!confirm(`确认暂停「${name}」本期目标？暂停后可随时恢复。`)) return
    setTimeGoalStatus(type, 'paused')
  }

  window.resumeTimeGoal = () => {
    const type = activeTimeGoalType
    if (!type) return
    setTimeGoalStatus(type, 'active')
  }

  window.abandonTimeGoal = () => {
    const type = activeTimeGoalType
    if (!type) return
    const name = TIME_GOAL_NAMES[type] || '该时间'
    if (!confirm(`确认放弃「${name}」本期目标？放弃后需通过「更新目标」重新设定。`)) return
    setTimeGoalStatus(type, 'abandoned')
  }

  document.getElementById('timeGoalModalOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'timeGoalModalOverlay') window.closeTimeGoalModal()
  })

  const DEFAULT_REWARD_PACK = {
    survival: [
      { icon: '🧩', name: '生存星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🎓', name: '线上课限时3天体验券', desc: '点亮星球后开启礼包可抽得' },
    ],
    money: [
      { icon: '🧩', name: '赚钱星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🏕️', name: '线下训练营9折折扣券', desc: '点亮星球后开启礼包可抽得' },
    ],
    beauty: [
      { icon: '🧩', name: '好看星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🎓', name: '线上课限时3天体验券', desc: '点亮星球后开启礼包可抽得' },
    ],
    fun: [
      { icon: '🧩', name: '好玩星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🏕️', name: '线下训练营9折折扣券', desc: '点亮星球后开启礼包可抽得' },
    ],
    flow: [
      { icon: '🧩', name: '心流星球能量碎片 ×1', desc: '完成本期目标可获得' },
      { icon: '🎓', name: '线上课限时3天体验券', desc: '点亮星球后开启礼包可抽得' },
    ],
  }

  function escapeRewardText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  let activeRewardPackType = null

  function renderRewardPackItems(items, emptyText) {
    if (!items?.length) {
      return emptyText
        ? `<div class="reward-pack-empty">${escapeRewardText(emptyText)}</div>`
        : ''
    }
    return items
      .map(
        (item) => `
      <div class="reward-pack-item">
        <div class="reward-pack-icon">${item.icon || '🎁'}</div>
        <div class="reward-pack-info">
          <div class="reward-pack-name">${escapeRewardText(item.name)}</div>
          <div class="reward-pack-desc">${escapeRewardText(item.desc || '')}</div>
        </div>
        ${item.tag ? `<div class="reward-pack-tag">${escapeRewardText(item.tag)}</div>` : ''}
      </div>`
      )
      .join('')
  }

  function refreshRewardPackCustomList() {
    const customList = document.getElementById('rewardPackCustomList')
    if (!customList) return
    const custom = (dashboardData?.rewards || []).map((r) => ({
      icon: '✨',
      name: r.name,
      desc: r.description || '悦己奖励',
      tag: r.status === 'locked' ? '待解锁' : '已解锁',
    }))
    customList.innerHTML = renderRewardPackItems(custom, '暂无悦己奖励，可在下方添加')
  }

  function buildRewardDescription(desc, condition) {
    const parts = []
    if (condition) parts.push(condition)
    if (desc?.trim()) parts.push(desc.trim())
    return parts.join(' · ') || '悦己奖励'
  }

  function buildPackRewardConditionText() {
    const type = document.getElementById('packRewardConditionType')?.value || 'completion_rate'
    const raw = document.getElementById('packRewardConditionValue')?.value
    const value = Number.parseInt(String(raw || ''), 10)
    if (!Number.isFinite(value) || value <= 0) return ''
    if (type === 'planet_light') {
      return `该星球已点亮${value}次`
    }
    return `完成率达成${Math.min(100, value)}%`
  }

  window.syncPackRewardConditionUi = () => {
    const type = document.getElementById('packRewardConditionType')?.value || 'completion_rate'
    const unit = document.getElementById('packRewardConditionUnit')
    const input = document.getElementById('packRewardConditionValue')
    if (unit) unit.textContent = type === 'planet_light' ? '次' : '%'
    if (input) {
      input.max = type === 'planet_light' ? '99' : '100'
      input.placeholder = 'XX'
    }
  }

  async function createUserReward({ name, description }) {
    await api.post('/rewards', { name, description })
    const { data } = await api.get('/home/dashboard')
    dashboardData = data
    renderRewards(data.rewards)
    refreshRewardPackCustomList()
  }

  window.closeRewardPackModal = () => {
    document.getElementById('rewardPackModalOverlay')?.classList.add('hidden')
    activeRewardPackType = null
  }

  window.viewRewardPack = (type) => {
    activeRewardPackType = type
    const titleEl = document.getElementById('rewardPackModalTitle')
    const defaultList = document.getElementById('rewardPackDefaultList')

    if (titleEl) titleEl.textContent = '完成即可得奖励礼包'
    if (defaultList) {
      defaultList.innerHTML = renderRewardPackItems(
        DEFAULT_REWARD_PACK[type] || DEFAULT_REWARD_PACK.survival,
        '暂无随机小惊喜'
      )
    }
    refreshRewardPackCustomList()
    window.syncPackRewardConditionUi()
    document.getElementById('rewardPackModalOverlay')?.classList.remove('hidden')
  }

  const SHOP_PICK_APPS = {
    taobao: {
      appUrl: 'taobao://',
      webUrl: 'https://m.taobao.com/',
    },
    dewu: {
      appUrl: 'dewuapp://',
      webUrl: 'https://m.dewu.com/',
    },
    smzdm: {
      appUrl: 'smzdm://',
      webUrl: 'https://m.smzdm.com/',
    },
  }

  window.openShopPick = (shop) => {
    const cfg = SHOP_PICK_APPS[shop]
    if (!cfg) return
    const startedAt = Date.now()
    try {
      window.location.href = cfg.appUrl
    } catch {
      window.open(cfg.webUrl, '_blank', 'noopener,noreferrer')
      return
    }
    // 未安装对应 App 时回退到手机网页版
    window.setTimeout(() => {
      if (Date.now() - startedAt < 1800) {
        window.open(cfg.webUrl, '_blank', 'noopener,noreferrer')
      }
    }, 900)
  }

  let dressDraftLook = getCurrentAvatarLook()
  let dressPreviewTimer = null

  function hslSwatch(hue, soft = false, dark = false) {
    if (dark) return `hsl(${hue} 18% 22%)`
    if (soft) return `hsl(${hue} 28% 88%)`
    return `hsl(${hue} 72% 58%)`
  }

  function scheduleDressPreview() {
    if (dressPreviewTimer) clearTimeout(dressPreviewTimer)
    dressPreviewTimer = setTimeout(() => {
      const wrap = document.getElementById('avatarDressPreview')
      if (!wrap) return
      previewAvatarLook(dressDraftLook, wrap)
    }, 60)
  }

  function renderDressPanels() {
    const panels = document.getElementById('avatarDressPanels')
    if (!panels) return
    const draft = normalizeLook(dressDraftLook)
    const presetId = findPresetId(draft)

    const chip = (active, label, onClickAttr) =>
      `<button type="button" class="dress-chip${active ? ' active' : ''}" onclick="${onClickAttr}">${label}</button>`

    const swatch = (active, color, title, onClickAttr) =>
      `<button type="button" class="dress-swatch${active ? ' active' : ''}" title="${title}" style="background:${color}" onclick="${onClickAttr}"></button>`

    panels.innerHTML = `
      <div class="dress-section">
        <div class="dress-section-title">① 选择人物</div>
        <div class="dress-character-grid">
          ${CHARACTERS.map(
            (c) => `
            <button type="button" class="dress-character-card${draft.characterId === c.id ? ' active' : ''}" onclick="setAvatarDressField('character','${c.id}')">
              <img class="dress-character-thumb" src="${c.thumb}" alt="${c.title}" draggable="false">
              <span class="dress-character-title">${c.title}</span>
            </button>`,
          ).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">② 宠物 <span class="dress-locked-tag">待解锁</span></div>
        <div class="dress-pet-grid">
          ${PETS.filter((p) => p.id !== 'none').map((p) => {
            const thumb =
              p.id === 'luna'
                ? `<img src="${p.src}" alt="守护者">`
                : p.id === 'artemis'
                  ? `<img src="${p.src}" alt="陪伴者">`
                  : `<span class="dress-pet-both"><img src="${PETS.find((x) => x.id === 'luna').src}" alt="守护者"><img src="${PETS.find((x) => x.id === 'artemis').src}" alt="陪伴者"></span>`
            return `
            <div class="dress-pet-card is-locked" aria-disabled="true" title="待解锁">
              <span class="dress-pet-thumb">${thumb}</span>
              <span class="dress-pet-name">${p.short}</span>
              <span class="dress-pet-lock">待解锁</span>
            </div>`
          }).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">③ 外观微调</div>
        <div class="dress-section-title dress-section-subtitle">快捷套装</div>
        <div class="dress-options">
          ${LOOK_PRESETS.map((p) => chip(presetId === p.id, p.name, `setAvatarDressField('preset','${p.id}')`)).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">发色</div>
        <div class="dress-options">
          ${HAIR_SWATCHES.map((s) =>
            swatch(
              draft.hairHue === s.hue && !!draft.hairSilver === !!s.silver && !!draft.hairDark === !!s.dark,
              s.dark ? hslSwatch(s.hue, false, true) : s.silver ? 'linear-gradient(135deg,#f2f4f8,#9aa3b2)' : hslSwatch(s.hue),
              s.name,
              `setAvatarDressField('hair',${s.hue},${s.silver ? 'true' : 'false'},${s.dark ? 'true' : 'false'})`,
            ),
          ).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">服装色</div>
        <div class="dress-options">
          ${OUTFIT_SWATCHES.map((s) =>
            swatch(
              draft.outfitHue === s.hue && !!draft.outfitSoft === !!s.soft,
              s.soft ? hslSwatch(s.hue, true) : hslSwatch(s.hue),
              s.name,
              `setAvatarDressField('outfit',${s.hue},${s.soft ? 'true' : 'false'})`,
            ),
          ).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">点缀色</div>
        <div class="dress-options">
          ${ACCENT_SWATCHES.map((s) =>
            swatch(draft.accentHue === s.hue, hslSwatch(s.hue), s.name, `setAvatarDressField('accent',${s.hue})`),
          ).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">肤色</div>
        <div class="dress-options">
          ${SKIN_SWATCHES.map((s) =>
            chip(draft.skinTone === s.tone, s.name, `setAvatarDressField('skin',${s.tone})`),
          ).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">配饰</div>
        <div class="dress-options">
          ${ACCESSORIES.map((a) =>
            chip(draft.accessory === a.id, `${a.emoji} ${a.name}`, `setAvatarDressField('accessory','${a.id}')`),
          ).join('')}
        </div>
      </div>
      <div class="dress-section">
        <div class="dress-section-title">光环</div>
        <div class="dress-options">
          ${AURAS.map((a) => chip(draft.aura === a.id, a.name, `setAvatarDressField('aura','${a.id}')`)).join('')}
        </div>
      </div>
    `
  }

  function syncDressModalUi() {
    const preview = document.getElementById('avatarDressPreview')
    if (preview) {
      preview.innerHTML = renderDressPreviewFigure(dressDraftLook)
    }
    renderDressPanels()
    scheduleDressPreview()
  }

  window.openAvatarDressModal = () => {
    dressDraftLook = getCurrentAvatarLook()
    syncDressModalUi()
    document.getElementById('avatarDressOverlay')?.classList.remove('hidden')
  }

  window.closeAvatarDressModal = () => {
    document.getElementById('avatarDressOverlay')?.classList.add('hidden')
  }

  window.resetAvatarDressDraft = () => {
    const personality = useUserStore().personality
    dressDraftLook = lookForCharacter(characterIdFromPersonality(personality), {
      petId: 'none',
      source: 'personality',
    })
    syncDressModalUi()
  }

  window.setAvatarDressField = (field, value, flagA = false, flagB = false) => {
    const next = { ...normalizeLook(dressDraftLook) }
    if (field === 'character') {
      dressDraftLook = lookForCharacter(value, next)
      syncDressModalUi()
      return
    }
    if (field === 'pet') {
      // 宠物暂未解锁，仅展示选项
      return
    }
    if (field === 'preset') {
      const preset = LOOK_PRESETS.find((p) => p.id === value)
      if (preset) {
        dressDraftLook = normalizeLook({
          ...next,
          ...preset.look,
          characterId: next.characterId,
          petId: next.petId,
        })
      }
    } else if (field === 'hair') {
      next.hairHue = Number(value)
      next.hairSilver = !!flagA
      next.hairDark = !!flagB
      dressDraftLook = next
    } else if (field === 'outfit') {
      next.outfitHue = Number(value)
      next.outfitSoft = !!flagA
      dressDraftLook = next
    } else if (field === 'accent') {
      next.accentHue = Number(value)
      dressDraftLook = next
    } else if (field === 'skin') {
      next.skinTone = Number(value)
      dressDraftLook = next
    } else if (field === 'accessory') {
      next.accessory = value
      dressDraftLook = next
    } else if (field === 'aura') {
      next.aura = value
      dressDraftLook = next
    }
    renderDressPanels()
    scheduleDressPreview()
  }

  window.confirmAvatarDress = () => {
    const saved = saveAvatarLook({ ...dressDraftLook, petId: 'none' }, { asUserPick: true })
    setCurrentAvatarLook(saved)
    refreshAvatarLook(saved)
    window.closeAvatarDressModal()
    showToast('形象已保存，闪闪发光～')
  }

  window.addPackReward = async () => {
    const name = document.getElementById('packRewardName')?.value?.trim()
    const desc = document.getElementById('packRewardDesc')?.value?.trim()
    const condition = buildPackRewardConditionText()
    if (!name) {
      alert('请输入奖励名称')
      return
    }
    if (!condition) {
      alert('请填写达成标准中的数值 XX')
      return
    }
    try {
      await createUserReward({
        name,
        description: buildRewardDescription(desc, condition),
      })
      const nameInput = document.getElementById('packRewardName')
      const descInput = document.getElementById('packRewardDesc')
      const valueInput = document.getElementById('packRewardConditionValue')
      if (nameInput) nameInput.value = ''
      if (descInput) descInput.value = ''
      if (valueInput) valueInput.value = ''
      window.syncPackRewardConditionUi()
    } catch (err) {
      alert(err.response?.data?.detail || '添加奖励失败，请稍后重试')
    }
  }

  document.getElementById('rewardPackModalOverlay')?.addEventListener('click', (e) => {
    if (e.target?.id === 'rewardPackModalOverlay') window.closeRewardPackModal()
  })

  window.showPlanetDetail = (type) => {
    const names = {
      survival: '生存星球',
      money: '赚钱星球',
      beauty: '好看星球',
      fun: '好玩星球',
      flow: '心流星球',
    }
    const planet = dashboardData?.planets?.find((p) => p.planet_type === type)
    if (planet) {
      if (planet.ready_to_light) {
        // 满碎片时引导点旁侧「点亮」按钮
        alert(
          `${names[type]}\n\n能量碎片已集齐 7/7\n请点击星球下方的「点亮」按钮升一级`
        )
        return
      }
      const maxLv = planet.max_level || 7
      const lv = planet.level || 0
      alert(
        `${names[type]}\n\n等级：Lv.${lv}/${maxLv}\n点亮进度：${planet.progress_percent || 0}%\n能量碎片：${planet.energy_fragments || 0}/${planet.fragments_per_light || 7}\n状态：${lv >= maxLv ? '已完全点亮' : '点亮中'}\n\n集齐 7 个能量碎片可点亮一次；共需点亮 7 次，星球才会全量高亮`
      )
      return
    }
    alert(`${names[type]}\n\n完成今日行动，点亮你的${names[type]}`)
  }

  const energyChatHistory = []
  let companionVoiceSpeak = true
  let companionRecognition = null
  let companionListening = false
  const userStoreForCompanion = useUserStore()
  let activeCompanion = getCompanion(userStoreForCompanion.personality)

  function escapeChatText(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  function syncCompanionUi(companion) {
    activeCompanion = companion || getCompanion(userStoreForCompanion.personality)
    const nameEl = document.getElementById('companionHeaderName')
    const descEl = document.getElementById('companionHeaderDesc')
    const headerAvatar = document.getElementById('companionHeaderAvatar')
    const greetingAvatar = document.getElementById('companionGreetingAvatar')
    const greetingBubble = document.getElementById('companionGreetingBubble')
    if (nameEl) nameEl.textContent = activeCompanion.display
    if (descEl) descEl.textContent = `${activeCompanion.title} · 文字或语音陪你聊`
    if (headerAvatar) headerAvatar.src = activeCompanion.avatar
    if (greetingAvatar) greetingAvatar.src = activeCompanion.avatar
    if (greetingBubble && energyChatHistory.length === 0) {
      greetingBubble.textContent = activeCompanion.greeting
    }
    const toggle = document.getElementById('companionVoiceToggle')
    if (toggle) {
      toggle.classList.toggle('is-on', companionVoiceSpeak)
      toggle.classList.toggle('is-off', !companionVoiceSpeak)
      toggle.setAttribute('aria-pressed', companionVoiceSpeak ? 'true' : 'false')
      toggle.textContent = companionVoiceSpeak ? '🔊' : '🔇'
    }
  }

  function companionAvatarHtml(role) {
    if (role === 'user') return '<div class="energy-chat-avatar">🙂</div>'
    return `<div class="energy-chat-avatar companion-avatar-img"><img src="${escapeChatText(activeCompanion.avatar)}" alt=""></div>`
  }

  function appendEnergyChatMessage(role, content, extraClass = '') {
    const box = document.getElementById('energyChatMessages')
    if (!box) return null
    const row = document.createElement('div')
    row.className = `energy-chat-msg ${role}${extraClass ? ` ${extraClass}` : ''}`
    row.innerHTML = `
      ${companionAvatarHtml(role)}
      <div class="energy-chat-bubble">${escapeChatText(content)}</div>`
    box.appendChild(row)
    box.scrollTop = box.scrollHeight
    return row
  }

  function maybeSpeakReply(text) {
    if (!companionVoiceSpeak || !text) return
    speakCompanionText(text)
  }

  syncCompanionUi(activeCompanion)
  api
    .get('/energy/companion')
    .then(({ data }) => {
      if (!data) return
      activeCompanion = {
        ...getCompanion(data.personality),
        name: data.name || activeCompanion.name,
        title: data.title || activeCompanion.title,
        display: data.display || activeCompanion.display,
        avatar: data.avatar || activeCompanion.avatar,
        greeting: data.greeting || activeCompanion.greeting,
      }
      syncCompanionUi(activeCompanion)
    })
    .catch(() => {})

  window.toggleCompanionVoiceSpeak = () => {
    companionVoiceSpeak = !companionVoiceSpeak
    if (!companionVoiceSpeak) stopCompanionSpeech()
    syncCompanionUi(activeCompanion)
    showToast(companionVoiceSpeak ? '已开启伙伴朗读' : '已关闭伙伴朗读')
  }

  window.toggleCompanionVoiceInput = () => {
    const micBtn = document.getElementById('energyChatMicBtn')
    const hint = document.getElementById('companionVoiceHint')

    if (companionListening) {
      try {
        companionRecognition?.stop?.()
      } catch {
        /* ignore */
      }
      companionListening = false
      micBtn?.classList.remove('is-listening')
      if (hint) hint.textContent = '已停止聆听，可以继续打字或再点麦克风'
      return
    }

    stopCompanionSpeech()
    companionRecognition = createCompanionSpeechRecognition({
      onStart: () => {
        companionListening = true
        micBtn?.classList.add('is-listening')
        if (hint) hint.textContent = '我在听…说完会自动停下'
      },
      onEnd: () => {
        companionListening = false
        micBtn?.classList.remove('is-listening')
      },
      onError: () => {
        companionListening = false
        micBtn?.classList.remove('is-listening')
        if (hint) hint.textContent = '这台设备暂时听不清，可以改用文字聊聊'
        showToast('语音识别不可用，试试文字吧')
      },
      onResult: (text) => {
        const input = document.getElementById('energyChatInput')
        if (input) input.value = text
        if (hint) hint.textContent = '听清了，正在请伙伴回答…'
        window.sendEnergyChat()
      },
    })

    if (!companionRecognition) {
      showToast('当前环境不支持语音识别，请用文字聊')
      if (hint) hint.textContent = '可改用文字输入；部分机型 WebView 不支持语音识别'
      return
    }

    try {
      companionRecognition.start()
    } catch {
      showToast('没能打开麦克风，请检查权限后再试')
    }
  }

  window.submitEnergyChat = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      window.sendEnergyChat()
    }
  }

  window.sendEnergyChat = async () => {
    const input = document.getElementById('energyChatInput')
    const sendBtn = document.getElementById('energyChatSendBtn')
    const message = input?.value?.trim()
    if (!message) return

    if (input) input.value = ''
    if (sendBtn) sendBtn.disabled = true
    appendEnergyChatMessage('user', message)

    const typing = appendEnergyChatMessage(
      'assistant',
      `${activeCompanion.name}正在想怎么说…`,
      'is-typing-row'
    )
    const bubble = typing?.querySelector('.energy-chat-bubble')
    if (bubble) bubble.classList.add('is-typing')

    try {
      const { data } = await api.post(
        '/energy/chat',
        {
          message,
          history: energyChatHistory.slice(-12),
        },
        { timeout: 60000 }
      )
      if (data?.companion_display || data?.companion_avatar) {
        activeCompanion = {
          ...activeCompanion,
          name: data.companion_name || activeCompanion.name,
          display: data.companion_display || activeCompanion.display,
          avatar: data.companion_avatar || activeCompanion.avatar,
        }
        syncCompanionUi(activeCompanion)
      }
      const reply =
        data?.reply || `我是${activeCompanion.name}，在这儿陪着你，可以再具体说说。`
      if (typing) typing.remove()
      appendEnergyChatMessage('assistant', reply)
      energyChatHistory.push({ role: 'user', content: message })
      energyChatHistory.push({ role: 'assistant', content: reply })
      maybeSpeakReply(reply)
    } catch (err) {
      if (typing) typing.remove()
      const fail =
        err.response?.data?.detail ||
        `${activeCompanion.name}这会儿信号有点弱，稍后再聊好吗？`
      appendEnergyChatMessage('assistant', fail)
    } finally {
      if (sendBtn) sendBtn.disabled = false
      input?.focus()
    }
  }

  window.selectCategory = (el, category) => {
    document.querySelectorAll('#energyPlanetTabs .time-type-tag').forEach((tab) => {
      tab.classList.remove('selected', 'is-lit', 'active')
    })
    el.classList.add('selected', 'is-lit', 'active')
    currentCategory = category
    filterProducts()
  }

  window.selectSubcategory = (el, subcategory) => {
    document.querySelectorAll('.subcategory-tab').forEach((tab) => tab.classList.remove('active'))
    el.classList.add('active')
    currentSubcategory = subcategory
    filterProducts()
  }

  window.addToPlan = async (btn, name, productId) => {
    try {
      const { data } = await api.post(`/rewards/products/${productId}/add`)
      if (data.added) {
        btn.classList.add('added')
        btn.textContent = '✓ 已加入'
        alert(`✅ "${name}" 已加入你的计划！`)
      } else {
        btn.classList.remove('added')
        btn.textContent = '加入计划'
      }
    } catch {
      if (btn.classList.contains('added')) {
        btn.classList.remove('added')
        btn.textContent = '加入计划'
      } else {
        btn.classList.add('added')
        btn.textContent = '✓ 已加入'
        alert(`✅ "${name}" 已加入你的计划！`)
      }
    }
  }

  window.addReward = async () => {
    const name = document.getElementById('rewardName')?.value?.trim()
    const desc = document.getElementById('rewardDesc')?.value?.trim()
    const condition = document.getElementById('rewardCondition')?.value || ''
    if (!name) {
      alert('请输入奖励名称')
      return
    }
    try {
      await createUserReward({
        name,
        description: buildRewardDescription(desc, condition),
      })
    } catch {
      const rewardList = document.getElementById('rewardList')
      const rewardItem = document.createElement('div')
      rewardItem.className = 'task-item'
      rewardItem.innerHTML = `
        <div class="task-content">
          <div class="task-title">${name}</div>
          <div class="task-meta">${buildRewardDescription(desc, condition)}</div>
        </div>
        <div class="task-tag" style="background: rgba(212, 185, 106, 0.2); color: var(--accent-gold);">待解锁</div>
      `
      rewardList?.appendChild(rewardItem)
      if (!dashboardData) dashboardData = {}
      dashboardData.rewards = [
        ...(dashboardData.rewards || []),
        { id: Date.now(), name, description: buildRewardDescription(desc, condition), status: 'locked' },
      ]
      refreshRewardPackCustomList()
    }
    const nameInput = document.getElementById('rewardName')
    const descInput = document.getElementById('rewardDesc')
    const condInput = document.getElementById('rewardCondition')
    if (nameInput) nameInput.value = ''
    if (descInput) descInput.value = ''
    if (condInput) condInput.value = ''
  }

  const handlers = [
    'switchTab',
    'confirmTaskComplete',
    'closeTaskPhotoModal',
    'captureTaskPhoto',
    'toggleTaskSocial',
    'likeTaskPost',
    'shareTask',
    'closeInviteModal',
    'copyInviteText',
    'acceptInviteCode',
    'closeDailySummary',
    'lightPlanetNow',
    'closePandoraLater',
    'openPandoraNow',
    'closePandoraReward',
    'openReflectionInput',
    'closeReflectionModal',
    'submitReflection',
    'openWeekendReview',
    'closeWeekendReview',
    'unlockMonthlyGrowthReport',
    'closeMonthlyGrowthReport',
    'expandCommunityFeed',
    'shrinkCommunityFeed',
    'likePost',
    'toggleComment',
    'sharePost',
    'submitComment',
    'sendComment',
    'showUpgradeInfo',
    'upgradeTier',
    'toggleBadgeDisplay',
    'showPlanetDetail',
    'getTimeGoalStatusMap',
    'viewTimeGoal',
    'closeTimeGoalModal',
    'updateTimeGoal',
    'pauseTimeGoal',
    'resumeTimeGoal',
    'abandonTimeGoal',
    'viewRewardPack',
    'closeRewardPackModal',
    'addPackReward',
    'syncPackRewardConditionUi',
    'openShopPick',
    'openAvatarDressModal',
    'closeAvatarDressModal',
    'confirmAvatarDress',
    'resetAvatarDressDraft',
    'setAvatarDressField',
    'openDailyCompletionCurve',
    'closeDailyCompletionCurve',
    'openTodayGrowthQuote',
    'closeTodayGrowthQuote',
    'selectCategory',
    'selectSubcategory',
    'addToPlan',
    'addReward',
    'submitEnergyChat',
    'sendEnergyChat',
    'toggleCompanionVoiceSpeak',
    'toggleCompanionVoiceInput',
    'logoutApp',
  ]

  return () => {
    stopFireworks()
    stopCommunityAutoScroll()
    stopCompanionSpeech()
    try {
      companionRecognition?.stop?.()
    } catch {
      /* ignore */
    }
    companionRecognition = null
    if (communityResumeTimer != null) clearTimeout(communityResumeTimer)
    communityResumeTimer = null
    communityScrollBound = false
    communityExpandLevel = 0
    communityScrollPausedByUser = false
    displayedBadges = []
    currentCategory = 'all'
    currentSubcategory = 'recommended'
    dashboardData = null
    focusedTaskId = null
    inviteShareText = ''
    dailySummaryShownToday = false
    pendingCompleteTaskId = null
    pendingLightPlanetType = null
    lightPromptShownFor = null
    handlers.forEach((name) => delete window[name])
  }
}
