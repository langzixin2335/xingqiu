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


# 引导测奖励：完成最后一项行动 → 该星球碎片 6→7 → 可点亮潘多拉
_LIGHT_TEST_PLANET = "survival"
_LIGHT_TEST_OPEN_TITLE = "确认完成今日引导行动（领碎片）"

# 测试用差异化亮度；生存默认 Lv.6，点亮一次即满级，便于测「计划完成 → 成长奖励」
_DEMO_PLANET_LEVELS = {
    "survival": 6,
    "money": 4,
    "beauty": 1,
    "fun": 5,
    "flow": 3,
}


def _ensure_demo_planet_levels(
    db: Session,
    user_id: int,
    *,
    skip_types: set[str] | None = None,
) -> None:
    """把五星球设成不同等级，便于测试亮度差异。"""
    from .services.planet_service import ensure_all_planets

    skip = skip_types or set()
    planets = ensure_all_planets(db, user_id)
    dirty = False
    for planet in planets:
        if planet.planet_type in skip:
            continue
        target = _DEMO_PLANET_LEVELS.get(planet.planet_type)
        if target is None:
            continue
        if int(planet.level or 0) != target:
            planet.level = target
            planet.active = True
            dirty = True
    if dirty:
        db.flush()


def _apply_light_planet_guide(
    db: Session,
    user: User,
    planet_type: str = _LIGHT_TEST_PLANET,
    *,
    ensure_tasks: bool = True,
) -> dict:
    """把今日行动调成「只剩 1 项待完成」，对应星球碎片 6/7（不 commit）。"""
    from .services.planet_service import FRAGMENTS_PER_LIGHT, PLANET_TYPES, ensure_all_planets
    from .services.task_rollover_service import ensure_today_tasks

    if planet_type not in PLANET_TYPES:
        planet_type = _LIGHT_TEST_PLANET

    today = date.today().isoformat()
    ensure_all_planets(db, user.id)

    if ensure_tasks:
        try:
            ensure_today_tasks(db, user.id)
        except Exception:
            db.rollback()
            ensure_all_planets(db, user.id)

    today_tasks = (
        db.query(DailyTask)
        .filter(DailyTask.user_id == user.id, DailyTask.task_date == today)
        .order_by(DailyTask.sort_order, DailyTask.id)
        .all()
    )

    open_title = _LIGHT_TEST_OPEN_TITLE

    if not today_tasks:
        specs = [
            ("survival", open_title if planet_type == "survival" else "晨跑5公里"),
            ("money", "阅读《原则》30页"),
            ("beauty", "晚间护肤流程"),
            ("fun", "学习摄影技巧"),
            ("flow", "正念冥想15分钟"),
        ]
        today_tasks = []
        for idx, (ttype, title) in enumerate(specs):
            if ttype == planet_type:
                title = open_title
            task = DailyTask(
                user_id=user.id,
                title=title,
                time_type=ttype,
                scheduled_label="今日 · 待完成",
                completed=False,
                requires_photo=False,
                sort_order=idx + 1,
                task_date=today,
            )
            db.add(task)
            today_tasks.append(task)
        db.flush()

    # 全部先标完成，再放开 1 条目标星球任务（无需拍照）
    open_task = next((t for t in today_tasks if t.time_type == planet_type), None)
    if open_task is None:
        open_task = today_tasks[0]
        open_task.time_type = planet_type
    open_task.title = open_title
    open_task.completed = False
    open_task.requires_photo = False
    open_task.scheduled_label = "今日 · 待完成"

    for task in today_tasks:
        if task.id == open_task.id:
            continue
        task.completed = True
        task.scheduled_label = (task.scheduled_label or "今日").replace("待完成", "已完成")
        if "已完成" not in (task.scheduled_label or ""):
            task.scheduled_label = "今日 · 已完成"

    # 先拉开五星球亮度差异，再把引导星球调到「差 1 枚碎片」
    _ensure_demo_planet_levels(db, user.id)

    planets = ensure_all_planets(db, user.id)
    keep = next((p for p in planets if p.planet_type == planet_type), None)
    demo_level = _DEMO_PLANET_LEVELS.get(planet_type, 2)
    if keep is None:
        keep = PlanetProgress(
            user_id=user.id,
            planet_type=planet_type,
            level=demo_level,
            current_task="引导点亮",
            active=True,
            energy_fragments=FRAGMENTS_PER_LIGHT - 1,
        )
        db.add(keep)
    else:
        keep.energy_fragments = FRAGMENTS_PER_LIGHT - 1
        keep.active = True
        keep.level = demo_level
        keep.current_task = "引导点亮"
    db.flush()

    return {
        "user_id": user.id,
        "phone": user.phone,
        "planet_type": planet_type,
        "energy_fragments": FRAGMENTS_PER_LIGHT - 1,
        "fragments_per_light": FRAGMENTS_PER_LIGHT,
        "open_task": open_task.title,
        "today_tasks": len(today_tasks),
        "hint": "确认完成今日唯一待办后，该星球碎片将集齐，可点亮",
        "skipped": False,
    }


