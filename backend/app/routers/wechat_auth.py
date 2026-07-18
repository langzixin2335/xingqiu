from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth_utils import create_access_token
from ..config import settings
from ..database import get_db
from ..schemas import TokenResponse, UserOut, WechatAuthUrlResponse, WechatLoginRequest
from ..services.wechat_service import (
    build_wechat_auth_url,
    exchange_wechat_code,
    get_or_create_wechat_user,
)

router = APIRouter(prefix="/auth/wechat", tags=["auth-wechat"])


@router.get("/auth-url", response_model=WechatAuthUrlResponse)
def get_wechat_auth_url():
    url = build_wechat_auth_url()
    if url:
        return WechatAuthUrlResponse(url=url, dev_mode=False, message="请在微信内打开链接授权")
    return WechatAuthUrlResponse(
        url=None,
        dev_mode=settings.wechat_dev_mode,
        message="开发模式：可直接使用模拟微信登录",
    )


@router.post("/login", response_model=TokenResponse)
async def wechat_login(payload: WechatLoginRequest, db: Session = Depends(get_db)):
    try:
        profile = await exchange_wechat_code(payload.code)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    user = get_or_create_wechat_user(db, profile)
    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))
