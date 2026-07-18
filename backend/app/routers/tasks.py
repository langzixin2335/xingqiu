from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import DailyTask, User
from ..schemas import TaskEffectOut, TaskToggleResponse
from ..serializers import task_to_out
from ..services.gamification_service import on_task_completed, on_task_uncompleted

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/today")
def get_today_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from ..services.task_rollover_service import ensure_today_tasks, today_str

    ensure_today_tasks(db, current_user.id)
    today = today_str()
    tasks = (
        db.query(DailyTask)
        .filter(DailyTask.user_id == current_user.id)
        .order_by(DailyTask.sort_order)
        .all()
    )
    dated = [t for t in tasks if t.task_date == today]
    items = dated if dated else tasks
    return [task_to_out(t, current_user.id, db) for t in items]


@router.post("/{task_id}/toggle", response_model=TaskToggleResponse)
def toggle_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = (
        db.query(DailyTask)
        .filter(DailyTask.id == task_id, DailyTask.user_id == current_user.id)
        .first()
    )
    if not task:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="任务不存在")

    task.completed = not task.completed
    if task.completed:
        task.scheduled_label = task.scheduled_label.replace("待完成", "已完成")
        if "·" not in task.scheduled_label:
            task.scheduled_label = "已完成"
        effects_data = on_task_completed(db, current_user, task)
    else:
        task.scheduled_label = task.scheduled_label.replace("已完成", "待完成")
        effects_data = on_task_uncompleted(db, current_user.id, task)

    db.commit()
    db.refresh(task)
    return TaskToggleResponse(
        task=task_to_out(task, current_user.id, db),
        effects=TaskEffectOut(**effects_data),
    )


@router.post("/{task_id}/complete-photo", response_model=TaskToggleResponse)
def complete_with_photo(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi import HTTPException

    from ..services.community_service import PLANET_NAME
    from ..services.gamification_service import _get_or_create_streak, _today_tasks

    task = (
        db.query(DailyTask)
        .filter(DailyTask.id == task_id, DailyTask.user_id == current_user.id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="任务不存在")

    if not task.completed:
        task.completed = True
        task.scheduled_label = task.scheduled_label.replace("待完成", "已完成")
        if "·" not in task.scheduled_label:
            task.scheduled_label = "已完成"
        effects_data = on_task_completed(db, current_user, task)
    else:
        tasks = _today_tasks(db, current_user.id)
        completed = sum(1 for t in tasks if t.completed)
        total = len(tasks) or 1
        streak = _get_or_create_streak(db, current_user.id)
        all_done = completed == total and total > 0
        effects_data = {
            "planet_type": task.time_type,
            "planet_level": 1,
            "all_complete_today": all_done,
            "completion_rate": round(completed / total * 100),
            "streak": {
                "current": streak.current_streak,
                "longest": streak.longest_streak,
                "total_days": streak.total_complete_days,
            },
            "badges_unlocked": [],
            "rewards_unlocked": [],
            "energy_fragment": (
                {
                    "planet_type": task.time_type,
                    "planet_name": PLANET_NAME.get(task.time_type, "闪耀星球"),
                }
                if all_done
                else None
            ),
        }

    db.commit()
    db.refresh(task)
    return TaskToggleResponse(
        task=task_to_out(task, current_user.id, db),
        effects=TaskEffectOut(**effects_data),
    )
