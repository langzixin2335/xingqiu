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
    DemoGuidesOut,
    PlanetOut,
    PlanPhaseOut,
    PlanSummaryOut,
    ProductOut,
    RewardOut,
    StreakOut,
    UserOut,
    WeekendReviewOut,
)
from ..serializers import post_to_out, task_to_out
from ..services.planet_service import ensure_all_planets, light_planet, planet_to_out
from ..seed import (
    ensure_demo_growth_reward_guide,
    ensure_demo_reward_guide,
    ensure_user_home_data,
)
from ..services.gamification_service import (
    compute_dimension_progress,
    compute_overall_completion_rate,
    compute_planet_growth_speed,
    compute_weekly_completion,
    get_weekend_review,
)
from ..services.task_rollover_service import ensure_today_tasks, today_str

router = APIRouter(prefix="/home", tags=["home"])


def _phase_progress(
    db: Session,
    user_id: int,
    phase_index: int,
    total_phases: int,
    time_type: str | None = None,
) -> int:
    """阶段进度跟对应星球点亮进度对齐，避免「今日全勾完」直接显示 100%。"""
    from ..services.planet_service import compute_progress_percent, ensure_all_planets

    planets = {p.planet_type: p for p in ensure_all_planets(db, user_id)}
    if time_type and time_type in planets:
        p = planets[time_type]
        return compute_progress_percent(int(p.level or 0), int(p.energy_fragments or 0))

    # 无 time_type 时：用五星球均值，并按阶段序号略作错落
    if planets:
        avg = round(
            sum(
                compute_progress_percent(int(p.level or 0), int(p.energy_fragments or 0))
                for p in planets.values()
            )
            / max(len(planets), 1)
        )
        return min(100, max(0, avg))
    return max(0, (phase_index + 1) * (100 // max(total_phases, 1)))


@router.get("/dashboard", response_model=DashboardOut)
def get_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    ensure_user_home_data(db, current_user)
    ensure_today_tasks(db, current_user.id)
    # 固定引导：今日只剩 1 条待完成 + 生存星球 6/7，方便人人测碎片/点亮潘多拉
    ensure_demo_reward_guide(db, current_user)
    # 成长奖励固定引导：保证有已解锁礼包可点
    ensure_demo_growth_reward_guide(db, current_user)

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

    all_plans = (
        db.query(Plan)
        .filter(Plan.user_id == current_user.id)
        .order_by(Plan.id.desc())
        .all()
    )
    active_plan = next((p for p in all_plans if p.is_active), None) or (
        all_plans[0] if all_plans else None
    )

    def _phases_for(plan_row: Plan) -> list[PlanPhaseOut]:
        goals = (
            db.query(PlanGoal)
            .filter(PlanGoal.plan_id == plan_row.id)
            .order_by(PlanGoal.sort_order, PlanGoal.id)
            .all()
        )
        result = []
        for idx, goal in enumerate(goals):
            result.append(
                PlanPhaseOut(
                    id=goal.id,
                    phase_label=goal.phase_label or goal.period,
                    title=goal.title,
                    action=goal.action or "",
                    time_type=goal.time_type,
                    period=goal.period,
                    progress_percent=_phase_progress(
                        db,
                        current_user.id,
                        idx,
                        len(goals),
                        time_type=goal.time_type,
                    ),
                )
            )
        return result

    plan_summaries: list[PlanSummaryOut] = []
    for p in all_plans:
        phases_p = _phases_for(p)
        plan_summaries.append(
            PlanSummaryOut(
                id=p.id,
                core_goal=p.core_goal,
                goal_status=p.goal_status or "has-plan",
                is_active=bool(p.is_active) if active_plan is None else p.id == active_plan.id,
                created_at=p.created_at.isoformat() if p.created_at else None,
                phase_count=len(phases_p),
                phases=phases_p,
            )
        )

    phases = _phases_for(active_plan) if active_plan else []
    plan = active_plan

    streak_row = db.query(UserStreak).filter(UserStreak.user_id == current_user.id).first()
    streak = StreakOut(
        current=streak_row.current_streak if streak_row else 0,
        longest=streak_row.longest_streak if streak_row else 0,
        total_days=streak_row.total_complete_days if streak_row else 0,
    )

    weekend = get_weekend_review(db, current_user.id)
    weekend_out = WeekendReviewOut(**weekend) if weekend else None

    # 目标总进度 / 各维度进度：基于真实点亮等级；满级星球 → 成长奖励 100% + 礼包高亮
    from ..services.planet_service import PLANET_MAX_LEVEL

    dimension_progress = compute_dimension_progress(db, current_user.id)
    completion_rate = compute_overall_completion_rate(db, current_user.id)
    plan_complete_planets = [
        p.planet_type for p in planets if int(p.level or 0) >= PLANET_MAX_LEVEL
    ]
    demo_guides = DemoGuidesOut(
        growth_reward_pack=False,
        plan_complete_planets=plan_complete_planets,
    )

    return DashboardOut(
        user=UserOut.model_validate(current_user),
        planets=[planet_to_out(db, current_user.id, p) for p in planets],
        tasks=[task_to_out(t, current_user.id, db) for t in tasks],
        plan_phases=phases,
        plans=plan_summaries,
        active_plan_id=plan.id if plan else None,
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
        demo_guides=demo_guides,
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
