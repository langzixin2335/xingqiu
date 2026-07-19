/**
 * 中心立绘外观：人物选择 / 宠物 / 发色·服装·配饰·光环
 * 配置存 localStorage
 */

const STORAGE_KEY = 'shining_planet_avatar_look_v2'
/** 抠透明底 / 新姿态素材后递增，避免浏览器/App 继续用旧缓存 */
const ASSET_VER = 'v4'

function avatarUrl(path) {
  return `${path}?${ASSET_VER}`
}

/** 与行动时间联动：生存看书 / 赚钱办公 / 好看对镜 / 好玩拍照 / 心流静坐 */
function characterPoses(prefix) {
  // moon 沿用旧文件名 sailor-{pose}.png；其余 sailor-{id}-{pose}.png
  if (prefix === 'moon') {
    return {
      idle: avatarUrl('/images/avatar/sailor-idle.png'),
      reading: avatarUrl('/images/avatar/sailor-reading.png'),
      laptop: avatarUrl('/images/avatar/sailor-laptop.png'),
      beauty: avatarUrl('/images/avatar/sailor-beauty.png'),
      fun: avatarUrl('/images/avatar/sailor-fun.png'),
      meditate: avatarUrl('/images/avatar/sailor-meditate.png'),
    }
  }
  return {
    idle: avatarUrl(`/images/avatar/sailor-${prefix}-idle.png`),
    reading: avatarUrl(`/images/avatar/sailor-${prefix}-reading.png`),
    laptop: avatarUrl(`/images/avatar/sailor-${prefix}-laptop.png`),
    beauty: avatarUrl(`/images/avatar/sailor-${prefix}-beauty.png`),
    fun: avatarUrl(`/images/avatar/sailor-${prefix}-fun.png`),
    meditate: avatarUrl(`/images/avatar/sailor-${prefix}-meditate.png`),
  }
}

/** 五位美少女战士（全员支持行动姿态） */
export const CHARACTERS = [
  {
    id: 'moon',
    name: '土星主宰者',
    title: '土星主宰者',
    poses: characterPoses('moon'),
    thumb: avatarUrl('/images/avatar/sailor-idle.png'),
    idle: avatarUrl('/images/avatar/sailor-idle.png'),
    hasPoses: true,
    defaultLook: {
      hairHue: 42,
      outfitHue: 212,
      accentHue: 0,
      skinTone: 0,
      accessory: 'none',
      aura: 'gold',
    },
  },
  {
    id: 'mercury',
    name: '水星主宰者',
    title: '水星主宰者',
    poses: characterPoses('mercury'),
    thumb: avatarUrl('/images/avatar/sailor-mercury-idle.png'),
    idle: avatarUrl('/images/avatar/sailor-mercury-idle.png'),
    hasPoses: true,
    defaultLook: {
      hairHue: 210,
      outfitHue: 200,
      accentHue: 195,
      skinTone: -4,
      accessory: 'none',
      aura: 'cyan',
    },
  },
  {
    id: 'mars',
    name: '火星主宰者',
    title: '火星主宰者',
    poses: characterPoses('mars'),
    thumb: avatarUrl('/images/avatar/sailor-mars-idle.png'),
    idle: avatarUrl('/images/avatar/sailor-mars-idle.png'),
    hasPoses: true,
    defaultLook: {
      hairHue: 280,
      outfitHue: 345,
      accentHue: 0,
      skinTone: 0,
      accessory: 'none',
      aura: 'violet',
      hairDark: true,
    },
  },
  {
    id: 'jupiter',
    name: '木星主宰者',
    title: '木星主宰者',
    poses: characterPoses('jupiter'),
    thumb: avatarUrl('/images/avatar/sailor-jupiter-idle.png'),
    idle: avatarUrl('/images/avatar/sailor-jupiter-idle.png'),
    hasPoses: true,
    defaultLook: {
      hairHue: 145,
      outfitHue: 145,
      accentHue: 330,
      skinTone: 2,
      accessory: 'none',
      aura: 'gold',
    },
  },
  {
    id: 'venus',
    name: '金星主宰者',
    title: '金星主宰者',
    poses: characterPoses('venus'),
    thumb: avatarUrl('/images/avatar/sailor-venus-idle.png'),
    idle: avatarUrl('/images/avatar/sailor-venus-idle.png'),
    hasPoses: true,
    defaultLook: {
      hairHue: 42,
      outfitHue: 32,
      accentHue: 220,
      skinTone: 4,
      accessory: 'none',
      aura: 'gold',
    },
  },
]

