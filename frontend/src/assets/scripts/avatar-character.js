/**
 * 美少女战士立绘 — 五位人物全员姿态联动 + 换装
 * 生存→看书 / 赚钱→笔记本办公 / 好看→对镜打扮 / 好玩→拍照 / 心流→静坐
 */
import {
  accessoryMarkup,
  getCharacter,
  getCharacterPoseSrc,
  loadAvatarLook,
  normalizeLook,
  recolorAvatarSrc,
  saveAvatarLook,
} from './avatar-look.js'

const POSE_BY_TYPE = {
  survival: { pose: 'reading', label: '生存时间中' },
  money: { pose: 'laptop', label: '赚钱时间中' },
  beauty: { pose: 'beauty', label: '好看时间中' },
  fun: { pose: 'fun', label: '好玩时间中' },
  flow: { pose: 'meditate', label: '心流时间中' },
}

let applyToken = 0
let currentLook = loadAvatarLook()

export function getCurrentAvatarLook() {
  return normalizeLook(currentLook)
}

export function setCurrentAvatarLook(look) {
  currentLook = normalizeLook(look)
  return currentLook
}

/** 按五行人格同步默认战士（用户未在换装里锁定人物时） */
export function syncAvatarLookFromPersonality(personality) {
  const next = loadAvatarLook(personality)
  currentLook = next
  if (next.source !== 'user') {
    saveAvatarLook(next, { asUserPick: false })
  }
  return next
}

export function resolvePoseImageSrc(poseKey = 'idle', look = currentLook) {
  const cfg = normalizeLook(look)
  return getCharacterPoseSrc(cfg.characterId, poseKey)
}

async function resolvePoseSrc(poseKey, look) {
  const src = resolvePoseImageSrc(poseKey, look)
  return recolorAvatarSrc(src, look)
}

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

export function renderAvatarFigure(poseKey = 'idle', look = currentLook) {
  const cfg = normalizeLook(look)
  const src = resolvePoseImageSrc(poseKey, cfg)
  const ch = getCharacter(cfg.characterId)
  const aura = cfg.aura && cfg.aura !== 'none' ? ` aura-${cfg.aura}` : ''
  return `
    <div class="avatar-figure${aura}" data-pose="${poseKey}" data-character="${ch.id}">
      ${accessoryMarkup(cfg.accessory)}
      <img
        class="avatar-img"
        src="${src}"
        alt="${ch.name}"
        draggable="false"
        data-pose="${poseKey}"
        data-base-src="${src}"
      />
    </div>`
}

function applyFigureLayers(figure, look) {
  if (!figure) return
  const cfg = normalizeLook(look)
  figure.className = `avatar-figure${cfg.aura && cfg.aura !== 'none' ? ` aura-${cfg.aura}` : ''}`
  figure.dataset.character = cfg.characterId
  figure.querySelectorAll('.avatar-acc').forEach((el) => el.remove())
  figure.insertAdjacentHTML('afterbegin', accessoryMarkup(cfg.accessory))
}

async function bindPoseWithLook(poseKey, look) {
  const token = ++applyToken
  const character = document.getElementById('avatarCharacter')
  const img = character?.querySelector('.avatar-img')
  if (!img) return

  try {
    const baseSrc = resolvePoseImageSrc(poseKey, look)
    img.dataset.baseSrc = baseSrc
    img.dataset.pose = poseKey
    const src = await resolvePoseSrc(poseKey, look)
    if (token !== applyToken) return
    img.src = src
    applyFigureLayers(character.querySelector('.avatar-figure'), look)
  } catch {
    // 重上色失败时保留原图
  }
}

function statusText(label) {
  return `当前状态：${label || '行动中'}`
}

export function renderAvatarPanel(tasks, focusTaskId = null) {
  const state = resolveAvatarPose(tasks, focusTaskId)
  const look = getCurrentAvatarLook()
  queueMicrotask(() => {
    bindPoseWithLook(state.pose, look)
  })
  return `
    <div class="avatar-stage" id="avatarStage">
      <div class="avatar-status-top" id="avatarStatusTop">${statusText(state.label)}</div>
      <div class="avatar-character pose-${state.pose}" id="avatarCharacter">
        ${renderAvatarFigure(state.pose, look)}
      </div>
      <button type="button" class="avatar-dress-btn" id="avatarDressBtn" onclick="openAvatarDressModal()">去换装</button>
    </div>`
}

export function updateAvatarPanel(tasks, focusTaskId = null) {
  const stage = document.getElementById('avatarStage')
  if (!stage) return

  const state = resolveAvatarPose(tasks, focusTaskId)
  const look = getCurrentAvatarLook()
  const character = document.getElementById('avatarCharacter')
  const statusTop = document.getElementById('avatarStatusTop')

  if (character) {
    character.className = `avatar-character pose-${state.pose}`
    character.innerHTML = renderAvatarFigure(state.pose, look)
    bindPoseWithLook(state.pose, look)
  }
  if (statusTop) statusTop.textContent = statusText(state.label)

  if (!document.getElementById('avatarDressBtn')) {
    stage.insertAdjacentHTML(
      'beforeend',
      '<button type="button" class="avatar-dress-btn" id="avatarDressBtn" onclick="openAvatarDressModal()">去换装</button>',
    )
  }
}

export function refreshAvatarLook(look) {
  if (look) setCurrentAvatarLook(look)
  const character = document.getElementById('avatarCharacter')
  if (!character) return
  const pose = character.querySelector('.avatar-img')?.dataset?.pose || 'idle'
  const next = getCurrentAvatarLook()
  character.innerHTML = renderAvatarFigure(pose, next)
  bindPoseWithLook(pose, next)
}

export async function previewAvatarLook(look, container) {
  if (!container) return
  const cfg = normalizeLook(look)
  let figure = container.querySelector('.avatar-figure')
  if (!figure) {
    container.innerHTML = renderAvatarFigure('idle', cfg)
    figure = container.querySelector('.avatar-figure')
  }
  const img = container.querySelector('.avatar-img')
  if (!img) return
  const baseSrc = resolvePoseImageSrc('idle', cfg)
  img.dataset.baseSrc = baseSrc
  img.dataset.pose = 'idle'
  img.alt = getCharacter(cfg.characterId).name
  try {
    img.src = await recolorAvatarSrc(baseSrc, cfg)
  } catch {
    img.src = baseSrc
  }
  applyFigureLayers(figure, cfg)
}

export function renderDressPreviewFigure(look = currentLook) {
  return renderAvatarFigure('idle', look)
}
