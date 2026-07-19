from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Plan, PlanGoal, User
from ..schemas import (
    AiDailyTask,
    AiGoalUnderstanding,
    AiPlanPhase,
    AiPlanRequest,
    AiPlanResponse,
    PlanCreateRequest,
    PlanSummaryOut,
)
from ..services.ai_service import generate_plan_phases
from ..services.ocr_service import extract_plan_text, parse_goals_from_text
from ..services.plan_service import delete_plan_data, sync_user_plan_data

router = APIRouter(prefix="/plans", tags=["plans"])


def _plan_summary(db: Session, plan: Plan) -> PlanSummaryOut:
    goals = (
        db.query(PlanGoal)
        .filter(PlanGoal.plan_id == plan.id)
        .order_by(PlanGoal.sort_order, PlanGoal.id)
        .all()
    )
    return PlanSummaryOut(
        id=plan.id,
        core_goal=plan.core_goal,
        goal_status=plan.goal_status or "has-plan",
        is_active=bool(plan.is_active),
        created_at=plan.created_at.isoformat() if plan.created_at else None,
        phase_count=len(goals),
        phases=[],
    )


@router.get("")
def list_plans(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plans = (
        db.query(Plan)
        .filter(Plan.user_id == current_user.id)
        .order_by(Plan.id.desc())
        .all()
    )
    return {"plans": [_plan_summary(db, p) for p in plans]}


@router.post("")
def create_plan(
    payload: PlanCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 新计划设为当前聚焦；其他计划保持存在，任务/提醒按 plan_id 并存
    db.query(Plan).filter(Plan.user_id == current_user.id).update({"is_active": False})
    plan = Plan(
        user_id=current_user.id,
        goal_status=payload.goal_status,
        core_goal=payload.core_goal,
        is_active=True,
    )
    db.add(plan)
    db.flush()

    goal_rows = []
    for idx, goal in enumerate(payload.goals):
        row = PlanGoal(
            plan_id=plan.id,
            time_type=goal.time_type,
            period=goal.period,
            phase_label=goal.phase_label or "",
            title=goal.title,
            action=goal.action or "",
            sort_order=idx + 1,
        )
        db.add(row)
        goal_rows.append(row)

    db.flush()
    sync_user_plan_data(
        db,
        current_user.id,
        goal_rows,
        payload.reminders,
        daily_tasks=payload.daily_tasks,
        plan_id=plan.id,
    )
    task_count = len(payload.daily_tasks) if payload.daily_tasks else len(goal_rows)
    return {
        "id": plan.id,
        "message": "计划已保存",
        "task_count": task_count,
        "plan_count": db.query(Plan).filter(Plan.user_id == current_user.id).count(),
    }


@router.post("/ai-generate", response_model=AiPlanResponse)
async def ai_generate_plan(
    payload: AiPlanRequest,
    current_user: User = Depends(get_current_user),
):
    personality = payload.personality or current_user.personality
    bundle, source = await generate_plan_phases(
        payload.core_goal,
        payload.duration,
        personality,
        payload.daily_time_budget,
    )
    u = bundle["goal_understanding"]
    return AiPlanResponse(
        goal_understanding=AiGoalUnderstanding(**u),
        phases=[AiPlanPhase(**p) for p in bundle["phases"]],
        daily_tasks=[AiDailyTask(**t) for t in bundle["daily_tasks"]],
        source=source,
    )


@router.post("/ocr")
async def ocr_plan(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    content = await file.read()
    text, source = await extract_plan_text(
        content, file.content_type or "application/octet-stream", file.filename or ""
    )
    goals = parse_goals_from_text(text)
    return {
        "text": text,
        "goals": goals,
        "source": source,
        "message": "OCR识别完成",
    }


@router.post("/{plan_id}/activate")
def activate_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(Plan)
        .filter(Plan.id == plan_id, Plan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")
    db.query(Plan).filter(Plan.user_id == current_user.id).update({"is_active": False})
    plan.is_active = True
    db.commit()
    return {"id": plan.id, "message": "已切换到该计划"}


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(Plan)
        .filter(Plan.id == plan_id, Plan.user_id == current_user.id)
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="计划不存在")

    was_active = bool(plan.is_active)
    delete_plan_data(db, current_user.id, plan.id)
    db.delete(plan)
    db.flush()

    remaining = (
        db.query(Plan)
        .filter(Plan.user_id == current_user.id)
        .order_by(Plan.id.desc())
        .all()
    )
    if was_active and remaining:
        remaining[0].is_active = True

    # 用剩余计划目标重同步星球
    from ..services.plan_service import _sync_planets

    all_goals = (
        db.query(PlanGoal)
        .join(Plan, Plan.id == PlanGoal.plan_id)
        .filter(Plan.user_id == current_user.id)
        .all()
    )
    _sync_planets(db, current_user.id, all_goals)
    db.commit()
    return {"message": "计划已删除", "plan_count": len(remaining)}