/** 黑猫守护者 / 白猫陪伴者 */
export const PETS = [
  { id: 'none', name: '暂不带宠物', short: '无', src: '' },
  { id: 'luna', name: '守护者（黑猫）', short: '守护者', src: avatarUrl('/images/avatar/pet-luna.png') },
  { id: 'artemis', name: '陪伴者（白猫）', short: '陪伴者', src: avatarUrl('/images/avatar/pet-artemis.png') },
  { id: 'both', name: '守护&陪伴', short: '守护&陪伴', src: '' },
]

export const DEFAULT_LOOK = {
  characterId: 'moon',
  petId: 'none',
  hairHue: 42,
  outfitHue: 212,
  accentHue: 0,
  skinTone: 0,
  accessory: 'none',
  aura: 'gold',
}

/** 五行人格 → 默认战士（与圆形头像一致） */
export const PERSONALITY_TO_CHARACTER = {
  wood: 'jupiter', // 木 → 木野真琴
  fire: 'mars', // 火 → 火野丽
  earth: 'moon', // 土 → 月野兔
  metal: 'venus', // 金 → 爱野美奈子
  water: 'mercury', // 水 → 水野亚美
}

export function characterIdFromPersonality(personality) {
  const key = String(personality || '').trim().toLowerCase()
  return PERSONALITY_TO_CHARACTER[key] || 'moon'
}

export const LOOK_PRESETS = [
  { id: 'classic', name: '经典配色', look: { hairHue: 42, outfitHue: 212, accentHue: 0, skinTone: 0, accessory: 'none', aura: 'gold' } },
  { id: 'sakura', name: '樱粉', look: { hairHue: 330, outfitHue: 330, accentHue: 350, skinTone: 4, accessory: 'flower', aura: 'pink' } },
  { id: 'mint', name: '薄荷', look: { hairHue: 160, outfitHue: 165, accentHue: 145, skinTone: 0, accessory: 'halo', aura: 'cyan' } },
  { id: 'violet', name: '紫夜', look: { hairHue: 275, outfitHue: 265, accentHue: 300, skinTone: -4, accessory: 'star', aura: 'violet' } },
  { id: 'sunset', name: '暮光', look: { hairHue: 28, outfitHue: 25, accentHue: 12, skinTone: 6, accessory: 'glasses', aura: 'gold' } },
  { id: 'midnight', name: '银月', look: { hairHue: 220, outfitHue: 230, accentHue: 200, skinTone: -8, accessory: 'headphones', aura: 'cyan' } },
]

export const HAIR_SWATCHES = [
  { name: '金发', hue: 42 },
  { name: '粉发', hue: 330 },
  { name: '橙发', hue: 24 },
  { name: '红发', hue: 5 },
  { name: '紫发', hue: 280 },
  { name: '蓝发', hue: 210 },
  { name: '青发', hue: 165 },
  { name: '银发', hue: 210, silver: true },
  { name: '黑发', hue: 240, dark: true },
]

export const OUTFIT_SWATCHES = [
  { name: '水手蓝', hue: 212 },
  { name: '玫红', hue: 340 },
  { name: '翠绿', hue: 150 },
  { name: '紫罗兰', hue: 270 },
  { name: '暖橙', hue: 28 },
  { name: '夜空', hue: 230 },
  { name: '奶油白', hue: 45, soft: true },
]

export const ACCENT_SWATCHES = [
  { name: '经典红', hue: 0 },
  { name: '金橙', hue: 32 },
  { name: '玫粉', hue: 340 },
  { name: '品红', hue: 320 },
  { name: '琥珀', hue: 18 },
  { name: '珊瑚', hue: 12 },
]

