<template>
  <div class="legacy-page legacy-page--main-home">
    <Starfield :star-count="36" :shooting-stars="0" />
    <!-- 星空背景 -->
        <div class="page-container">
            <!-- 头部 -->
            <div class="header">
                <div class="brand-logo">✦ SHINING PLANET ✦</div>
                <div class="page-title" id="pageTitle">我的<span>星际旅程</span></div>
                <div class="page-subtitle" id="pageSubtitle">在闪耀星球，每一天都是成长</div>
                <div class="divider"></div>
            </div>
    
            <!-- ========== Tab 1: 计划进度 ========== -->
            <div class="tab-content active" id="tab-plan">
                <!-- 点亮我的星球 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🪐</span>
                        点亮我的星球
                    </div>
                    <div class="card-desc">收集星球能量碎片，点亮你的闪耀星球解锁奖励</div>
                    
                    <div class="planet-orbit" id="planetOrbit"></div>
                </div>
    
                <!-- 今日行动清单 -->
                <div class="card">
                    <div class="card-title" id="todayActionsTitle">
                        <span class="icon">📋</span>
                        <span class="today-actions-heading">今日行动</span>
                        <button type="button" class="daily-quote-btn" id="dailyQuoteBtn" onclick="openTodayGrowthQuote()" title="查收爱的鼓励">
                            <span class="daily-quote-icon" aria-hidden="true">💌</span>
                            查收爱的鼓励
                            <span class="daily-quote-dot hidden" id="dailyQuoteDot" aria-hidden="true"></span>
                        </button>
                    </div>
                    <div class="card-desc" id="todayActionsDesc">完成所有行动，获得星球能量碎片</div>
                    
                    <div class="today-tasks" id="todayTasks">
                        <div class="task-item task-pending" data-task="1" data-time-type="survival">
                            <div class="task-type-tag survival">生存行动</div>
                            <div class="task-content">
                                <div class="task-title">晨跑5公里</div>
                                <div class="task-meta">07:00 · 待完成</div>
                            </div>
                            <div class="task-actions">
                                <button class="task-action-btn invite" onclick="shareTask(this)" title="邀约伙伴">邀约伙伴</button>
                                <button class="task-action-btn confirm" onclick="confirmTaskComplete(this)" title="确认完成">确认完成</button>
                            </div>
                        </div>
                    </div>
                </div>
    
                <!-- 周行动回顾：平日看上周，周日解锁本周 -->
                <div class="card weekend-review-card hidden" id="weekendReviewCard">
                    <div class="card-title">
                        <span class="icon">📝</span>
                        <span id="weekendReviewTitle">周行动回顾</span>
                        <span class="weekend-review-lock-tag hidden" id="weekendReviewLockTag">周日解锁</span>
                    </div>
                    <div class="weekend-review-text" id="weekendReviewText"></div>
                    <button class="btn btn-secondary weekend-review-btn" id="weekendReviewBtn" onclick="openWeekendReview()">查看上周行动回顾</button>
                </div>
    
                <!-- 星球社区 -->
                <div class="card community-card" id="communityCard">
                    <div class="card-title">
                        <span class="icon">🌍</span>
                        星球社区
                    </div>
                    <div class="card-desc">同属星球小伙伴的今日行动分享</div>

                    <div class="community-feed-wrap" id="communityFeedWrap" data-expand-level="0">
                        <div class="community-feed" id="communityFeed"></div>
                    </div>
                    <div class="community-expand-controls">
                        <button type="button" class="community-expand-btn" id="communityExpandUpBtn" onclick="shrinkCommunityFeed()" aria-label="收起行动分享" hidden>▲</button>
                        <button type="button" class="community-expand-btn" id="communityExpandDownBtn" onclick="expandCommunityFeed()" aria-label="展开更多行动分享">▼</button>
                    </div>
                </div>
            </div>
    
            <!-- ========== Tab 3: 能量中心 ========== -->
            <div class="tab-content" id="tab-energy">
                <!-- 上半：你的伙伴对话（文字 + 语音） -->
                <div class="card energy-chat-card">
                    <div class="companion-header" id="companionHeader">
                        <img class="companion-header-avatar" id="companionHeaderAvatar" src="/images/avatar/sailor-fire-portrait.png" alt="你的伙伴">
                        <div class="companion-header-text">
                            <div class="companion-header-name" id="companionHeaderName">你的伙伴·星光</div>
                            <div class="companion-header-desc" id="companionHeaderDesc">文字聊聊，也能语音陪你说几句</div>
                        </div>
                        <button type="button" class="companion-voice-toggle" id="companionVoiceToggle" onclick="toggleCompanionVoiceSpeak()" aria-pressed="true" title="回复时朗读">🔊</button>
                    </div>
                    <div class="energy-chat" id="energyChat">
                        <div class="energy-chat-messages" id="energyChatMessages">
                            <div class="energy-chat-msg assistant" id="companionGreetingMsg">
                                <div class="energy-chat-avatar companion-avatar-img">
                                    <img id="companionGreetingAvatar" src="/images/avatar/sailor-fire-portrait.png" alt="">
                                </div>
                                <div class="energy-chat-bubble" id="companionGreetingBubble">我是你的伙伴。想补充哪颗星球的能量，都跟我说一声；也可以按住麦克风跟我说话。</div>
                            </div>
                        </div>
                        <div class="energy-chat-composer">
                            <button type="button" class="energy-chat-mic" id="energyChatMicBtn" onclick="toggleCompanionVoiceInput()" aria-label="语音对话" title="语音对话">🎤</button>
                            <input
                                type="text"
                                class="energy-chat-input"
                                id="energyChatInput"
                                placeholder="跟你的伙伴说点什么…"
                                maxlength="500"
                                onkeypress="submitEnergyChat(event)"
                            >
                            <button type="button" class="energy-chat-send" id="energyChatSendBtn" onclick="sendEnergyChat()">发送</button>
                        </div>
                        <div class="companion-voice-hint" id="companionVoiceHint">点麦克风说话，她听完会温柔回答；也可打开喇叭让她读出来</div>
                    </div>
                </div>

                <!-- 下半：能量补给站 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">⚡</span>
                        能量补给站
                    </div>
                    <div class="card-desc">你已经很用力了，歇一歇，充会电再出发</div>
                    
                    <!-- 一级分类：五种时间星球（与制定计划页同款标签） -->
                    <div class="time-types category-tabs" id="energyPlanetTabs">
                        <div class="time-type-tag all is-lit selected" data-type="all" onclick="selectCategory(this, 'all')">全部</div>
                        <div class="time-type-tag survival" data-type="survival" onclick="selectCategory(this, 'survival')">生存星球</div>
                        <div class="time-type-tag money" data-type="money" onclick="selectCategory(this, 'money')">赚钱星球</div>
                        <div class="time-type-tag beauty" data-type="beauty" onclick="selectCategory(this, 'beauty')">好看星球</div>
                        <div class="time-type-tag fun" data-type="fun" onclick="selectCategory(this, 'fun')">好玩星球</div>
                        <div class="time-type-tag flow" data-type="flow" onclick="selectCategory(this, 'flow')">心流星球</div>
                    </div>
    
                    <!-- 二级分类：学习阶段 -->
                    <div class="subcategory-tabs">
                        <div class="subcategory-tab active" onclick="selectSubcategory(this, 'recommended')">✨ 为你挑选</div>
                        <div class="subcategory-tab" onclick="selectSubcategory(this, 'beginner')">🌱 新手入门</div>
                        <div class="subcategory-tab" onclick="selectSubcategory(this, 'advanced')">🚀 进阶提升</div>
                        <div class="subcategory-tab" onclick="selectSubcategory(this, 'special')">🎯 专项突破</div>
                    </div>
    
                    <div class="product-grid" id="productGrid">
                        <!-- 为你挑选 -->
                        <div class="product-card" data-category="survival" data-subcategory="recommended">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">🏃</div>
                            <div class="product-info">
                                <div class="product-name">21天运动养成课</div>
                                <div class="product-desc">科学运动，打造健康体魄</div>
                                <div class="product-price">¥199<span class="original">¥299</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '21天运动养成课')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="money" data-subcategory="recommended">
                            <div class="product-badge limited-free">限时免费</div>
                            <div class="product-image">📚</div>
                            <div class="product-info">
                                <div class="product-name">趁早时间管理课</div>
                                <div class="product-desc">21天建立高效时间体系</div>
                                <div class="product-price">¥199<span class="original">¥299</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '趁早时间管理课')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="flow" data-subcategory="recommended">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">🧘</div>
                            <div class="product-info">
                                <div class="product-name">正念冥想入门</div>
                                <div class="product-desc">30天找回内心平静</div>
                                <div class="product-price">¥149<span class="original">¥199</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '正念冥想入门')">加入计划</button>
                            </div>
                        </div>
                        
                        <!-- 新手入门 -->
                        <div class="product-card" data-category="survival" data-subcategory="beginner">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">🥗</div>
                            <div class="product-info">
                                <div class="product-name">营养饮食指南</div>
                                <div class="product-desc">吃出健康好身材</div>
                                <div class="product-price">¥89<span class="original">¥129</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '营养饮食指南')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="beauty" data-subcategory="beginner">
                            <div class="product-badge limited-free">限时免费</div>
                            <div class="product-image">📓</div>
                            <div class="product-info">
                                <div class="product-name">效率手册2026</div>
                                <div class="product-desc">年度规划·每日追踪</div>
                                <div class="product-price">¥89<span class="original">¥129</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '效率手册2026')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="fun" data-subcategory="beginner">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">📷</div>
                            <div class="product-info">
                                <div class="product-name">手机摄影课</div>
                                <div class="product-desc">记录生活中的美好瞬间</div>
                                <div class="product-price">¥149<span class="original">¥199</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '手机摄影课')">加入计划</button>
                            </div>
                        </div>
                        
                        <!-- 进阶提升 -->
                        <div class="product-card" data-category="money" data-subcategory="advanced">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">🎤</div>
                            <div class="product-info">
                                <div class="product-name">演讲表达训练营</div>
                                <div class="product-desc">从紧张到自信的蜕变</div>
                                <div class="product-price">¥399<span class="original">¥599</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '演讲表达训练营')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="beauty" data-subcategory="advanced">
                            <div class="product-badge limited-free">限时免费</div>
                            <div class="product-image">💄</div>
                            <div class="product-info">
                                <div class="product-name">形象管理课</div>
                                <div class="product-desc">找到属于你的风格</div>
                                <div class="product-price">¥249<span class="original">¥349</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '形象管理课')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="flow" data-subcategory="advanced">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">📖</div>
                            <div class="product-info">
                                <div class="product-name">晨间仪式套装</div>
                                <div class="product-desc">开启美好一天的仪式感</div>
                                <div class="product-price">¥159<span class="original">¥229</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '晨间仪式套装')">加入计划</button>
                            </div>
                        </div>
                        
                        <!-- 专项突破 -->
                        <div class="product-card" data-category="fun" data-subcategory="special">
                            <div class="product-badge limited-free">限时免费</div>
                            <div class="product-image">🎨</div>
                            <div class="product-info">
                                <div class="product-name">零基础绘画课</div>
                                <div class="product-desc">释放创造力的快乐</div>
                                <div class="product-price">¥179<span class="original">¥259</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '零基础绘画课')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="money" data-subcategory="special">
                            <div class="product-badge vip-free">会员免费</div>
                            <div class="product-image">💼</div>
                            <div class="product-info">
                                <div class="product-name">职场沟通术</div>
                                <div class="product-desc">高效沟通，事半功倍</div>
                                <div class="product-price">¥299<span class="original">¥399</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '职场沟通术')">加入计划</button>
                            </div>
                        </div>
                        
                        <div class="product-card" data-category="survival" data-subcategory="special">
                            <div class="product-badge limited-free">限时免费</div>
                            <div class="product-image">😴</div>
                            <div class="product-info">
                                <div class="product-name">优质睡眠课</div>
                                <div class="product-desc">告别失眠，睡出好状态</div>
                                <div class="product-price">¥129<span class="original">¥199</span></div>
                                <button class="add-btn" onclick="addToPlan(this, '优质睡眠课')">加入计划</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    
            <!-- ========== Tab 2: 成长奖励 ========== -->
            <div class="tab-content" id="tab-reward">
                <!-- 总体进度 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🏆</span>
                        计划进度
                    </div>
    
                    <div class="progress-ring">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle class="progress-ring-bg" cx="60" cy="60" r="52"/>
                            <circle class="progress-ring-fill" cx="60" cy="60" r="52"
                                stroke-dasharray="326.73" stroke-dashoffset="326.73" id="progressRing"/>
                        </svg>
                        <div class="progress-ring-text">
                            <div class="progress-ring-value">0%</div>
                            <div class="progress-ring-label">目标总进度</div>
                        </div>
                    </div>

                    <div class="dimension-progress" id="dimensionProgress"></div>
                </div>

                <!-- 成长赛季 BOSS 战 -->
                <div class="card growth-boss-card">
                    <div class="card-title">
                        <span class="icon">⚔️</span>
                        成长赛季BOSS战
                    </div>
                    <div class="card-desc">任意 3 个星球点亮进度达到 100%，即可解锁线下活动报名参与权益</div>
                    <div class="growth-boss-list" id="growthBossList">
                        <div class="growth-boss-item" data-quarter="Q1">
                            <div class="growth-boss-quarter">Q1</div>
                            <div class="growth-boss-body">
                                <div class="growth-boss-label">Boss战</div>
                                <div class="growth-boss-name">高效启动开年训练营</div>
                            </div>
                            <button type="button" class="growth-boss-unlock-btn is-locked" data-boss-unlock="Q1" disabled>待解锁</button>
                        </div>
                        <div class="growth-boss-item" data-quarter="Q2">
                            <div class="growth-boss-quarter">Q2</div>
                            <div class="growth-boss-body">
                                <div class="growth-boss-label">Boss战</div>
                                <div class="growth-boss-name">专项技能提升训练营</div>
                            </div>
                            <button type="button" class="growth-boss-unlock-btn is-locked" data-boss-unlock="Q2" disabled>待解锁</button>
                        </div>
                        <div class="growth-boss-item" data-quarter="Q3">
                            <div class="growth-boss-quarter">Q3</div>
                            <div class="growth-boss-body">
                                <div class="growth-boss-label">Boss战</div>
                                <div class="growth-boss-name">闪耀星球达人分享交流</div>
                            </div>
                            <button type="button" class="growth-boss-unlock-btn is-locked" data-boss-unlock="Q3" disabled>待解锁</button>
                        </div>
                        <div class="growth-boss-item" data-quarter="Q4">
                            <div class="growth-boss-quarter">Q4</div>
                            <div class="growth-boss-body">
                                <div class="growth-boss-label">Boss战</div>
                                <div class="growth-boss-name">跨年演讲入场券</div>
                            </div>
                            <button type="button" class="growth-boss-unlock-btn is-locked" data-boss-unlock="Q4" disabled>待解锁</button>
                        </div>
                    </div>
                </div>

                <!-- 成长总览：月度分析报告 -->
                <div class="card growth-overview-card">
                    <div class="card-title">
                        <span class="icon">🌌</span>
                        成长总览
                        <button type="button" class="daily-curve-btn ai-zone-info-btn growth-overview-ai-btn" onclick="openAiMemberZoneInfo()" title="AI体验专区">AI体验专区</button>
                    </div>
                    <div class="growth-report-gate" id="growthReportGate">
                        <div class="growth-report-gate-title">月度个人成长报告</div>
                        <div class="growth-report-gate-desc">汇总本月高光、五种时间盘点与下月规划</div>
                        <button type="button" class="btn btn-primary growth-report-unlock-btn" onclick="unlockMonthlyGrowthReport()">
                            解锁查看月度成长报告
                        </button>
                    </div>
                    <section class="growth-template-report hidden" id="growthTemplateReport" aria-label="月度个人成长报告"></section>
                </div>
    
                <!-- 我的奖励：已获得的勋章 / 礼包 / 悦己奖励 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🎁</span>
                        我的奖励
                    </div>
                    <div class="card-desc">点亮星球、潘多拉魔盒与计划礼包中获得的奖励，都会收纳在这里</div>
                    <div class="my-rewards-list" id="myRewardsList"></div>
                </div>
            </div>
    
            <!-- ========== Tab 4: 会员中心 ========== -->
            <div class="tab-content" id="tab-member">
                <!-- 会员卡片 -->
                <div class="member-card">
                    <div class="member-avatar" style="display: flex; align-items: center; justify-content: center; font-size: 28px; background: rgba(212, 185, 106, 0.15);">👤</div>
                    <div class="member-name" id="memberName">闪耀星球居民</div>
                    <div class="member-level" id="memberLevel">🌟 星耀会员</div>
                    <div class="member-expire">有效期至：2026年12月31日</div>
                </div>
    
                <!-- 当前会员权益解锁进度 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🔓</span>
                        我的权益解锁进度
                    </div>
                    <div class="card-desc">星耀会员已解锁 4/6 项权益</div>
    
                    <div class="benefit-progress-list">
                        <div class="benefit-progress-item">
                            <div class="benefit-progress-icon">🤖</div>
                            <div class="benefit-progress-bar-wrap">
                                <div class="benefit-progress-label">
                                    <span class="name">AI专属计划</span>
                                    <span class="status unlocked">已解锁</span>
                                </div>
                                <div class="benefit-progress-track">
                                    <div class="benefit-progress-fill unlocked" style="width: 100%"></div>
                                </div>
                            </div>
                        </div>
    
                        <div class="benefit-progress-item">
                            <div class="benefit-progress-icon">📊</div>
                            <div class="benefit-progress-bar-wrap">
                                <div class="benefit-progress-label">
                                    <span class="name">深度数据分析</span>
                                    <span class="status unlocked">已解锁</span>
                                </div>
                                <div class="benefit-progress-track">
                                    <div class="benefit-progress-fill unlocked" style="width: 100%"></div>
                                </div>
                            </div>
                        </div>
    
                        <div class="benefit-progress-item">
                            <div class="benefit-progress-icon">👥</div>
                            <div class="benefit-progress-bar-wrap">
                                <div class="benefit-progress-label">
                                    <span class="name">专属社群</span>
                                    <span class="status unlocked">已解锁</span>
                                </div>
                                <div class="benefit-progress-track">
                                    <div class="benefit-progress-fill unlocked" style="width: 100%"></div>
                                </div>
                            </div>
                        </div>
    
                        <div class="benefit-progress-item">
                            <div class="benefit-progress-icon">🎁</div>
                            <div class="benefit-progress-bar-wrap">
                                <div class="benefit-progress-label">
                                    <span class="name">会员专属折扣</span>
                                    <span class="status unlocked">已解锁</span>
                                </div>
                                <div class="benefit-progress-track">
                                    <div class="benefit-progress-fill unlocked" style="width: 100%"></div>
                                </div>
                            </div>
                        </div>
    
                        <div class="benefit-progress-item">
                            <div class="benefit-progress-icon">🏆</div>
                            <div class="benefit-progress-bar-wrap">
                                <div class="benefit-progress-label">
                                    <span class="name">线下活动报名参与权</span>
                                    <span class="status locked">待解锁</span>
                                </div>
                                <div class="benefit-progress-track">
                                    <div class="benefit-progress-fill locked" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
    
                        <div class="benefit-progress-item">
                            <div class="benefit-progress-icon">🌟</div>
                            <div class="benefit-progress-bar-wrap">
                                <div class="benefit-progress-label">
                                    <span class="name">1对1成长顾问</span>
                                    <span class="status locked">待解锁</span>
                                </div>
                                <div class="benefit-progress-track">
                                    <div class="benefit-progress-fill locked" style="width: 0%"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    
                <!-- 会员等级对比 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">💎</span>
                        会员等级
                    </div>
                    <div class="card-desc">选择适合你的成长方案</div>
    
                    <!-- 萌芽会员 -->
                    <div class="tier-card">
                        <div class="tier-header">
                            <div class="tier-icon">🌱</div>
                            <div class="tier-info">
                                <div class="tier-name">萌芽会员</div>
                                <div class="tier-price">¥87 <span class="period">/ 季度</span></div>
                            </div>
                        </div>
                        <div class="benefit-progress-list">
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">AI计划生成（每季度9次）</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">基础成长报告</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">能量中心9.5折</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <button class="upgrade-btn secondary" onclick="showUpgradeInfo('萌芽')">查看详情</button>
                    </div>
    
                    <!-- 星耀会员（当前） -->
                    <div class="tier-card current">
                        <div class="tier-badge current">当前</div>
                        <div class="tier-header">
                            <div class="tier-icon">🌟</div>
                            <div class="tier-info">
                                <div class="tier-name">星耀会员</div>
                                <div class="tier-price">¥297 <span class="period">/ 季度</span></div>
                            </div>
                        </div>
                        <div class="benefit-progress-list">
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">AI专属计划（无限次）</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">深度数据分析</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">专属成长社群</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">能量中心9折</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
    
                    <!-- 星球女王（推荐升级） -->
                    <div class="tier-card recommended">
                        <div class="tier-badge recommended">推荐升级</div>
                        <div class="tier-header">
                            <div class="tier-icon">👑</div>
                            <div class="tier-info">
                                <div class="tier-name">星球女王</div>
                                <div class="tier-price">¥897 <span class="period">/ 季度</span></div>
                            </div>
                        </div>
                        <div class="benefit-progress-list">
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">星耀会员全部权益</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">线下活动报名参与权</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">1对1成长顾问（季度）</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                            <div class="benefit-progress-item">
                                <div class="benefit-progress-bar-wrap">
                                    <div class="benefit-progress-label">
                                        <span class="name">能量中心8.5折</span>
                                        <span class="status unlocked">✓</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
    
                <!-- 权益对比表 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">📊</span>
                        权益对比
                    </div>
                    <div class="card-desc">一目了然，选择最适合你的方案</div>
    
                    <table class="compare-table">
                        <thead>
                            <tr>
                                <th>权益项目</th>
                                <th>萌芽</th>
                                <th class="current-col">星耀</th>
                                <th>女王</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>AI计划生成</td>
                                <td><span class="check">✓</span> 9次/季</td>
                                <td class="current-col"><span class="check">✓</span> 无限</td>
                                <td><span class="check">✓</span> 无限</td>
                            </tr>
                            <tr>
                                <td>成长报告</td>
                                <td><span class="check">✓</span> 基础</td>
                                <td class="current-col"><span class="check">✓</span> 深度</td>
                                <td><span class="check">✓</span> 深度</td>
                            </tr>
                            <tr>
                                <td>专属社群</td>
                                <td><span class="cross">—</span></td>
                                <td class="current-col"><span class="check">✓</span></td>
                                <td><span class="check">✓</span></td>
                            </tr>
                            <tr>
                                <td>能量中心折扣</td>
                                <td><span class="check">✓</span> 9.5折</td>
                                <td class="current-col"><span class="check">✓</span> 9折</td>
                                <td><span class="check">✓</span> 8.5折</td>
                            </tr>
                            <tr>
                                <td>线下活动报名</td>
                                <td><span class="cross">—</span></td>
                                <td class="current-col"><span class="cross">—</span></td>
                                <td><span class="check">✓</span></td>
                            </tr>
                            <tr>
                                <td>1对1成长顾问</td>
                                <td><span class="cross">—</span></td>
                                <td class="current-col"><span class="cross">—</span></td>
                                <td><span class="check">✓</span> 季度</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- App 下载 -->
                <div class="card app-download-card">
                    <div class="card-title">
                        <span class="icon">📱</span>
                        App 下载
                    </div>
                    <div class="card-desc">安装闪耀星球 Android 客户端，随时打卡成长</div>
                    <div class="app-download-body">
                        <div class="app-download-icon">🪐</div>
                        <div class="app-download-info">
                            <div class="app-download-name">闪耀星球</div>
                            <div class="app-download-meta">Android · 版本 1.0 · 安装包 APK</div>
                        </div>
                    </div>
                    <a class="btn btn-primary app-download-btn" id="appDownloadBtn" href="/downloads/shining-planet.apk" download="shining-planet.apk">下载 Android 版</a>
                    <div class="app-download-hint">若浏览器无法直接安装，请用手机自带浏览器打开后安装。首次安装需允许「未知来源」应用。</div>
                </div>
            </div>
        </div>
    
        <!-- 点亮后：潘多拉魔盒 -->
        <div class="daily-summary-overlay hidden" id="pandoraBoxOverlay">
            <div class="pandora-card">
                <div class="pandora-box" aria-hidden="true">
                    <div class="pandora-lid"></div>
                    <div class="pandora-body"></div>
                    <div class="pandora-glow"></div>
                </div>
                <div class="pandora-title">恭喜点亮<span id="pandoraPlanetName">生存星球</span></div>
                <p class="pandora-upgrade" id="pandoraUpgradeText">恭喜升级至 Lv.1</p>
                <div class="pandora-desc" id="pandoraDescText">星球亮度提升一级，获得潘多拉魔盒一个<br>打开即可领取奖励</div>
                <div class="pandora-actions">
                    <button type="button" class="btn btn-primary pandora-claim-btn" onclick="openPandoraNow()">领取奖励</button>
                </div>
            </div>
        </div>

        <!-- 打开魔盒：系统奖励礼品卡 -->
        <div class="daily-summary-overlay hidden" id="pandoraRewardOverlay">
            <canvas class="fireworks-canvas" id="pandoraFireworksCanvas"></canvas>
            <div class="gift-card pandora-reward-card">
                <div class="pandora-reward-icon" id="pandoraRewardIcon">🎟️</div>
                <div class="gift-card-title">恭喜你获得</div>
                <div class="gift-card-reward" id="pandoraRewardText">线上课限时3天体验券</div>
                <div class="pandora-reward-hint">奖励已放入你的成长礼包</div>
                <button type="button" class="btn btn-primary gift-claim-btn pandora-claim-btn" onclick="closePandoraReward()">领取奖励</button>
            </div>
        </div>

        <!-- 周行动回顾（成长报告模版） -->
        <div class="invite-modal-overlay hidden" id="weekendSummaryOverlay" onclick="if(event.target===this)closeWeekendReview()">
            <div class="invite-modal-card weekend-summary-modal-card">
                <div class="weekend-summary-modal-top">
                    <div class="invite-modal-title" id="weekendSummaryModalTitle">上周行动回顾</div>
                    <button type="button" class="weekend-summary-close" onclick="closeWeekendReview()" aria-label="关闭">×</button>
                </div>
                <div class="weekend-summary-scroll">
                    <section class="growth-report" id="weekendGrowthReport" aria-label="周行动回顾分析报告"></section>
                </div>
                <div class="daily-summary-actions" style="margin-top: 12px;">
                    <button type="button" class="btn btn-secondary" onclick="closeWeekendReview()">关闭</button>
                </div>
            </div>
        </div>

        <!-- 查收爱的鼓励 -->
        <div class="invite-modal-overlay hidden" id="dailyQuoteOverlay" onclick="if(event.target===this)closeTodayGrowthQuote()">
            <div class="invite-modal-card daily-quote-modal-card" onclick="event.stopPropagation()">
                <div class="invite-modal-title">爱的鼓励</div>
                <div class="card-desc daily-quote-modal-desc">给你的一句温柔提醒，慢慢看就好</div>
                <div class="daily-quote-body" id="dailyQuoteBody"></div>
                <div class="daily-summary-actions" style="margin-top: 16px;">
                    <button type="button" class="btn btn-secondary" onclick="closeTodayGrowthQuote()">收好了</button>
                </div>
            </div>
        </div>

        <!-- 轻松模式今日行动列表（AI体验 Demo） -->
        <div class="ai-mode-demo-page hidden" id="aiEasyModePage" role="dialog" aria-label="轻松模式今日行动">
            <div class="ai-mode-demo-inner">
                <header class="ai-mode-demo-header">
                    <button type="button" class="ai-mode-demo-back" onclick="closeAiEasyModePage()" aria-label="返回">← 返回</button>
                    <div class="ai-mode-demo-badge sticky">AI自适应难度：轻松模式</div>
                    <div class="ai-mode-demo-title">今日行动</div>
                    <p class="ai-mode-demo-subtitle">微任务示例 · 降低放弃压力</p>
                </header>
                <div class="ai-mode-demo-list today-tasks">
                    <div class="task-item task-pending ai-mode-demo-task">
                        <div class="task-type-tag flow">微任务</div>
                        <div class="task-content">
                            <div class="task-title">5分钟冥想</div>
                            <div class="task-meta">约 5 分钟 · 待完成</div>
                        </div>
                        <button type="button" class="task-action-btn confirm" onclick="notifyAiModeDemoOnly()">确认完成</button>
                    </div>
                    <div class="task-item task-pending ai-mode-demo-task">
                        <div class="task-type-tag survival">微任务</div>
                        <div class="task-content">
                            <div class="task-title">简单拉伸</div>
                            <div class="task-meta">约 3 分钟 · 待完成</div>
                        </div>
                        <button type="button" class="task-action-btn confirm" onclick="notifyAiModeDemoOnly()">确认完成</button>
                    </div>
                    <div class="task-item task-pending ai-mode-demo-task">
                        <div class="task-type-tag fun">微任务</div>
                        <div class="task-content">
                            <div class="task-title">日常随笔记录</div>
                            <div class="task-meta">约 5 分钟 · 待完成</div>
                        </div>
                        <button type="button" class="task-action-btn confirm" onclick="notifyAiModeDemoOnly()">确认完成</button>
                    </div>
                </div>
                <p class="ai-mode-demo-note">
                    触发条件：连续3天行动完成率＜50%，AI自动下调难度，生成微任务，降低放弃压力。<br>
                    Demo仅展示界面，自动化判定逻辑后期实现。
                </p>
            </div>
        </div>

        <!-- 进阶模式行动列表（AI体验 Demo） -->
        <div class="ai-mode-demo-page ai-mode-demo-page--advanced hidden" id="aiAdvancedModePage" role="dialog" aria-label="进阶模式行动列表">
            <div class="ai-mode-demo-inner">
                <header class="ai-mode-demo-header">
                    <button type="button" class="ai-mode-demo-back" onclick="closeAiAdvancedModePage()" aria-label="返回">← 返回</button>
                    <div class="ai-mode-demo-badge ai-mode-demo-badge--advanced sticky">AI自适应难度：进阶模式</div>
                    <div class="ai-mode-demo-title">今日行动</div>
                    <p class="ai-mode-demo-subtitle">进阶行动示例 · 循序渐进成长</p>
                </header>
                <div class="ai-mode-demo-list today-tasks">
                    <div class="task-item task-pending ai-mode-demo-task ai-mode-demo-task--advanced">
                        <div class="task-type-tag flow">进阶行动</div>
                        <div class="task-content">
                            <div class="task-title">30分钟深度阅读</div>
                            <div class="task-meta">约 30 分钟 · 待完成</div>
                        </div>
                        <button type="button" class="task-action-btn confirm" onclick="notifyAiModeDemoOnly()">确认完成</button>
                    </div>
                    <div class="task-item task-pending ai-mode-demo-task ai-mode-demo-task--advanced">
                        <div class="task-type-tag money">进阶行动</div>
                        <div class="task-content">
                            <div class="task-title">职业技能练习</div>
                            <div class="task-meta">约 40 分钟 · 待完成</div>
                        </div>
                        <button type="button" class="task-action-btn confirm" onclick="notifyAiModeDemoOnly()">确认完成</button>
                    </div>
                    <div class="task-item task-pending ai-mode-demo-task ai-mode-demo-task--advanced">
                        <div class="task-type-tag survival">进阶行动</div>
                        <div class="task-content">
                            <div class="task-title">完整形体训练</div>
                            <div class="task-meta">约 45 分钟 · 待完成</div>
                        </div>
                        <button type="button" class="task-action-btn confirm" onclick="notifyAiModeDemoOnly()">确认完成</button>
                    </div>
                </div>
                <p class="ai-mode-demo-note ai-mode-demo-note--advanced">
                    触发条件：连续7天稳定完成行动，AI适度提升行动强度，实现循序渐进成长。<br>
                    Demo仅展示界面，自动化判定逻辑后期实现。
                </p>
            </div>
        </div>

        <!-- AI体验专区（从成长总览入口打开） -->
        <div class="invite-modal-overlay hidden" id="aiMemberZoneOverlay" onclick="if(event.target===this)closeAiMemberZoneInfo()">
            <div class="invite-modal-card ai-member-zone-card">
                <div class="invite-modal-title">AI体验专区</div>
                <p class="ai-member-zone-lead">说明1：无手动切换入口，正式版由AI全自动调度，用户完全不感知；</p>
                <p class="ai-member-zone-lead ai-member-zone-lead--2">说明2：模拟触发入口，仅做页面交互和预警弹窗，用户行为判断规则、AI个性化微调模型等后续开发。</p>
                <div class="ai-zone-actions" id="aiZoneActions">
                    <button type="button" class="ai-zone-action-btn" onclick="triggerAiExperience('easy')">
                        <span class="ai-zone-action-scene">每日行动连续断签</span>
                        <span class="ai-zone-action-arrow" aria-hidden="true">→</span>
                        <span class="ai-zone-action-result">切换【轻松模式】</span>
                    </button>
                    <button type="button" class="ai-zone-action-btn" onclick="triggerAiExperience('advanced')">
                        <span class="ai-zone-action-scene">每日行动稳定完成</span>
                        <span class="ai-zone-action-arrow" aria-hidden="true">→</span>
                        <span class="ai-zone-action-result">切换【进阶模式】</span>
                    </button>
                    <button type="button" class="ai-zone-action-btn ai-zone-action-btn--wake" onclick="triggerAiExperience('wake')">
                        <span class="ai-zone-action-scene">低活跃状态</span>
                        <span class="ai-zone-action-arrow" aria-hidden="true">→</span>
                        <span class="ai-zone-action-result">触发 AI 流失唤醒</span>
                    </button>
                </div>
                <div class="daily-summary-actions ai-zone-footer" id="aiZoneFooter" style="margin-top: 16px;">
                    <button type="button" class="btn btn-secondary" onclick="closeAiMemberZoneInfo()">关闭</button>
                </div>
            </div>
        </div>

        <!-- AI 流失唤醒挽留弹窗（居中，不跳转页面） -->
        <div class="invite-modal-overlay hidden" id="aiChurnWakeOverlay" onclick="if(event.target===this)closeAiChurnWakeModal()">
            <div class="invite-modal-card ai-churn-wake-card">
                <div class="invite-modal-title">温馨提示</div>
                <p class="ai-churn-wake-text">
                    您近期每日行动明显下降，系统已自动为您调整为轻松成长计划，帮你平缓回归节奏。
                </p>
                <div class="daily-summary-actions ai-churn-wake-actions">
                    <button type="button" class="btn btn-primary" onclick="confirmAiChurnSwitchEasy()">一键切换轻松计划</button>
                    <button type="button" class="btn btn-secondary" onclick="closeAiChurnWakeModal()">稍后再调整</button>
                </div>
                <p class="ai-churn-wake-note">
                    AI流失预警机制：系统持续监控登录间隔、行动完成度，识别流失风险自动推送唤醒方案，并下调任务难度。<br>
                    本次完成弹窗交互与挽留页面设计，情感计算、用户画像模型后续迭代开发。
                </p>
            </div>
        </div>

        <!-- 拍照确认完成 -->
        <div class="invite-modal-overlay hidden" id="taskPhotoOverlay">
            <div class="invite-modal-card task-photo-card">
                <div class="invite-modal-title">确认完成</div>
                <div class="task-photo-hint">拍下完成瞬间，确认今日行动</div>
                <div class="task-photo-preview hidden" id="taskPhotoPreview"></div>
                <input type="file" id="taskPhotoInput" accept="image/*" capture="environment" class="hidden">
                <div class="daily-summary-actions">
                    <button class="btn btn-primary" id="taskPhotoCaptureBtn" onclick="captureTaskPhoto()">打开相机</button>
                    <button class="btn btn-secondary" onclick="closeTaskPhotoModal()">取消</button>
                </div>
            </div>
        </div>

        <!-- 全勤礼品卡 -->
        <div class="daily-summary-overlay hidden" id="dailySummaryOverlay">
            <canvas class="fireworks-canvas" id="fireworksCanvas"></canvas>
            <div class="gift-card">
                <div class="gift-fragments" aria-hidden="true">
                    <svg class="gift-fragments-svg" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <linearGradient id="fragGold" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stop-color="#F0D78C"/>
                                <stop offset="55%" stop-color="#D4B96A"/>
                                <stop offset="100%" stop-color="#8A7340"/>
                            </linearGradient>
                            <linearGradient id="fragAmber" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stop-color="#FFE29A"/>
                                <stop offset="100%" stop-color="#C9A24B"/>
                            </linearGradient>
                            <linearGradient id="fragSoft" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stop-color="#E8C55A"/>
                                <stop offset="100%" stop-color="#A8893A"/>
                            </linearGradient>
                            <filter id="fragGlow" x="-40%" y="-40%" width="180%" height="180%">
                                <feGaussianBlur stdDeviation="2.2" result="b"/>
                                <feMerge>
                                    <feMergeNode in="b"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>
                        <!-- 主碎片：不规则晶体，边缘缺口，不闭合成完整图形 -->
                        <g filter="url(#fragGlow)" class="frag-main">
                            <path fill="url(#fragGold)" d="M78 28 L108 42 L118 78 L92 108 L62 96 L48 62 Z"/>
                            <path fill="url(#fragAmber)" opacity="0.55" d="M78 28 L96 48 L86 72 L62 58 Z"/>
                            <path fill="rgba(255,255,255,0.22)" d="M78 28 L96 48 L84 40 Z"/>
                        </g>
                        <!-- 散落小碎片 -->
                        <g class="frag-bit f1" filter="url(#fragGlow)">
                            <path fill="url(#fragSoft)" d="M28 46 L46 40 L52 58 L34 68 Z"/>
                        </g>
                        <g class="frag-bit f2" filter="url(#fragGlow)">
                            <path fill="url(#fragAmber)" d="M118 24 L136 34 L128 52 L110 42 Z"/>
                        </g>
                        <g class="frag-bit f3" filter="url(#fragGlow)">
                            <path fill="url(#fragGold)" d="M22 92 L40 86 L48 104 L30 114 Z"/>
                        </g>
                        <g class="frag-bit f4" filter="url(#fragGlow)">
                            <path fill="url(#fragSoft)" d="M122 96 L140 90 L146 110 L128 118 Z"/>
                        </g>
                        <g class="frag-bit f5">
                            <path fill="#E8C55A" opacity="0.75" d="M66 118 L78 112 L84 126 L70 132 Z"/>
                        </g>
                    </svg>
                </div>
                <div class="gift-card-title">恭喜获得</div>
                <div class="gift-card-reward" id="giftFragmentText">星球能量碎片 ×1</div>
                <button class="btn btn-primary gift-claim-btn" onclick="closeDailySummary()">收获奖励</button>
            </div>
        </div>

        <!-- 已完成行动：分享去向选择 -->
        <div class="invite-modal-overlay hidden" id="taskShareChoiceOverlay" onclick="if(event.target===this)closeTaskShareChoice()">
            <div class="invite-modal-card task-share-choice-card" onclick="event.stopPropagation()">
                <div class="invite-modal-title">分享</div>
                <p class="invite-share-desc" id="taskShareChoiceDesc">把这份完成动态分享出去</p>
                <div class="task-share-choice-actions">
                    <button type="button" class="task-share-choice-btn wechat" onclick="shareTaskToWechat()">
                        <span class="task-share-choice-icon">💬</span>
                        <span class="task-share-choice-text">
                            <strong>分享给微信好友</strong>
                            <small>生成链接，发给好友一起闪闪发光</small>
                        </span>
                    </button>
                    <button type="button" class="task-share-choice-btn community" onclick="shareTaskToCommunity()">
                        <span class="task-share-choice-icon">🌍</span>
                        <span class="task-share-choice-text">
                            <strong>分享至星球社区</strong>
                            <small>发布到同属星球小伙伴的动态流</small>
                        </span>
                    </button>
                </div>
                <button type="button" class="btn btn-secondary task-share-choice-close" onclick="closeTaskShareChoice()">取消</button>
            </div>
        </div>

        <!-- 邀约伙伴：链接分享 -->
        <div class="invite-modal-overlay hidden" id="inviteModalOverlay">
            <div class="invite-modal-card invite-share-card">
                <div class="invite-modal-title" id="inviteModalTitle">邀约伙伴</div>
                <p class="invite-share-desc" id="inviteShareDesc">生成专属链接，通过微信发给伙伴一起打卡</p>
                <div class="invite-link-box">
                    <div class="invite-link-url" id="inviteShareUrl">链接生成中…</div>
                    <button type="button" class="invite-link-copy" onclick="copyInviteLink()" title="复制链接">复制</button>
                </div>
                <p class="invite-share-hint" id="inviteShareHint">也可复制链接，粘贴到微信聊天发送</p>
                <div class="daily-summary-actions">
                    <button type="button" class="btn btn-primary" id="inviteWechatShareBtn" onclick="shareInviteToWechat()">微信分享</button>
                    <button type="button" class="btn btn-secondary" onclick="closeInviteModal()">关闭</button>
                </div>
                <div class="invite-accept-row" id="inviteAcceptRow">
                    <input type="text" class="input-field" id="inviteCodeInput" placeholder="已有邀约码？粘贴后应约">
                    <button type="button" class="btn btn-secondary" onclick="acceptInviteCode()">应约</button>
                </div>
            </div>
        </div>

        <!-- 微信分享引导（点右上角 ···） -->
        <div class="wechat-share-guide hidden" id="wechatShareGuideOverlay" onclick="if(event.target===this)closeWechatShareGuide()">
            <div class="wechat-share-guide__arrow" aria-hidden="true">
                <svg viewBox="0 0 120 90" width="120" height="90">
                    <path d="M20 70 C40 70 70 55 95 18" fill="none" stroke="#E8C55A" stroke-width="3" stroke-linecap="round"/>
                    <path d="M78 22 L98 14 L90 36" fill="none" stroke="#E8C55A" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
            <div class="wechat-share-guide__card" onclick="event.stopPropagation()">
                <div class="wechat-share-guide__title">分享给微信好友</div>
                <p class="wechat-share-guide__text">请点击右上角 <strong>···</strong><br>选择「发送给朋友」或「分享到朋友圈」</p>
                <button type="button" class="btn btn-primary" onclick="closeWechatShareGuide()">我知道了</button>
            </div>
        </div>

        <!-- 感悟输入 -->
        <div class="invite-modal-overlay hidden" id="reflectionModalOverlay">
            <div class="invite-modal-card">
                <div class="invite-modal-title">今日成长感悟</div>
                <textarea class="input-field reflection-input" id="reflectionInput" placeholder="写下今天的一点收获..."></textarea>
                <div class="daily-summary-actions">
                    <button class="btn btn-primary" onclick="submitReflection()">发布到社区</button>
                    <button class="btn btn-secondary" onclick="closeReflectionModal()">取消</button>
                </div>
            </div>
        </div>

        <!-- 查看计划（原「我的计划」内容） -->
        <div class="invite-modal-overlay hidden" id="timeGoalModalOverlay">
            <div class="invite-modal-card time-goal-modal-card">
                <div class="invite-modal-title" id="timeGoalModalTitle">查看计划</div>
                <div class="time-goal-modal-status" id="timeGoalModalStatus"></div>
                <div class="card-desc time-goal-plan-desc" id="planCoreGoalDesc">查看你的长期成长路径与当前阶段</div>
                <div class="plan-switcher" id="planSwitcher"></div>
                <div class="plan-phase-timeline time-goal-plan-timeline" id="planPhaseTimeline"></div>
                <div class="time-goal-modal-body" id="timeGoalModalBody"></div>
                <button type="button" class="btn btn-secondary plan-add-btn" id="btnAddAnotherPlan" onclick="addAnotherPlan()">＋ 再订一条计划</button>
                <div class="time-goal-modal-actions">
                    <button type="button" class="btn btn-secondary" id="timeGoalUpdateBtn" onclick="updateTimeGoal()">更新计划</button>
                    <button type="button" class="btn btn-secondary" id="timeGoalPauseBtn" onclick="pauseTimeGoal()">暂停计划</button>
                    <button type="button" class="btn btn-secondary time-goal-abandon-btn" id="timeGoalAbandonBtn" onclick="abandonTimeGoal()">放弃计划</button>
                </div>
                <button type="button" class="btn btn-primary time-goal-close-btn" onclick="closeTimeGoalModal()">关闭</button>
            </div>
        </div>

        <!-- 中心人物换装 -->
        <div class="invite-modal-overlay hidden" id="avatarDressOverlay" onclick="if(event.target===this)closeAvatarDressModal()">
            <div class="invite-modal-card avatar-dress-modal-card" onclick="event.stopPropagation()">
                <div class="invite-modal-title">去换装</div>
                <div class="card-desc avatar-dress-modal-desc">先选人物，再微调外观；宠物暂未解锁，上方实时预览</div>
                <div class="avatar-dress-layout">
                    <div class="avatar-dress-preview-wrap">
                        <div class="avatar-dress-preview" id="avatarDressPreview">
                            <div class="avatar-figure aura-gold" id="avatarDressPreviewFigure">
                                <img class="avatar-img" src="/images/avatar/sailor-idle.png?v4" alt="换装预览" draggable="false" data-pose="idle" data-base-src="/images/avatar/sailor-idle.png?v4">
                            </div>
                        </div>
                        <div class="avatar-dress-preview-hint">实时预览</div>
                    </div>
                    <div class="avatar-dress-panels" id="avatarDressPanels"></div>
                </div>
                <div class="avatar-dress-actions">
                    <button type="button" class="btn btn-secondary" onclick="resetAvatarDressDraft()">恢复默认</button>
                    <button type="button" class="btn btn-secondary" onclick="closeAvatarDressModal()">取消</button>
                    <button type="button" class="btn btn-primary" onclick="confirmAvatarDress()">保存形象</button>
                </div>
            </div>
        </div>

        <!-- 奖励礼包（与制定计划页弹窗一致） -->
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

        <!-- 底部Tab导航 -->
        <div class="bottom-tab-bar">
            <div class="tab-nav">
                <button class="tab-item active" data-tab="plan" onclick="switchTab('plan', event)">
                    <span class="tab-icon">🪐</span>
                    <span class="tab-label">点亮行动</span>
                </button>
                <button class="tab-item" data-tab="reward" onclick="switchTab('reward', event)">
                    <span class="tab-icon">🏆</span>
                    <span class="tab-label">成长奖励</span>
                </button>
                <button class="tab-item" data-tab="energy" onclick="switchTab('energy', event)">
                    <span class="tab-icon">⚡</span>
                    <span class="tab-label">能量中心</span>
                </button>
                <button class="tab-item" data-tab="member" onclick="switchTab('member', event)">
                    <span class="tab-icon">👤</span>
                    <span class="tab-label">会员中心</span>
                </button>
            </div>
        </div>
    
        
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import Starfield from '../components/Starfield.vue'
import { initMainHomeView } from '../assets/scripts/main-home-page.js'
import '../assets/styles/main-home.css'

const router = useRouter()
let cleanup = null

onMounted(() => {
  cleanup = initMainHomeView(router)
})

onBeforeUnmount(() => {
  if (cleanup) cleanup()
})
</script>
