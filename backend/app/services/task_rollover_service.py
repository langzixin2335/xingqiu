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
    plan_id: int | None = None,
) -> None:
    q = db.query(TaskTemplate).filter(TaskTemplate.user_id == user_id)
    if plan_id is not None:
        q = q.filter(TaskTemplate.plan_id == plan_id)
    q.delete()

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
                plan_id=plan_id,
                title=title,
                time_type=time_type,
                remind_time=remind_time or "07:00",
                requires_photo=requires_photo,
                sort_order=idx + 1,
                active=True,
            )
        )


def ensure_today_tasks(db: Session, user_id: int) -> None:
    """按各计划模板补齐今日任务；已有今日任务的计划不再重复生成。"""
    today = today_str()
    existing_plan_ids = {
        row[0]
        for row in db.query(DailyTask.plan_id)
        .filter(DailyTask.user_id == user_id, DailyTask.task_date == today)
        .distinct()
        .all()
    }
    # 无 plan_id 的旧任务：若今日已有任意任务，则跳过整户补齐（兼容）
    has_legacy_today = (
        db.query(DailyTask)
        .filter(
            DailyTask.user_id == user_id,
            DailyTask.task_date == today,
            DailyTask.plan_id.is_(None),
        )
        .count()
        > 0
    )

    templates = (
        db.query(TaskTemplate)
        .filter(TaskTemplate.user_id == user_id, TaskTemplate.active == True)
        .order_by(TaskTemplate.plan_id, TaskTemplate.sort_order)
        .all()
    )
    if not templates:
        return

    # 需要补齐的计划：今日尚无该 plan 任务的模板集合
    plans_to_fill: set[int | None] = set()
    for tpl in templates:
        pid = tpl.plan_id
        if pid is None:
            if not has_legacy_today and not existing_plan_ids:
                plans_to_fill.add(None)
        elif pid not in existing_plan_ids:
            plans_to_fill.add(pid)

    if not plans_to_fill:
        return

    for tpl in templates:
        if tpl.plan_id not in plans_to_fill:
            continue
        scheduled = f"{tpl.remind_time} · 待完成" if tpl.remind_time else "今日 · 待完成"
        db.add(
            DailyTask(
                user_id=user_id,
                plan_id=tpl.plan_id,
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