export const SKIN_SWATCHES = [
  { name: '瓷白', tone: -12 },
  { name: '自然', tone: 0 },
  { name: '暖阳', tone: 10 },
  { name: '蜜茶', tone: 18 },
]

export const ACCESSORIES = [
  { id: 'none', name: '无配饰', emoji: '—' },
  { id: 'glasses', name: '眼镜', emoji: '👓' },
  { id: 'headphones', name: '耳机', emoji: '🎧' },
  { id: 'flower', name: '花饰', emoji: '🌸' },
  { id: 'star', name: '星冠', emoji: '⭐' },
  { id: 'halo', name: '光环', emoji: '😇' },
  { id: 'cat', name: '猫耳', emoji: '🐱' },
  { id: 'ribbon', name: '发带', emoji: '🎀' },
]

export const AURAS = [
  { id: 'none', name: '无光环' },
  { id: 'gold', name: '金色' },
  { id: 'pink', name: '粉色' },
  { id: 'cyan', name: '青色' },
  { id: 'violet', name: '紫色' },
]

const recolorCache = new Map()
const imageCache = new Map()

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]
}

export function getCharacterPoseSrc(characterId, poseKey = 'idle') {
  const ch = getCharacter(characterId)
  const poses = ch.poses || characterPoses(ch.id === 'moon' ? 'moon' : ch.id)
  return poses[poseKey] || poses.idle || ch.idle
}

export function getPet(id) {
  return PETS.find((p) => p.id === id) || PETS[0]
}

export function normalizeLook(raw = {}) {
  const characterId = CHARACTERS.some((c) => c.id === raw.characterId) ? raw.characterId : DEFAULT_LOOK.characterId
  const petId = PETS.some((p) => p.id === raw.petId) ? raw.petId : DEFAULT_LOOK.petId
  return {
    characterId,
    petId,
    hairHue: Number.isFinite(+raw.hairHue) ? clamp(+raw.hairHue, 0, 359) : DEFAULT_LOOK.hairHue,
    outfitHue: Number.isFinite(+raw.outfitHue) ? clamp(+raw.outfitHue, 0, 359) : DEFAULT_LOOK.outfitHue,
    accentHue: Number.isFinite(+raw.accentHue) ? clamp(+raw.accentHue, 0, 359) : DEFAULT_LOOK.accentHue,
    skinTone: Number.isFinite(+raw.skinTone) ? clamp(+raw.skinTone, -24, 24) : DEFAULT_LOOK.skinTone,
    accessory: ACCESSORIES.some((a) => a.id === raw.accessory) ? raw.accessory : DEFAULT_LOOK.accessory,
    aura: AURAS.some((a) => a.id === raw.aura) ? raw.aura : DEFAULT_LOOK.aura,
    hairSilver: !!raw.hairSilver,
    hairDark: !!raw.hairDark,
    outfitSoft: !!raw.outfitSoft,
    // user=去换装主动保存；personality=跟随五行默认
    source: raw.source === 'user' ? 'user' : 'personality',
  }
}

/** 切换人物时套用该人物默认配色，保留宠物 */
export function lookForCharacter(characterId, prev = {}) {
  const ch = getCharacter(characterId)
  return normalizeLook({
    ...ch.defaultLook,
    characterId: ch.id,
    petId: prev.petId || 'none',
    source: prev.source || 'personality',
  })
}

function readStoredLookRaw() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('shining_planet_avatar_look_v1')
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function loadAvatarLook(personality) {
  const stored = readStoredLookRaw()
  // 用户在换装里主动选过人物：尊重其选择
  if (stored?.source === 'user') {
    return normalizeLook(stored)
  }
  // 否则默认跟随五行人格对应战士
  if (personality) {
    return lookForCharacter(characterIdFromPersonality(personality), {
      petId: stored?.petId || 'none',
      source: 'personality',
    })
  }
  if (stored) return normalizeLook({ ...stored, source: 'personality' })
  return normalizeLook({ ...DEFAULT_LOOK, source: 'personality' })
}

