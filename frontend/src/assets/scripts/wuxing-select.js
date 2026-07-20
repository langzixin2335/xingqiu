// 生成星空背景
        function createStarfield() {
            const container = document.getElementById('starfield');
            const starCount = 80;
            for (let i = 0; i < starCount; i++) {
                const star = document.createElement('div');
                star.className = 'star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 100 + '%';
                star.style.setProperty('--duration', (2 + Math.random() * 4) + 's');
                star.style.setProperty('--delay', Math.random() * 5 + 's');
                star.style.setProperty('--opacity', 0.3 + Math.random() * 0.7);
                const size = 1 + Math.random() * 2;
                star.style.width = size + 'px';
                star.style.height = size + 'px';
                container.appendChild(star);
            }
        }

        // 五行人格数据
        const elementData = {
            wood: {
                name: '木型 · 生发型',
                subtitle: '理想主义者 · 共情者',
                icon: '🌿',
                traits: '理想、共情、上进、有风骨、乐于成长、愿意创造与帮助他人',
                careers: ['教育培训', '内容创作', '公益文化', '设计创意', '医疗护理', '心理相关'],
            },
            fire: {
                name: '火型 · 传播型',
                subtitle: '热情领袖 · 表达者',
                icon: '🔥',
                traits: '热情、表达、感染力、行动力、外向、善于带动气氛',
                careers: ['销售商务', '市场品牌', '传媒主持', '人力招聘', '直播运营', '活动策划'],
            },
            earth: {
                name: '土型 · 承载型',
                subtitle: '稳重守护者 · 协调者',
                icon: '🏔️',
                traits: '稳重、守信、包容、责任心、务实、善于协调与托底',
                careers: ['行政运营', '财务会计', '项目管理', '客户服务', '后勤保障', '稳定岗/体制内'],
            },
            metal: {
                name: '金型 · 决断型',
                subtitle: '正义执行者 · 决策者',
                icon: '⚔️',
                traits: '理性、正义、果断、重情义、目标感强、原则清晰',
                careers: ['创业管理', '法律合规', '金融投资', '技术研发', '工程制造', '风控审计'],
            },
            water: {
                name: '水型 · 洞察型',
                subtitle: '智慧洞察者 · 策略家',
                icon: '🌊',
                traits: '聪慧、通透、变通、善观察、敏感细腻、策略思维',
                careers: ['咨询顾问', '产品策略', '数据分析', '研究策划', '猎头招聘', '自由职业'],
            }
        };

        let selectedElement = null;
        let currentDetailElement = null;

        // 选择人格
        function selectElement(element) {
            // 移除其他选中状态
            document.querySelectorAll('.element-card').forEach(card => {
                card.classList.remove('selected');
            });

            // 添加选中状态
            const card = document.querySelector(`[data-element="${element}"]`);
            card.classList.add('selected');
            selectedElement = element;

            // 激活确认按钮
            document.getElementById('confirmBtn').classList.add('active');

            // 显示详情
            showDetail(element);
        }

        // 显示详情
        function showDetail(element) {
            currentDetailElement = element;
            const data = elementData[element];

            document.getElementById('detailTitle').textContent = data.name;
            document.getElementById('detailSubtitle').textContent = data.subtitle;
            document.getElementById('detailIcon').textContent = data.icon;
            document.getElementById('detailTraits').textContent = data.traits;

            const avatar = document.getElementById('detailAvatar');
            avatar.className = 'detail-avatar ' + element;

            const careersContainer = document.getElementById('detailCareers');
            careersContainer.innerHTML = data.careers.map(c => `<span class="detail-tag">${c}</span>`).join('');

            document.getElementById('detailOverlay').classList.add('show');
            document.getElementById('detailPanel').classList.add('show');
        }

        // 关闭详情
        function closeDetail() {
            document.getElementById('detailOverlay').classList.remove('show');
            document.getElementById('detailPanel').classList.remove('show');
        }

        // 从详情确认选择
        function confirmFromDetail() {
            closeDetail();
            confirmSelection();
        }

        // 确认选择
        function confirmSelection() {
            if (!selectedElement) return;
            const data = elementData[selectedElement];
            alert(`欢迎来到闪耀星球！\n\n你已选择：${data.name}\n\n接下来，你将进入属于你的星球成长路径。每一天的微小行动，都是在星球上点亮一颗星星。✨`);
        }

        // 初始化
        createStarfield();