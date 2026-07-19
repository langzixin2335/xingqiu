const COMPANIONS = {
  wood: {
    key: 'wood',
    name: '青芽',
    title: '木之伙伴',
    display: '你的伙伴·青芽',
    avatar: '/images/avatar/sailor-wood-portrait.png',
    greeting: '我是青芽，会一直陪你慢慢长。今天想先照顾哪颗星球？',
    checkinLines: [
      '这一步很漂亮，我看见了',
      '你又多照顾了自己一点',
      '慢慢长，也是在发光',
      '我在，继续就好',
      '今天的你，已经很勇敢',
    ],
  },
  fire: {
    key: 'fire',
    name: '焰焰',
    title: '火之伙伴',
    display: '你的伙伴·焰焰',
    avatar: '/images/avatar/sailor-fire-portrait.png',
    greeting: '嘿，我是焰焰！今天也一起把光点亮一点？想聊哪颗星球都行。',
    checkinLines: [
      '太好了，这波能量很亮',
      '你做完了，我替你开心',
      '保持这点火，就很美',
      '冲一小步，也算赢',
      '我在旁边给你加油',
    ],
  },
  earth: {
    key: 'earth',
    name: '安安',
    title: '土之伙伴',
    display: '你的伙伴·安安',
    avatar: '/images/avatar/sailor-earth-portrait.png',
    greeting: '我是安安，会稳稳陪着你。今天节奏怎样，想慢慢说给我听吗？',
    checkinLines: [
      '稳住了，这一下很踏实',
      '你说到做到，我放心',
      '慢慢来，根基更牢',
      '照顾好自己，也是进度',
      '我在，不着急',
    ],
  },
  metal: {
    key: 'metal',
    name: '澄澄',
    title: '金之伙伴',
    display: '你的伙伴·澄澄',
    avatar: '/images/avatar/sailor-metal-portrait.png',
    greeting: '我是澄澄。目标可以拆小一点，我陪你一步一步走清楚。',
    checkinLines: [
      '这一项，收得漂亮',
      '方向对了，继续就好',
      '你很清楚自己在做什么',
      '完成比完美更重要',
      '我看着你把事办妥',
    ],
  },
  water: {
    key: 'water',
    name: '涟涟',
    title: '水之伙伴',
    display: '你的伙伴·涟涟',
    avatar: '/images/avatar/sailor-water-portrait.png',
    greeting: '我是涟涟。累了也可以先说说，我在这儿听着，再一起想下一步。',
    checkinLines: [
      '看见你完成，我心里软软的',
      '这一下，你对自己很温柔',
      '流过去就好，光还在',
      '你不用一个人硬扛',
      '我陪着你，慢慢来',
    ],
  },
}

const DEFAULT_COMPANION = {
  key: 'star',
  name: '星光',
  title: '你的伙伴',
  display: '你的伙伴·星光',
  avatar: '/images/avatar/sailor-fire-portrait.png',
  greeting: '我是你的伙伴星光。想补充哪颗星球的能量，都跟我说一声。',
  checkinLines: [
    '做得很好，我在陪着你',
    '今天的你，值得被看见',
    '小小一步，也算闪亮',
    '我不催你，只陪着你',
    '继续照顾自己就好',
  ],
}

export function getCompanion(personality) {
  const key = String(personality || '').trim().toLowerCase()
  return COMPANIONS[key] || DEFAULT_COMPANION
}

export function pickCompanionCheckinLine(personality) {
  const companion = getCompanion(personality)
  const lines = companion.checkinLines || []
  if (!lines.length) return '做得很好，我在陪着你'
  return lines[Math.floor(Math.random() * lines.length)]
}

/** 浏览器 TTS：让伙伴「开口」；persona: sister=潇洒姐 / brother=弟弟 */
export function speakCompanionText(text, options = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis || !text) return
  try {
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(String(text))
    utter.lang = 'zh-CN'
    utter.rate = options.rate ?? 1
    utter.pitch = options.pitch ?? 1
    const persona = options.persona === 'brother' ? 'brother' : 'sister'
    const voices = window.speechSynthesis.getVoices?.() || []
    const zh = voices.filter((v) => /zh|chinese/i.test(v.lang || v.name || ''))
    if (zh.length) {
      // 粗略按音色名挑；找不到就用第一条中文
      const prefer =
        persona === 'brother'
          ? zh.find((v) => /male|男|yunyang|kangkang|xiaoxuan/i.test(v.name))
          : zh.find((v) => /female|女|xiaoxiao|xiaoyi|huihui|yaoyao/i.test(v.name))
      utter.voice = prefer || zh[0]
    }
    window.speechSynthesis.speak(utter)
  } catch {
    // ignore TTS failures
  }
}

export function stopCompanionSpeech() {
  try {
    window.speechSynthesis?.cancel()
  } catch {
    // ignore
  }
}

export function createCompanionSpeechRecognition({ onResult, onError, onEnd } = {}) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) return null
  const recognition = new SpeechRecognition()
  recognition.lang = 'zh-CN'
  recognition.interimResults = false
  recognition.maxAlternatives = 1
  recognition.onresult = (event) => {
    const text = event.results?.[0]?.[0]?.transcript || ''
    onResult?.(text.trim())
  }
  recognition.onerror = (event) => onError?.(event)
  recognition.onend = () => onEnd?.()
  return recognition
}