export function saveAvatarLook(look, options = {}) {
  const asUserPick = options.asUserPick === true
  const next = normalizeLook({
    ...look,
    source: asUserPick ? 'user' : look.source === 'user' ? 'user' : 'personality',
  })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function lookCacheKey(look) {
  const l = normalizeLook(look)
  return [
    l.characterId,
    l.hairHue,
    l.outfitHue,
    l.accentHue,
    l.skinTone,
    l.hairSilver ? 1 : 0,
    l.hairDark ? 1 : 0,
    l.outfitSoft ? 1 : 0,
  ].join('_')
}

function rgbToHsv(r, g, b) {
  r /= 255
  g /= 255
  b /= 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  return { h, s, v: max }
}

function hsvToRgb(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let rp = 0
  let gp = 0
  let bp = 0
  if (h < 60) [rp, gp, bp] = [c, x, 0]
  else if (h < 120) [rp, gp, bp] = [x, c, 0]
  else if (h < 180) [rp, gp, bp] = [0, c, x]
  else if (h < 240) [rp, gp, bp] = [0, x, c]
  else if (h < 300) [rp, gp, bp] = [x, 0, c]
  else [rp, gp, bp] = [c, 0, x]
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  }
}

function inHueRange(h, start, end) {
  if (start <= end) return h >= start && h <= end
  return h >= start || h <= end
}

function classifyPixel(h, s, v) {
  if (v < 0.08 || (s < 0.05 && v > 0.92)) return 'keep'
  if (inHueRange(h, 185, 245) && s > 0.22 && v > 0.18) return 'outfit'
  if (inHueRange(h, 345, 22) && s > 0.35 && v > 0.2) return 'accent'
  if (inHueRange(h, 28, 62) && s > 0.28 && v > 0.35) return 'hair'
  if (inHueRange(h, 8, 45) && s > 0.08 && s < 0.55 && v > 0.45) return 'skin'
  if (inHueRange(h, 320, 350) && s > 0.15 && s < 0.55 && v > 0.5) return 'skin'
  // 绿发/绿衣、橙衣等扩展，便于非月野兔角色微调
  if (inHueRange(h, 100, 170) && s > 0.25 && v > 0.2) return 'outfit'
  if (inHueRange(h, 15, 45) && s > 0.45 && v > 0.25) return 'outfit'
  if (inHueRange(h, 250, 310) && s > 0.2 && v > 0.12 && v < 0.55) return 'hair'
  return 'keep'
}

function loadImage(src) {
  if (imageCache.has(src)) return imageCache.get(src)
  const p = new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`load fail: ${src}`))
    img.src = src
  })
  imageCache.set(src, p)
  return p
}

function isCharacterDefaultColors(look) {
  const ch = getCharacter(look.characterId)
  const base = normalizeLook({ ...ch.defaultLook, characterId: ch.id, petId: look.petId })
  return (
    look.hairHue === base.hairHue &&
    look.outfitHue === base.outfitHue &&
    look.accentHue === base.accentHue &&
    look.skinTone === base.skinTone &&
    !!look.hairSilver === !!base.hairSilver &&
    !!look.hairDark === !!base.hairDark &&
    !!look.outfitSoft === !!base.outfitSoft
  )
}

