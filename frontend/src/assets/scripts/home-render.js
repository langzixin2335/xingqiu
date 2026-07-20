import { renderAvatarPanel } from './avatar-character.js'

const TIME_TAG = {
  survival: '生存',
  money: '赚钱',
  beauty: '好看',
  fun: '好玩',
  flow: '心流',
}

const ACTION_TAG = {
  survival: '生存行动',
  money: '赚钱行动',
  beauty: '好看行动',
  fun: '好玩行动',
  flow: '心流行动',
}

const PLANET_CONFIG = {
  survival: { name: '生存星球', class: 'planet-survival', float: 1 },
  money: { name: '赚钱星球', class: 'planet-money', float: 2 },
  beauty: { name: '好看星球', class: 'planet-beauty', float: 3 },
  fun: { name: '好玩星球', class: 'planet-fun', float: 4 },
  flow: { name: '心流星球', class: 'planet-flow', float: 5 },
}

// 围绕中心角色的五星方位（百分比定位）
const PLANET_POSITIONS = {
  survival: 'left: 8%; top: 8%;',
  money: 'left: 68%; top: 6%;',
  beauty: 'left: 74%; top: 48%;',
  fun: 'left: 6%; top: 52%;',
  flow: 'left: 38%; top: 72%;',
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/\n/g, ' ')
}

function renderTaskSocial(task) {
  if (!task.completed || !task.post_id) return ''
  const likes = task.likes_count || 0
  const comments = task.comments_count || 0
  const likeUsers = (task.like_users || []).map((n) => escapeHtml(n)).join('、') || '暂无人点赞'
  const commentItems = (task.comments || [])
    .map(
      (c) => `
      <div class="comment-item">
        <span class="comment-user">${escapeHtml(c.author_name)}：</span>
        <span class="comment-text">${escapeHtml(c.content)}</span>
      </div>`
    )
    .join('')

  return `
    <div class="task-social" data-post-id="${task.post_id}">
      <button class="task-social-btn${task.liked ? ' liked' : ''}" onclick="likeTaskPost(this)" data-post-id="${task.post_id}">
        <span class="action-icon">❤️</span>
        <span class="action-count">${likes}</span>
      </button>
      <button class="task-social-btn" onclick="toggleTaskSocial(this)">
        <span class="action-icon">💬</span>
        <span class="action-count">${comments}</span>
      </button>
      <div class="task-social-detail" style="display:none;">
        <div class="task-like-users"><strong>点赞</strong>：${likeUsers}</div>
        <div class="comment-list">${commentItems || '<div class="comment-item"><span class="comment-text">暂无评论</span></div>'}</div>
        <div class="comment-input-area">
          <input type="text" class="comment-input" placeholder="写下你的鼓励..." onkeypress="submitComment(event, this)">
          <button class="comment-send" onclick="sendComment(this)" data-post-id="${task.post_id}">发送</button>
        </div>
      </div>
    </div>`
}

export function renderTasks(tasks, options = {}) {
  const container = document.getElementById('todayTasks')
  if (!container) return

  const focusTaskId = options.focusTaskId ?? null
  const onFocusTask = typeof options.onFocusTask === 'function' ? options.onFocusTask : null

  // 未完成置顶，进页一眼看到要关注的行动
  const ordered = [...(tasks || [])].sort((a, b) => Number(!!a.completed) - Number(!!b.completed))
  const pendingCount = ordered.filter((t) => !t.completed).length

  const descEl = document.getElementById('todayActionsDesc')
  if (descEl) {
    const aiMode = localStorage.getItem('sp_ai_action_mode')
    if (pendingCount <= 0) {
      descEl.textContent = '今日行动已全部完成，继续点亮你的星球'
    } else if (aiMode === 'easy') {
      descEl.textContent = '轻松模式：今日行动已为你减负，先完成一件就很好'
    } else if (aiMode === 'advanced') {
      descEl.textContent = '进阶模式：今日行动已拉高强度，冲一冲更深的点亮'
    } else {
      descEl.textContent = '完成所有行动，获得星球能量碎片'
    }
    descEl.classList.remove('has-pending')
  }

  container.innerHTML = ordered
    .map((task) => {
      const tag = ACTION_TAG[task.time_type] || `${TIME_TAG[task.time_type] || task.time_type}行动`
      const checked = task.completed
      const focused = focusTaskId != null && String(focusTaskId) === String(task.id)
      const pending = !checked
      const actions = checked
        ? `<button class="task-action-btn invite share-friend" onclick="shareTask(this)" title="分享">分享</button>`
        : `
          <button class="task-action-btn invite" onclick="shareTask(this)" title="邀约伙伴">邀约伙伴</button>
          <button class="task-action-btn confirm" onclick="confirmTaskComplete(this)" title="确认完成">确认完成</button>`

      return `
      <div class="task-item${checked ? ' completed' : ' task-pending'}${focused ? ' avatar-focus' : ''}" data-task="${task.id}" data-time-type="${task.time_type}" data-post-id="${task.post_id || ''}" data-completed="${checked ? '1' : '0'}" tabindex="0" role="button" aria-label="${pending ? '待完成行动：' : '已完成行动：'}${escapeHtml(task.title)}">
        <div class="task-type-tag ${task.time_type}">${tag}</div>
        <div class="task-content">
          <div class="task-title">${escapeHtml(task.title)}</div>
          <div class="task-meta">${escapeHtml(task.scheduled_label || (pending ? '今日 · 待完成' : '今日 · 已完成'))}</div>
        </div>
        <div class="task-actions">${actions}</div>
        ${renderTaskSocial(task)}
      </div>`
    })
    .join('')

  const markFocus = (taskId) => {
    container.querySelectorAll('.task-item').forEach((el) => {
      el.classList.toggle('avatar-focus', String(el.dataset.task) === String(taskId))
    })
  }

  container.querySelectorAll('.task-item').forEach((item) => {
    const activate = () => {
      const taskId = item.dataset.task
      if (taskId == null || taskId === '') return
      markFocus(taskId)
      onFocusTask?.(taskId)
    }
    item.addEventListener('pointerenter', activate)
    item.addEventListener('focus', activate)
    item.addEventListener('click', activate)
  })
}

