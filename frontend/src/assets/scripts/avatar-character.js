/**
 * 美少女战士立绘 — 按行动类型联动：
 * 生存→看书 / 赚钱→笔记本办公 / 好看→健身 / 好玩→拍照 / 心流→静坐
 */
const POSE_IMAGES = {
  idle: '/images/avatar/sailor-idle.png',
  reading: '/images/avatar/sailor-reading.png',
  laptop: '/images/avatar/sailor-laptop.png',
  fun: '/images/avatar/sailor-fun.png',
  meditate: '/images/avatar/sailor-meditate.png',
  // 健身：腿臂交替四帧
  fitness: [
    '/images/avatar/sailor-run-1.png',
    '/images/avatar/sailor-run-2.png',
    '/images/avatar/sailor-run-3.png',
    '/images/avatar/sailor-run-4.png',
  ],
}

const FITNESS_FRAME_MS = 140

// 预加载健身帧，避免切换时闪白
POSE_IMAGES.fitness.forEach((src) => {
  const img = new Image()
  img.src = src
})

const POSE_BY_TYPE = {
  survival: { pose: 'reading', label: '生存时间中' },
  money: { pose: 'laptop', label: '赚钱时间中' },
  beauty: { pose: 'fitness', label: '好看时间中' },
  fun: { pose: 'fun', label: '好玩时间中' },
  flow: { pose: 'meditate', label: '心流时间中' },
}

let fitnessTimer = null

function stopFitnessAnimation() {
  if (fitnessTimer != null) {
    clearInterval(fitnessTimer)
    fitnessTimer = null
  }
}

function startFitnessAnimation(imgEl) {
  stopFitnessAnimation()
  const frames = POSE_IMAGES.fitness
  if (!imgEl || !frames?.length) return
  let i = 0
  imgEl.src = frames[0]
  fitnessTimer = setInterval(() => {
    i = (i + 1) % frames.length
    imgEl.src = frames[i]
  }, FITNESS_FRAME_MS)
}

/** 根据行动类型匹配人物姿态（ surviv→看书 / money→办公 / beauty→健身 / fun→拍照 / flow→静坐 ） */
export function resolvePoseFromTask(task) {
  if (!task) {
    return { pose: 'idle', label: '空闲时间中', taskTitle: '', timeType: '' }
  }

  const title = String(task.title || '')
  const timeType = task.time_type || ''
  const mapped = POSE_BY_TYPE[timeType] || { pose: 'idle', label: '空闲时间中' }

  return {
    pose: mapped.pose,
    label: mapped.label,
    taskTitle: title,
    timeType,
  }
}

/** 根据今日行动匹配人物姿态；优先使用当前聚焦的行动 */
export function resolveAvatarPose(tasks = [], focusTaskId = null) {
  if (!tasks.length) {
    return resolvePoseFromTask(null)
  }

  let focus = null
  if (focusTaskId != null && focusTaskId !== '') {
    focus = tasks.find((t) => String(t.id) === String(focusTaskId)) || null
  }
  if (!focus) {
    const incomplete = tasks.filter((t) => !t.completed)
    focus = incomplete[0] || tasks[0]
  }
  return resolvePoseFromTask(focus)
}

function poseImageSrc(poseKey) {
  const entry = POSE_IMAGES[poseKey] || POSE_IMAGES.idle
  return Array.isArray(entry) ? entry[0] : entry
}

export function renderAvatarFigure(poseKey = 'idle') {
  const src = poseImageSrc(poseKey)
  const isFitness = poseKey === 'fitness'
  return `
    <img
      class="avatar-img${isFitness ? ' avatar-img-run' : ''}"
      src="${src}"
      alt="美少女战士"
      draggable="false"
      data-pose="${poseKey}"
    />`
}

function bindPoseAnimation(poseKey) {
  stopFitnessAnimation()
  const img = document.querySelector('#avatarCharacter .avatar-img')
  if (!img) return
  if (poseKey === 'fitness') {
    startFitnessAnimation(img)
  }
}

function statusText(label) {
  return `当前状态：${label || '行动中'}`
}

export function renderAvatarPanel(tasks, focusTaskId = null) {
  const state = resolveAvatarPose(tasks, focusTaskId)
  queueMicrotask(() => bindPoseAnimation(state.pose))
  return `
    <div class="avatar-stage" id="avatarStage">
      <div class="avatar-status-top" id="avatarStatusTop">${statusText(state.label)}</div>
      <div class="avatar-character pose-${state.pose}" id="avatarCharacter">
        ${renderAvatarFigure(state.pose)}
      </div>
    </div>`
}

/** 仅更新中心人物姿态，不重绘整颗星球轨道 */
export function updateAvatarPanel(tasks, focusTaskId = null) {
  const stage = document.getElementById('avatarStage')
  if (!stage) return

  const state = resolveAvatarPose(tasks, focusTaskId)
  const character = document.getElementById('avatarCharacter')
  const statusTop = document.getElementById('avatarStatusTop')

  if (character) {
    character.className = `avatar-character pose-${state.pose}`
    character.innerHTML = renderAvatarFigure(state.pose)
    bindPoseAnimation(state.pose)
  }
  if (statusTop) statusTop.textContent = statusText(state.label)
}
