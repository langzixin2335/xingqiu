from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...database import get_db
from ...models import AdminUser, PaymentOrder, User
from ...schemas_admin import AdminOrderListItem, AdminOrderUpdate

router = APIRouter(prefix="/admin/orders", tags=["admin-orders"])

STATUS_LABELS = {"pending": "待支付", "paid": "已支付", "cancelled": "已取消", "refunded": "已退款"}


@router.get("", response_model=list[AdminOrderListItem])
def list_orders(
    status: str = Query(default=""),
    q: str = Query(default=""),
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(PaymentOrder, User).join(User, PaymentOrder.user_id == User.id).order_by(PaymentOrder.id.desc())
    if status:
        query = query.filter(PaymentOrder.status == status)
    if q:
        like = f"%{q}%"
        query = query.filter(
            (PaymentOrder.order_no.like(like)) | (User.phone.like(like)) | (User.nickname.like(like))
        )
    rows = query.limit(200).all()
    return [
        AdminOrderListItem(
            id=order.id,
            order_no=order.order_no,
            user_id=order.user_id,
            user_phone=user.phone,
            user_nickname=user.nickname,
            target_tier=order.target_tier,
            amount=order.amount,
            status=order.status,
            transaction_id=order.transaction_id,
            created_at=order.created_at,
            paid_at=order.paid_at,
        )
        for order, user in rows
    ]


@router.patch("/{order_id}", response_model=AdminOrderListItem)
def update_order(
    order_id: int,
    payload: AdminOrderUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    order = db.query(PaymentOrder).filter(PaymentOrder.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    user = db.query(User).filter(User.id == order.user_id).first()
    if payload.status:
        order.status = payload.status
        if payload.status == "paid" and not order.paid_at:
            order.paid_at = datetime.utcnow()
            if user:
                user.member_tier = order.target_tier
        if payload.status in ("cancelled", "refunded") and order.paid_at:
            order.paid_at = None

    db.commit()
    db.refresh(order)

    return AdminOrderListItem(
        id=order.id,
        order_no=order.order_no,
        user_id=order.user_id,
        user_phone=user.phone if user else "",
        user_nickname=user.nickname if user else "",
        target_tier=order.target_tier,
        amount=order.amount,
        status=order.status,
        transaction_id=order.transaction_id,
        created_at=order.created_at,
        paid_at=order.paid_at,
    )