export function renderPlanets(planets, tasks = [], focusTaskId = null) {
  const orbit = document.getElementById('planetOrbit')
  if (!orbit) return

  const byType = Object.fromEntries((planets || []).map((p) => [p.planet_type, p]))
  // 始终渲染五种星球，缺数据时用占位，避免好看星球丢失
  const ordered = Object.keys(PLANET_CONFIG).map((type) => {
    return (
      byType[type] || {
        planet_type: type,
        level: 0,
        max_level: 7,
        energy_fragments: 0,
        fragments_per_light: 7,
        ready_to_light: false,
        progress_percent: 0,
        active: true,
      }
    )
  })

  const defs = `
    <svg class="planet-svg-defs" aria-hidden="true" width="0" height="0">
      <defs>
        <filter id="planetGrain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="3" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0.28 0" result="g"/>
          <feBlend in="SourceGraphic" in2="g" mode="overlay"/>
        </filter>
        <filter id="planetCraters" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="turbulence" baseFrequency="0.55" numOctaves="2" seed="7" stitchTiles="stitch" result="t"/>
          <feDiffuseLighting in="t" lighting-color="#fff" surfaceScale="2.2" result="d">
            <feDistantLight azimuth="225" elevation="48"/>
          </feDiffuseLighting>
          <feComposite in="d" in2="SourceGraphic" operator="in"/>
          <feBlend in="SourceGraphic" in2="d" mode="multiply"/>
        </filter>
      </defs>
    </svg>`

  orbit.innerHTML =
    defs +
    renderAvatarPanel(tasks, focusTaskId) +
    ordered
      .map((planet) => {
        const cfg = PLANET_CONFIG[planet.planet_type]
        if (!cfg) return ''
        const pos = PLANET_POSITIONS[planet.planet_type]
        const level = Math.min(planet.level ?? 0, 7)
        const maxLevel = planet.max_level || 7
        const percent = Math.min(
          100,
          planet.progress_percent ?? Math.round((level / maxLevel) * 100)
        )
        const litRatio = (level / maxLevel).toFixed(3)
        const fullyLit = level >= maxLevel
        const fragments = planet.energy_fragments ?? 0
        const perLight = planet.fragments_per_light || 7
        const ready = !fullyLit && (!!planet.ready_to_light || fragments >= perLight)
        return `
      <div class="planet ${cfg.class} float-${cfg.float} lit-${level}${fullyLit ? ' lit-full' : ''}${ready ? ' ready-light' : ''}" data-planet-type="${planet.planet_type}" style="${pos} --lit-ratio: ${litRatio};" onclick="showPlanetDetail('${planet.planet_type}')">
        <div class="planet-sphere">
          <span class="planet-ring planet-ring-back" aria-hidden="true"></span>
          <div class="planet-body" aria-hidden="true">
            <span class="planet-surface"></span>
            <span class="planet-detail"></span>
            <span class="planet-clouds"></span>
            <span class="planet-terminator"></span>
            <span class="planet-atmosphere"></span>
            <span class="planet-rim"></span>
            <span class="planet-veil"></span>
          </div>
          <span class="planet-ring planet-ring-front" aria-hidden="true"></span>
          ${ready ? `<button type="button" class="planet-light-btn" onclick="event.stopPropagation(); lightPlanetNow('${planet.planet_type}')">点亮</button>` : ''}
        </div>
        <div class="planet-meta">
          <div class="planet-name">${cfg.name}</div>
          <div class="planet-level-row">
            <span class="planet-level">Lv.${level}/${maxLevel}</span>
            <div class="planet-progress" aria-label="点亮进度 ${percent}%">
              <div class="planet-progress-fill" style="width:${percent}%"></div>
            </div>
          </div>
          <div class="planet-fragments-row">
            <div class="planet-fragments${ready ? ' full' : ''}">${fullyLit ? '已完全点亮' : `能量碎片 ${Math.min(fragments, perLight)}/${perLight}`}</div>
          </div>
        </div>
      </div>`
      })
      .join('')
}

export function renderCommunity(posts, options = {}) {
  const feed = document.getElementById('communityFeed')
  if (!feed) return

  const limit = options.limit ?? 10
  const list = (posts || []).slice(0, limit)
  if (!list.length) {
    feed.innerHTML = `<div class="community-empty">暂无行动分享，完成今日行动后会出现在这里</div>`
    window.setupCommunityFeedScroll?.()
    return
  }

  feed.innerHTML = list
    .map(
      (post) => `
    <div class="community-post" data-post-id="${post.id}">
      <div class="post-header">
        <div class="post-avatar">${post.avatar}</div>
        <div class="post-info">
          <div class="post-name">${escapeHtml(post.author_name)}</div>
          <div class="post-meta">刚刚 · 完成${escapeHtml(post.task_title)}</div>
        </div>
        <div class="post-tag ${post.time_type}">${TIME_TAG[post.time_type]}</div>
      </div>
      <div class="post-content">${escapeHtml(post.content)}</div>
      <div class="post-actions">
        <button class="post-action${post.liked ? ' liked' : ''}" onclick="likePost(this)" data-post-id="${post.id}">
          <span class="action-icon">❤️</span>
          <span class="action-count">${post.likes_count}</span>
        </button>
        <button class="post-action" onclick="toggleComment(this)">
          <span class="action-icon">💬</span>
          <span class="action-count">${post.comments_count}</span>
        </button>
      </div>
      <div class="comment-section" style="display: none;">
        <div class="comment-list">
          ${(post.comments || [])
            .map(
              (c) => `
            <div class="comment-item">
              <span class="comment-user">${escapeHtml(c.author_name)}：</span>
              <span class="comment-text">${escapeHtml(c.content)}</span>
            </div>`
            )
            .join('')}
        </div>
        <div class="comment-input-area">
          <input type="text" class="comment-input" placeholder="写下你的鼓励..." onkeypress="submitComment(event, this)">
          <button class="comment-send" onclick="sendComment(this)" data-post-id="${post.id}">发送</button>
        </div>
      </div>
    </div>`
    )
    .join('')

  window.setupCommunityFeedScroll?.()
}

export function renderProducts(products) {
  const grid = document.getElementById('productGrid')
  if (!grid) return

  grid.innerHTML = products
    .map((p) => {
      const badge = p.badge
        ? `<div class="product-badge ${p.badge === '限免' ? 'limited-free' : ''}">${p.badge}</div>`
        : ''
      return `
      <div class="product-card" data-category="${p.category}" data-subcategory="${p.subcategory}" data-product-id="${p.id}">
        ${badge}
        <div class="product-emoji">${p.emoji}</div>
        <div class="product-name">${p.name}</div>
        <div class="product-desc">${p.description}</div>
        <button class="add-btn${p.added ? ' added' : ''}" onclick="addToPlan(this, '${p.name}', ${p.id})">${p.added ? '✓ 已加入' : '加入计划'}</button>
      </div>`
    })
    .join('')
}

