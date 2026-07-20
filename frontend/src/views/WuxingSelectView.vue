<template>
  <div class="legacy-page legacy-page--wuxing-select">
    <Starfield :star-count="36" :shooting-stars="0" :variable-stars="false" />
    <!-- 星空背景 -->
        <!-- 页面内容 -->
        <div class="page-container">
            <header class="header">
                <div class="logo">✦ SHINING PLANET ✦</div>
                <h1 class="title">选择你的<span>五行人格</span></h1>
                <p class="subtitle">先看性格特质，职业方向仅作参考<br>找不到完全对上的岗位，选最接近的性格即可</p>
                <div class="divider"></div>
            </header>
    
            <div class="elements-grid" id="elementsGrid">
                <!-- 木型 - 生发型 -->
                <div class="element-card wood" data-element="wood" onclick="selectElement('wood')">
                    <div class="goddess-avatar wood">
                        <img src="/images/avatar/sailor-wood-portrait.png" alt="木野真琴" width="128" height="128" loading="lazy" decoding="async">
                    </div>
                    <div class="card-content">
                        <div class="card-header">
                            <span class="element-name wood">木型</span>
                            <span class="element-type wood">生发型</span>
                        </div>
                        <div class="card-traits">理想、共情、上进、有风骨、乐于成长</div>
                        <div class="card-careers">方向：教育培训、内容创作、设计创意、医疗护理…</div>
                    </div>
                    <div class="select-indicator"></div>
                </div>
    
                <!-- 火型 - 传播型 -->
                <div class="element-card fire" data-element="fire" onclick="selectElement('fire')">
                    <div class="goddess-avatar fire">
                        <img src="/images/avatar/sailor-fire-portrait.png" alt="火野丽" width="128" height="128" loading="lazy" decoding="async">
                    </div>
                    <div class="card-content">
                        <div class="card-header">
                            <span class="element-name fire">火型</span>
                            <span class="element-type fire">传播型</span>
                        </div>
                        <div class="card-traits">热情、表达、感染力、行动力、外向</div>
                        <div class="card-careers">方向：销售商务、市场品牌、传媒主持、直播运营…</div>
                    </div>
                    <div class="select-indicator"></div>
                </div>
    
                <!-- 土型 - 承载型 -->
                <div class="element-card earth" data-element="earth" onclick="selectElement('earth')">
                    <div class="goddess-avatar earth">
                        <img src="/images/avatar/sailor-earth-portrait.png" alt="月野兔" width="128" height="128" loading="lazy" decoding="async">
                    </div>
                    <div class="card-content">
                        <div class="card-header">
                            <span class="element-name earth">土型</span>
                            <span class="element-type earth">承载型</span>
                        </div>
                        <div class="card-traits">稳重、守信、包容、责任心、务实</div>
                        <div class="card-careers">方向：行政运营、财务会计、项目管理、客户服务…</div>
                    </div>
                    <div class="select-indicator"></div>
                </div>
    
                <!-- 金型 - 决断型 -->
                <div class="element-card metal" data-element="metal" onclick="selectElement('metal')">
                    <div class="goddess-avatar metal">
                        <img src="/images/avatar/sailor-metal-portrait.png" alt="爱野美奈子" width="128" height="128" loading="lazy" decoding="async">
                    </div>
                    <div class="card-content">
                        <div class="card-header">
                            <span class="element-name metal">金型</span>
                            <span class="element-type metal">决断型</span>
                        </div>
                        <div class="card-traits">理性、正义、果断、重情义、目标感强</div>
                        <div class="card-careers">方向：创业管理、法律合规、金融投资、技术研发…</div>
                    </div>
                    <div class="select-indicator"></div>
                </div>
    
                <!-- 水型 - 洞察型 -->
                <div class="element-card water" data-element="water" onclick="selectElement('water')">
                    <div class="goddess-avatar water">
                        <img src="/images/avatar/sailor-water-portrait.png" alt="水野亚美" width="128" height="128" loading="lazy" decoding="async">
                    </div>
                    <div class="card-content">
                        <div class="card-header">
                            <span class="element-name water">水型</span>
                            <span class="element-type water">洞察型</span>
                        </div>
                        <div class="card-traits">聪慧、通透、变通、善观察、策略思维</div>
                        <div class="card-careers">方向：咨询顾问、产品策略、数据分析、自由职业…</div>
                    </div>
                    <div class="select-indicator"></div>
                </div>
            </div>
    
            <div class="bottom-section">
                <p class="hint-text">点击卡片查看详情；先看性格，职业仅作参考</p>
                <button class="confirm-btn" id="confirmBtn" onclick="confirmSelection()">确认选择</button>
            </div>
        </div>
    
        <!-- 详情浮层遮罩 -->
        <div class="detail-panel-overlay" id="detailOverlay" onclick="closeDetail()"></div>
    
        <!-- 详情浮层 -->
        <div class="detail-panel" id="detailPanel">
            <button class="close-detail" onclick="closeDetail()">✕</button>
            <div class="detail-header">
                <div class="detail-avatar" id="detailAvatar">
                    <img id="detailAvatarImg" src="/images/avatar/sailor-wood-portrait.png" alt="五行伙伴" width="160" height="160" decoding="async">
                </div>
                <div class="detail-title-group">
                    <div class="detail-title" id="detailTitle">木型 · 生发型</div>
                    <div class="detail-subtitle" id="detailSubtitle">理想主义者 · 共情者</div>
                </div>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">性格特质</div>
                <p class="detail-text" id="detailTraits">理想、共情、上进、有风骨、乐于成长、愿意创造与帮助他人</p>
            </div>
            <div class="detail-section">
                <div class="detail-section-title">职业方向<span class="detail-section-note">（参考，非限定）</span></div>
                <div class="detail-tags" id="detailCareers">
                    <span class="detail-tag">教育培训</span>
                    <span class="detail-tag">内容创作</span>
                    <span class="detail-tag">公益文化</span>
                    <span class="detail-tag">设计创意</span>
                    <span class="detail-tag">医疗护理</span>
                    <span class="detail-tag">心理相关</span>
                </div>
            </div>
            <p class="detail-pick-hint">岗位对不上也没关系，按最接近的性格特质选即可</p>
            <button class="detail-btn" onclick="confirmFromDetail()">选择这个人格</button>
        </div>
    
        
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Starfield from '../components/Starfield.vue'
import { initWuxingSelectView } from '../assets/scripts/wuxing-select-page.js'
import '../assets/styles/wuxing-select.css'

const router = useRouter()
let cleanup = null

onMounted(() => {
  cleanup = initWuxingSelectView(router)
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})
</script>