def ensure_demo_reward_guide(
    db: Session,
    user: User,
    planet_type: str = _LIGHT_TEST_PLANET,
) -> dict:
    """首页固定引导：确认完成 → 点亮潘多拉 → 满级后去成长奖励领计划礼包。

    - 待完成 1 条 + 碎片 6/7：保持
    - 已全完成且可点亮：保持
    - 引导星球已满级：保持，便于成长奖励页 100% + 礼包高亮
    - 其它状态：重新备好（生存默认 Lv.6，点亮即满级）
    """
    from .services.planet_service import (
        FRAGMENTS_PER_LIGHT,
        PLANET_MAX_LEVEL,
        PLANET_TYPES,
        ensure_all_planets,
    )

    if planet_type not in PLANET_TYPES:
        planet_type = _LIGHT_TEST_PLANET

    today = date.today().isoformat()
    planets = ensure_all_planets(db, user.id)
    planet = next((p for p in planets if p.planet_type == planet_type), None)
    fragments = int(planet.energy_fragments or 0) if planet else 0
    level = int(planet.level or 0) if planet else 0
    ready_to_light = fragments >= FRAGMENTS_PER_LIGHT and level < PLANET_MAX_LEVEL

    today_tasks = (
        db.query(DailyTask)
        .filter(DailyTask.user_id == user.id, DailyTask.task_date == today)
        .order_by(DailyTask.sort_order, DailyTask.id)
        .all()
    )
    pending = [t for t in today_tasks if not t.completed]

    # 中间态 0：引导星球已满级 → 等用户去成长奖励领取计划完成礼包
    if level >= PLANET_MAX_LEVEL:
        _ensure_demo_planet_levels(db, user.id, skip_types={planet_type})
        return {
            "skipped": True,
            "phase": "await_claim",
            "planet_type": planet_type,
            "energy_fragments": fragments,
            "level": level,
        }

    # 中间态 1：只剩 1 条引导待完成，碎片差 1 枚 → 等用户确认完成
    if (
        len(pending) == 1
        and pending[0].time_type == planet_type
        and fragments == FRAGMENTS_PER_LIGHT - 1
        and level < PLANET_MAX_LEVEL
    ):
        _ensure_demo_planet_levels(db, user.id)
        if planet is not None:
            planet.level = _DEMO_PLANET_LEVELS.get(planet_type, 6)
            planet.energy_fragments = FRAGMENTS_PER_LIGHT - 1
            planet.active = True
            db.flush()
        return {
            "skipped": True,
            "phase": "await_complete",
            "planet_type": planet_type,
            "open_task": pending[0].title,
            "energy_fragments": FRAGMENTS_PER_LIGHT - 1,
        }

    # 中间态 2：今日已全部完成，星球可点亮 → 等用户点「点亮」开潘多拉
    if not pending and today_tasks and ready_to_light:
        _ensure_demo_planet_levels(db, user.id, skip_types={planet_type})
        return {
            "skipped": True,
            "phase": "await_light",
            "planet_type": planet_type,
            "energy_fragments": fragments,
        }

    return _apply_light_planet_guide(db, user, planet_type=planet_type, ensure_tasks=False)


