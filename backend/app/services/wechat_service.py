import secrets
from urllib.parse import quote

import httpx

from ..auth_utils import hash_password
from ..config import settings
from ..models import User
from sqlalchemy.orm import Session


def build_wechat_auth_url(state: str = "shining") -> str | None:
    if not settings.wechat_app_id:
        return None
    redirect = quote(settings.wechat_oauth_redirect, safe="")
    return (
        "https://open.weixin.qq.com/connect/oauth2/authorize"
        f"?appid={settings.wechat_app_id}"
        f"&redirect_uri={redirect}"
        "&response_type=code"
        "&scope=snsapi_userinfo"
        f"&state={state}#wechat_redirect"
    )


async def exchange_wechat_code(code: str) -> dict:
    if settings.wechat_dev_mode and code in ("dev", "test"):
        return {
            "openid": f"dev_openid_{secrets.token_hex(8)}",
            "nickname": "微信用户",
            "headimgurl": "",
        }

    if not settings.wechat_app_id or not settings.wechat_app_secret:
        raise ValueError("微信登录未配置")

    async with httpx.AsyncClient(timeout=30) as client:
        token_resp = await client.get(
            "https://api.weixin.qq.com/sns/oauth2/access_token",
            params={
                "appid": settings.wechat_app_id,
                "secret": settings.wechat_app_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        token_data = token_resp.json()
        if "errcode" in token_data:
            raise ValueError(token_data.get("errmsg", "微信授权失败"))

        openid = token_data["openid"]
        access_token = token_data["access_token"]

        user_resp = await client.get(
            "https://api.weixin.qq.com/sns/userinfo",
            params={"access_token": access_token, "openid": openid, "lang": "zh_CN"},
        )
        user_data = user_resp.json()
        if "errcode" in user_data:
            return {"openid": openid, "nickname": "微信用户", "headimgurl": ""}

        return {
            "openid": openid,
            "nickname": user_data.get("nickname", "微信用户"),
            "headimgurl": user_data.get("headimgurl", ""),
        }


def get_or_create_wechat_user(db: Session, wx_profile: dict) -> User:
    openid = wx_profile["openid"]
    user = db.query(User).filter(User.wechat_openid == openid).first()
    if user:
        return user

    nickname = wx_profile.get("nickname", "微信用户")[:50]
    phone = f"wx{openid[-10:]}".ljust(11, "0")[:11]
    while db.query(User).filter(User.phone == phone).first():
        phone = f"wx{secrets.token_hex(3)}"[:11]

    user = User(
        phone=phone,
        nickname=nickname,
        password_hash=hash_password(secrets.token_urlsafe(16)),
        wechat_openid=openid,
        avatar="👩",
        onboarding_step="welcome",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