/** 按外观配置重上色；人物默认配色直接用原图 */
export async function recolorAvatarSrc(src, look) {
  const cfg = normalizeLook(look)
  const key = `${src}|${lookCacheKey(cfg)}`
  if (recolorCache.has(key)) return recolorCache.get(key)

  if (isCharacterDefaultColors(cfg)) {
    recolorCache.set(key, src)
    return src
  }

  const img = await loadImage(src)
  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3]
    if (a < 10) continue
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const hsv = rgbToHsv(r, g, b)
    const kind = classifyPixel(hsv.h, hsv.s, hsv.v)
    if (kind === 'keep') continue

    let nh = hsv.h
    let ns = hsv.s
    let nv = hsv.v

    if (kind === 'hair') {
      nh = cfg.hairHue
      if (cfg.hairSilver) {
        ns = Math.min(ns, 0.12)
        nv = Math.min(1, nv * 1.05)
      } else if (cfg.hairDark) {
        ns = Math.min(ns * 0.55, 0.35)
        nv = nv * 0.45
      }
    } else if (kind === 'outfit') {
      nh = cfg.outfitHue
      if (cfg.outfitSoft) {
        ns = Math.min(ns * 0.35, 0.25)
        nv = Math.min(1, nv * 1.08)
      }
    } else if (kind === 'accent') {
      nh = cfg.accentHue
    } else if (kind === 'skin') {
      nv = clamp(nv + cfg.skinTone / 100, 0.15, 1)
      ns = clamp(ns + (cfg.skinTone > 0 ? 0.02 : -0.02), 0.05, 0.6)
    }

    const rgb = hsvToRgb(nh, ns, nv)
    data[i] = rgb.r
    data[i + 1] = rgb.g
    data[i + 2] = rgb.b
  }

  ctx.putImageData(imageData, 0, 0)
  const url = canvas.toDataURL('image/png')
  recolorCache.set(key, url)
  return url
}

export function accessoryMarkup(accessoryId) {
  const id = accessoryId || 'none'
  if (id === 'none') return ''
  const map = {
    glasses: '<span class="avatar-acc avatar-acc-glasses" aria-hidden="true">👓</span>',
    headphones: '<span class="avatar-acc avatar-acc-headphones" aria-hidden="true">🎧</span>',
    flower: '<span class="avatar-acc avatar-acc-flower" aria-hidden="true">🌸</span>',
    star: '<span class="avatar-acc avatar-acc-star" aria-hidden="true">⭐</span>',
    halo: '<span class="avatar-acc avatar-acc-halo" aria-hidden="true">✨</span>',
    cat: '<span class="avatar-acc avatar-acc-cat" aria-hidden="true">🐱</span>',
    ribbon: '<span class="avatar-acc avatar-acc-ribbon" aria-hidden="true">🎀</span>',
  }
  return map[id] || ''
}

export function petMarkup(petId) {
  const id = petId || 'none'
  if (id === 'none') return ''
  if (id === 'luna') {
    return `<img class="avatar-pet avatar-pet-luna" src="${avatarUrl('/images/avatar/pet-luna.png')}" alt="守护者" draggable="false">`
  }
  if (id === 'artemis') {
    return `<img class="avatar-pet avatar-pet-artemis" src="${avatarUrl('/images/avatar/pet-artemis.png')}" alt="陪伴者" draggable="false">`
  }
  if (id === 'both') {
    return `
      <img class="avatar-pet avatar-pet-luna" src="${avatarUrl('/images/avatar/pet-luna.png')}" alt="守护者" draggable="false">
      <img class="avatar-pet avatar-pet-artemis" src="${avatarUrl('/images/avatar/pet-artemis.png')}" alt="陪伴者" draggable="false">`
  }
  return ''
}

export function findPresetId(look) {
  // 预设只比色，不比人物
  const colorKey = [
    look.hairHue,
    look.outfitHue,
    look.accentHue,
    look.skinTone,
    look.hairSilver ? 1 : 0,
    look.hairDark ? 1 : 0,
    look.outfitSoft ? 1 : 0,
  ].join('_')
  const hit = LOOK_PRESETS.find((p) => {
    const n = normalizeLook({ ...p.look, characterId: look.characterId, petId: look.petId })
    const pk = [n.hairHue, n.outfitHue, n.accentHue, n.skinTone, n.hairSilver ? 1 : 0, n.hairDark ? 1 : 0, n.outfitSoft ? 1 : 0].join('_')
    return (
      pk === colorKey &&
      (p.look.accessory || 'none') === (look.accessory || 'none') &&
      (p.look.aura || 'none') === (look.aura || 'none')
    )
  })
  return hit?.id || ''
}
