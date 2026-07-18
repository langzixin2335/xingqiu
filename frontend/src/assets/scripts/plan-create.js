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

        // 选择目标状态
        function selectGoalStatus(status) {
            document.querySelectorAll('.status-option').forEach(el => el.classList.remove('selected'));
            document.getElementById('status-' + status).classList.add('selected');
            
            if (status === 'has-plan') {
                document.getElementById('has-plan-area').classList.remove('hidden');
                document.getElementById('no-plan-area').classList.add('hidden');
            } else {
                document.getElementById('has-plan-area').classList.add('hidden');
                document.getElementById('no-plan-area').classList.remove('hidden');
                document.getElementById('no-plan-area').classList.add('fade-in');
            }
        }

        // 模拟扫描
        function simulateScan() {
            alert('📷 扫描功能演示\n\n在实际APP中，这里将调用相机进行OCR识别，自动提取效率手册中的目标计划。');
        }

        // 选择时间类型
        function selectTimeType(type) {
            document.querySelectorAll('.time-type-tag').forEach(el => el.classList.remove('selected'));
            event.target.classList.add('selected');
        }

        // 选择阶段
        function selectPeriod(period) {
            document.querySelectorAll('.period-btn').forEach(el => el.classList.remove('selected'));
            event.target.classList.add('selected');
        }

        // 添加目标
        function addGoal() {
            const input = document.getElementById('goalInput');
            if (!input.value.trim()) {
                alert('请输入目标内容');
                return;
            }
            alert('✅ 目标已添加：' + input.value);
            input.value = '';
        }

        // 切换开关
        function toggleSwitch(el) {
            el.classList.toggle('active');
        }

        // 生成计划
        function generatePlan() {
            const preview = document.getElementById('planPreview');
            preview.classList.remove('hidden');
            preview.classList.add('fade-in');
            preview.scrollIntoView({ behavior: 'smooth' });
        }

        // 确认计划
        function confirmPlan() {
            alert('🎉 计划已确认！\n\n欢迎来到闪耀星球，你的星际成长之旅正式开始！');
        }

        // 初始化
        createStarfield();

        // 获取URL参数中的人格类型（保留用于数据传递）
        const urlParams = new URLSearchParams(window.location.search);
        const personality = urlParams.get('personality') || 'fire';