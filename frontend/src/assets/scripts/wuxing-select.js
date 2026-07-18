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
                traits: '理想、共情、上进、有风骨',
                careers: ['教育', '写作', '公益', '文化创意'],
                advice: '发挥你的共情力与创造力，在帮助他人的过程中实现自我价值。注意平衡理想与现实，让梦想落地生根。'
            },
            fire: {
                name: '火型 · 传播型',
                subtitle: '热情领袖 · 表达者',
                icon: '🔥',
                traits: '热情、表达、感染力、行动力',
                careers: ['HR', '销售', '主持', '市场营销'],
                advice: '用你的热情点燃他人，在传播与连接中创造影响力。注意控制节奏，避免过度消耗自己的能量。'
            },
            earth: {
                name: '土型 · 承载型',
                subtitle: '稳重守护者 · 协调者',
                icon: '🏔️',
                traits: '稳重、守信、包容、责任心',
                careers: ['公务员', '行政', '会计', '后勤'],
                advice: '你的可靠与包容是团队最坚实的后盾。学会适时表达需求，不要总把别人的重担放在自己肩上。'
            },
            metal: {
                name: '金型 · 决断型',
                subtitle: '正义执行者 · 决策者',
                icon: '⚔️',
                traits: '理性、正义、果断、重情义',
                careers: ['创业', '法律', '金融', '风控'],
                advice: '你的决断力与正义感是改变世界的利器。在坚持原则的同时，保持对人性柔软的理解。'
            },
            water: {
                name: '水型 · 洞察型',
                subtitle: '智慧洞察者 · 策略家',
                icon: '🌊',
                traits: '聪慧、通透、共情、变通',
                careers: ['心理咨询', '编剧', '咨询', '猎头'],
                advice: '你的通透与智慧能看透事物本质。善用这份洞察力，同时保持与世界的温暖连接。'
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
            document.getElementById('detailAdvice').textContent = data.advice;

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