from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class UserOut(BaseModel):
    id: int
    phone: str
    nickname: str
    personality: Optional[str] = None
    onboarding_step: str
    member_tier: str
    avatar: str = "👤"
    member_expire: str = "2026-12-31"

    class Config:
        from_attributes = True


class WechatLoginRequest(BaseModel):
    code: str = Field(min_length=1)


class WechatAuthUrlResponse(BaseModel):
    url: Optional[str] = None
    dev_mode: bool = True
    message: str = ""


class MemberUpgradeRequest(BaseModel):
    target_tier: str = Field(pattern=r"^(星耀|星球女王)$")


class PushRegisterRequest(BaseModel):
    token: str = Field(min_length=1, max_length=512)
    platform: str = Field(default="android", pattern=r"^(android|ios|web)$")


class PaymentOrderCreateRequest(BaseModel):
    target_tier: str = Field(pattern=r"^(星耀|星球女王)$")


class PaymentOrderOut(BaseModel):
    order_no: str
    amount: int
    target_tier: str
    dev_mode: bool = True
    message: str = ""
    pay_params: Optional[dict] = None


class PaymentConfirmRequest(BaseModel):
    order_no: str = Field(min_length=1, max_length=64)


class MemberInfoOut(BaseModel):
    tier: str
    expire: str
    benefits_unlocked: int
    benefits_total: int
    price_quarterly: int


class RegisterRequest(BaseModel):
    nickname: str = Field(min_length=1, max_length=50)
    phone: str = Field(pattern=r"^1\d{10}$")
    sms_code: str = Field(min_length=4, max_length=8)
    password: str = Field(min_length=6, max_length=64)


class LoginRequest(BaseModel):
    phone: str = Field(pattern=r"^1\d{10}$")
    password: str


class SmsCodeRequest(BaseModel):
    phone: str = Field(pattern=r"^1\d{10}$")


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class PersonalityRequest(BaseModel):
    personality: str = Field(pattern=r"^(wood|fire|earth|metal|water)$")


class OnboardingRequest(BaseModel):
    onboarding_step: str = Field(pattern=r"^(welcome|personality|plan|done)$")


class PlanGoalIn(BaseModel):
    time_type: str = Field(pattern=r"^(survival|money|beauty|fun|flow)$")
    period: str = Field(pattern=r"^(short|medium|long)$")
    title: str = Field(min_length=1, max_length=255)
    phase_label: str = ""
    action: str = ""


class DailyReminderIn(BaseModel):
    title: str = Field(min_length=1, max_length=2000)
    time_type: str = Field(pattern=r"^(survival|money|beauty|fun|flow)$")
    remind_time: str = Field(default="07:00", pattern=r"^\d{2}:\d{2}$")
    deliver_mode: str = Field(default="text", pattern=r"^(text|voice)$")
    voice_persona: str = Field(default="sister", pattern=r"^(sister|brother)$")
    repeat_days: str = Field(default="1,2,3,4,5")
    holiday_skip: bool = False
    smart_enabled: bool = True


class EncouragePhrasesRequest(BaseModel):
    time_type: str = Field(default="survival", pattern=r"^(survival|money|beauty|fun|flow)$")
    count: int = Field(default=5, ge=3, le=8)


class AiPlanRequest(BaseModel):
    core_goal: str = Field(min_length=1)
    duration: str = Field(default="3个月")
    daily_time_budget: str = Field(default="30-60分钟", max_length=40)
    personality: Optional[str] = Field(default=None, pattern=r"^(wood|fire|earth|metal|water)$")


class AiGoalUnderstanding(BaseModel):
    summary: str
    category: str = "个人成长"
    success_criteria: str = ""
    weekly_hours: int = 5
    main_obstacle: str = ""
    primary_time_type: str = "money"


class AiPlanPhase(BaseModel):
    period: str
    goal: str
    action: str
    time_type: str = "survival"


class AiDailyTask(BaseModel):
    title: str
    time_type: str
    remind_time: str = "07:00"
    repeat_days: str = "1,2,3,4,5,6,7"
    requires_photo: bool = False


class AiPlanResponse(BaseModel):
    goal_understanding: AiGoalUnderstanding
    phases: list[AiPlanPhase]
    daily_tasks: list[AiDailyTask]
    source: str = "template"


class PlanDailyTaskIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    time_type: str = Field(pattern=r"^(survival|money|beauty|fun|flow)$")
    remind_time: str = Field(default="07:00", pattern=r"^\d{2}:\d{2}$")
    repeat_days: str = Field(default="1,2,3,4,5,6,7")
    requires_photo: bool = False


class PlanCreateRequest(BaseModel):
    goal_status: str = Field(pattern=r"^(has-plan|no-plan)$")
    core_goal: Optional[str] = None
    goals: list[PlanGoalIn] = []
    daily_tasks: list[PlanDailyTaskIn] = []
    reminders: list[DailyReminderIn] = []


class ReminderOut(BaseModel):
    id: int
    title: str
    time_type: str
    remind_time: str
    deliver_mode: str = "text"
    voice_persona: str = "sister"
    repeat_days: str
    holiday_skip: bool
    smart_enabled: bool

    class Config:
        from_attributes = True


