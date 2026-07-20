from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Product, User, UserProduct, UserReward
from ..schemas import RewardCreateRequest, RewardOut

router = APIRouter(prefix="/rewards", tags=["rewards"])


@router.get("", response_model=list[RewardOut])
def list_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(UserReward)
        .filter(UserReward.user_id == current_user.id)
        .order_by(UserReward.id)
        .all()
    )


@router.post("", response_model=RewardOut)
def add_reward(
    payload: RewardCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    # 同名已获得奖励不重复写入
    existing = (
        db.query(UserReward)
        .filter(
            UserReward.user_id == current_user.id,
            UserReward.name == payload.name,
            UserReward.status == "unlocked",
        )
        .first()
    )
    if existing and payload.status == "unlocked":
        return existing

    reward = UserReward(
        user_id=current_user.id,
        name=payload.name,
        description=payload.description or "自定义奖励",
        status=payload.status or "locked",
    )
    db.add(reward)
    db.commit()
    db.refresh(reward)
    return reward


@router.post("/products/{product_id}/add")
def add_product_to_plan(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return {"message": "产品不存在"}
    existing = (
        db.query(UserProduct)
        .filter(UserProduct.user_id == current_user.id, UserProduct.product_id == product_id)
        .first()
    )
    if existing:
        db.delete(existing)
        db.commit()
        return {"added": False, "message": "已取消加入"}
    db.add(UserProduct(user_id=current_user.id, product_id=product_id))
    db.commit()
    return {"added": True, "message": f"「{product.name}」已加入计划"}
