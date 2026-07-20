import { useUserStore } from '../../stores/user'
import api from '../../api'

const elementData = {
  wood: {
    name: '木型 · 生发型',
    subtitle: '理想主义者 · 共情者',
    image: '/images/avatar/sailor-wood-portrait.png',
    traits: '理想、共情、上进、有风骨、乐于成长、愿意创造与帮助他人',
    careers: ['教育培训', '内容创作', '公益文化', '设计创意', '医疗护理', '心理相关'],
  },
  fire: {
    name: '火型 · 传播型',
    subtitle: '热情领袖 · 表达者',
    image: '/images/avatar/sailor-fire-portrait.png',
    traits: '热情、表达、感染力、行动力、外向、善于带动气氛',
    careers: ['销售商务', '市场品牌', '传媒主持', '人力招聘', '直播运营', '活动策划'],
  },
  earth: {
    name: '土型 · 承载型',
    subtitle: '稳重守护者 · 协调者',
    image: '/images/avatar/sailor-earth-portrait.png',
    traits: '稳重、守信、包容、责任心、务实、善于协调与托底',
    careers: ['行政运营', '财务会计', '项目管理', '客户服务', '后勤保障', '稳定岗/体制内'],
  },
  metal: {
    name: '金型 · 决断型',
    subtitle: '正义执行者 · 决策者',
    image: '/images/avatar/sailor-metal-portrait.png',
    traits: '理性、正义、果断、重情义、目标感强、原则清晰',
    careers: ['创业管理', '法律合规', '金融投资', '技术研发', '工程制造', '风控审计'],
  },
  water: {
    name: '水型 · 洞察型',
    subtitle: '智慧洞察者 · 策略家',
    image: '/images/avatar/sailor-water-portrait.png',
    traits: '聪慧、通透、变通、善观察、敏感细腻、策略思维',
    careers: ['咨询顾问', '产品策略', '数据分析', '研究策划', '猎头招聘', '自由职业'],
  },
}

let selectedElement = null

function restorePortraitImages() {
  document.querySelectorAll('.element-card[data-element]').forEach((card) => {
    const key = card.getAttribute('data-element')
    const data = elementData[key]
    const img = card.querySelector('.goddess-avatar img')
    if (img && data?.image) {
      img.src = data.image
      img.alt = data.name
    }
  })
  const detailImg = document.getElementById('detailAvatarImg')
  if (detailImg && !detailImg.getAttribute('src')) {
    detailImg.src = elementData.wood.image
  }
}

export function initWuxingSelectView(router) {
  // 确认跳转前曾清空 img.src；返回/热更新后把头像补回
  restorePortraitImages()

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

    window.closeDetail?.()

    // 避免 alert 阻塞后再跳转导致部分 Android WebView 崩掉
    // 注意：不要在跳转前清空头像 src，否则停留/返回本页会出现空白
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