class CommentOut(BaseModel):
    id: int
    author_name: str
    content: str

    class Config:
        from_attributes = True


class TaskOut(BaseModel):
    id: int
    title: str
    time_type: str
    scheduled_label: str
    requires_photo: bool
    completed: bool
    post_id: Optional[int] = None
    likes_count: int = 0
    comments_count: int = 0
    liked: bool = False
    like_users: list[str] = []
    comments: list[CommentOut] = []

    class Config:
        from_attributes = True


class StreakOut(BaseModel):
    current: int = 0
    longest: int = 0
    total_days: int = 0


class PlanPhaseOut(BaseModel):
    id: int
    phase_label: str
    title: str
    action: str
    time_type: str
    period: str
    progress_percent: int = 0

    class Config:
        from_attributes = True


class EnergyFragmentOut(BaseModel):
    planet_type: str
    planet_name: str


class TaskEffectOut(BaseModel):
    planet_type: Optional[str] = None
    planet_level: int = 1
    all_complete_today: bool = False
    completion_rate: int = 0
    streak: StreakOut = StreakOut()
    badges_unlocked: list[dict] = []
    rewards_unlocked: list[dict] = []
    energy_fragment: Optional[EnergyFragmentOut] = None
    ready_to_light: bool = False
    ready_planet_type: Optional[str] = None
    ready_planet_name: Optional[str] = None


class TaskToggleResponse(BaseModel):
    task: TaskOut
    effects: TaskEffectOut


class InvitationCreateRequest(BaseModel):
    task_title: str = Field(min_length=1, max_length=255)
    time_type: str = Field(default="survival", pattern=r"^(survival|money|beauty|fun|flow)$")


class InvitationOut(BaseModel):
    id: int
    invite_code: str
    task_title: str
    time_type: str
    inviter_name: str
    status: str
    share_text: str
    share_url: str

    class Config:
        from_attributes = True


class ReflectionRequest(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class WeekendReviewOut(BaseModel):
    week_completions: int
    current_streak: int
    message: str
    period: str = "previous"  # previous | current
    week_label: str = ""
    title: str = "上周总结"
    button_label: str = "查看上周总结"
    current_week_locked: bool = True


class PlanetOut(BaseModel):
    planet_type: str
    level: int
    max_level: int = 7
    current_task: str
    active: bool
    energy_fragments: int = 0
    fragments_per_light: int = 7
    ready_to_light: bool = False
    progress_percent: int = 0

    class Config:
        from_attributes = True


class PostOut(BaseModel):
    id: int
    author_name: str
    avatar: str
    content: str
    task_title: str
    time_type: str
    likes_count: int
    comments_count: int
    liked: bool = False
    like_users: list[str] = []
    comments: list[CommentOut] = []

    class Config:
        from_attributes = True


class ProductOut(BaseModel):
    id: int
    name: str
    description: str
    category: str
    subcategory: str
    badge: Optional[str] = None
    emoji: str
    added: bool = False

    class Config:
        from_attributes = True


class BadgeOut(BaseModel):
    id: int
    badge_key: str
    icon: str
    name: str
    unlocked: bool
    displayed: bool

    class Config:
        from_attributes = True


class RewardOut(BaseModel):
    id: int
    name: str
    description: str
    status: str

    class Config:
        from_attributes = True


class RewardCreateRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str = ""


class CommentCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=500)


class EnergyChatMessage(BaseModel):
    role: str = Field(pattern=r"^(user|assistant)$")
    content: str = Field(min_length=1, max_length=2000)


class EnergyChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    history: list[EnergyChatMessage] = Field(default_factory=list, max_length=20)


class EnergyChatResponse(BaseModel):
    reply: str
    source: str = "ai"
    companion_name: str = "星光"
    companion_display: str = "你的伙伴·星光"
    companion_avatar: str = "/images/avatar/sailor-fire-portrait.png"
    personality: str | None = None


class PlanetGrowthSpeedOut(BaseModel):
    count: int = 0
    daily: list[int] = Field(default_factory=list)
    per_day: float = 0.0


class PlanSummaryOut(BaseModel):
    id: int
    core_goal: Optional[str] = None
    goal_status: str = "has-plan"
    is_active: bool = True
    created_at: Optional[str] = None
    phase_count: int = 0
    phases: list[PlanPhaseOut] = []

    class Config:
        from_attributes = True


class DashboardOut(BaseModel):
    user: UserOut
    planets: list[PlanetOut]
    tasks: list[TaskOut]
    plan_phases: list[PlanPhaseOut] = []
    plans: list[PlanSummaryOut] = []
    active_plan_id: Optional[int] = None
    posts: list[PostOut]
    products: list[ProductOut]
    badges: list[BadgeOut]
    rewards: list[RewardOut]
    completion_rate: int
    weekly_completion: list[int]
    dimension_progress: dict[str, int]
    planet_growth_speed: dict[str, PlanetGrowthSpeedOut] = Field(default_factory=dict)
    streak: StreakOut = StreakOut()
    weekend_review: Optional[WeekendReviewOut] = None
    core_goal: Optional[str] = None

