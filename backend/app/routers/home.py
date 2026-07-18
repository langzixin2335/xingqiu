from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import (
    CommunityPost,
    DailyTask,
    PlanetProgress,
    Plan,
    PlanGoal,
    Product,
    User,
    UserBadge,
    UserProduct,
    UserReward,
    UserStreak,
)
from ..schemas import (
    BadgeOut,
    DashboardOut,
    PlanetOut,
    PlanPhaseOut,
    ProductOut,
    RewardOut,
    StreakOut,
    UserOut,
    WeekendReviewOut,
)
from ..serializers import post_to_out, task_to_out
from ..services.planet_service import ensure_all_planets, light_planet, planet_to_out
from ..seed import ensure_user_home_data
from ..services.gamification_service import (
    compute_dimension_progress,
    compute_overall_completion_rate,
    compute_planet_growth_speed,
    compute_weekly_completion,
    get_weekend_review,
)
from ..services.task_rollover_service import ensure_today_tasks, today_str

router = APIRouter(prefix="/home", tags=["home"])


def _phase_progress(db: Session, user_id: int, phase_index: int, total_phases: int) -> int:
    tasks = db.query(DailyTask).filter(DailyTask.user_id == user_id).all()
    if not tasks:
        return max(10, (phase_index + 1) * (100 // max(total_phases, 1)))
    completed = sum(1 for t in tasks if t.completed)
    base = round(completed / len(tasks) * 100)
    return min(100, base + phase_index * 5)


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_home_data(db, current_user)
    ensure_today_tasks(db, current_user.id)

    today = today_str()
    all_tasks = (
        db.query(DailyTask)
        .filter(DailyTask.user_id == current_user.id)
        .order_by(DailyTask.sort_order)
        .all()
    )
    tasks = [t for t in all_tasks if t.task_date == today] or all_tasks

    planets = ensure_all_planets(db, current_user.id)
    db.commit()
    badges = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == current_user.id)
        .order_by(UserBadge.id)
        .all()
    )
    rewards = (
        db.query(UserReward)
        .filter(UserReward.user_id == current_user.id)
        .order_by(UserReward.id)
        .all()
    )
    posts = db.query(CommunityPost).order_by(CommunityPost.created_at.desc()).limit(20).all()
    products = db.query(Product).order_by(Product.id).all()
    added_ids = {
        p.product_id
        for p in db.query(UserProduct).filter(UserProduct.user_id == current_user.id).all()
    }

    plan = (
        db.query(Plan)
        .filter(Plan.user_id == current_user.id)
        .order_by(Plan.id.desc())
        .first()
    )
    phases = []
    if plan:
        goals = (
            db.query(PlanGoal)
            .filter(PlanGoal.plan_id == plan.id)
            .order_by(PlanGoal.sort_order, PlanGoal.id)
            .all()
        )
        for idx, goal in enumerate(goals):
            phases.append(
                PlanPhaseOut(
                    id=goal.id,
                    phase_label=goal.phase_label or goal.period,
                    title=goal.title,
                    action=goal.action or "",
                    time_type=goal.time_type,
                    period=goal.period,
                    progress_percent=_phase_progress(db, current_user.id, idx, len(goals)),
                )
            )

    streak_row = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    streak = StreakOut(
        current=streak_row.current_streak if streak_row else 0,
        longest=streak_row.longest_streak if streak_row else 0,
        total_days=streak_row.total_complete_days if streak_row else 0,
    )

    weekend = get_weekend_review(db, current_user.id)
    weekend_out = WeekendReviewOut(**weekend) if weekend else None

    # 目标总进度 / 各维度进度：均基于五种星球点亮完成率
    dimension_progress = compute_dimension_progress(db, current_user.id)
    completion_rate = compute_overall_completion_rate(db, current_user.id)

    return DashboardOut(
        user=UserOut.model_validate(current_user),
        planets=[planet_to_out(db, current_user.id, p) for p in planets],
        tasks=[task_to_out(t, current_user.id, db) for t in tasks],
        plan_phases=phases,
        posts=[post_to_out(p, current_user.id, db) for p in posts],
        products=[
            ProductOut(
                id=p.id,
                name=p.name,
                description=p.description,
                category=p.category,
                subcategory=p.subcategory,
                badge=p.badge,
                emoji=p.emoji,
                added=p.id in added_ids,
            )
            for p in products
        ],
        badges=[BadgeOut.model_validate(b) for b in badges],
        rewards=[RewardOut.model_validate(r) for r in rewards],
        completion_rate=completion_rate,
        weekly_completion=compute_weekly_completion(db, current_user.id),
        dimension_progress=dimension_progress,
        planet_growth_speed=compute_planet_growth_speed(db, current_user.id),
        streak=streak,
        weekend_review=weekend_out,
        core_goal=plan.core_goal if plan else None,
    )


@router.post("/planets/{planet_type}/light", response_model=PlanetOut)
def light_user_planet(
    planet_type: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = light_planet(db, current_user.id, planet_type)
    db.commit()
    return result