def prepare_light_planet_test(
    db: Session,
    user: User,
    planet_type: str = _LIGHT_TEST_PLANET,
) -> dict:
    """强制重置引导状态（脚本 /dev 接口用）。"""
    result = _apply_light_planet_guide(db, user, planet_type=planet_type, ensure_tasks=True)
    db.commit()
    return result


def ensure_demo_growth_reward_guide(db: Session, user: User) -> None:
    """成长奖励固定测试：保证有可领取的悦己奖励（已解锁）。"""
    rewards = (
        db.query(UserReward)
        .filter(UserReward.user_id == user.id)
        .order_by(UserReward.id)
        .all()
    )
    unlocked = [r for r in rewards if r.status == "unlocked"]
    if unlocked:
        return
    locked = [r for r in rewards if r.status == "locked"]
    if locked:
        locked[0].status = "unlocked"
        db.flush()
        return
    db.add(
        UserReward(
            user_id=user.id,
            name="测试悦己奖励 · 一杯喜欢的饮品",
            description="计划点亮进度达成 100% 可领取（测试引导）",
            status="unlocked",
        )
    )
    db.flush()


def ensure_user_home_data(db: Session, user: User) -> None:
    if db.query(DailyTask).filter(DailyTask.user_id == user.id).count() > 0:
        return

    today = date.today().isoformat()
    # 默认即可测点亮：4 项已完成 + 生存星球 1 项待完成，碎片 6/7
    tasks = [
        DailyTask(
            user_id=user.id,
            title=_LIGHT_TEST_OPEN_TITLE,
            time_type="survival",
            scheduled_label="今日 · 待完成",
            completed=False,
            requires_photo=False,
            sort_order=1,
            task_date=today,
        ),
        DailyTask(
            user_id=user.id,
            title="阅读《原则》30页",
            time_type="money",
            scheduled_label="今日 · 已完成",
            completed=True,
            sort_order=2,
            task_date=today,
        ),
        DailyTask(
            user_id=user.id,
            title="晚间护肤流程",
            time_type="beauty",
            scheduled_label="今日 · 已完成",
            completed=True,
            requires_photo=True,
            sort_order=3,
            task_date=today,
        ),
        DailyTask(
            user_id=user.id,
            title="正念冥想15分钟",
            time_type="flow",
            scheduled_label="今日 · 已完成",
            completed=True,
            sort_order=4,
            task_date=today,
        ),
        DailyTask(
            user_id=user.id,
            title="学习摄影技巧",
            time_type="fun",
            scheduled_label="今日 · 已完成",
            completed=True,
            requires_photo=True,
            sort_order=5,
            task_date=today,
        ),
    ]
    planets = [
        PlanetProgress(
            user_id=user.id,
            planet_type="survival",
            level=3,
            current_task="测试点亮",
            active=True,
            energy_fragments=6,
        ),
        PlanetProgress(user_id=user.id, planet_type="money", level=5, current_task="阅读1小时", active=True, energy_fragments=0),
        PlanetProgress(user_id=user.id, planet_type="beauty", level=2, current_task="护肤打卡", active=True, energy_fragments=0),
        PlanetProgress(user_id=user.id, planet_type="fun", level=1, current_task="暂无任务", active=False, energy_fragments=0),
        PlanetProgress(user_id=user.id, planet_type="flow", level=4, current_task="冥想15分", active=True, energy_fragments=0),
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
