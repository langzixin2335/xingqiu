from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth_utils import create_access_token, hash_password, verify_password
from ..config import settings
from ..database import get_db
from ..models import SmsCode, User
from ..deps import get_current_user
from ..schemas import (
    LoginRequest,
    RegisterRequest,
    SmsCodeRequest,
    TokenResponse,
    UserOut,
)
from ..services.sms_service import (
    SMS_CODE_EXPIRE_MINUTES,
    generate_sms_code,
    is_sms_configured,
    send_sms_code,
)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/sms-code")
def send_sms_code_api(payload: SmsCodeRequest, db: Session = Depends(get_db)):
    if not is_sms_configured():
        raise HTTPException(status_code=503, detail="短信服务未配置")

    recent = (
        db.query(SmsCode)
        .filter(SmsCode.phone == payload.phone)
        .order_by(SmsCode.created_at.desc())
        .first()
    )
    if recent and recent.created_at > datetime.utcnow() - timedelta(seconds=60):
        raise HTTPException(status_code=429, detail="发送太频繁，请 60 秒后再试")

    code = generate_sms_code()
    try:
        send_sms_code(payload.phone, code)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e

    db.add(SmsCode(phone=payload.phone, code=code))
    db.commit()

    result = {"message": "验证码已发送"}
    if settings.sms_provider == "dev":
        result["dev_code"] = code
    return result


@router.post("/register", response_model=TokenResponse)
def register(payload: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.phone == payload.phone).first():
        raise HTTPException(status_code=400, detail="该手机号已注册")

    sms = (
        db.query(SmsCode)
        .filter(SmsCode.phone == payload.phone)
        .order_by(SmsCode.created_at.desc())
        .first()
    )
    if not sms or sms.code != payload.sms_code:
        raise HTTPException(status_code=400, detail="验证码错误或已过期")

    if sms.created_at < datetime.utcnow() - timedelta(minutes=SMS_CODE_EXPIRE_MINUTES):
        raise HTTPException(status_code=400, detail="验证码已过期，请重新获取")

    user = User(
        phone=payload.phone,
        nickname=payload.nickname,
        password_hash=hash_password(payload.password),
        onboarding_step="welcome",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.phone == payload.phone).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=400, detail="手机号或密码错误")

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
