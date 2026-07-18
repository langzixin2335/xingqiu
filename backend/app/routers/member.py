from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import PaymentOrder, User
from ..schemas import (
    MemberUpgradeRequest,
    PaymentConfirmRequest,
    PaymentOrderCreateRequest,
    PaymentOrderOut,
    UserOut,
)
from ..services.wechat_pay_service import (
    TIER_ORDER,
    calc_upgrade_amount,
    create_jsapi_order,
    create_wechat_pay_params,
    decrypt_notify_resource,
    generate_order_no,
    is_wechat_pay_configured,
)

router = APIRouter(prefix="/member", tags=["member"])

TIER_PRICES = {"萌芽": 87, "星耀": 297, "星球女王": 897}
BENEFITS = {"萌芽": 2, "星耀": 4, "星球女王": 6}


@router.get("/info")
def member_info(current_user: User = Depends(get_current_user)):
    from ..schemas import MemberInfoOut

    tier = current_user.member_tier
    return MemberInfoOut(
        tier=tier,
        expire=current_user.member_expire or "2026-12-31",
        benefits_unlocked=BENEFITS.get(tier, 2),
        benefits_total=6,
        price_quarterly=TIER_PRICES.get(tier, 87),
    )


def _validate_upgrade(current_user: User, target_tier: str) -> int:
    current_idx = TIER_ORDER.index(current_user.member_tier) if current_user.member_tier in TIER_ORDER else 0
    target_idx = TIER_ORDER.index(target_tier)
    if target_idx <= current_idx:
        raise HTTPException(status_code=400, detail="只能升级到更高等级")
    return calc_upgrade_amount(current_user.member_tier, target_tier)


def _apply_upgrade(user: User, target_tier: str, db: Session) -> User:
    user.member_tier = target_tier
    db.commit()
    db.refresh(user)
    return user


def _mark_order_paid(order: PaymentOrder, db: Session, transaction_id: str | None = None) -> User:
    order.status = "paid"
    order.paid_at = datetime.utcnow()
    if transaction_id:
        order.transaction_id = transaction_id
    user = db.query(User).filter(User.id == order.user_id).first()
    if user:
        user.member_tier = order.target_tier
    db.commit()
    db.refresh(user)
    return user


@router.post("/create-order", response_model=PaymentOrderOut)
def create_payment_order(
    payload: PaymentOrderCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    amount = _validate_upgrade(current_user, payload.target_tier)
    order_no = generate_order_no()
    order = PaymentOrder(
        order_no=order_no,
        user_id=current_user.id,
        target_tier=payload.target_tier,
        amount=amount,
        status="pending",
    )
    db.add(order)
    db.commit()

    dev_mode = not is_wechat_pay_configured()
    pay_params = None

    if not dev_mode:
        if not current_user.wechat_openid:
            raise HTTPException(status_code=400, detail="请先使用微信登录后再支付")
        try:
            prepay_id = create_jsapi_order(
                order_no=order_no,
                amount_yuan=amount,
                openid=current_user.wechat_openid,
                description=f"闪耀星球会员升级-{payload.target_tier}",
            )
            order.prepay_id = prepay_id
            db.commit()
            pay_params = create_wechat_pay_params(order_no, amount, current_user.wechat_openid, prepay_id)
        except RuntimeError as e:
            raise HTTPException(status_code=502, detail=str(e)) from e

    return PaymentOrderOut(
        order_no=order_no,
        amount=amount,
        target_tier=payload.target_tier,
        dev_mode=dev_mode,
        message="演示模式：确认后将直接完成升级" if dev_mode else "请完成微信支付",
        pay_params=pay_params,
    )


@router.post("/confirm-order", response_model=UserOut)
def confirm_payment_order(
    payload: PaymentConfirmRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = (
        db.query(PaymentOrder)
        .filter(PaymentOrder.order_no == payload.order_no, PaymentOrder.user_id == current_user.id)
        .first()
    )
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status == "paid":
        db.refresh(current_user)
        return UserOut.model_validate(current_user)
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="订单状态异常")

    if not is_wechat_pay_configured():
        user = _mark_order_paid(order, db)
        return UserOut.model_validate(user)

    raise HTTPException(status_code=400, detail="请完成微信支付后等待回调确认")


@router.post("/pay/notify")
async def wechat_pay_notify(request: Request, db: Session = Depends(get_db)):
    """微信支付 V3 结果回调"""
    if not is_wechat_pay_configured():
        return Response(content='{"code":"SUCCESS","message":"dev mode"}', media_type="application/json")

    try:
        body = await request.json()
        resource = body.get("resource", {})
        data = decrypt_notify_resource(resource)
    except Exception:
        return Response(
            content='{"code":"FAIL","message":"decrypt error"}',
            status_code=400,
            media_type="application/json",
        )

    if data.get("trade_state") != "SUCCESS":
        return Response(content='{"code":"SUCCESS","message":"ignored"}', media_type="application/json")

    order_no = data.get("out_trade_no")
    transaction_id = data.get("transaction_id")
    order = db.query(PaymentOrder).filter(PaymentOrder.order_no == order_no).first()
    if order and order.status == "pending":
        _mark_order_paid(order, db, transaction_id)

    return Response(content='{"code":"SUCCESS","message":"成功"}', media_type="application/json")


@router.post("/upgrade", response_model=UserOut)
def upgrade_member(
    payload: MemberUpgradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """兼容旧接口：演示模式下直接升级"""
    _validate_upgrade(current_user, payload.target_tier)
    if is_wechat_pay_configured():
        raise HTTPException(status_code=400, detail="请使用 /member/create-order 创建支付订单")
    user = _apply_upgrade(current_user, payload.target_tier, db)
    return UserOut.model_validate(user)
