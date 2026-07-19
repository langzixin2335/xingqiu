import { useUserStore } from '../../stores/user'
import api from '../../api'

const elementData = {
  wood: {
    name: '木型 · 生发型',
    subtitle: '理想主义者 · 共情者',
    image: '/images/avatar/sailor-wood-portrait.png',
    traits: '理想、共情、上进、有风骨',
    careers: ['教育', '写作', '公益', '文化创意'],
    advice: '选中后，她会成为你的陪跑伙伴「青芽」，用文字和语音一路陪你慢慢长。',
  },
  fire: {
    name: '火型 · 传播型',
    subtitle: '热情领袖 · 表达者',
    image: '/images/avatar/sailor-fire-portrait.png',
    traits: '热情、表达、感染力、行动力',
    careers: ['HR', '销售', '主持', '市场营销'],
    advice: '选中后，她会成为你的陪跑伙伴「焰焰」，热情陪你说话、鼓励你一点点点亮。',
  },
  earth: {
    name: '土型 · 承载型',
    subtitle: '稳重守护者 · 协调者',
    image: '/images/avatar/sailor-earth-portrait.png',
    traits: '稳重、守信、包容、责任心',
    careers: ['公务员', '行政', '会计', '后勤'],
    advice: '选中后，她会成为你的陪跑伙伴「安安」，稳稳陪着你，不催不赶。',
  },
  metal: {
    name: '金型 · 决断型',
    subtitle: '正义执行者 · 决策者',
    image: '/images/avatar/sailor-metal-portrait.png',
    traits: '理性、正义、果断、重情义',
    careers: ['创业', '法律', '金融', '风控'],
    advice: '选中后，她会成为你的陪跑伙伴「澄澄」，帮你把路拆清楚，一步一步陪跑。',
  },
  water: {
    name: '水型 · 洞察型',
    subtitle: '智慧洞察者 · 策略家',
    image: '/images/avatar/sailor-water-portrait.png',
    traits: '聪慧、通透、共情、变通',
    careers: ['心理咨询', '编剧', '咨询', '猎头'],
    advice: '选中后，她会成为你的陪跑伙伴「涟涟」，先听你说，再温柔陪你往前。',
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
    setText('detailTraits', data.traits)
    setText('detailAdvice', data.advice)

    const avatar = document.getElementById('detailAvatar')
    if (avatar) avatar.className = `detail-avatar ${element}`

    const avatarImg = document.getElementById('detailAvatarImg')
    if (avatarImg && data.image) {
      avatarImg.src = data.image
      avatarImg.alt = data.name
    }

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
    document.querySelectorAll('.goddess-avatar img, #detailAvatarImg').forEach((img) => {
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
