from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import PushDevice, User
from ..schemas import PushRegisterRequest

router = APIRouter(prefix="/push", tags=["push"])


@router.post("/register")
def register_push_token(
    payload: PushRegisterRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    device = (
        db.query(PushDevice)
        .filter(PushDevice.user_id == current_user.id, PushDevice.platform == payload.platform)
        .first()
    )
    if device:
        device.token = payload.token
    else:
        db.add(PushDevice(user_id=current_user.id, platform=payload.platform, token=payload.token))
    db.commit()
    return {"message": "推送 Token 已注册"}


@router.delete("/unregister")
def unregister_push_token(
    platform: str = "android",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    db.query(PushDevice).filter(
        PushDevice.user_id == current_user.id,
        PushDevice.platform == platform,
    ).delete()
    db.commit()
    return {"message": "推送 Token 已移除"}
