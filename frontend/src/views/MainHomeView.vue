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
                    <div class="card-desc">收集星球能量碎片，点亮你的闪耀星球</div>
                    
                    <div class="planet-orbit" id="planetOrbit"></div>
                </div>
    
                <!-- 今日行动清单 -->
                <div class="card">
                    <div class="card-title" id="todayActionsTitle">
                        <span class="icon">📋</span>
                        今日行动
                        <button type="button" class="daily-curve-btn" onclick="openDailyCompletionCurve()" title="查看每日行动完成曲线">每日完成曲线</button>
                    </div>
                    <div class="card-desc">完成所有行动，获得星球能量碎片</div>
                    
                    <div class="today-tasks" id="todayTasks">
                        <div class="task-item" data-task="1" data-time-type="survival">
                            <div class="task-type-tag survival">生存行动</div>
                            <div class="task-content">
                                <div class="task-title">晨跑5公里</div>
                                <div class="task-meta">07:00 · 待完成</div>
                            </div>
                            <div class="task-actions">
                                <button class="task-action-btn invite" onclick="shareTask(this)" title="发起邀约">发起邀约</button>
                                <button class="task-action-btn confirm" onclick="confirmTaskComplete(this)" title="确认完成">确认完成</button>
                            </div>
                        </div>
                    </div>
                </div>
    
                <!-- 我的计划（阶段时间轴） -->
                <div class="card" id="myPlanCard">
                    <div class="card-title">
                        <span class="icon">🗺️</span>
                        我的计划
                        <span id="streakBadge" class="streak-badge" style="margin-left: auto; font-size: 12px;"></span>
                    </div>
                    <div class="card-desc" id="planCoreGoalDesc">查看你的长期成长路径与当前阶段</div>
                    <div class="plan-phase-timeline" id="planPhaseTimeline"></div>
                </div>

                <!-- 周末复盘 -->
                <div class="card weekend-review-card hidden" id="weekendReviewCard">
                    <div class="card-title"><span class="icon">📝</span> 周末复盘</div>
                    <div class="weekend-review-text" id="weekendReviewText"></div>
                    <button class="btn btn-secondary weekend-review-btn" onclick="openWeekendReview()">查看本周总结</button>
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
                <!-- 上半：AI 对话 -->
                <div class="card energy-chat-card">
                    <div class="energy-chat" id="energyChat">
                        <div class="energy-chat-messages" id="energyChatMessages">
                            <div class="energy-chat-msg assistant">
                                <div class="energy-chat-avatar">🪐</div>
                                <div class="energy-chat-bubble">想补充哪个星球的能量，可以把你的想法告诉我，我帮你推荐；</div>
                            </div>
                        </div>
                        <div class="energy-chat-composer">
                            <input
                                type="text"
                                class="energy-chat-input"
                                id="energyChatInput"
                                placeholder="请输入你的问题"
                                maxlength="500"
                                onkeypress="submitEnergyChat(event)"
                            >
                            <button type="button" class="energy-chat-send" id="energyChatSendBtn" onclick="sendEnergyChat()">发送</button>
                        </div>
                    </div>
                </div>

                <!-- 下半：能量补给站 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">⚡</span>
                        能量补给站
                    </div>
                    <div class="card-desc">选择适合你的星球能量，加入计划自动追踪</div>
                    
                    <!-- 一级分类：五种时间星球 -->
                    <div class="category-tabs">
                        <div class="category-tab active" onclick="selectCategory(this, 'all')">全部</div>
                        <div class="category-tab" onclick="selectCategory(this, 'survival')">🌿 生存星球</div>
                        <div class="category-tab" onclick="selectCategory(this, 'money')">💎 赚钱星球</div>
                        <div class="category-tab" onclick="selectCategory(this, 'beauty')">✨ 好看星球</div>
                        <div class="category-tab" onclick="selectCategory(this, 'fun')">🎮 好玩星球</div>
                        <div class="category-tab" onclick="selectCategory(this, 'flow')">🧘 心流星球</div>
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
                    <div class="card-desc">完成任意3个星球（含）计划，即可解锁线下活动报名参与权益</div>
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
    
                <!-- 勋章墙 -->
                <div class="card">
                    <div class="card-title">
                        <span class="icon">🎖️</span>
                        勋章墙
                    </div>
                    <div class="card-desc">解锁成就，记录你的每一个里程碑。点击已解锁勋章可设置展示在头像旁（最多2个）</div>
    
                    <div class="badge-grid" id="badgeGrid">
                        <div class="badge-item unlocked" onclick="toggleBadgeDisplay(this, '🔥', '连续7天')">
                            <div class="badge-icon">🔥</div>
                            <div class="badge-name">连续7天</div>
                            <div class="badge-display-indicator" style="display: none;">👤</div>
                        </div>
                        <div class="badge-item unlocked" onclick="toggleBadgeDisplay(this, '⭐', '早起达人')">
                            <div class="badge-icon">⭐</div>
                            <div class="badge-name">早起达人</div>
                            <div class="badge-display-indicator" style="display: none;">👤</div>
                        </div>
                        <div class="badge-item unlocked" onclick="toggleBadgeDisplay(this, '📚', '阅读之星')">
                            <div class="badge-icon">📚</div>
                            <div class="badge-name">阅读之星</div>
                            <div class="badge-display-indicator" style="display: none;">👤</div>
                        </div>
                        <div class="badge-item locked">
                            <div class="badge-icon">🏃</div>
                            <div class="badge-name">运动健将</div>
                        </div>
                        <div class="badge-item locked">
                            <div class="badge-icon">🎯</div>
                            <div class="badge-name">目标达成</div>
                        </div>
                        <div class="badge-item locked">
                            <div class="badge-icon">👑</div>
                            <div class="badge-name">星球女王</div>
                        </div>
                        <div class="badge-item locked">
                            <div class="badge-icon">💎</div>
                            <div class="badge-name">智慧宝石</div>
                        </div>
                        <div class="badge-item locked">
                            <div class="badge-icon">🌟</div>
                            <div class="badge-name">闪耀之星</div>
                        </div>
                    </div>
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
                        <button class="upgrade-btn primary" onclick="upgradeTier('星球女王')">补差价升级 ¥600/季度</button>
                        <div class="upgrade-price">当前星耀会员剩余有效期可抵扣</div>
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
                <div class="pandora-desc">获得潘多拉魔盒一个<br>请问现在打开么？</div>
                <div class="pandora-actions">
                    <button class="btn btn-primary" onclick="openPandoraNow()">现在打开</button>
                    <button class="btn btn-secondary" onclick="closePandoraLater()">稍后打开</button>
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
                <button class="btn btn-primary gift-claim-btn" onclick="closePandoraReward()">收获奖励</button>
            </div>
        </div>

        <!-- 周末复盘：本周总结（成长报告模版） -->
        <div class="invite-modal-overlay hidden" id="weekendSummaryOverlay" onclick="if(event.target===this)closeWeekendReview()">
            <div class="invite-modal-card weekend-summary-modal-card">
                <div class="weekend-summary-modal-top">
                    <div class="invite-modal-title">本周总结</div>
                    <button type="button" class="weekend-summary-close" onclick="closeWeekendReview()" aria-label="关闭">×</button>
                </div>
                <div class="weekend-summary-scroll">
                    <section class="growth-report" id="weekendGrowthReport" aria-label="本周个人成长分析报告"></section>
                </div>
                <div class="daily-summary-actions" style="margin-top: 12px;">
                    <button type="button" class="btn btn-secondary" onclick="closeWeekendReview()">关闭</button>
                </div>
            </div>
        </div>

        <!-- 每日行动完成曲线（从今日行动入口打开） -->
        <div class="invite-modal-overlay hidden" id="dailyCurveOverlay" onclick="if(event.target===this)closeDailyCompletionCurve()">
            <div class="invite-modal-card daily-curve-modal-card">
                <div class="invite-modal-title">每日行动完成曲线</div>
                <div class="card-desc" style="margin-bottom: 12px; text-align: center;">近7天行动完成情况</div>
                <div class="chart-container daily-curve-modal-chart">
                    <canvas id="completionChartModal" width="320" height="160" aria-label="每日行动完成曲线"></canvas>
                </div>
                <div class="daily-curve-weekdays">
                    <span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span>
                </div>
                <div class="daily-summary-actions" style="margin-top: 16px;">
                    <button type="button" class="btn btn-secondary" onclick="closeDailyCompletionCurve()">关闭</button>
                </div>
            </div>
        </div>

        <!-- 拍照确认完成 -->
        <div class="invite-modal-overlay hidden" id="taskPhotoOverlay">
            <div class="invite-modal-card task-photo-card">
                <div class="invite-modal-title">拍照确认完成</div>
                <div class="task-photo-hint">拍下完成瞬间，将自动分享至星球社区</div>
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

        <!-- 邀约分享 -->
        <div class="invite-modal-overlay hidden" id="inviteModalOverlay">
            <div class="invite-modal-card">
                <div class="invite-modal-title">发起邀约</div>
                <div class="invite-modal-text" id="inviteShareText"></div>
                <div class="daily-summary-actions">
                    <button class="btn btn-primary" onclick="copyInviteText()">复制邀约文案</button>
                    <button class="btn btn-secondary" onclick="closeInviteModal()">关闭</button>
                </div>
                <div class="invite-accept-row">
                    <input type="text" class="input-field" id="inviteCodeInput" placeholder="输入好友邀约码应约">
                    <button class="btn btn-secondary" onclick="acceptInviteCode()">应约</button>
                </div>
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

        <!-- 查看时间目标 -->
        <div class="invite-modal-overlay hidden" id="timeGoalModalOverlay">
            <div class="invite-modal-card time-goal-modal-card">
                <div class="invite-modal-title" id="timeGoalModalTitle">本期目标</div>
                <div class="time-goal-modal-status" id="timeGoalModalStatus"></div>
                <div class="time-goal-modal-body" id="timeGoalModalBody"></div>
                <div class="time-goal-modal-actions">
                    <button type="button" class="btn btn-secondary" id="timeGoalUpdateBtn" onclick="updateTimeGoal()">更新目标</button>
                    <button type="button" class="btn btn-secondary" id="timeGoalPauseBtn" onclick="pauseTimeGoal()">暂停目标</button>
                    <button type="button" class="btn btn-secondary time-goal-abandon-btn" id="timeGoalAbandonBtn" onclick="abandonTimeGoal()">放弃目标</button>
                </div>
                <button type="button" class="btn btn-primary time-goal-close-btn" onclick="closeTimeGoalModal()">关闭</button>
            </div>
        </div>

        <!-- 奖励礼包 -->
        <div class="invite-modal-overlay hidden" id="rewardPackModalOverlay">
            <div class="invite-modal-card reward-pack-modal-card">
                <div class="invite-modal-title" id="rewardPackModalTitle">奖励礼包</div>
                <div class="reward-pack-section">
                    <div class="reward-pack-section-title">默认奖励</div>
                    <div class="reward-pack-list" id="rewardPackDefaultList"></div>
                </div>
                <div class="reward-pack-section">
                    <div class="reward-pack-section-title">悦己奖励</div>
                    <div class="reward-input-area reward-pack-config">
                        <input type="text" class="input-field" placeholder="奖励名称（例如：买一件新衣服）" id="packRewardName">
                        <div class="reward-pack-desc-block">
                            <div class="reward-pack-desc-head">
                                <span class="reward-pack-desc-label">奖励描述/去挑选</span>
                                <div class="reward-shop-apps" aria-label="去挑选">
                                    <button type="button" class="reward-shop-app smzdm" onclick="openShopPick('smzdm')" title="什么值得买去挑选">
                                        <img class="reward-shop-logo" src="/images/brands/smzdm-logo.png" alt="什么值得买" width="36" height="36">
                                        <span class="reward-shop-name">什么值得买</span>
                                    </button>
                                </div>
                            </div>
                            <textarea class="input-field" placeholder="奖励描述/去挑选..." id="packRewardDesc"></textarea>
                        </div>
                        <div class="reward-pack-condition-label">达成条件</div>
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
                            <button class="add-btn" style="margin-top: 0; width: auto; padding: 10px 16px;" onclick="addPackReward()">添加奖励</button>
                        </div>
                    </div>
                    <div class="reward-pack-list" id="rewardPackCustomList"></div>
                </div>
                <button type="button" class="btn btn-primary time-goal-close-btn" onclick="closeRewardPackModal()">关闭</button>
            </div>
        </div>

        <!-- 底部Tab导航 -->
        <div class="bottom-tab-bar">
            <div class="tab-nav">
                <button class="tab-item active" onclick="switchTab('plan')">
                    <span class="tab-icon">🪐</span>
                    <span class="tab-label">点亮行动</span>
                </button>
                <button class="tab-item" onclick="switchTab('reward')">
                    <span class="tab-icon">🏆</span>
                    <span class="tab-label">成长奖励</span>
                </button>
                <button class="tab-item" onclick="switchTab('energy')">
                    <span class="tab-icon">⚡</span>
                    <span class="tab-label">能量中心</span>
                </button>
                <button class="tab-item" onclick="switchTab('member')">
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
