<template>
  <div class="legacy-page legacy-page--plan-create">
    <Starfield :star-count="40" :shooting-stars="0" />
    <!-- 星空背景 -->
        <div class="page-container">
            <!-- 头部 -->
            <div class="header">
                <div class="brand-logo">✦ SHINING PLANET ✦</div>
                <div class="page-title">制定你的<span>成长计划</span></div>
                <div class="page-subtitle">为你定制专属成长路径</div>
                <div class="divider"></div>
            </div>
    
            <!-- 第一步：选择目标状态 -->
            <div class="card" id="step1">
                <div class="card-title">
                    <span class="icon">🎯</span>
                    你的目标状态
                </div>
                <div class="card-desc">选择你当前的目标情况，我们将为你提供对应的计划制定方式</div>
                
                <div class="goal-status-options">
                    <div class="status-option selected" onclick="selectGoalStatus('has-plan')" id="status-has-plan">
                        <span class="icon">📋</span>
                        <div class="label">已有目标计划</div>
                        <div class="sublabel">有明确目标</div>
                    </div>
                    <div class="status-option" onclick="selectGoalStatus('no-plan')" id="status-no-plan">
                        <span class="icon">💡</span>
                        <div class="label">有目标无计划</div>
                        <div class="sublabel">需要AI生成</div>
                    </div>
                </div>
            </div>
    
            <!-- 已有目标计划区域 -->
            <div id="has-plan-area">
                <!-- OCR扫描上传 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">📷</span>
                        效率手册扫描
                    </div>
                    <div class="card-desc">已有纸质计划？扫码或拍照上传，AI自动识别并导入</div>
                    
                    <div class="scan-area" onclick="simulateScan()">
                        <div class="scan-icon">📷</div>
                        <div class="scan-text">点击扫描或上传效率手册</div>
                        <div class="scan-hint">支持拍照、相册选择、PDF上传</div>
                    </div>
                    
                    <div class="input-group">
                        <label class="input-label">或手动输入你的核心目标</label>
                        <textarea class="input-field" placeholder="例如：我想在3个月内减重10斤，提升演讲能力..."></textarea>
                    </div>
                </div>
    
                <!-- 五种时间目标设定 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">⏰</span>
                        五种时间星际目标
                    </div>
                    <div class="card-desc">将目标分配到五种时间维度，设定不同阶段</div>
                    
                    <div class="time-types">
                        <div class="time-type-tag survival selected" onclick="selectTimeType('survival')">生存星球</div>
                        <div class="time-type-tag money" onclick="selectTimeType('money')">赚钱星球</div>
                        <div class="time-type-tag beauty" onclick="selectTimeType('beauty')">好看星球</div>
                        <div class="time-type-tag fun" onclick="selectTimeType('fun')">好玩星球</div>
                        <div class="time-type-tag flow" onclick="selectTimeType('flow')">心流星球</div>
                    </div>
    
                    <div class="period-selector">
                        <button class="period-btn selected" onclick="selectPeriod('short')">短期<br><small>1-3个月</small></button>
                        <button class="period-btn" onclick="selectPeriod('medium')">中期<br><small>3-6个月</small></button>
                        <button class="period-btn" onclick="selectPeriod('long')">长期<br><small>6-12个月</small></button>
                    </div>
    
                    <div class="input-group">
                        <input type="text" class="input-field" placeholder="输入这个阶段的具体目标..." id="goalInput">
                    </div>
    
                    <button class="btn btn-secondary" onclick="addGoal()">+ 添加目标</button>
    
                    <div class="goal-list" id="goalList">
                        <div class="goal-item">
                            <div class="goal-icon" style="background: rgba(45, 90, 61, 0.3);">🌿</div>
                            <div class="goal-content">
                                <div class="goal-title">每天运动30分钟，保持规律作息</div>
                                <div class="goal-period">生存星球 | 短期 1-3个月</div>
                            </div>
                            <button class="goal-delete">×</button>
                        </div>
                    </div>
                </div>
    
                <!-- 每日目标设置 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🔔</span>
                        每日目标提醒
                    </div>
                    <div class="card-desc">设置每日小目标，像闹钟一样提醒你执行</div>
    
                    <div class="daily-goal-form">
                        <div class="form-row">
                            <div class="input-group">
                                <label class="input-label">目标内容</label>
                                <input type="text" class="input-field" placeholder="例如：晨跑5公里">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="input-group">
                                <label class="input-label">提醒时间</label>
                                <div class="time-picker">
                                    <input type="text" class="input-field" inputmode="numeric" placeholder="07:00" value="07:00" maxlength="5" aria-label="提醒时间">
                                </div>
                            </div>
                            <div class="input-group">
                                <label class="input-label">所属类型</label>
                                <select class="input-field">
                                    <option>生存星球</option>
                                    <option>赚钱星球</option>
                                    <option>好看星球</option>
                                    <option>好玩星球</option>
                                    <option>心流星球</option>
                                </select>
                            </div>
                        </div>
                        <div class="input-group">
                            <label class="input-label">重复周期</label>
                            <div class="repeat-options">
                                <div class="repeat-option selected">周一</div>
                                <div class="repeat-option selected">周二</div>
                                <div class="repeat-option selected">周三</div>
                                <div class="repeat-option selected">周四</div>
                                <div class="repeat-option selected">周五</div>
                                <div class="repeat-option">周六</div>
                                <div class="repeat-option">周日</div>
                            </div>
                        </div>
                        <div class="switch-row">
                            <span class="switch-label">节假日不生效</span>
                            <div class="switch" onclick="toggleSwitch(this)"></div>
                        </div>
                        <div class="switch-row">
                            <span class="switch-label">开启智能提醒</span>
                            <div class="switch active" onclick="toggleSwitch(this)"></div>
                        </div>
                    </div>
    
                    <button class="btn btn-secondary">+ 添加每日目标</button>
                </div>
            </div>
    
            <!-- 无计划区域：AI生成 -->
            <div id="no-plan-area" class="hidden">
                <div class="ai-generate-area">
                    <div class="ai-icon">✨</div>
                    <div class="ai-title">AI为你生成专属计划</div>
                    <div class="ai-desc">
                        基于你的独特特质<br>
                        结合你的日常时间分配，为你定制最优成长路径
                    </div>
                    <div class="ai-hint">
                        💡 只需告诉我们你的核心目标，AI将自动拆解为五种时间的阶段计划
                    </div>
                    <div class="input-group" style="text-align: left;">
                        <label class="input-label">你的核心目标是什么？</label>
                        <textarea class="input-field" placeholder="例如：我想成为一名优秀的演讲者，能够自信地在公众场合表达..." style="min-height: 100px;"></textarea>
                    </div>
                    <div class="input-group" style="text-align: left;">
                        <label class="input-label">你期望达成的时间？</label>
                        <div class="period-selector">
                            <button class="period-btn selected">3个月</button>
                            <button class="period-btn">6个月</button>
                            <button class="period-btn">1年</button>
                        </div>
                    </div>
                    <button class="btn btn-primary" onclick="generatePlan()">✨ 生成我的专属计划</button>
                </div>
    
                <!-- 生成的计划预览 -->
                <div id="planPreview" class="hidden">
                    <div class="plan-preview">
                        <div class="plan-header">
                            <div style="font-size: 32px;">🪐</div>
                            <div>
                                <div class="plan-title">你的专属成长计划</div>
                                <div class="plan-subtitle">为你量身定制</div>
                            </div>
                            <button class="edit-btn">编辑</button>
                        </div>
                        <div class="plan-timeline">
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-period">第1-2周 · 启动期</div>
                                    <div class="timeline-goal">建立演讲基础，每天朗读15分钟</div>
                                    <div class="timeline-action">生存星球：保护嗓子，练习呼吸</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-period">第3-4周 · 积累期</div>
                                    <div class="timeline-goal">录制3分钟演讲视频，每周2次</div>
                                    <div class="timeline-action">赚钱星球：学习演讲技巧课程</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-period">第2个月 · 突破期</div>
                                    <div class="timeline-goal">参加线下演讲俱乐部，实战演练</div>
                                    <div class="timeline-action">好玩星球：在轻松环境中练习</div>
                                </div>
                            </div>
                            <div class="timeline-item">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <div class="timeline-period">第3个月 · 绽放期</div>
                                    <div class="timeline-goal">完成一次公开演讲，分享成长</div>
                                    <div class="timeline-action">心流星球：享受表达的乐趣</div>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <div class="btn-row">
                        <button type="button" class="btn btn-secondary" id="btnRegeneratePlan" onclick="generatePlan()">重新生成</button>
                        <button type="button" class="btn btn-primary" id="btnConfirmPlan" onclick="confirmPlan()">确认计划</button>
                    </div>
                </div>
            </div>
    
            <!-- 底部确认按钮 -->
            <div style="height: 100px;"></div>
        </div>
    
        <div class="bottom-bar">
            <button class="btn btn-primary" onclick="confirmPlan()">确认我的计划</button>
        </div>

        <!-- 扫描来源选择 -->
        <div class="scan-sheet-overlay hidden" id="scanSheetOverlay" onclick="closeScanSheet(event)">
            <div class="scan-sheet" onclick="event.stopPropagation()">
                <div class="scan-sheet-title">选择上传方式</div>
                <div class="scan-sheet-desc">支持拍照、相册图片或 PDF 文件</div>
                <button type="button" class="scan-sheet-option" onclick="pickScanSource('camera')">
                    <span class="scan-sheet-option-icon">📷</span>
                    <span class="scan-sheet-option-text">
                        <strong>拍照</strong>
                        <small>打开相机拍摄效率手册</small>
                    </span>
                </button>
                <button type="button" class="scan-sheet-option" onclick="pickScanSource('photos')">
                    <span class="scan-sheet-option-icon">🖼️</span>
                    <span class="scan-sheet-option-text">
                        <strong>相册选择</strong>
                        <small>从手机相册挑选图片</small>
                    </span>
                </button>
                <button type="button" class="scan-sheet-option" onclick="pickScanSource('file')">
                    <span class="scan-sheet-option-icon">📄</span>
                    <span class="scan-sheet-option-text">
                        <strong>文件选择</strong>
                        <small>上传 PDF / 图片文件</small>
                    </span>
                </button>
                <button type="button" class="scan-sheet-cancel" onclick="closeScanSheet()">取消</button>
            </div>
        </div>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Starfield from '../components/Starfield.vue'
import { initPlanCreateView } from '../assets/scripts/plan-create-page.js'
import '../assets/styles/plan-create.css'

const router = useRouter()
let cleanup = null

onMounted(() => {
  try {
    cleanup = initPlanCreateView(router)
  } catch (err) {
    console.error('initPlanCreateView failed', err)
    alert('计划页加载异常，请重新打开或联系客服')
  }
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})
</script>
