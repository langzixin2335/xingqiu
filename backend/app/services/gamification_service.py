from datetime import date, timedelta

from sqlalchemy.orm import Session

from ..models import (
    DailyTask,
    PlanetProgress,
    TaskCompletionLog,
    UserBadge,
    UserReward,
    UserStreak,
)
from .community_service import create_task_completion_post

PHOTO_TYPES = {"beauty", "fun"}


def today_str() -> str:
    return date.today().isoformat()


def _get_or_create_streak(db: Session, user_id: int) -> UserStreak:
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    if not streak:
        streak = UserStreak(user_id=user_id)
        db.add(streak)
        db.flush()
    return streak


def _today_tasks(db: Session, user_id: int) -> list[DailyTask]:
    today = today_str()
    tasks = (
        db.query(DailyTask)
        .filter(DailyTask.user_id == user_id)
        .order_by(DailyTask.sort_order)
        .all()
    )
    dated = [t for t in tasks if t.task_date == today]
    return dated if dated else tasks


def _all_complete_today(db: Session, user_id: int) -> bool:
    tasks = _today_tasks(db, user_id)
    return bool(tasks) and all(t.completed for t in tasks)


def _update_planet_on_complete(
    db: Session, user_id: int, time_type: str, task_title: str
) -> tuple[PlanetProgress | None, bool]:
    """完成对应行动 → +1 能量碎片；集齐 7 个后需用户手动点亮。"""
    from .planet_service import award_energy_fragment

    planet, just_ready = award_energy_fragment(
        db, user_id, time_type, amount=1, task_title=task_title
    )
    return planet, just_ready


def _log_completion(db: Session, user_id: int, task: DailyTask) -> None:
    today = today_str()
    exists = (
        db.query(TaskCompletionLog)
        .filter(
            TaskCompletionLog.user_id == user_id,
            TaskCompletionLog.task_id == task.id,
            TaskCompletionLog.completed_date == today,
        )
        .first()
    )
    if exists:
        return
    db.add(
        TaskCompletionLog(
            user_id=user_id,
            task_id=task.id,
            task_title=task.title,
            time_type=task.time_type,
            completed_date=today,
        )
    )


def _remove_completion_log(db: Session, user_id: int, task: DailyTask) -> None:
    db.query(TaskCompletionLog).filter(
        TaskCompletionLog.user_id == user_id,
        TaskCompletionLog.task_id == task.id,
        TaskCompletionLog.completed_date == today_str(),
    ).delete()


def _update_streak_on_all_complete(db: Session, user_id: int) -> UserStreak:
    streak = _get_or_create_streak(db, user_id)
    today = today_str()
    if streak.last_complete_date == today:
        return streak

    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if streak.last_complete_date == yesterday:
        streak.current_streak += 1
    else:
        streak.current_streak = 1

    streak.last_complete_date = today
    streak.total_complete_days += 1
    streak.longest_streak = max(streak.longest_streak, streak.current_streak)
    return streak


def _check_badges(db: Session, user_id: int) -> list[dict]:
    streak = _get_or_create_streak(db, user_id)
    logs = db.query(TaskCompletionLog).filter(TaskCompletionLog.user_id == user_id).all()
    checks = {
        "streak7": streak.current_streak >= 7,
        "earlybird": any("晨" in l.task_title or "早" in l.task_title for l in logs),
        "reader": sum(1 for l in logs if "读" in l.task_title) >= 3,
        "planet": streak.total_complete_days >= 1,
        "flow": sum(1 for l in logs if l.time_type == "flow") >= 5,
        "beauty": sum(1 for l in logs if l.time_type == "beauty") >= 3,
        "fun": sum(1 for l in logs if l.time_type == "fun") >= 3,
        "queen": streak.current_streak >= 21,
    }
    unlocked = []
    badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    for badge in badges:
        if badge.unlocked:
            continue
        if checks.get(badge.badge_key):
            badge.unlocked = True
            unlocked.append({"badge_key": badge.badge_key, "icon": badge.icon, "name": badge.name})
    return unlocked


