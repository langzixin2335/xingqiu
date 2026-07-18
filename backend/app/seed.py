from datetime import date

from sqlalchemy.orm import Session

from .auth_utils import hash_password
from .models import (
    AdminUser,
    CommunityComment,
    CommunityPost,
    DailyTask,
    PlanetProgress,
    Product,
    User,
    UserBadge,
    UserReward,
)


def seed_global_data(db: Session) -> None:
    if db.query(Product).count() == 0:
        products = [
            Product(name="21天运动养成课", description="科学运动，养成习惯", category="survival", subcategory="recommended", badge="热门", emoji="🏃"),
            Product(name="趁早时间管理课", description="五种时间，高效人生", category="money", subcategory="recommended", badge=None, emoji="⏰"),
            Product(name="正念冥想入门", description="静心冥想，找回内心", category="flow", subcategory="recommended", badge="限免", emoji="🧘"),
            Product(name="营养饮食指南", description="健康饮食，美丽由内而外", category="survival", subcategory="beginner", badge=None, emoji="🥗"),
            Product(name="效率手册2026", description="纸质+数字，成长双引擎", category="money", subcategory="beginner", badge="新品", emoji="📔"),
            Product(name="手机摄影课", description="记录生活美好瞬间", category="fun", subcategory="beginner", badge=None, emoji="📷"),
            Product(name="演讲表达训练营", description="自信表达，影响他人", category="money", subcategory="advanced", badge=None, emoji="🎤"),
            Product(name="形象管理课", description="外在形象，内在自信", category="beauty", subcategory="advanced", badge=None, emoji="💄"),
            Product(name="晨间仪式套装", description="美好一天从早晨开始", category="flow", subcategory="advanced", badge=None, emoji="🌅"),
            Product(name="零基础绘画课", description="用画笔表达内心世界", category="fun", subcategory="special", badge=None, emoji="🎨"),
            Product(name="职场沟通术", description="高效沟通，职场进阶", category="money", subcategory="special", badge=None, emoji="💼"),
            Product(name="优质睡眠课", description="深度睡眠，焕活身心", category="survival", subcategory="special", badge=None, emoji="😴"),
        ]
        db.add_all(products)

    if db.query(CommunityPost).count() == 0:
        posts = [
            CommunityPost(author_name="小星星", avatar="👩", content="今天早起完成了5公里晨跑，感觉整个人都清醒了！坚持打卡第15天 💪", task_title="晨跑5公里", time_type="survival", likes_count=8, comments_count=2),
            CommunityPost(author_name="书虫小美", avatar="👧", content="今天读到达里奥的\"极度透明\"原则，深受启发。工作中的沟通确实需要更直接一些 📚", task_title="阅读《原则》30页", time_type="money", likes_count=12, comments_count=1),
            CommunityPost(author_name="静心Lisa", avatar="🧘", content="15分钟正念冥想，让焦虑消散。推荐给每个忙碌的都市女性 ✨", task_title="正念冥想15分钟", time_type="flow", likes_count=6, comments_count=0),
        ]
        db.add_all(posts)
        db.flush()
        db.add_all([
            CommunityComment(post_id=posts[0].id, author_name="月亮姐姐", content="太厉害了！我也要早起跑步"),
            CommunityComment(post_id=posts[0].id, author_name="阳光小子", content="坚持15天，佩服！"),
            CommunityComment(post_id=posts[1].id, author_name="职场达人", content="这本书确实值得一读"),
        ])

    db.commit()


def seed_admin_user(db: Session) -> None:
    if db.query(AdminUser).count() == 0:
        db.add(
            AdminUser(
                username="admin",
                password_hash=hash_password("admin123"),
                nickname="超级管理员",
            )
        )
        db.commit()


def ensure_user_home_data(db: Session, user: User) -> None:
    if db.query(DailyTask).filter(DailyTask.user_id == user.id).count() > 0:
        return

    today = date.today().isoformat()
    tasks = [
        DailyTask(user_id=user.id, title="晨跑5公里", time_type="survival", scheduled_label="07:00 · 已完成", completed=True, sort_order=1, task_date=today),
        DailyTask(user_id=user.id, title="阅读《原则》30页", time_type="money", scheduled_label="08:30 · 已完成", completed=True, sort_order=2, task_date=today),
        DailyTask(user_id=user.id, title="晚间护肤流程", time_type="beauty", scheduled_label="21:00 · 待完成", requires_photo=True, sort_order=3, task_date=today),
        DailyTask(user_id=user.id, title="正念冥想15分钟", time_type="flow", scheduled_label="06:00 · 已完成", completed=True, sort_order=4, task_date=today),
        DailyTask(user_id=user.id, title="学习摄影技巧", time_type="fun", scheduled_label="周末 · 待完成", requires_photo=True, sort_order=5, task_date=today),
    ]
    planets = [
        PlanetProgress(user_id=user.id, planet_type="survival", level=3, current_task="运动30分", active=True),
        PlanetProgress(user_id=user.id, planet_type="money", level=5, current_task="阅读1小时", active=True),
        PlanetProgress(user_id=user.id, planet_type="beauty", level=2, current_task="护肤打卡", active=True),
        PlanetProgress(user_id=user.id, planet_type="fun", level=1, current_task="暂无任务", active=False),
        PlanetProgress(user_id=user.id, planet_type="flow", level=4, current_task="冥想15分", active=True),
    ]
    badges = [
        UserBadge(user_id=user.id, badge_key="streak7", icon="🔥", name="连续7天", unlocked=True),
        UserBadge(user_id=user.id, badge_key="earlybird", icon="⭐", name="早起达人", unlocked=True),
        UserBadge(user_id=user.id, badge_key="reader", icon="📚", name="阅读之星", unlocked=True),
        UserBadge(user_id=user.id, badge_key="planet", icon="🪐", name="星球探索", unlocked=False),
        UserBadge(user_id=user.id, badge_key="flow", icon="🧘", name="心流大师", unlocked=False),
        UserBadge(user_id=user.id, badge_key="beauty", icon="✨", name="好看星球", unlocked=False),
        UserBadge(user_id=user.id, badge_key="fun", icon="🎮", name="好玩达人", unlocked=False),
        UserBadge(user_id=user.id, badge_key="queen", icon="👑", name="星球女王", unlocked=False),
    ]
    rewards = [
        UserReward(user_id=user.id, name="买一件新衣服", description="完成本月目标后奖励", status="locked"),
        UserReward(user_id=user.id, name="周末短途旅行", description="连续打卡21天解锁", status="locked"),
    ]
    db.add_all(tasks + planets + badges + rewards)
    if user.member_tier == "萌芽":
        user.member_tier = "星耀"
    db.commit()