/** 展示所有已获得奖励：解锁勋章 + 已解锁礼包/悦己奖励 */
export function renderMyRewards(rewards = [], badges = []) {
  const list = document.getElementById('myRewardsList')
  if (!list) return

  const items = []
  for (const r of rewards || []) {
    if (r.status !== 'unlocked') continue
    const desc = r.description || '已获得奖励'
    const isPandora = /潘多拉/.test(desc)
    const isPlanPack = /计划完成|完成本期|点亮星球后/.test(desc)
    items.push({
      id: `reward-${r.id}`,
      icon: isPandora ? '🎁' : isPlanPack ? '🎟️' : '✨',
      name: r.name,
      desc,
      tag: isPandora ? '潘多拉' : isPlanPack ? '计划礼包' : '悦己奖励',
    })
  }
  for (const b of badges || []) {
    if (!b.unlocked) continue
    items.push({
      id: `badge-${b.id}`,
      icon: b.icon || '🎖️',
      name: b.name,
      desc: '成就勋章',
      tag: '勋章',
      badge: b,
    })
  }

  if (!items.length) {
    list.innerHTML =
      '<div class="my-rewards-empty">还没有获得奖励，完成行动、点亮星球后会出现在这里</div>'
    return
  }

  list.innerHTML = items
    .map((item) => {
      const click =
        item.badge != null
          ? `onclick="toggleBadgeDisplay(this, '${String(item.icon).replace(/'/g, "\\'")}', '${String(item.name).replace(/'/g, "\\'")}')" data-badge-id="${item.badge.id}"`
          : ''
      const displayed =
        item.badge?.displayed
          ? '<span class="my-reward-tag is-display">展示中</span>'
          : `<span class="my-reward-tag">${escapeHtml(item.tag)}</span>`
      return `
    <div class="my-reward-item${item.badge ? ' is-badge' : ''}" ${click}>
      <div class="my-reward-icon">${item.icon}</div>
      <div class="my-reward-info">
        <div class="my-reward-name">${escapeHtml(item.name)}</div>
        <div class="my-reward-desc">${escapeHtml(item.desc)}</div>
      </div>
      ${displayed}
    </div>`
    })
    .join('')
}

export function renderMember(user) {
  const nameEl = document.getElementById('memberName')
  const levelEl = document.getElementById('memberLevel')
  const expireEl = document.querySelector('#tab-member .member-expire')
  if (nameEl) nameEl.textContent = user.nickname
  if (levelEl) levelEl.textContent = `🌟 ${user.member_tier}会员`
  if (expireEl && user.member_expire) {
    expireEl.textContent = `有效期至：${user.member_expire}`
  }

  const card = document.querySelector('#tab-member .member-card')
  if (card && !card.querySelector('#logoutBtn')) {
    const btn = document.createElement('button')
    btn.id = 'logoutBtn'
    btn.className = 'btn btn-outline'
    btn.style.cssText = 'margin-top:12px;width:auto;padding:10px 24px;'
    btn.textContent = '退出登录'
    btn.onclick = () => window.logoutApp?.()
    card.appendChild(btn)
  }
}

/** 与点亮行动一致：优先用后端 progress_percent（含碎片），否则 Lv/满级 */
function planetLevelInfo(planet) {
  const maxLevel = planet?.max_level || 7
  const level = Math.min(Math.max(0, Number(planet?.level) || 0), maxLevel)
  const fragments = Math.min(
    Math.max(0, Number(planet?.energy_fragments) || 0),
    Number(planet?.fragments_per_light) || 7
  )
  const perLight = Number(planet?.fragments_per_light) || 7
  const fromApi = Number(planet?.progress_percent)
  let percent
  if (Number.isFinite(fromApi)) {
    percent = Math.min(100, Math.max(0, Math.round(fromApi)))
  } else if (level >= maxLevel) {
    percent = 100
  } else {
    const total = maxLevel * perLight
    percent = total ? Math.round(((level * perLight + fragments) / total) * 100) : 0
  }
  return { level, maxLevel, percent }
}

function renderMiniPlanetIcon(type, litRatio) {
  const cfg = PLANET_CONFIG[type]
  if (!cfg) return ''
  return `
    <div class="dimension-planet ${cfg.class}" style="--lit-ratio: ${litRatio};" aria-hidden="true">
      <div class="planet-sphere">
        <span class="planet-ring planet-ring-back"></span>
        <div class="planet-body">
          <span class="planet-surface"></span>
          <span class="planet-detail"></span>
          <span class="planet-clouds"></span>
          <span class="planet-terminator"></span>
          <span class="planet-atmosphere"></span>
          <span class="planet-rim"></span>
          <span class="planet-veil"></span>
        </div>
        <span class="planet-ring planet-ring-front"></span>
      </div>
    </div>`
}

