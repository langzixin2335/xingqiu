from sqlalchemy.orm import Session

from ..models import DailyReminder, DailyTask, PlanetProgress, PlanGoal
from .task_rollover_service import PHOTO_TYPES, sync_task_templates, today_str

TIME_LABELS = {
    "survival": "生存",
    "money": "赚钱",
    "beauty": "好看",
    "fun": "好玩",
    "flow": "心流",
}


def sync_user_plan_data(
    db: Session,
    user_id: int,
    goals: list[PlanGoal] | list,
    reminders: list | None = None,
    daily_tasks: list | None = None,
) -> None:
    db.query(DailyTask).filter(DailyTask.user_id == user_id).delete()
    db.query(DailyReminder).filter(DailyReminder.user_id == user_id).delete()

    today = today_str()
    if daily_tasks:
        sync_task_templates(db, user_id, daily_tasks)
        for idx, item in enumerate(daily_tasks[:8]):
            if hasattr(item, "title"):
                title = item.title
                time_type = item.time_type
                requires_photo = getattr(item, "requires_photo", time_type in PHOTO_TYPES)
                remind_time = getattr(item, "remind_time", None)
            else:
                title = item.get("title", "")
                time_type = item.get("time_type", "survival")
                requires_photo = item.get("requires_photo", time_type in PHOTO_TYPES)
                remind_time = item.get("remind_time")
            if not title:
                continue
            scheduled = f"{remind_time} · 待完成" if remind_time else "今日 · 待完成"
            db.add(
                DailyTask(
                    user_id=user_id,
                    title=title,
                    time_type=time_type,
                    scheduled_label=scheduled,
                    requires_photo=requires_photo,
                    completed=False,
                    sort_order=idx + 1,
                    task_date=today,
                )
            )

    merged_reminders = list(reminders or [])
    if daily_tasks and not merged_reminders:
        for item in daily_tasks:
            title = item.title if hasattr(item, "title") else item.get("title", "")
            remind_time = getattr(item, "remind_time", None) or item.get("remind_time", "07:00")
            time_type = item.time_type if hasattr(item, "time_type") else item.get("time_type", "survival")
            repeat_days = getattr(item, "repeat_days", None) or item.get("repeat_days", "1,2,3,4,5,6,7")
            if title and remind_time:
                merged_reminders.append(
                    {
                        "title": title,
                        "time_type": time_type,
                        "remind_time": remind_time,
                        "repeat_days": repeat_days,
                        "holiday_skip": False,
                        "smart_enabled": True,
                    }
                )

    if merged_reminders:
        for item in merged_reminders:
            db.add(
                DailyReminder(
                    user_id=user_id,
                    title=item.title if hasattr(item, "title") else item["title"],
                    time_type=item.time_type if hasattr(item, "time_type") else item["time_type"],
                    remind_time=item.remind_time if hasattr(item, "remind_time") else item.get("remind_time", "07:00"),
                    repeat_days=item.repeat_days if hasattr(item, "repeat_days") else item.get("repeat_days", "1,2,3,4,5"),
                    holiday_skip=item.holiday_skip if hasattr(item, "holiday_skip") else item.get("holiday_skip", False),
                    smart_enabled=item.smart_enabled if hasattr(item, "smart_enabled") else item.get("smart_enabled", True),
                )
            )

    _sync_planets(db, user_id, goals)
    db.commit()


def _sync_planets(db: Session, user_id: int, goals: list) -> None:
    from .planet_service import PLANET_MAX_LEVEL

    existing = {
        p.planet_type: p
        for p in db.query(PlanetProgress).filter(PlanetProgress.user_id == user_id).all()
    }
    active_types = set()
    for goal in goals:
        time_type = goal.time_type if hasattr(goal, "time_type") else goal["time_type"]
        title = goal.title if hasattr(goal, "title") else goal["title"]
        active_types.add(time_type)
        if time_type in existing:
            planet = existing[time_type]
            planet.active = True
            planet.current_task = title[:20]
            # 建计划只同步激活状态与当前目标，不抬等级
            planet.level = min(int(planet.level or 0), PLANET_MAX_LEVEL)
        else:
            db.add(
                PlanetProgress(
                    user_id=user_id,
                    planet_type=time_type,
                    level=0,
                    current_task=title[:20],
                    active=True,
                    energy_fragments=0,
                )
            )

    for planet_type, planet in existing.items():
        if planet_type not in active_types:
            planet.active = False
            planet.current_task = "暂无任务"
