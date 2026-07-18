from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...database import get_db
from ...models import AdminUser, CommunityPost, DailyTask, PaymentOrder, Plan, Product, PushDevice, User
from ...schemas_admin import DashboardStats

router = APIRouter(prefix="/admin/dashboard", tags=["admin-dashboard"])


@router.get("/stats", response_model=DashboardStats)
def get_stats(
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    member_rows = db.query(User.member_tier, func.count(User.id)).group_by(User.member_tier).all()
    return DashboardStats(
        user_count=db.query(User).count(),
        post_count=db.query(CommunityPost).count(),
        product_count=db.query(Product).count(),
        task_count=db.query(DailyTask).count(),
        completed_tasks=db.query(DailyTask).filter(DailyTask.completed == True).count(),
        plan_count=db.query(Plan).count(),
        order_count=db.query(PaymentOrder).count(),
        paid_order_count=db.query(PaymentOrder).filter(PaymentOrder.status == "paid").count(),
        push_device_count=db.query(PushDevice).count(),
        member_tiers={tier: count for tier, count in member_rows},
    )
