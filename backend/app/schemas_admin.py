from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminOut(BaseModel):
    id: int
    username: str
    nickname: str

    class Config:
        from_attributes = True


class AdminTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: AdminOut


class DashboardStats(BaseModel):
    user_count: int
    post_count: int
    product_count: int
    task_count: int
    completed_tasks: int
    plan_count: int
    order_count: int
    paid_order_count: int
    push_device_count: int
    member_tiers: dict[str, int]


class AdminUserListItem(BaseModel):
    id: int
    phone: str
    nickname: str
    personality: Optional[str] = None
    onboarding_step: str
    member_tier: str
    created_at: datetime

    class Config:
        from_attributes = True


class AdminUserUpdate(BaseModel):
    nickname: Optional[str] = None
    member_tier: Optional[str] = None
    onboarding_step: Optional[str] = None
    personality: Optional[str] = None


class AdminPostListItem(BaseModel):
    id: int
    author_name: str
    content: str
    task_title: str
    time_type: str
    likes_count: int
    comments_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class AdminPostCreate(BaseModel):
    author_name: str
    avatar: str = "👩"
    content: str
    task_title: str
    time_type: str = "survival"


class AdminProductIn(BaseModel):
    name: str
    description: str = ""
    category: str
    subcategory: str
    badge: Optional[str] = None
    emoji: str = "📦"


class AdminProductOut(AdminProductIn):
    id: int

    class Config:
        from_attributes = True


class AdminOrderListItem(BaseModel):
    id: int
    order_no: str
    user_id: int
    user_phone: str
    user_nickname: str
    target_tier: str
    amount: int
    status: str
    transaction_id: Optional[str] = None
    created_at: datetime
    paid_at: Optional[datetime] = None


class AdminOrderUpdate(BaseModel):
    status: Optional[str] = Field(default=None, pattern=r"^(pending|paid|cancelled|refunded)$")


class AdminPushSendRequest(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    body: str = Field(min_length=1, max_length=500)
    target_type: str = Field(default="all", pattern=r"^(all|user)$")
    user_id: Optional[int] = None


class AdminPushMessageOut(BaseModel):
    id: int
    title: str
    body: str
    target_type: str
    user_id: Optional[int] = None
    sent_count: int
    failed_count: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


class AdminPushDeviceOut(BaseModel):
    id: int
    user_id: int
    user_nickname: str
    user_phone: str
    platform: str
    token_preview: str
    updated_at: datetime