def _unlock_rewards(db: Session, user_id: int, completion_rate: int) -> list[dict]:
    unlocked = []
    if completion_rate < 80:
        return unlocked
    rewards = (
        db.query(UserReward)
        .filter(UserReward.user_id == user_id, UserReward.status == "locked")
        .all()
    )
    for reward in rewards[:1]:
        reward.status = "unlocked"
        unlocked.append({"id": reward.id, "name": reward.name})
    return unlocked


def compute_dimension_progress(db: Session, user_id: int) -> dict[str, int]:
    """五种星球完成率：点亮等级 + 当前碎片进度。"""
    from .planet_service import (
        PLANET_TYPES,
        compute_progress_percent,
        ensure_all_planets,
    )

    planets = ensure_all_planets(db, user_id)
    by_type = {p.planet_type: p for p in planets}
    result = {}
    for t in PLANET_TYPES:
        planet = by_type.get(t)
        if not planet:
            result[t] = 0
            continue
        result[t] = compute_progress_percent(
            int(planet.level or 0),
            int(planet.energy_fragments or 0),
        )
    return result


def compute_overall_completion_rate(db: Session, user_id: int) -> int:
    """目标总进度 = 五种星球完成率均值。"""
    dims = compute_dimension_progress(db, user_id)
    if not dims:
        return 0
    return round(sum(dims.values()) / len(dims))


def compute_weekly_completion(db: Session, user_id: int) -> list[int]:
    today = date.today()
    result = []
    for i in range(6, -1, -1):
        day = (today - timedelta(days=i)).isoformat()
        tasks = (
            db.query(DailyTask)
            .filter(DailyTask.user_id == user_id, DailyTask.task_date == day)
            .all()
        )
        if tasks:
            completed = sum(1 for t in tasks if t.completed)
            result.append(round(completed / len(tasks) * 100))
        else:
            logs = (
                db.query(TaskCompletionLog)
                .filter(
                    TaskCompletionLog.user_id == user_id,
                    TaskCompletionLog.completed_date == day,
                )
                .count()
            )
            result.append(min(100, logs * 25) if logs else 0)
    return result


def compute_planet_growth_speed(db: Session, user_id: int) -> dict[str, dict]:
    """近7日各星球成长速度：按行动完成次数衡量（完成越多，成长越快）。"""
    from .planet_service import PLANET_TYPES

    today = date.today()
    days = [(today - timedelta(days=i)).isoformat() for i in range(6, -1, -1)]
    logs = (
        db.query(TaskCompletionLog)
        .filter(
            TaskCompletionLog.user_id == user_id,
            TaskCompletionLog.completed_date >= days[0],
            TaskCompletionLog.completed_date <= days[-1],
        )
        .all()
    )

    daily_map = {t: {d: 0 for d in days} for t in PLANET_TYPES}
    for log in logs:
        t = log.time_type if log.time_type in daily_map else None
        if not t or log.completed_date not in daily_map[t]:
            continue
        daily_map[t][log.completed_date] += 1

    result: dict[str, dict] = {}
    for t in PLANET_TYPES:
        daily = [daily_map[t][d] for d in days]
        count = sum(daily)
        result[t] = {
            "count": count,
            "daily": daily,
            "per_day": round(count / 7, 2),
        }
    return result