export function renderProgress(data) {
  const order = Object.keys(PLANET_CONFIG)
  const byType = Object.fromEntries((data.planets || []).map((p) => [p.planet_type, p]))
  const completeSet = new Set(data?.demo_guides?.plan_complete_planets || [])

  // 真实点亮进度；满级（计划完成）的星球进度 100%，奖励礼包高亮闪烁
  const levelInfos = Object.fromEntries(
    order.map((type) => {
      const info = planetLevelInfo(byType[type])
      if (completeSet.has(type) || info.level >= info.maxLevel) {
        return [type, { ...info, level: info.maxLevel, percent: 100 }]
      }
      return [type, info]
    })
  )
  const rates = order.map((type) => levelInfos[type].percent)
  const overall = Math.round(rates.reduce((a, b) => a + b, 0) / (rates.length || 1))

  // 仍计算成长速度数据，供报告文案使用（界面不再展示五行速度条）
  window.__growthSpeed = normalizePlanetGrowthSpeed(data)

  const ring = document.getElementById('progressRing')
  if (ring) {
    const offset = 326.73 * (1 - overall / 100)
    ring.setAttribute('stroke-dashoffset', String(offset))
  }
  const valueEl = document.querySelector('.progress-ring-value')
  if (valueEl) valueEl.textContent = `${overall}%`

  const list = document.getElementById('dimensionProgress')
  if (list) {
    const hasDefs = Boolean(document.querySelector('.planet-svg-defs, .dimension-planet-defs'))
    const defs = hasDefs
      ? ''
      : `
    <svg class="dimension-planet-defs" aria-hidden="true" width="0" height="0">
      <defs>
        <filter id="planetGrain" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" seed="3" stitchTiles="stitch" result="n"/>
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0 0.6  0 0 0 0.28 0" result="g"/>
          <feBlend in="SourceGraphic" in2="g" mode="overlay"/>
        </filter>
        <filter id="planetCraters" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="turbulence" baseFrequency="0.55" numOctaves="2" seed="7" stitchTiles="stitch" result="t"/>
          <feDiffuseLighting in="t" lighting-color="#fff" surfaceScale="2.2" result="d">
            <feDistantLight azimuth="225" elevation="48"/>
          </feDiffuseLighting>
          <feComposite in="d" in2="SourceGraphic" operator="in"/>
          <feBlend in="SourceGraphic" in2="d" mode="multiply"/>
        </filter>
      </defs>
    </svg>`

    const goalStatusMap =
      typeof window.getTimeGoalStatusMap === 'function' ? window.getTimeGoalStatusMap() : {}

    list.innerHTML =
      defs +
      order
        .map((type) => {
          const { level, maxLevel, percent } = levelInfos[type]
          const litRatio = (level / maxLevel).toFixed(3)
          const planetName = PLANET_CONFIG[type]?.name || `${TIME_TAG[type] || type}星球`
          const status = goalStatusMap[type] || 'active'
          const statusTip =
            status === 'paused' ? '已暂停' : status === 'abandoned' ? '已放弃' : ''
          const planDone = percent >= 100 || completeSet.has(type)
          // 计划完成：奖励礼包持续闪烁高亮，引导领取
          const packBlink = planDone ? ' is-blink is-claimable' : ''
          return `
      <div class="dimension-item${status !== 'active' ? ` is-${status}` : ''}${planDone ? ' is-plan-complete' : ''}" data-planet-type="${type}">
        ${renderMiniPlanetIcon(type, litRatio)}
        <div class="dimension-info">
          <div class="dimension-name">
            <span class="dimension-title">${planetName}-点亮进度${percent}%<span class="dimension-lv">Lv.${level}/${maxLevel}</span>${statusTip ? `<span class="dimension-status-tag">${statusTip}</span>` : ''}${planDone ? '<span class="dimension-status-tag is-complete">计划完成</span>' : ''}</span>
          </div>
          <div class="dimension-bottom">
            <div class="dimension-bar-wrap">
              <div class="dimension-bar">
                <div class="dimension-bar-fill ${type}" style="width: ${percent}%"></div>
              </div>
            </div>
            <div class="dimension-goal-actions">
              <button type="button" class="dimension-goal-btn" onclick="viewTimeGoal('${type}')">查看计划</button>
              <button type="button" class="dimension-goal-btn dimension-reward-pack-btn${packBlink}" onclick="viewRewardPack('${type}')">${planDone ? '领取礼包' : '奖励礼包'}</button>
            </div>
          </div>
        </div>
      </div>`
        })
        .join('')
  }

  window.__weeklyCompletion = data.weekly_completion || []
  renderGrowthTemplateReport(data, overall)
  syncSeasonBossUnlock(levelInfos)
}

/** 当前自然季度：1–3月 Q1 … 10–12月 Q4 */
function currentSeasonQuarter() {
  const month = new Date().getMonth() // 0–11
  return `Q${Math.floor(month / 3) + 1}`
}

/**
 * 任意 3 个星球计划完成度达 100% 时，高亮「当前季度」Boss 战按钮；其余保持置灰待解锁。
 */
export function syncSeasonBossUnlock(levelInfos) {
  const list = document.getElementById('growthBossList')
  if (!list) return

  const infos =
    levelInfos ||
    Object.fromEntries(
      Object.keys(PLANET_CONFIG).map((type) => [type, { percent: 0 }])
    )
  const completedCount = Object.values(infos).filter((info) => (info?.percent || 0) >= 100).length
  const canUnlock = completedCount >= 3
  const activeQuarter = currentSeasonQuarter()

  list.querySelectorAll('[data-boss-unlock]').forEach((btn) => {
    const quarter = btn.getAttribute('data-boss-unlock')
    const unlocked = canUnlock && quarter === activeQuarter
    btn.classList.toggle('is-locked', !unlocked)
    btn.classList.toggle('is-unlocked', unlocked)
    btn.disabled = !unlocked
    btn.textContent = unlocked ? '已解锁' : '待解锁'
    btn.title = unlocked
      ? '已满足条件，可报名参与本季线下活动'
      : canUnlock
        ? '当前不在该赛季时间'
        : `再完成 ${Math.max(0, 3 - completedCount)} 个星球计划即可解锁本季权益`
  })

  list.querySelectorAll('.growth-boss-item').forEach((item) => {
    const quarter = item.getAttribute('data-quarter')
    item.classList.toggle('is-active-season', canUnlock && quarter === activeQuarter)
  })
}

