from datetime import date

from sqlalchemy.orm import Session

from ..models import DailyTask, TaskTemplate

PHOTO_TYPES = {"beauty", "fun"}


def today_str() -> str:
    return date.today().isoformat()


def sync_task_templates(
    db: Session,
    user_id: int,
    daily_tasks: list,
) -> None:
    db.query(TaskTemplate).filter(TaskTemplate.user_id == user_id).delete()
    for idx, item in enumerate(daily_tasks[:8]):
        if hasattr(item, "title"):
            title = item.title
            time_type = item.time_type
            remind_time = getattr(item, "remind_time", "07:00")
            requires_photo = getattr(item, "requires_photo", time_type in PHOTO_TYPES)
        else:
            title = item.get("title", "")
            time_type = item.get("time_type", "survival")
            remind_time = item.get("remind_time", "07:00")
            requires_photo = item.get("requires_photo", time_type in PHOTO_TYPES)
        if not title:
            continue
        db.add(
            TaskTemplate(
                user_id=user_id,
                title=title,
                time_type=time_type,
                remind_time=remind_time or "07:00",
                requires_photo=requires_photo,
                sort_order=idx + 1,
                active=True,
            )
        )


def ensure_today_tasks(db: Session, user_id: int) -> None:
    today = today_str()
    existing = (
        db.query(DailyTask)
        .filter(DailyTask.user_id == user_id, DailyTask.task_date == today)
        .count()
    )
    if existing > 0:
        return

    templates = (
        db.query(TaskTemplate)
        .filter(TaskTemplate.user_id == user_id, TaskTemplate.active == True)
        .order_by(TaskTemplate.sort_order)
        .all()
    )
    if not templates:
        return

    for tpl in templates:
        scheduled = f"{tpl.remind_time} · 待完成" if tpl.remind_time else "今日 · 待完成"
        db.add(
            DailyTask(
                user_id=user_id,
                title=tpl.title,
                time_type=tpl.time_type,
                scheduled_label=scheduled,
                requires_photo=tpl.requires_photo,
                completed=False,
                sort_order=tpl.sort_order,
                task_date=today,
            )
        )
    db.commit()
