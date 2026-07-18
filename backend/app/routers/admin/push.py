from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...database import get_db
from ...models import AdminUser, PushDevice, PushMessage, User
from ...schemas_admin import AdminPushDeviceOut, AdminPushMessageOut, AdminPushSendRequest
from ...services.push_service import is_fcm_configured, send_push_to_tokens

router = APIRouter(prefix="/admin/push", tags=["admin-push"])


@router.get("/devices", response_model=list[AdminPushDeviceOut])
def list_devices(_: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    rows = (
        db.query(PushDevice, User)
        .join(User, PushDevice.user_id == User.id)
        .order_by(PushDevice.updated_at.desc())
        .limit(200)
        .all()
    )
    return [
        AdminPushDeviceOut(
            id=device.id,
            user_id=device.user_id,
            user_nickname=user.nickname,
            user_phone=user.phone,
            platform=device.platform,
            token_preview=device.token[:24] + "..." if len(device.token) > 24 else device.token,
            updated_at=device.updated_at,
        )
        for device, user in rows
    ]


@router.get("/messages", response_model=list[AdminPushMessageOut])
def list_messages(_: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(PushMessage).order_by(PushMessage.id.desc()).limit(100).all()


@router.post("/send", response_model=AdminPushMessageOut)
def send_push(
    payload: AdminPushSendRequest,
    admin: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    if payload.target_type == "user":
        if not payload.user_id:
            raise HTTPException(status_code=400, detail="请指定用户 ID")
        devices = db.query(PushDevice).filter(PushDevice.user_id == payload.user_id).all()
    else:
        devices = db.query(PushDevice).all()

    tokens = [d.token for d in devices]
    result = send_push_to_tokens(tokens, payload.title, payload.body)

    msg = PushMessage(
        title=payload.title,
        body=payload.body,
        target_type=payload.target_type,
        user_id=payload.user_id if payload.target_type == "user" else None,
        sent_count=result.get("sent_count", 0),
        failed_count=result.get("failed_count", 0),
        status="sent" if result.get("success") or not is_fcm_configured() else "failed",
        created_by=admin.id,
    )
    if not is_fcm_configured() and tokens:
        msg.status = "recorded"
        msg.sent_count = len(tokens)
        msg.failed_count = 0

    db.add(msg)
    db.commit()
    db.refresh(msg)
    return msg