def get_weekend_review(db: Session, user_id: int) -> dict | None:
    """周行动回顾：平日看上一周；周日才解锁本周复盘。"""
    today = date.today()
    weekday = today.weekday()  # 0=周一 ... 6=周日
    is_sunday = weekday == 6
    this_monday = today - timedelta(days=weekday)

    if is_sunday:
        week_start = this_monday
        week_end = this_monday + timedelta(days=6)
        period = "current"
        title = "本周行动回顾"
        button_label = "查看本周行动回顾"
        current_week_locked = False
    else:
        week_start = this_monday - timedelta(days=7)
        week_end = this_monday - timedelta(days=1)
        period = "previous"
        title = "上周行动回顾"
        button_label = "查看上周行动回顾"
        current_week_locked = True

    start_s = week_start.isoformat()
    end_s = week_end.isoformat()
    logs = (
        db.query(TaskCompletionLog)
        .filter(
            TaskCompletionLog.user_id == user_id,
            TaskCompletionLog.completed_date >= start_s,
            TaskCompletionLog.completed_date <= end_s,
        )
        .all()
    )
    streak = _get_or_create_streak(db, user_id)
    week_label = f"{week_start.month}月{week_start.day}日 - {week_end.month}月{week_end.day}日"
    count = len(logs)
    streak_days = streak.current_streak

    if is_sunday:
        message = (
            f"本周（{week_label}）已完成{count}个行动，连续保持行动{streak_days}天。"
            f"本周复盘已解锁，欢迎查看；"
        )
    else:
        message = (
            f"上周（{week_label}）已完成{count}个行动，连续保持行动{streak_days}天。"
            f"本周复盘将在周日解锁，敬请期待；"
        )

    return {
        "week_completions": count,
        "current_streak": streak_days,
        "message": message,
        "period": period,
        "week_label": week_label,
        "title": title,
        "button_label": button_label,
        "current_week_locked": current_week_locked,
    }


def on_task_completed(db, user, task) -> dict:
    from .community_service import PLANET_NAME
    from .planet_service import FRAGMENTS_PER_LIGHT, award_energy_fragment

    _log_completion(db, user.id, task)
    planet, just_ready = _update_planet_on_complete(
        db, user.id, task.time_type, task.title
    )
    create_task_completion_post(db, user, task)

    all_done = _all_complete_today(db, user.id)
    streak = _get_or_create_streak(db, user.id)
    if all_done:
        streak = _update_streak_on_all_complete(db, user.id)

    tasks = _today_tasks(db, user.id)
    completed = sum(1 for t in tasks if t.completed)
    total = len(tasks) or 1
    completion_rate = round(completed / total * 100)

    badges = _check_badges(db, user.id)
    rewards = _unlock_rewards(db, user.id, completion_rate) if all_done else []

    planet_type = planet.planet_type if planet else task.time_type
    energy_fragment = None
    if all_done:
        # 今日全勤额外奖励该星球 1 枚碎片（完成行动时已发过 1 枚）
        awarded, bonus_ready = award_energy_fragment(db, user.id, planet_type, amount=1)
        planet = awarded
        just_ready = just_ready or bonus_ready
        energy_fragment = {
            "planet_type": planet_type,
            "planet_name": PLANET_NAME.get(planet_type, "闪耀星球"),
            "total": int(awarded.energy_fragments or 0),
            "ready_to_light": int(awarded.energy_fragments or 0) >= FRAGMENTS_PER_LIGHT,
        }

    ready = just_ready or int(planet.energy_fragments or 0) >= FRAGMENTS_PER_LIGHT
    return {
        "planet_type": planet_type,
        "planet_level": planet.level if planet else 1,
        "all_complete_today": all_done,
        "completion_rate": completion_rate,
        "streak": {
            "current": streak.current_streak,
            "longest": streak.longest_streak,
            "total_days": streak.total_complete_days,
        },
        "badges_unlocked": badges,
        "rewards_unlocked": rewards,
        "energy_fragment": energy_fragment,
        "ready_to_light": ready,
        "ready_planet_type": planet_type if ready else None,
        "ready_planet_name": PLANET_NAME.get(planet_type, "闪耀星球") if ready else None,
    }


def on_task_uncompleted(db, user_id: int, task) -> dict:
    _remove_completion_log(db, user_id, task)
    tasks = _today_tasks(db, user_id)
    completed = sum(1 for t in tasks if t.completed)
    total = len(tasks) or 1
    streak = _get_or_create_streak(db, user_id)
    return {
        "all_complete_today": False,
        "completion_rate": round(completed / total * 100),
        "streak": {
            "current": streak.current_streak,
            "longest": streak.longest_streak,
            "total_days": streak.total_complete_days,
        },
        "badges_unlocked": [],
        "rewards_unlocked": [],
    }
