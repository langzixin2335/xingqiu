from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class AdminUser(Base):
    __tablename__ = "admin_users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    nickname = Column(String(50), default="管理员")
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), unique=True, index=True, nullable=False)
    nickname = Column(String(50), nullable=False)
    password_hash = Column(String(255), nullable=False)
    personality = Column(String(20), nullable=True)
    onboarding_step = Column(String(20), default="welcome", nullable=False)
    member_tier = Column(String(20), default="萌芽", nullable=False)
    wechat_openid = Column(String(64), unique=True, index=True, nullable=True)
    avatar = Column(String(10), default="👤")
    member_expire = Column(String(20), default="2026-12-31")
    created_at = Column(DateTime, default=datetime.utcnow)

    plans = relationship("Plan", back_populates="user")
    tasks = relationship("DailyTask", back_populates="user")
    reminders = relationship("DailyReminder", back_populates="user")
    planets = relationship("PlanetProgress", back_populates="user")
    rewards = relationship("UserReward", back_populates="user")
    badges = relationship("UserBadge", back_populates="user")
    push_devices = relationship("PushDevice", back_populates="user", cascade="all, delete-orphan")
    payment_orders = relationship("PaymentOrder", back_populates="user", cascade="all, delete-orphan")


class SmsCode(Base):
    __tablename__ = "sms_codes"

    id = Column(Integer, primary_key=True, index=True)
    phone = Column(String(20), index=True, nullable=False)
    code = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Plan(Base):
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    goal_status = Column(String(20), default="has-plan")
    core_goal = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="plans")
    goals = relationship("PlanGoal", back_populates="plan", cascade="all, delete-orphan")


class PlanGoal(Base):
    __tablename__ = "plan_goals"

    id = Column(Integer, primary_key=True, index=True)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    time_type = Column(String(20), nullable=False)
    period = Column(String(20), nullable=False)
    phase_label = Column(String(100), default="")
    title = Column(String(255), nullable=False)
    action = Column(Text, default="")
    sort_order = Column(Integer, default=0)

    plan = relationship("Plan", back_populates="goals")


class DailyTask(Base):
    __tablename__ = "daily_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    title = Column(String(255), nullable=False)
    time_type = Column(String(20), nullable=False)
    scheduled_label = Column(String(50), default="")
    requires_photo = Column(Boolean, default=False)
    completed = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    task_date = Column(String(10), nullable=True)

    user = relationship("User", back_populates="tasks")


class TaskTemplate(Base):
    __tablename__ = "task_templates"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    title = Column(String(255), nullable=False)
    time_type = Column(String(20), nullable=False)
    remind_time = Column(String(10), default="07:00")
    requires_photo = Column(Boolean, default=False)
    sort_order = Column(Integer, default=0)
    active = Column(Boolean, default=True)


class TaskCompletionLog(Base):
    __tablename__ = "task_completion_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    task_id = Column(Integer, ForeignKey("daily_tasks.id"), nullable=True)
    task_title = Column(String(255), nullable=False)
    time_type = Column(String(20), nullable=False)
    completed_date = Column(String(10), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class UserStreak(Base):
    __tablename__ = "user_streaks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    current_streak = Column(Integer, default=0)
    longest_streak = Column(Integer, default=0)
    last_complete_date = Column(String(10), nullable=True)
    total_complete_days = Column(Integer, default=0)


class TaskInvitation(Base):
    __tablename__ = "task_invitations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    inviter_name = Column(String(50), nullable=False)
    task_title = Column(String(255), nullable=False)
    time_type = Column(String(20), nullable=False)
    invite_code = Column(String(32), unique=True, index=True, nullable=False)
    status = Column(String(20), default="open")
    accepted_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    accepted_by_name = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class DailyReminder(Base):
    __tablename__ = "daily_reminders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=True)
    title = Column(Text, nullable=False)
    time_type = Column(String(80), nullable=False)
    remind_time = Column(String(10), default="07:00")
    deliver_mode = Column(String(10), default="text")
    voice_persona = Column(String(20), default="sister")
    repeat_days = Column(String(30), default="1,2,3,4,5")
    holiday_skip = Column(Boolean, default=False)
    smart_enabled = Column(Boolean, default=True)

    user = relationship("User", back_populates="reminders")


class PlanetProgress(Base):
    __tablename__ = "planet_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    planet_type = Column(String(20), nullable=False)
    level = Column(Integer, default=0)
    current_task = Column(String(100), default="")
    active = Column(Boolean, default=True)
    energy_fragments = Column(Integer, default=0)

    user = relationship("User", back_populates="planets")


class CommunityPost(Base):
    __tablename__ = "community_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    task_id = Column(Integer, ForeignKey("daily_tasks.id"), nullable=True, index=True)
    author_name = Column(String(50), nullable=False)
    avatar = Column(String(10), default="👩")
    content = Column(Text, nullable=False)
    task_title = Column(String(100), nullable=False)
    time_type = Column(String(20), nullable=False)
    likes_count = Column(Integer, default=0)
    comments_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    comments = relationship("CommunityComment", back_populates="post", cascade="all, delete-orphan")
    likes = relationship("PostLike", back_populates="post", cascade="all, delete-orphan")


class CommunityComment(Base):
    __tablename__ = "community_comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    author_name = Column(String(50), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("CommunityPost", back_populates="comments")


class PostLike(Base):
    __tablename__ = "post_likes"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("community_posts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    post = relationship("CommunityPost", back_populates="likes")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), default="")
    category = Column(String(20), nullable=False)
    subcategory = Column(String(20), nullable=False)
    badge = Column(String(30), nullable=True)
    emoji = Column(String(10), default="📦")


class UserProduct(Base):
    __tablename__ = "user_products"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)


class UserReward(Base):
    __tablename__ = "user_rewards"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String(255), default="")
    status = Column(String(20), default="locked")

    user = relationship("User", back_populates="rewards")


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    badge_key = Column(String(50), nullable=False)
    icon = Column(String(10), nullable=False)
    name = Column(String(50), nullable=False)
    unlocked = Column(Boolean, default=False)
    displayed = Column(Boolean, default=False)

    user = relationship("User", back_populates="badges")


class PushDevice(Base):
    __tablename__ = "push_devices"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    platform = Column(String(20), nullable=False)
    token = Column(String(512), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="push_devices")


class PaymentOrder(Base):
    __tablename__ = "payment_orders"

    id = Column(Integer, primary_key=True, index=True)
    order_no = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    target_tier = Column(String(20), nullable=False)
    amount = Column(Integer, nullable=False)
    status = Column(String(20), default="pending", nullable=False)
    prepay_id = Column(String(128), nullable=True)
    transaction_id = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    paid_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="payment_orders")


class PushMessage(Base):
    __tablename__ = "push_messages"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    body = Column(Text, nullable=False)
    target_type = Column(String(20), default="all", nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    status = Column(String(20), default="sent", nullable=False)
    created_by = Column(Integer, ForeignKey("admin_users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
