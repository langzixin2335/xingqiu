import { useUserStore } from '../../stores/user'
import api from '../../api'

const elementData = {
  wood: {
    name: '木型 · 生发型',
    subtitle: '理想主义者 · 共情者',
    icon: '🌿',
    traits: '理想、共情、上进、有风骨',
    careers: ['教育', '写作', '公益', '文化创意'],
    advice: '发挥你的共情力与创造力，在帮助他人的过程中实现自我价值。注意平衡理想与现实，让梦想落地生根。',
  },
  fire: {
    name: '火型 · 传播型',
    subtitle: '热情领袖 · 表达者',
    icon: '🔥',
    traits: '热情、表达、感染力、行动力',
    careers: ['HR', '销售', '主持', '市场营销'],
    advice: '用你的热情点燃他人，在传播与连接中创造影响力。注意控制节奏，避免过度消耗自己的能量。',
  },
  earth: {
    name: '土型 · 承载型',
    subtitle: '稳重守护者 · 协调者',
    icon: '🏔️',
    traits: '稳重、守信、包容、责任心',
    careers: ['公务员', '行政', '会计', '后勤'],
    advice: '你的可靠与包容是团队最坚实的后盾。学会适时表达需求，不要总把别人的重担放在自己肩上。',
  },
  metal: {
    name: '金型 · 决断型',
    subtitle: '正义执行者 · 决策者',
    icon: '⚔️',
    traits: '理性、正义、果断、重情义',
    careers: ['创业', '法律', '金融', '风控'],
    advice: '你的决断力与正义感是改变世界的利器。在坚持原则的同时，保持对人性柔软的理解。',
  },
  water: {
    name: '水型 · 洞察型',
    subtitle: '智慧洞察者 · 策略家',
    icon: '🌊',
    traits: '聪慧、通透、共情、变通',
    careers: ['心理咨询', '编剧', '咨询', '猎头'],
    advice: '你的通透与智慧能看透事物本质。善用这份洞察力，同时保持与世界的温暖连接。',
  },
}

let selectedElement = null

export function initWuxingSelectView(router) {
  window.selectElement = (element) => {
    document.querySelectorAll('.element-card').forEach((card) => {
      card.classList.remove('selected')
    })
    const card = document.querySelector(`[data-element="${element}"]`)
    if (card) card.classList.add('selected')
    selectedElement = element
    document.getElementById('confirmBtn')?.classList.add('active')
    window.showDetail(element)
  }

  window.showDetail = (element) => {
    const data = elementData[element]
    if (!data) return

    const setText = (id, text) => {
      const el = document.getElementById(id)
      if (el) el.textContent = text
    }

    setText('detailTitle', data.name)
    setText('detailSubtitle', data.subtitle)
    setText('detailIcon', data.icon)
    setText('detailTraits', data.traits)
    setText('detailAdvice', data.advice)

    const avatar = document.getElementById('detailAvatar')
    if (avatar) avatar.className = `detail-avatar ${element}`

    const careersContainer = document.getElementById('detailCareers')
    if (careersContainer) {
      careersContainer.innerHTML = data.careers
        .map((c) => `<span class="detail-tag">${c}</span>`)
        .join('')
    }

    document.getElementById('detailOverlay')?.classList.add('show')
    document.getElementById('detailPanel')?.classList.add('show')
  }

  window.closeDetail = () => {
    document.getElementById('detailOverlay')?.classList.remove('show')
    document.getElementById('detailPanel')?.classList.remove('show')
  }

  window.confirmFromDetail = () => {
    window.closeDetail()
    window.confirmSelection()
  }

  window.confirmSelection = async () => {
    if (!selectedElement) return
    const selected = elementData[selectedElement]
    const userStore = useUserStore()

    try {
      const { data: user } = await api.post('/user/personality', { personality: selectedElement })
      userStore.setUser(user)
    } catch {
      userStore.setPersonality(selectedElement)
      userStore.setOnboardingStep('plan')
    }

    // 释放大图，降低进入下一页时的 WebView 内存压力（真机闪退高发点）
    document.querySelectorAll('.goddess-avatar img').forEach((img) => {
      img.removeAttribute('src')
      img.src = ''
    })
    window.closeDetail?.()

    // 避免 alert 阻塞后再跳转导致部分 Android WebView 崩掉
    const personality = selectedElement
    router.replace({ path: '/onboarding/plan-create', query: { personality } }).catch(() => {
      window.location.hash = `#/onboarding/plan-create?personality=${personality}`
    })
  }

  const handlers = [
    'selectElement',
    'showDetail',
    'closeDetail',
    'confirmFromDetail',
    'confirmSelection',
  ]

  return () => {
    selectedElement = null
    handlers.forEach((name) => delete window[name])
  }
}