function formatReportDate(d) {
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}.${dd}`
}

function normalizePlanetGrowthSpeed(data) {
  const raw = data?.planet_growth_speed || {}
  return Object.keys(PLANET_CONFIG).map((type) => {
    const item = raw[type] || {}
    const daily = Array.isArray(item.daily) ? item.daily.map((n) => Number(n) || 0) : [0, 0, 0, 0, 0, 0, 0]
    const count = Number(item.count)
    const safeCount = Number.isFinite(count) ? count : daily.reduce((a, b) => a + b, 0)
    const perDay = Number(item.per_day)
    return {
      type,
      name: PLANET_CONFIG[type].name,
      label: `${TIME_TAG[type]}时间`,
      count: safeCount,
      perDay: Number.isFinite(perDay) ? perDay : Math.round((safeCount / 7) * 100) / 100,
      daily: daily.length === 7 ? daily : [0, 0, 0, 0, 0, 0, 0],
    }
  })
}

function buildGrowthReportModel(data, overall) {
  const weekly = Array.isArray(data.weekly_completion) ? data.weekly_completion : []
  const weekAvg = weekly.length
    ? Math.round(weekly.reduce((sum, n) => sum + (Number(n) || 0), 0) / weekly.length)
    : 0
  const streak = data.streak || {}
  const currentStreak = Number(streak.current) || 0
  const longestStreak = Number(streak.longest) || 0
  const totalDays = Number(streak.total_days) || 0

  const speeds = window.__growthSpeed?.length
    ? window.__growthSpeed
    : normalizePlanetGrowthSpeed(data)
  const ranked = [...speeds].sort((a, b) => (b.count || 0) - (a.count || 0))
  const strongest = ranked[0]
  const weakest = ranked[ranked.length - 1]
  const spread = (strongest?.count || 0) - (weakest?.count || 0)
  const totalGrowth = speeds.reduce((sum, i) => sum + (i.count || 0), 0)

  const first = weekly[0] ?? 0
  const last = weekly[weekly.length - 1] ?? 0
  const trend = last - first
  const trendLabel = trend > 8 ? '上升' : trend < -8 ? '回落' : '平稳'

  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 6)
  const periodText = data._weekendPeriodLabel
    ? String(data._weekendPeriodLabel)
    : `${formatReportDate(start)} – ${formatReportDate(today)}`
  const periodTitle = data._weekendPeriodTitle ? String(data._weekendPeriodTitle) : '近7日'

  const summaries = []
  if (weekAvg >= 80) {
    summaries.push(`近7日行动完成率均值 ${weekAvg}%，节奏稳定，完成质量很高。`)
  } else if (weekAvg >= 50) {
    summaries.push(`近7日行动完成率均值 ${weekAvg}%，整体在推进，仍有可提升空间。`)
  } else if (weekAvg > 0) {
    summaries.push(`近7日行动完成率均值 ${weekAvg}%，当前偏轻，建议先守住每天 1–2 项关键行动。`)
  } else {
    summaries.push('近7日暂无行动完成记录，从今天开始点亮，报告会逐步丰满起来。')
  }

  if (currentStreak > 0) {
    summaries.push(
      `已连续打卡 ${currentStreak} 天${longestStreak > currentStreak ? `，历史最长 ${longestStreak} 天` : ''}，坚持本身就是成长。`
    )
  } else if (totalDays > 0) {
    summaries.push(`累计行动日 ${totalDays} 天，重新接上节奏后，连续打卡会再次亮起。`)
  }

  if (totalGrowth > 0 && strongest && weakest && spread >= 2) {
    summaries.push(
      `近7日成长最快的是「${strongest.name}」（${strongest.count} 次，约 ${strongest.perDay.toFixed(1)} 次/天），最慢的是「${weakest.name}」（${weakest.count} 次）。`
    )
  } else if (totalGrowth > 0) {
    summaries.push(
      `近7日各星球成长速度较接近，合计完成 ${totalGrowth} 次行动，整体计划进度约 ${overall}%。`
    )
  }

  if (data.core_goal) {
    summaries.push(`你正围绕核心目标「${data.core_goal}」推进，建议把每日行动与该目标对齐。`)
  }

  let advice = '下周先保证每日行动有记录，再逐步提高完成比例。'
  if (weakest && (weakest.count || 0) === 0 && totalGrowth > 0) {
    advice = `「${weakest.name}」近7日几乎没有推进，建议为「${weakest.label}」安排至少 2–3 次行动，补上成长速度。`
  } else if (weakest && spread >= 2) {
    advice = `建议下周把更多精力分给「${weakest.name}」，哪怕每天一次微行动，也能拉近与其他星球的速度差。`
  } else if (weekAvg < 60) {
    advice = '建议把行动拆得更小、更容易完成，先稳住完成率，再加难度。'
  } else if (trend < -8) {
    advice = '近几日完成率有所回落，可先恢复最熟悉的一项行动，把节奏接回来。'
  } else if (weekAvg >= 80 && strongest) {
    advice = `状态很好。可在「${strongest.name}」上设定一个稍难一点的挑战，冲刺下一阶段。`
  }

  return {
    periodTitle,
    periodText,
    weekAvg,
    currentStreak,
    totalDays,
    strongest,
    weakest,
    trendLabel,
    weekly,
    summaries,
    advice,
  }
}

/** 完成度 0–100 → 0–5 星（半星步进） */
function computeGrowthStars(percent) {
  const pct = Math.max(0, Math.min(100, Number(percent) || 0))
  return Math.round((pct / 100) * 5 * 2) / 2
}

function formatStarLabel(stars) {
  const n = Number(stars) || 0
  if (n % 1 === 0) return `${n}星`
  return `${n}星`
}

/** 五星达成度：满星 / 半星亮起，其余空心 */
function renderGrowthStars(stars, classPrefix = 'growth-stars') {
  const value = Math.max(0, Math.min(5, Number(stars) || 0))
  const items = []
  for (let i = 1; i <= 5; i++) {
    let state = 'empty'
    if (value >= i) state = 'full'
    else if (value >= i - 0.5) state = 'half'
    items.push(
      `<span class="${classPrefix}-star is-${state}" aria-hidden="true">
        <span class="${classPrefix}-star-base">★</span>
        <span class="${classPrefix}-star-fill">★</span>
      </span>`
    )
  }
  return `
    <div class="${classPrefix}" role="img" aria-label="成长达成度 ${formatStarLabel(value)}">
      <span class="${classPrefix}-label">成长达成度</span>
      <span class="${classPrefix}-track">${items.join('')}</span>
      <span class="${classPrefix}-text">${formatStarLabel(value)}</span>
    </div>`
}

/** 周行动回顾：指标卡片版 */
export function renderGrowthReport(data, overall, rootId = 'weekendGrowthReport') {
  const root = document.getElementById(rootId)
  if (!root) return

  const model = buildGrowthReportModel(data, overall)
  const spark = (model.weekly.length ? model.weekly : [0, 0, 0, 0, 0, 0, 0])
    .map((v) => {
      const h = Math.max(8, Math.round(((Number(v) || 0) / 100) * 36))
      return `<span class="growth-report-spark-bar" style="height:${h}px" title="${Number(v) || 0}%"></span>`
    })
    .join('')

  root.innerHTML = `
    <div class="growth-report-head">
      <div class="growth-report-meta">
        <span class="growth-report-period">${model.periodTitle || '近7日'}</span>
        <span class="growth-report-dates">${model.periodText}</span>
        <span class="growth-report-trend">走势${model.trendLabel}</span>
      </div>
    </div>

    <div class="growth-report-metrics">
      <div class="growth-report-metric">
        <div class="growth-report-metric-value">${model.weekAvg}<span>%</span></div>
        <div class="growth-report-metric-label">周均完成率</div>
      </div>
      <div class="growth-report-metric">
        <div class="growth-report-metric-value">${model.currentStreak}<span>天</span></div>
        <div class="growth-report-metric-label">连续打卡</div>
      </div>
      <div class="growth-report-metric">
        <div class="growth-report-metric-value">${model.totalDays}<span>天</span></div>
        <div class="growth-report-metric-label">累计行动日</div>
      </div>
    </div>

    <div class="growth-report-balance">
      <div class="growth-report-balance-row">
        <div class="growth-report-chip is-strong">
          <span class="growth-report-chip-label">成长最快</span>
          <span class="growth-report-chip-value">${escapeHtml(model.strongest?.name || '—')} ${model.strongest?.count ?? 0}次</span>
        </div>
        <div class="growth-report-chip is-weak">
          <span class="growth-report-chip-label">成长最慢</span>
          <span class="growth-report-chip-value">${escapeHtml(model.weakest?.name || '—')} ${model.weakest?.count ?? 0}次</span>
        </div>
      </div>
      <div class="growth-report-spark" aria-hidden="true">${spark}</div>
      <div class="growth-report-spark-caption">近7日每日行动完成比例</div>
    </div>

    <div class="growth-report-body">
      <div class="growth-report-section-label">分析摘要</div>
      ${model.summaries.map((text) => `<p class="growth-report-para">${escapeHtml(text)}</p>`).join('')}
      <div class="growth-report-advice">
        <div class="growth-report-section-label">下阶段建议</div>
        <p class="growth-report-para">${escapeHtml(model.advice)}</p>
      </div>
    </div>
  `
}

function scoreFromCount(count, maxCount) {
  if (maxCount <= 0) return 5
  const ratio = Math.max(0, Math.min(1, count / maxCount))
  return Math.max(3, Math.min(10, Math.round(3 + ratio * 7)))
}

function buildGrowthTemplateModel(data, overall) {
  const weekly = Array.isArray(data.weekly_completion) ? data.weekly_completion : []
  const weekAvg = weekly.length
    ? Math.round(weekly.reduce((sum, n) => sum + (Number(n) || 0), 0) / weekly.length)
    : 0
  const streak = data.streak || {}
  const currentStreak = Number(streak.current) || 0
  const longestStreak = Number(streak.longest) || 0
  const tasks = Array.isArray(data.tasks) ? data.tasks : []
  const badges = Array.isArray(data.badges) ? data.badges.filter((b) => b.unlocked) : []
  const phases = Array.isArray(data.plan_phases) ? data.plan_phases : []

  const speeds = window.__growthSpeed?.length
    ? window.__growthSpeed
    : normalizePlanetGrowthSpeed(data)
  const ranked = [...speeds].sort((a, b) => (b.count || 0) - (a.count || 0))
  const strongest = ranked[0]
  const weakest = ranked[ranked.length - 1]
  const totalGrowth = speeds.reduce((sum, i) => sum + (i.count || 0), 0)
  const maxCount = Math.max(...speeds.map((s) => s.count), 1)

  const first = weekly[0] ?? 0
  const last = weekly[weekly.length - 1] ?? 0
  const trend = last - first

  const today = new Date()
  const periodLabel = `${today.getFullYear()}年${today.getMonth() + 1}月`
  const start = new Date(today)
  start.setDate(today.getDate() - 6)
  const rangeText = `${formatReportDate(start)} – ${formatReportDate(today)}`

  let keyword = '蓄力启动'
  if (weekAvg >= 80 && currentStreak >= 3) keyword = '稳定推进'
  else if (trend < -8) keyword = '重建节奏'
  else if (totalGrowth >= 10) keyword = '加速成长'
  else if (weekAvg >= 50) keyword = '有序推进'
  else if (currentStreak > 0) keyword = '重建秩序'

  const highlights = []
  tasks
    .filter((t) => t.completed)
    .slice(0, 2)
    .forEach((t) => {
      highlights.push(`完成「${t.title}」，推进${TIME_TAG[t.time_type] || ''}时间`)
    })
  if (currentStreak >= 3) {
    highlights.push(
      `连续打卡 ${currentStreak} 天${longestStreak > currentStreak ? `（历史最长 ${longestStreak} 天）` : ''}`
    )
  }
  if (strongest?.count > 0) {
    highlights.push(`${strongest.name}近7日完成 ${strongest.count} 次，成长速度领先`)
  }
  badges.slice(0, 1).forEach((b) => {
    highlights.push(`解锁勋章「${b.name}」`)
  })
  if (data.core_goal && overall >= 30) {
    highlights.push(`围绕核心目标「${data.core_goal}」持续推进，总进度 ${overall}%`)
  }
  if (!highlights.length) {
    highlights.push('本周期尚在起步，完成今日第一项行动即可点亮高光')
  }

  const timeInventory = speeds.map((s) => {
    const related = tasks
      .filter((t) => t.time_type === s.type)
      .map((t) => t.title)
      .slice(0, 3)
    const score = scoreFromCount(s.count, maxCount)
    const pct = totalGrowth > 0 ? Math.round((s.count / totalGrowth) * 100) : 0
    const detail =
      related.length > 0
        ? related.join('、')
        : s.count > 0
          ? `近7日完成 ${s.count} 次行动`
          : '本周期暂无完成记录'
    return { label: s.label, score, pct, detail, count: s.count }
  })

  const overTarget = timeInventory.filter((t) => t.score >= 8).map((t) => t.label)
  const underTarget = timeInventory.filter((t) => t.score <= 5).map((t) => t.label)
  let summary = ''
  if (totalGrowth === 0) {
    summary =
      '本周期五种时间推进偏轻，还没有形成稳定完成节奏。建议先锁定每天 1–2 项关键行动，把打卡接起来。'
  } else {
    const parts = []
    if (overTarget.length) parts.push(`${overTarget.join('、')}表现较好，完成质量过线`)
    if (underTarget.length) parts.push(`${underTarget.join('、')}占比偏低，挤占了整体平衡`)
    if (!parts.length) parts.push('五种时间推进相对均衡')
    parts.push(
      `近7日行动完成率均值 ${weekAvg}%，成长最快为${strongest?.name || '—'}，最慢为${weakest?.name || '—'}`
    )
    summary = `${parts.join('；')}。`
  }

  const harvests = []
  harvests.push({
    tag: '认知升级',
    text:
      weekAvg >= 60 || currentStreak >= 3
        ? '不再追求一次做完美，优先把行动做完、做持续；完成比完美更重要。'
        : '开始意识到节奏比爆发更重要，下一步重点是把每日行动变成可重复的小闭环。',
  })
  harvests.push({
    tag: '能力突破',
    text:
      strongest?.count > 0
        ? `在「${strongest.label}」上形成了可见输出（近7日 ${strongest.count} 次），证明小步推进有效。`
        : '能力突破尚在蓄力，完成第一轮连续打卡后会更快出现。',
  })
  harvests.push({
    tag: '关系滋养',
    text:
      badges.length >= 2
        ? `已解锁 ${badges.length} 枚勋章，星球社区与自我激励在互相喂养。`
        : '完成行动后分享到星球社区，能获得同频伙伴的反馈与能量。',
  })

  const unfinished = tasks.filter((t) => !t.completed)
  const unfinishedText = unfinished.length
    ? unfinished
        .slice(0, 2)
        .map((t) => t.title)
        .join('、')
    : '暂无明确未完成项'
  const unfinishedReason = unfinished.length
    ? weekAvg < 50
      ? '时间被碎片事项打散，能量分配不足'
      : '执行时段不稳定，深度专注被打断'
    : '保持现状，继续巩固完成节奏'
  const recurring =
    (weakest?.count || 0) === 0 && totalGrowth > 0
      ? `${weakest.label}长期被挤占，深度推进容易被生存琐事打断`
      : trend < -8
        ? '完成率起伏偏大，节奏难稳住'
        : '碎片时间多，固定专注时段尚未形成习惯'
  const optimizeAction =
    weakest && (weakest.count || 0) < (strongest?.count || 0)
      ? `每天为「${weakest.label}」预留固定 15–30 分钟，先做再优化`
      : '每天固定 1 小时深度时间，先完成最重要的一项行动'

  let nextKeyword = '落地行动'
  if (weekAvg < 50) nextKeyword = '重建节奏'
  else if ((weakest?.count || 0) === 0) nextKeyword = '补齐短板'
  else if (weekAvg >= 80) nextKeyword = '加码挑战'

  const nextGoals = []
  if (data.core_goal) nextGoals.push(`继续推进核心目标「${data.core_goal}」`)
  if (weakest) {
    const targetPct = Math.min(
      35,
      Math.max(18, (weakest.count / Math.max(totalGrowth, 1)) * 100 + 10)
    )
    nextGoals.push(`把「${weakest.label}」完成占比提升到约 ${Math.round(targetPct)}%`)
  }
  nextGoals.push(
    currentStreak > 0
      ? `连续打卡保持并冲击 ${Math.max(7, currentStreak + 3)} 天`
      : '重建连续打卡，先完成 3 天不断档'
  )
  if (phases[0]?.title) nextGoals.push(`推进当前阶段：${phases[0].title}`)

  // 成长达成度：周均完成率与计划总进度各半，映射为五星（支持半星）
  const starPercent = Math.round(weekAvg * 0.6 + (Number(overall) || 0) * 0.4)
  const starValue = computeGrowthStars(starPercent)

  return {
    periodLabel,
    rangeText,
    keyword,
    starValue,
    highlights: highlights.slice(0, 4),
    timeInventory,
    summary,
    harvests,
    bottleneck: {
      unfinished: unfinishedText,
      reason: unfinishedReason,
      recurring,
      optimize: optimizeAction,
    },
    nextPlan: {
      keyword: nextKeyword,
      goals: nextGoals.slice(0, 4),
      increase: weakest ? [weakest.label] : ['赚钱时间', '心流时间'],
      decrease:
        strongest && strongest.type === 'survival' && (strongest.count || 0) > 0
          ? ['无计划的碎片生存事务']
          : ['临时插入的低价值琐事'],
      microActions: [
        '每天上午固定 1 小时专注时段，先做最重要行动',
        weakest
          ? `为「${weakest.label}」设置提醒，完成后立即打卡`
          : '每晚花 5 分钟复盘今日五种时间',
        '行动完成后分享到星球社区，用反馈巩固习惯',
      ],
    },
  }
}

function renderNumberedList(items, className = 'growth-tpl-ol') {
  return `<ol class="${className}">${items
    .map((text) => `<li>${escapeHtml(text)}</li>`)
    .join('')}</ol>`
}

function monthlyGrowthReportKey() {
  const now = new Date()
  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  return `sp_monthly_growth_report_${ym}`
}

export function isMonthlyGrowthReportUnlocked() {
  try {
    return localStorage.getItem(monthlyGrowthReportKey()) === '1'
  } catch {
    return false
  }
}

export function syncMonthlyGrowthReportGate() {
  const gate = document.getElementById('growthReportGate')
  const report = document.getElementById('growthTemplateReport')
  if (!gate || !report) return
  const unlocked = isMonthlyGrowthReportUnlocked()
  gate.classList.toggle('hidden', unlocked)
  report.classList.toggle('hidden', !unlocked)
}

/** 成长总览：月度报告模版（一到五章节，需解锁后查看） */
export function renderGrowthTemplateReport(data, overall) {
  const root = document.getElementById('growthTemplateReport')
  if (!root) return

  const model = buildGrowthTemplateModel(data, overall)
  const inventoryHtml = model.timeInventory
    .map(
      (t) => `
      <div class="growth-tpl-time-item">
        <div class="growth-tpl-time-main">
          <span class="growth-tpl-time-name">${escapeHtml(t.label)}</span>
          <span class="growth-tpl-time-score">${t.score}分</span>
          <span class="growth-tpl-time-sep">|</span>
          <span class="growth-tpl-time-pct">${t.pct}%</span>
        </div>
        <div class="growth-tpl-time-detail">${escapeHtml(t.detail)}</div>
      </div>`
    )
    .join('')

  const harvestHtml = model.harvests
    .map(
      (h, i) =>
        `<li><strong>${i + 1}. ${escapeHtml(h.tag)}：</strong>${escapeHtml(h.text)}</li>`
    )
    .join('')

  root.innerHTML = `
    <div class="growth-tpl-head">
      <div class="growth-tpl-head-row">
        <h3 class="growth-tpl-title">月度个人成长报告</h3>
        <button type="button" class="growth-tpl-close" onclick="closeMonthlyGrowthReport()" aria-label="关闭报告">×</button>
      </div>
      ${renderGrowthStars(model.starValue, 'growth-stars')}
      <div class="growth-tpl-meta-lines">
        <div><span class="growth-tpl-meta-key">周期</span>${escapeHtml(model.periodLabel)}（近7日 ${escapeHtml(model.rangeText)}）</div>
        <div><span class="growth-tpl-meta-key">关键词</span>${escapeHtml(model.keyword)}</div>
      </div>
    </div>

    <section class="growth-tpl-section">
      <h4 class="growth-tpl-h">一、高光时刻</h4>
      ${renderNumberedList(model.highlights)}
    </section>

    <section class="growth-tpl-section">
      <h4 class="growth-tpl-h">二、五种时间盘点</h4>
      <div class="growth-tpl-time-list">${inventoryHtml}</div>
      <div class="growth-tpl-summary">
        <span class="growth-tpl-summary-label">小结</span>
        <p>${escapeHtml(model.summary)}</p>
      </div>
    </section>

    <section class="growth-tpl-section">
      <h4 class="growth-tpl-h">三、本月成长收获</h4>
      <ol class="growth-tpl-ol">${harvestHtml}</ol>
    </section>

    <section class="growth-tpl-section">
      <h4 class="growth-tpl-h">四、卡点与反思</h4>
      <ol class="growth-tpl-ol">
        <li><strong>未完成：</strong>${escapeHtml(model.bottleneck.unfinished)}。<strong>原因：</strong>${escapeHtml(model.bottleneck.reason)}。</li>
        <li><strong>反复问题：</strong>${escapeHtml(model.bottleneck.recurring)}。</li>
        <li><strong>优化动作：</strong>${escapeHtml(model.bottleneck.optimize)}。</li>
      </ol>
    </section>

    <section class="growth-tpl-section growth-tpl-section-last">
      <h4 class="growth-tpl-h">五、下月规划</h4>
      <div class="growth-tpl-plan-keyword">关键词：${escapeHtml(model.nextPlan.keyword)}</div>
      <div class="growth-tpl-sublabel">核心目标</div>
      ${renderNumberedList(model.nextPlan.goals)}
      <div class="growth-tpl-adjust">
        <div><strong>时间调整：</strong></div>
        <div>增加：${escapeHtml(model.nextPlan.increase.join('、'))}</div>
        <div>减少：${escapeHtml(model.nextPlan.decrease.join('、'))}</div>
      </div>
      <div class="growth-tpl-sublabel">落地小动作</div>
      ${renderNumberedList(model.nextPlan.microActions)}
    </section>
    <div class="growth-tpl-footer">
      <button type="button" class="btn btn-secondary growth-tpl-close-btn" onclick="closeMonthlyGrowthReport()">收起报告</button>
    </div>
  `

  syncMonthlyGrowthReportGate()
}

export function renderPlanPhases(phases, coreGoal, plans = [], activePlanId = null) {
  const timeline = document.getElementById('planPhaseTimeline')
  const desc = document.getElementById('planCoreGoalDesc')
  const switcher = document.getElementById('planSwitcher')
  if (!timeline) return

  const list = Array.isArray(plans) ? plans : []
  const activeId = activePlanId ?? list.find((p) => p.is_active)?.id ?? list[0]?.id ?? null
  const active = list.find((p) => p.id === activeId) || null
  const showPhases = active?.phases?.length ? active.phases : phases || []
  const showGoal = active?.core_goal || coreGoal

  if (switcher) {
    if (list.length >= 1) {
      switcher.innerHTML = list
        .map((p, idx) => {
          const label = (p.core_goal || `计划 ${idx + 1}`).slice(0, 18)
          const selected = p.id === activeId
          return `<button type="button" class="plan-switch-chip${selected ? ' active' : ''}" onclick="switchHomePlan(${p.id})" title="${escapeHtml(p.core_goal || label)}">${escapeHtml(label)}</button>`
        })
        .join('')
      switcher.classList.remove('hidden')
    } else {
      switcher.innerHTML = ''
      switcher.classList.add('hidden')
    }
  }

  if (desc) {
    if (list.length > 1 && showGoal) {
      desc.textContent = `当前：${showGoal}（点上方标签可切换其他计划）`
    } else if (showGoal) {
      desc.textContent = `核心目标：${showGoal}`
    } else {
      desc.textContent = '查看你的长期成长路径与当前阶段'
    }
  }

  if (!showPhases?.length) {
    timeline.innerHTML = '<div class="plan-phase-empty">确认计划后，这里将展示你的阶段成长路径</div>'
    return
  }

  timeline.innerHTML = showPhases
    .map(
      (phase, index) => `
    <div class="plan-phase-item${index === 0 ? ' current' : ''}">
      <div class="plan-phase-header">
        <span class="plan-phase-label">${escapeHtml(phase.phase_label || `阶段 ${index + 1}`)}</span>
        <span class="plan-phase-progress">${phase.progress_percent ?? 0}%</span>
      </div>
      <div class="plan-phase-goal">${escapeHtml(phase.title)}</div>
      ${phase.action ? `<div class="plan-phase-action">${escapeHtml(phase.action)}</div>` : ''}
      <div class="plan-phase-bar"><div class="plan-phase-bar-fill" style="width:${phase.progress_percent ?? 0}%"></div></div>
      <div class="plan-phase-tag ${phase.time_type}">${TIME_TAG[phase.time_type] || phase.time_type}</div>
    </div>`
    )
    .join('')
}

export function renderStreak(_streak) {
  // 今日行动区不再展示「连续 N 天」，避免制造焦虑
}

export function renderWeekendReview(review) {
  const card = document.getElementById('weekendReviewCard')
  const text = document.getElementById('weekendReviewText')
  if (!card || !text) return
  if (!review) {
    card.classList.add('hidden')
    return
  }

  const titleEl = document.getElementById('weekendReviewTitle')
  const btn = document.getElementById('weekendReviewBtn')
  const lockTag = document.getElementById('weekendReviewLockTag')
  const count = Number(review.week_completions) || 0
  const streakDays = Number(review.current_streak) || 0
  const weekLabel = String(review.week_label || '').trim()
  const isCurrent = review.period === 'current'
  const periodPrefix = isCurrent
    ? weekLabel
      ? `本周（${weekLabel}）`
      : '本周'
    : weekLabel
      ? `上周（${weekLabel}）`
      : '上周'
  const message = isCurrent
    ? `${periodPrefix}已完成${count}个行动，连续保持行动完成${streakDays}天。本周复盘已解锁，欢迎查看；`
    : `${periodPrefix}已完成${count}个行动，连续保持行动完成${streakDays}天。本周复盘将在周日解锁，敬请期待；`

  if (titleEl) {
    titleEl.textContent = isCurrent ? '周行动回顾 · 本周' : '周行动回顾 · 上周'
  }
  text.textContent = message
  if (btn) btn.textContent = review.button_label || (isCurrent ? '查看本周行动回顾' : '查看上周行动回顾')
  if (lockTag) {
    lockTag.classList.toggle('hidden', !review.current_week_locked)
  }
  card.classList.remove('hidden')
}
