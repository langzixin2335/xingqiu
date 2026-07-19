// 生成星空
        function createStarfield() {
            const starfield = document.getElementById('starfield');
            const starCount = 80;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.setProperty('--duration', (Math.random() * 3 + 2) + 's');
                star.style.setProperty('--delay', Math.random() * 5 + 's');
                star.style.setProperty('--opacity', Math.random() * 0.8 + 0.2);
                starfield.appendChild(star);
            }
        }

        // 切换Tab
        function switchTab(tabName) {
            // 隐藏所有tab内容
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
            });
            
            // 显示目标tab
            document.getElementById('tab-' + tabName).classList.add('active');
            
            // 更新tab按钮状态
            document.querySelectorAll('.tab-item').forEach(el => {
                el.classList.remove('active');
            });
            event.currentTarget.classList.add('active');
            
            // 更新页面标题
            const titles = {
                'plan': '我的<span>星际旅程</span>',
                'energy': '能量<span>中心</span>',
                'reward': '成长<span>奖励</span>',
                'member': '会员<span>中心</span>'
            };
            document.getElementById('pageTitle').innerHTML = titles[tabName];
            
            const subtitles = {
                'plan': '在闪耀星球，每一天都是成长',
                'energy': '成长的路上，有我陪你一起走',
                'reward': '记录成长，奖励自己',
                'member': '专属权益，助力成长'
            };
            document.getElementById('pageSubtitle').textContent = subtitles[tabName];
        }

        // 鼓励语句库
        const encourageMessages = [
            '太棒了！你正在闪闪发光，继续保持！',
            '每一次坚持都是对更好自己的投资！',
            '你比自己想象的更优秀，继续加油！',
            '今天的努力，是明天惊喜的铺垫！',
            '你正在用行动书写自己的闪耀故事！',
            '小小的进步，也是大大的胜利！',
            '你的坚持让星球更加闪耀！',
            '这就是成长的力量，为你骄傲！',
            '每一步都算数，你做得很好！',
            '保持这份热情，未来可期！'
        ];

        // 打卡任务
        function toggleTask(el) {
            const taskItem = el.closest('.task-item');
            const taskId = taskItem.dataset.task;
            const feedbackEl = taskItem.querySelector('.encourage-feedback');
            const feedbackTextEl = taskItem.querySelector('.feedback-text');
            
            if (el.classList.contains('checked')) {
                el.classList.remove('checked');
                el.textContent = '';
                taskItem.classList.remove('completed');
                if (feedbackEl) feedbackEl.classList.remove('show');
            } else {
                el.classList.add('checked');
                el.textContent = '✓';
                taskItem.classList.add('completed');
                // 触发完成动画
                el.style.transform = 'scale(1.2)';
                setTimeout(() => {
                    el.style.transform = 'scale(1)';
                }, 200);
                
                // 显示鼓励反馈
                if (feedbackEl && feedbackTextEl) {
                    const randomMsg = encourageMessages[Math.floor(Math.random() * encourageMessages.length)];
                    feedbackTextEl.textContent = randomMsg;
                    feedbackEl.classList.add('show');
                }
            }
            updateProgress();
        }

        // 打开拍照入口
        function openCamera(btn) {
            const taskItem = btn.closest('.task-item');
            const uploadArea = taskItem.querySelector('.photo-upload-area');
            if (uploadArea) {
                uploadArea.classList.toggle('show');
            }
        }

        // 模拟拍照上传
        function simulatePhotoUpload(area) {
            const taskItem = area.closest('.task-item');
            const checkbox = taskItem.querySelector('.task-checkbox');
            const feedbackEl = taskItem.querySelector('.encourage-feedback');
            const feedbackTextEl = taskItem.querySelector('.feedback-text');
            
            alert('📷 拍照上传演示\n\n在实际APP中，这里将调用相机拍照或从相册选择照片。');
            
            // 自动标记为完成
            if (!checkbox.classList.contains('checked')) {
                checkbox.classList.add('checked');
                checkbox.textContent = '✓';
                taskItem.classList.add('completed');
            }
            
            // 隐藏拍照区域
            area.classList.remove('show');
            
            // 显示鼓励反馈
            if (feedbackEl && feedbackTextEl) {
                const randomMsg = encourageMessages[Math.floor(Math.random() * encourageMessages.length)];
                feedbackTextEl.textContent = randomMsg;
                feedbackEl.classList.add('show');
            }
            
            updateProgress();
        }

        // 发起邀约
        function shareTask(taskName) {
            alert('邀请好友一起打卡\n\n任务：' + taskName + '\n\n在实际APP中，这里将生成邀约卡片，可以发送给好友邀请一起完成任务，互相监督共同成长。');
        }

        // 星球社区 - 点赞
        function likePost(btn) {
            const countEl = btn.querySelector('.action-count');
            let count = parseInt(countEl.textContent);

            if (btn.classList.contains('liked')) {
                btn.classList.remove('liked');
                countEl.textContent = count - 1;
            } else {
                btn.classList.add('liked');
                countEl.textContent = count + 1;
            }
        }

        // 星球社区 - 展开/收起评论
        function toggleComment(btn) {
            const post = btn.closest('.community-post');
            const commentSection = post.querySelector('.comment-section');
            if (commentSection.style.display === 'none') {
                commentSection.style.display = 'block';
            } else {
                commentSection.style.display = 'none';
            }
        }

        // 星球社区 - 分享动态
        function sharePost(userName, taskName) {
            alert('分享动态\n\n' + userName + ' 完成了「' + taskName + '」\n\n在实际APP中，这里将生成分享卡片，可以分享到朋友圈或保存图片。');
        }

        // 星球社区 - 提交评论（回车）
        function submitComment(event, input) {
            if (event.key === 'Enter') {
                sendComment(input.nextElementSibling);
            }
        }

        // 星球社区 - 发送评论
        function sendComment(btn) {
            const inputArea = btn.closest('.comment-input-area');
            const input = inputArea.querySelector('.comment-input');
            const text = input.value.trim();
            if (!text) return;

            const commentList = inputArea.previousElementSibling;
            const newComment = document.createElement('div');
            newComment.className = 'comment-item';
            newComment.innerHTML = '<span class="comment-user">我：</span><span class="comment-text">' + text + '</span>';
            commentList.appendChild(newComment);

            input.value = '';

            // 更新评论数
            const post = btn.closest('.community-post');
            const commentBtn = post.querySelector('.post-action:nth-child(2)');
            const countEl = commentBtn.querySelector('.action-count');
            countEl.textContent = parseInt(countEl.textContent) + 1;
        }

        // 查看会员详情
        function showUpgradeInfo(tier) {
            const info = {
                '萌芽': '萌芽会员 ¥87/季度\n\n适合刚开始自我成长之旅的你：\n• AI计划生成：每季度9次\n• 基础成长报告\n• 能量中心9.5折\n\n点击「补差价升级」可随时升级到更高等级。',
                '星耀': '星耀会员 ¥297/季度\n\n适合认真投入成长的你：\n• AI专属计划：无限次\n• 深度数据分析\n• 专属成长社群\n• 能量中心9折\n\n你已解锁4/6项权益，升级女王可解锁全部。',
                '女王': '星球女王 ¥897/季度\n\n适合追求极致成长的你：\n• 包含星耀全部权益\n• 线下活动报名参与权\n• 1对1成长顾问（季度）\n• 能量中心8.5折\n\n尊享最高等级权益，开启女王之路。'
            };
            alert(info[tier] || '会员详情');
        }

        // 补差价升级
        function upgradeTier(targetTier) {
            const currentTier = '星耀';
            const currentPrice = 297;
            const targetPrice = 897;
            const diff = targetPrice - currentPrice;

            const confirmMsg = '补差价升级确认\n\n' +
                '当前会员：' + currentTier + '会员（¥' + currentPrice + '/季度）\n' +
                '目标会员：' + targetTier + '（¥' + targetPrice + '/季度）\n' +
                '补差价：¥' + diff + '/季度\n\n' +
                '升级后即刻解锁：\n' +
                '• 线下活动报名参与权\n' +
                '• 1对1成长顾问（季度）\n' +
                '• 能量中心8.5折\n\n' +
                '当前会员剩余有效期可自动抵扣，无需额外计算。\n\n' +
                '是否确认升级？';

            if (confirm(confirmMsg)) {
                alert('🎉 升级成功！\n\n你已升级为「星球女王」会员！\n\n新的权益已解锁，快去体验吧！');
            }
        }

        // 更新进度
        function updateProgress() {
            const total = document.querySelectorAll('.task-item').length;
            const completed = document.querySelectorAll('.task-checkbox.checked').length;
            const progressText = document.querySelector('.card-title span');
            if (progressText) {
                progressText.textContent = completed + '/' + total + ' 完成';
            }
        }

        // 绘制每日行动完成曲线
        function drawCompletionChart() {
            const canvas = document.getElementById('completionChart');
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            const dpr = window.devicePixelRatio || 1;
            const rect = canvas.getBoundingClientRect();
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);

            const width = rect.width;
            const height = rect.height;
            const padding = { top: 20, right: 20, bottom: 10, left: 30 };
            const chartW = width - padding.left - padding.right;
            const chartH = height - padding.top - padding.bottom;

            // 近7天完成数据（百分比）
            const data = [60, 80, 40, 100, 75, 90, 66];
            const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

            // 清空画布
            ctx.clearRect(0, 0, width, height);

            // 绘制网格线
            ctx.strokeStyle = 'rgba(255,255,255,0.05)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (chartH / 4) * i;
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(width - padding.right, y);
                ctx.stroke();
            }

            // 绘制Y轴标签
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'right';
            for (let i = 0; i <= 4; i++) {
                const y = padding.top + (chartH / 4) * i;
                ctx.fillText((100 - i * 25) + '%', padding.left - 6, y + 3);
            }

            // 绘制曲线
            const points = data.map((val, i) => ({
                x: padding.left + (chartW / (data.length - 1)) * i,
                y: padding.top + chartH - (val / 100) * chartH
            }));

            // 填充区域
            ctx.beginPath();
            ctx.moveTo(points[0].x, padding.top + chartH);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.lineTo(points[points.length - 1].x, padding.top + chartH);
            ctx.closePath();
            const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartH);
            gradient.addColorStop(0, 'rgba(212, 185, 106, 0.3)');
            gradient.addColorStop(1, 'rgba(212, 185, 106, 0.02)');
            ctx.fillStyle = gradient;
            ctx.fill();

            // 绘制线条
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            points.forEach(p => ctx.lineTo(p.x, p.y));
            ctx.strokeStyle = '#d4b96a';
            ctx.lineWidth = 2;
            ctx.stroke();

            // 绘制数据点
            points.forEach((p, i) => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
                ctx.fillStyle = '#d4b96a';
                ctx.fill();
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#0a0a0f';
                ctx.fill();

                // 数值标签
                ctx.fillStyle = '#d4b96a';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(data[i] + '%', p.x, p.y - 10);
            });
        }

        // 勋章展示管理
        let displayedBadges = [];
        function toggleBadgeDisplay(el, icon, name) {
            if (el.classList.contains('locked')) return;

            const indicator = el.querySelector('.badge-display-indicator');
            const isDisplayed = el.classList.contains('displayed');

            if (isDisplayed) {
                // 取消展示
                el.classList.remove('displayed');
                if (indicator) indicator.style.display = 'none';
                displayedBadges = displayedBadges.filter(b => b.name !== name);
            } else {
                // 检查是否已达上限
                if (displayedBadges.length >= 2) {
                    alert('最多只能展示2个勋章在头像旁\n\n请先取消一个已展示的勋章，再选择新的。');
                    return;
                }
                // 设置展示
                el.classList.add('displayed');
                if (indicator) indicator.style.display = 'block';
                displayedBadges.push({ icon, name });
            }

            // 更新头像旁展示的勋章（实际APP中这里会更新头像组件）
            updateAvatarBadges();
        }

        function updateAvatarBadges() {
            // 实际APP中这里会更新头像旁边的勋章展示
            console.log('头像旁展示的勋章：', displayedBadges);
        }

        // 显示星球详情
        function showPlanetDetail(type) {
            const names = {
                'survival': '生存星球',
                'money': '赚钱星球',
                'beauty': '好看星球',
                'fun': '好玩星球',
                'flow': '心流星球'
            };
            alert('🪐 ' + names[type] + '\n\n这里将展示该星球的详细进度、历史记录和升级路径。');
        }

        // 当前筛选状态
        let currentCategory = 'all';
        let currentSubcategory = 'recommended';

        // 筛选产品
        function filterProducts() {
            document.querySelectorAll('.product-card').forEach(card => {
                const matchCategory = currentCategory === 'all' || card.dataset.category === currentCategory;
                const matchSubcategory = currentSubcategory === 'all' || card.dataset.subcategory === currentSubcategory;
                if (matchCategory && matchSubcategory) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        }

        // 选择一级分类（星球）
        function selectCategory(el, category) {
            document.querySelectorAll('.category-tab').forEach(tab => tab.classList.remove('active'));
            el.classList.add('active');
            currentCategory = category;
            filterProducts();
        }

        // 选择二级分类（阶段）
        function selectSubcategory(el, subcategory) {
            document.querySelectorAll('.subcategory-tab').forEach(tab => tab.classList.remove('active'));
            el.classList.add('active');
            currentSubcategory = subcategory;
            filterProducts();
        }

        // 加入计划
        function addToPlan(btn, name) {
            if (btn.classList.contains('added')) {
                btn.classList.remove('added');
                btn.textContent = '加入计划';
            } else {
                btn.classList.add('added');
                btn.textContent = '✓ 已加入';
                alert('✅ "' + name + '" 已加入你的计划！');
            }
        }

        // 添加奖励
        function addReward() {
            const name = document.getElementById('rewardName').value;
            const desc = document.getElementById('rewardDesc').value;
            if (!name.trim()) {
                alert('请输入奖励名称');
                return;
            }
            
            const rewardList = document.getElementById('rewardList');
            const rewardItem = document.createElement('div');
            rewardItem.className = 'task-item';
            rewardItem.innerHTML = `
                <div class="task-content">
                    <div class="task-title">${name}</div>
                    <div class="task-meta">${desc || '自定义奖励'}</div>
                </div>
                <div class="task-tag" style="background: rgba(212, 185, 106, 0.2); color: var(--accent-gold);">待解锁</div>
            `;
            rewardList.appendChild(rewardItem);
            
            document.getElementById('rewardName').value = '';
            document.getElementById('rewardDesc').value = '';
        }

        // 初始化
        createStarfield();

        // 获取URL参数中的人格类型（保留用于数据传递）
        const urlParams = new URLSearchParams(window.location.search);
        const personality = urlParams.get('personality') || 'fire';

        // 动画进度条
        setTimeout(() => {
            document.querySelectorAll('.dimension-bar-fill').forEach(bar => {
                const width = bar.style.width;
                bar.style.width = '0';
                setTimeout(() => {
                    bar.style.width = width;
                }, 100);
            });
        }, 500);

        // 绘制完成曲线（当切换到奖励中心Tab时）
        const originalSwitchTab = switchTab;
        switchTab = function(tabName) {
            originalSwitchTab(tabName);
            if (tabName === 'reward') {
                setTimeout(drawCompletionChart, 300);
            }
        };