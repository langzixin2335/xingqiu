// 生成星空
        function createStarfield() {
            const starfield = document.getElementById('starfield');
            const starCount = 100;

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

            // 添加流星
            for (let i = 0; i < 3; i++) {
                const shootingStar = document.createElement('div');
                shootingStar.className = 'shooting-star';
                shootingStar.style.left = Math.random() * 50 + '%';
                shootingStar.style.top = Math.random() * 30 + '%';
                shootingStar.style.setProperty('--delay', (i * 5 + Math.random() * 3) + 's');
                starfield.appendChild(shootingStar);
            }
        }

        // 进入应用
        function enterApp() {
            // 添加退出动画
            const container = document.querySelector('.welcome-container');
            container.style.transition = 'all 0.6s ease';
            container.style.opacity = '0';
            container.style.transform = 'scale(0.95)';

            // 跳转到五行选择页面
            setTimeout(() => {
                window.location.href = 'wuxing-select.html';
            }, 600);
        }

        // 初始化
        createStarfield();