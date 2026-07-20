<template>
  <div class="legacy-page legacy-page--plan-create">
    <Starfield :star-count="40" :shooting-stars="0" />
    <!-- 星空背景 -->
        <div class="page-container">
            <!-- 头部 -->
            <div class="header">
                <div class="brand-logo">✦ SHINING PLANET ✦</div>
                <div class="page-title">点亮属于你的<span>闪耀计划</span></div>
                <div class="page-subtitle">不急不赶，我们慢慢把日子过成会发光的样子</div>
                <div class="divider"></div>
            </div>
    
            <!-- 第一步：选择目标状态 -->
            <div class="card" id="step1">
                <div class="card-title">
                    <span class="icon">✨</span>
                    你现在走到哪一步了
                </div>
                <div class="card-desc">告诉我你的起点，我陪你走到终点</div>
                
                <div class="goal-status-options">
                    <div class="status-option selected" onclick="selectGoalStatus('has-plan')" id="status-has-plan">
                        <span class="icon">🌙</span>
                        <div class="label">我已有自己的计划</div>
                    </div>
                    <div class="status-option" onclick="selectGoalStatus('no-plan')" id="status-no-plan">
                        <span class="icon">💫</span>
                        <div class="label">我有愿望，还缺路径</div>
                    </div>
                </div>
            </div>

            <!-- 已保存的计划（再订一条后仍可在此看到） -->
            <div class="card hidden" id="savedPlansCard">
                <div class="card-title">
                    <span class="icon">🗺️</span>
                    已安放的计划
                </div>
                <div class="card-desc">之前订好的计划都在这里；回星球「成长奖励 → 查看计划」也可切换查看</div>
                <div class="saved-plans-list" id="savedPlansList"></div>
                <button type="button" class="btn btn-secondary" onclick="goHomeAfterPlan()" style="margin-top: 12px;">去星球查看全部</button>
            </div>
    
            <!-- 已有目标计划区域 -->
            <div id="has-plan-area">
                <!-- 效率手册：绑定 → 上传 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">📒</span>
                        把纸上的计划带进星球
                    </div>
                    <div class="card-desc">先轻轻绑定手册，再把内容放进来，AI 会帮你温柔整理</div>

                    <div class="handbook-steps" id="handbookSteps">
                        <div class="handbook-step" id="handbookStepBind">
                            <div class="handbook-step-index">1</div>
                            <div class="handbook-step-body">
                                <div class="handbook-step-title">扫一扫手册背面二维码，完成身份绑定</div>
                                <div class="handbook-step-status" id="handbookBindStatus">还没绑定哦</div>
                            </div>
                            <button type="button" class="handbook-step-action" onclick="bindHandbookQr()" aria-label="扫一扫">
                                <span class="handbook-step-action-icon">▣</span>
                                <span>扫一扫</span>
                            </button>
                        </div>

                        <div class="handbook-step" id="handbookStepUpload">
                            <div class="handbook-step-index">2</div>
                            <div class="handbook-step-body">
                                <div class="handbook-step-title">拍照或从相册上传手册内容</div>
                                <div class="handbook-step-status" id="handbookUploadHint">绑定后就可以上传啦</div>
                            </div>
                            <button type="button" class="handbook-step-action" id="handbookUploadBtn" onclick="simulateScan()" aria-label="打开相机">
                                <span class="handbook-step-action-icon">📷</span>
                                <span>相机</span>
                            </button>
                        </div>
                    </div>
                    
                </div>

                <div class="section-or-divider" aria-hidden="true">
                    <span>或亲手点亮一颗星球</span>
                </div>
    
                <!-- 五种时间目标设定 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🪐</span>
                        五种时间星际计划
                    </div>
                    <div class="card-desc">选一颗想先照顾的星球，写下这一阶段想对自己说的话</div>
                    
                    <div class="time-types" id="timeTypes">
                        <div class="time-type-tag survival" data-type="survival" onclick="selectTimeType('survival')">生存星球</div>
                        <div class="time-type-tag money" data-type="money" onclick="selectTimeType('money')">赚钱星球</div>
                        <div class="time-type-tag beauty" data-type="beauty" onclick="selectTimeType('beauty')">好看星球</div>
                        <div class="time-type-tag fun" data-type="fun" onclick="selectTimeType('fun')">好玩星球</div>
                        <div class="time-type-tag flow" data-type="flow" onclick="selectTimeType('flow')">心流星球</div>
                    </div>
    
                    <div class="period-selector">
                        <button class="period-btn selected" onclick="selectPeriod('short')">短期<br><small>1-3个月</small></button>
                        <button class="period-btn" onclick="selectPeriod('medium')">中期<br><small>3-6个月</small></button>
                        <button class="period-btn" onclick="selectPeriod('long')">长期<br><small>6-12个月</small></button>
                    </div>
    
                    <div class="input-group goal-input-group">
                        <div class="goal-input-row">
                            <input type="text" class="input-field" placeholder="请温柔地说出你的计划..." id="goalInput">
                            <div class="goal-input-modes" role="group" aria-label="输入方式">
                                <button
                                    type="button"
                                    class="goal-mode-btn is-active"
                                    id="goalModeVoice"
                                    onclick="setGoalInputMode('voice')"
                                    aria-label="语音输入"
                                    title="语音输入"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
                                    </svg>
                                </button>
                                <button
                                    type="button"
                                    class="goal-mode-btn"
                                    id="goalModeText"
                                    onclick="setGoalInputMode('text')"
                                    aria-label="文字输入"
                                    title="文字输入"
                                >
                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                        <path d="M4 5h16v2H4V5zm2 4h12v2H6V9zm-2 4h16v2H4v-2zm2 4h10v2H6v-2z"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                        <div class="goal-mode-hint" id="goalModeHint">想说就说，点麦克风，我听着</div>
                    </div>
    
                    <button class="btn btn-secondary" onclick="addGoal()">+ 放进星球</button>
    
                    <div class="goal-list" id="goalList"></div>
                </div>
            </div>
    
            <!-- 无计划区域：AI生成 -->
            <div id="no-plan-area" class="hidden">
                <div class="ai-generate-area">
                    <div class="ai-icon">✨</div>
                    <div class="ai-title">让星光替你理清路径</div>
                    <div class="ai-desc">
                        根据你的特质与节奏<br>
                        为你铺一条不那么用力、却足够闪亮的路
                    </div>
                    <div class="ai-hint">
                        💫 说说你心底真正想靠近的样子，我来帮你安进五颗星球
                    </div>
                    <div class="input-group" style="text-align: left;">
                        <label class="input-label">你最想靠近的自己是？</label>
                        <textarea class="input-field" placeholder="例如：我想更自在地表达，在人群里也能安心做自己..." style="min-height: 100px;"></textarea>
                    </div>
                    <div class="input-group" style="text-align: left;">
                        <label class="input-label">希望用多久温柔抵达？</label>
                        <div class="period-selector" id="aiDurationOptions">
                            <button type="button" class="period-btn selected" data-duration="3个月">3个月</button>
                            <button type="button" class="period-btn" data-duration="6个月">6个月</button>
                            <button type="button" class="period-btn" data-duration="1年">1年</button>
                        </div>
                    </div>
                    <div class="input-group" style="text-align: left;">
                        <label class="input-label">每日可支配的时间范围</label>
                        <div class="period-selector period-selector--daily-budget" id="aiDailyBudgetOptions">
                            <button type="button" class="period-btn selected" data-budget="15-30分钟">每天<br><small>15-30分钟</small></button>
                            <button type="button" class="period-btn" data-budget="30-60分钟">每天<br><small>30-60分钟</small></button>
                            <button type="button" class="period-btn" data-budget="1-2小时">每天<br><small>1-2小时</small></button>
                            <button type="button" class="period-btn" data-budget="2小时以上">每天<br><small>2小时以上</small></button>
                        </div>
                        <div class="goal-mode-hint">选一个刚刚好的节奏，计划会按你的时间温柔排开</div>
                    </div>
                    <button class="btn btn-primary" onclick="generatePlan()">✨ 生成我的闪耀计划</button>
                </div>
    
                <!-- 生成的计划预览 -->
                <div id="planPreview" class="hidden">
                    <div class="plan-preview">
                        <div class="plan-header">
                            <div style="font-size: 32px;">🪐</div>
                            <div>
                                <div class="plan-title">你的闪耀成长地图</div>
                                <div class="plan-subtitle">专属于你，刚刚好</div>
                            </div>
                            <button class="edit-btn">编辑</button>
                        </div>
                        <div class="plan-timeline">
                            <div class="plan-phase-empty">生成计划后，这里会展示与你目标匹配的星球路径</div>
                        </div>
                    </div>
    
                    <div class="btn-row">
                        <button type="button" class="btn btn-secondary" id="btnRegeneratePlan" onclick="generatePlan()">再想想一版</button>
                        <button type="button" class="btn btn-primary" id="btnConfirmPlan" onclick="confirmPlan()">就用这一版</button>
                    </div>
                </div>
            </div>

            <!-- 每日爱的鼓励（两条流程共用；愿望路径在生成计划后出现） -->
            <div id="encourageArea" class="card">
                <div class="card-title">
                    <span class="icon">💓</span>
                    开启每日爱的鼓励
                </div>
                <div class="card-desc">每天准时送达一句爱的加油，让行动更有力量</div>

                <div class="daily-goal-form">
                    <div class="input-group">
                        <label class="input-label">想对自己说的话</label>
                        <div class="period-selector" id="encourageModeOptions" role="group" aria-label="鼓励写法">
                            <button type="button" class="period-btn selected" data-mode="single" onclick="setEncourageMode('single')">每天同一句</button>
                            <button type="button" class="period-btn" data-mode="pool" onclick="setEncourageMode('pool')">多句随机出</button>
                            <button type="button" class="period-btn" data-mode="ai" onclick="setEncourageMode('ai')">帮你生成</button>
                        </div>
                    </div>

                    <div class="input-group goal-input-group" id="encourageSingleBlock">
                        <div class="goal-input-row">
                            <input type="text" class="input-field" id="encourageSingleInput" placeholder="例如：今天也值得被温柔对待">
                            <div class="goal-input-modes" role="group" aria-label="鼓励输入方式">
                                <button type="button" class="goal-mode-btn is-active" id="encourageModeVoice" onclick="setEncourageInputMode('voice')" aria-label="语音输入" title="语音输入">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
                                </button>
                                <button type="button" class="goal-mode-btn" id="encourageModeText" onclick="setEncourageInputMode('text')" aria-label="文字输入" title="文字输入">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v2H4V5zm2 4h12v2H6V9zm-2 4h16v2H4v-2zm2 4h10v2H6v-2z"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="goal-mode-hint" id="encourageModeHint">想说就说，点麦克风，我听着</div>
                    </div>

                    <div class="input-group goal-input-group hidden" id="encouragePoolBlock">
                        <div class="goal-input-row">
                            <input type="text" class="input-field" id="encouragePoolInput" placeholder="写下一句，回车或点添加">
                            <div class="goal-input-modes" role="group" aria-label="鼓励输入方式">
                                <button type="button" class="goal-mode-btn is-active" id="encouragePoolModeVoice" onclick="setEncourageInputMode('voice')" aria-label="语音输入" title="语音输入">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/></svg>
                                </button>
                                <button type="button" class="goal-mode-btn" id="encouragePoolModeText" onclick="setEncourageInputMode('text')" aria-label="文字输入" title="文字输入">
                                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v2H4V5zm2 4h12v2H6V9zm-2 4h16v2H4v-2zm2 4h10v2H6v-2z"/></svg>
                                </button>
                            </div>
                        </div>
                        <div class="goal-mode-hint" id="encouragePoolModeHint">想说就说，点麦克风，我听着</div>
                        <button type="button" class="btn btn-secondary encourage-pool-add" onclick="addEncouragePhrase()">+ 添加这句</button>
                        <div class="encourage-phrase-list" id="encouragePhraseList"></div>
                        <div class="goal-mode-hint">建议 3 句以上，每天打开都有一点小新鲜</div>
                    </div>

                    <div class="input-group hidden" id="encourageAiBlock">
                        <div class="goal-mode-hint">帮你写好几句；每天送达时随机挑一句。</div>
                        <button type="button" class="btn btn-secondary" id="encourageAiBtn" onclick="generateEncourageByAi()">✨ 帮我生成</button>
                        <div class="encourage-phrase-list" id="encourageAiPhraseList"></div>
                    </div>

                    <div class="form-row">
                        <div class="input-group">
                            <label class="input-label">送达时刻</label>
                            <button type="button" class="time-display-btn" id="encourageTimeDisplayBtn" onclick="toggleEncourageTimePicker()" aria-label="选择送达时刻">
                                <span id="encourageTimeDisplay">07:00</span>
                                <span class="time-display-btn__hint">点击选择</span>
                            </button>
                            <input type="hidden" id="encourageTimeInput" value="07:00">
                            <div class="time-wheel-panel hidden" id="encourageTimeWheelPanel">
                                <div class="time-wheel" id="encourageTimeWheel" data-time="07:00">
                                    <div class="time-wheel__mask" aria-hidden="true"></div>
                                    <div class="time-wheel__highlight" aria-hidden="true"></div>
                                    <div class="time-wheel__cols">
                                        <div class="time-wheel__col" id="encourageHourCol" data-unit="hour"></div>
                                        <div class="time-wheel__sep">:</div>
                                        <div class="time-wheel__col" id="encourageMinuteCol" data-unit="minute"></div>
                                    </div>
                                </div>
                                <button type="button" class="btn btn-secondary time-wheel-done" onclick="closeEncourageTimePicker()">完成</button>
                            </div>
                        </div>
                        <div class="input-group">
                            <label class="input-label">送达方式</label>
                            <div class="period-selector" id="encourageDeliverModeOptions" data-deliver-mode="text" data-voice-persona="sister" role="group" aria-label="送达方式">
                                <button type="button" class="period-btn" data-mode="voice" onclick="setEncourageDeliverMode('voice')">语音</button>
                                <button type="button" class="period-btn selected" data-mode="text" onclick="setEncourageDeliverMode('text')">文字</button>
                            </div>
                        </div>
                    </div>

                    <div class="input-group hidden" id="encourageVoicePersonaOptions" role="group" aria-label="语音角色">
                        <label class="input-label">选择音色</label>
                        <div class="period-selector">
                            <button type="button" class="period-btn selected" data-persona="sister" onclick="setEncourageVoicePersona('sister')">潇洒姐<br><small>成熟温柔</small></button>
                            <button type="button" class="period-btn" data-persona="brother" onclick="setEncourageVoicePersona('brother')">弟弟<br><small>清爽陪伴</small></button>
                        </div>
                    </div>

                    <div class="input-group">
                        <label class="input-label">陪伴的日子</label>
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
                        <span class="switch-label">节假日安静陪伴</span>
                        <div class="switch" onclick="toggleSwitch(this)"></div>
                    </div>
                    <div class="switch-row">
                        <span class="switch-label">开启温柔提醒</span>
                        <div class="switch active" onclick="toggleSwitch(this)"></div>
                    </div>
                </div>

                <button class="btn btn-secondary" id="addEncourageBtn">+ 保存每日鼓励</button>
                <div class="goal-list reminder-list" id="reminderList"></div>
            </div>
    
            <!-- 底部确认按钮 -->
            <div style="height: 100px;"></div>
        </div>
    
        <div class="bottom-bar">
            <button class="btn btn-primary" onclick="confirmPlan()">开启我的星球旅程</button>
        </div>

        <!-- 达成奖励礼包（与首页成长礼包一致） -->
        <div class="invite-modal-overlay hidden" id="rewardPackModalOverlay">
            <div class="invite-modal-card reward-pack-modal-card">
                <div class="invite-modal-title" id="rewardPackModalTitle">完成即可得奖励礼包</div>
                <div class="reward-pack-section">
                    <div class="reward-pack-section-title">随机小惊喜（系统默认）</div>
                    <div class="reward-pack-list" id="rewardPackDefaultList"></div>
                </div>
                <div class="reward-pack-section">
                    <div class="reward-pack-section-title">悦己奖励（自定义选项）</div>
                    <div class="reward-input-area reward-pack-config">
                        <input type="text" class="input-field" placeholder="奖励名称（例如：一顿喜欢的brunch）" id="packRewardName">
                        <div class="reward-pack-desc-block">
                            <div class="reward-pack-desc-head">
                                <span class="reward-pack-desc-label">写点心意 / 去挑选</span>
                                <div class="reward-shop-apps" aria-label="去挑选">
                                    <button type="button" class="reward-shop-app taobao" onclick="openShopPick('taobao')" title="淘宝去挑选">
                                        <img class="reward-shop-logo" src="/images/brands/taobao-logo.png" alt="淘宝" width="36" height="36">
                                        <span class="reward-shop-name">淘宝</span>
                                    </button>
                                    <button type="button" class="reward-shop-app dewu" onclick="openShopPick('dewu')" title="得物去挑选">
                                        <img class="reward-shop-logo" src="/images/brands/dewu-logo.png" alt="得物" width="36" height="36">
                                        <span class="reward-shop-name">得物</span>
                                    </button>
                                    <button type="button" class="reward-shop-app smzdm" onclick="openShopPick('smzdm')" title="什么值得买去挑选">
                                        <img class="reward-shop-logo" src="/images/brands/smzdm-logo.png" alt="什么值得买" width="36" height="36">
                                        <span class="reward-shop-name">值得买</span>
                                    </button>
                                </div>
                            </div>
                            <textarea class="input-field" placeholder="奖励描述/去挑选..." id="packRewardDesc"></textarea>
                        </div>
                        <div class="reward-pack-condition-label">达成标准（允许给自己留点待完成）</div>
                        <div class="form-row reward-pack-condition-row">
                            <select class="input-field" id="packRewardConditionType" onchange="syncPackRewardConditionUi()">
                                <option value="completion_rate">完成率达成</option>
                                <option value="planet_light">该星球已点亮</option>
                            </select>
                            <div class="reward-pack-condition-value">
                                <input
                                    type="number"
                                    class="input-field"
                                    id="packRewardConditionValue"
                                    min="1"
                                    max="100"
                                    placeholder="XX"
                                    inputmode="numeric"
                                >
                                <span class="reward-pack-condition-unit" id="packRewardConditionUnit">%</span>
                            </div>
                            <button class="add-btn" type="button" onclick="addPackReward()">添加奖励</button>
                        </div>
                    </div>
                    <div class="reward-pack-list" id="rewardPackCustomList"></div>
                </div>
                <button type="button" class="btn btn-primary reward-pack-close-btn" onclick="closeRewardPackModal()">关闭</button>
            </div>
        </div>

        <!-- 扫描来源选择 -->
        <div class="scan-sheet-overlay hidden" id="scanSheetOverlay" onclick="closeScanSheet(event)">
            <div class="scan-sheet" onclick="event.stopPropagation()">
                <div class="scan-sheet-title">选择上传方式</div>
                <div class="scan-sheet-desc">支持拍照或从相册选择手册内容</div>
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
