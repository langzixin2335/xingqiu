from datetime import datetime
import base64
import json
import secrets
import time
from typing import Optional

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

from ..config import settings

TIER_PRICES = {"萌芽": 87, "星耀": 297, "星球女王": 897}
TIER_ORDER = ["萌芽", "星耀", "星球女王"]
WECHAT_API_BASE = "https://api.mch.weixin.qq.com"


def generate_order_no() -> str:
    return f"SP{datetime.utcnow().strftime('%Y%m%d%H%M%S')}{secrets.token_hex(4).upper()}"


def calc_upgrade_amount(current_tier: str, target_tier: str) -> int:
    return TIER_PRICES[target_tier] - TIER_PRICES.get(current_tier, 0)


def is_wechat_pay_configured() -> bool:
    return bool(
        settings.wechat_app_id
        and settings.wechat_mch_id
        and settings.wechat_pay_api_v3_key
        and settings.wechat_mch_serial_no
        and _load_private_key() is not None
    )


def _load_private_key():
    key_content = settings.wechat_mch_private_key
    if not key_content and settings.wechat_mch_private_key_path:
        with open(settings.wechat_mch_private_key_path, encoding="utf-8") as f:
            key_content = f.read()
    if not key_content:
        return None
    key_content = key_content.replace("\\n", "\n")
    return serialization.load_pem_private_key(key_content.encode(), password=None)


def _sign_message(message: str) -> str:
    private_key = _load_private_key()
    if not private_key:
        raise RuntimeError("未配置微信商户私钥")
    signature = private_key.sign(message.encode(), padding.PKCS1v15(), hashes.SHA256())
    return base64.b64encode(signature).decode()


def _build_authorization(method: str, url_path: str, body: str = "") -> str:
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)
    sign_str = f"{method}\n{url_path}\n{timestamp}\n{nonce}\n{body}\n"
    signature = _sign_message(sign_str)
    return (
        f'WECHATPAY2-SHA256-RSA2048 mchid="{settings.wechat_mch_id}",'
        f'nonce_str="{nonce}",signature="{signature}",'
        f'timestamp="{timestamp}",serial_no="{settings.wechat_mch_serial_no}"'
    )


def create_jsapi_order(order_no: str, amount_yuan: int, openid: str, description: str) -> str:
    """调用微信 V3 统一下单（JSAPI），返回 prepay_id"""
    url_path = "/v3/pay/transactions/jsapi"
    payload = {
        "appid": settings.wechat_app_id,
        "mchid": settings.wechat_mch_id,
        "description": description,
        "out_trade_no": order_no,
        "notify_url": settings.wechat_pay_notify_url,
        "amount": {"total": amount_yuan * 100, "currency": "CNY"},
        "payer": {"openid": openid},
    }
    body = json.dumps(payload, ensure_ascii=False)
    headers = {
        "Authorization": _build_authorization("POST", url_path, body),
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    with httpx.Client(timeout=30) as client:
        resp = client.post(f"{WECHAT_API_BASE}{url_path}", content=body.encode("utf-8"), headers=headers)
        if resp.status_code >= 400:
            raise RuntimeError(f"微信下单失败: {resp.status_code} {resp.text}")
        return resp.json()["prepay_id"]


def build_jsapi_pay_params(prepay_id: str) -> dict:
    """生成前端调起微信支付所需参数"""
    timestamp = str(int(time.time()))
    nonce = secrets.token_hex(16)
    package = f"prepay_id={prepay_id}"
    sign_str = f"{settings.wechat_app_id}\n{timestamp}\n{nonce}\n{package}\n"
    return {
        "appId": settings.wechat_app_id,
        "timeStamp": timestamp,
        "nonceStr": nonce,
        "package": package,
        "signType": "RSA",
        "paySign": _sign_message(sign_str),
    }


def create_wechat_pay_params(order_no: str, amount: int, openid: str, prepay_id: Optional[str] = None) -> dict:
    if not is_wechat_pay_configured():
        return {}
    if not prepay_id:
        prepay_id = create_jsapi_order(
            order_no=order_no,
            amount_yuan=amount,
            openid=openid,
            description="闪耀星球会员升级",
        )
    return build_jsapi_pay_params(prepay_id)


def decrypt_notify_resource(resource: dict) -> dict:
    """解密微信支付 V3 回调 resource 字段"""
    api_key = settings.wechat_pay_api_v3_key
    nonce = resource["nonce"].encode()
    ciphertext = base64.b64decode(resource["ciphertext"])
    associated_data = resource.get("associated_data", "").encode()
    plain = AESGCM(api_key.encode()).decrypt(nonce, ciphertext, associated_data)
    return json.loads(plain.decode())
