/** 能量中心统一星宠：不区分五行人格 */
export const ENERGY_PET = {
  key: 'star-meow',
  name: '星喵人',
  title: '你的能量星宠',
  display: '你的能量星宠 · 星喵人',
  avatar: '/images/avatar/pet-artemis.png',
  greeting:
    '喵～我是你的能量星宠星喵人。想补充哪颗星球的能量，都跟我说一声；也可以按住麦克风跟我说话。',
  checkinLines: [
    '喵，这一步我看见了',
    '你又多照顾了自己一点',
    '小小一步，也算闪亮',
    '我在，继续就好',
    '今天的你，值得被摸摸头',
  ],
}

/** @deprecated personality 参数保留兼容，统一返回星喵人 */
export function getCompanion(_personality) {
  return ENERGY_PET
}

export function pickCompanionCheckinLine(_personality) {
  const lines = ENERGY_PET.checkinLines || []
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
    utter.pitch = options.pitch ?? 1.05
    const persona = options.persona === 'brother' ? 'brother' : 'sister'
    const voices = window.speechSynthesis.getVoices?.() || []
    const zh = voices.filter((v) => /zh|chinese/i.test(v.lang || v.name || ''))
    if (zh.length) {
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
