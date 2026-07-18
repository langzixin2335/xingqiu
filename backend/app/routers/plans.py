from fastapi import APIRouter, Depends, File, UploadFile
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
)
from ..services.ai_service import generate_plan_phases
from ..services.ocr_service import extract_plan_text, parse_goals_from_text
from ..services.plan_service import sync_user_plan_data

router = APIRouter(prefix="/plans", tags=["plans"])


@router.post("")
def create_plan(
    payload: PlanCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = Plan(
        user_id=current_user.id,
        goal_status=payload.goal_status,
        core_goal=payload.core_goal,
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
    )
    task_count = len(payload.daily_tasks) if payload.daily_tasks else len(goal_rows)
    return {"id": plan.id, "message": "计划已保存", "task_count": task_count}


@router.post("/ai-generate", response_model=AiPlanResponse)
async def ai_generate_plan(
    payload: AiPlanRequest,
    current_user: User = Depends(get_current_user),
):
    personality = payload.personality or current_user.personality
    bundle, source = await generate_plan_phases(payload.core_goal, payload.duration, personality)
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
