import hashlib
import hmac
import json
import secrets
import urllib.parse
from datetime import datetime
from uuid import uuid4

import httpx

from ..config import settings

SMS_CODE_EXPIRE_MINUTES = 5


def generate_sms_code() -> str:
    if settings.sms_provider == "dev":
        return settings.dev_sms_code
    return f"{secrets.randbelow(1_000_000):06d}"


def is_sms_configured() -> bool:
    provider = settings.sms_provider
    if provider == "dev":
        return True
    if provider == "aliyun":
        return bool(
            settings.aliyun_access_key_id
            and settings.aliyun_access_key_secret
            and settings.aliyun_sms_sign_name
            and settings.aliyun_sms_template_code
        )
    if provider == "tencent":
        return bool(
            settings.tencent_secret_id
            and settings.tencent_secret_key
            and settings.tencent_sms_app_id
            and settings.tencent_sms_sign_name
            and settings.tencent_sms_template_id
        )
    return False


def send_sms_code(phone: str, code: str) -> None:
    provider = settings.sms_provider
    if provider == "dev":
        return
    if provider == "aliyun":
        _send_aliyun(phone, code)
        return
    if provider == "tencent":
        _send_tencent(phone, code)
        return
    raise RuntimeError(f"不支持的短信通道: {provider}")


def _percent_encode(value: str) -> str:
    return urllib.parse.quote(str(value), safe="~")


def _aliyun_sign(params: dict, secret: str) -> str:
    sorted_params = sorted(params.items())
    canonical = "&".join(f"{_percent_encode(k)}={_percent_encode(v)}" for k, v in sorted_params)
    string_to_sign = f"GET&%2F&{_percent_encode(canonical)}"
    digest = hmac.new((secret + "&").encode(), string_to_sign.encode(), hashlib.sha1).digest()
    import base64

    return base64.b64encode(digest).decode()


def _send_aliyun(phone: str, code: str) -> None:
    params = {
        "AccessKeyId": settings.aliyun_access_key_id,
        "Action": "SendSms",
        "Format": "JSON",
        "PhoneNumbers": phone,
        "RegionId": settings.aliyun_sms_region,
        "SignName": settings.aliyun_sms_sign_name,
        "SignatureMethod": "HMAC-SHA1",
        "SignatureNonce": uuid4().hex,
        "SignatureVersion": "1.0",
        "TemplateCode": settings.aliyun_sms_template_code,
        "TemplateParam": json.dumps({"code": code}, ensure_ascii=False),
        "Timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
        "Version": "2017-05-25",
    }
    params["Signature"] = _aliyun_sign(params, settings.aliyun_access_key_secret)
    url = f"https://dysmsapi.aliyuncs.com/?{urllib.parse.urlencode(params)}"
    with httpx.Client(timeout=15) as client:
        resp = client.get(url)
        data = resp.json()
        if data.get("Code") != "OK":
            raise RuntimeError(data.get("Message") or "阿里云短信发送失败")


def _send_tencent(phone: str, code: str) -> None:
    import hashlib
    import hmac
    import time

    host = "sms.tencentcloudapi.com"
    service = "sms"
    action = "SendSms"
    version = "2021-01-11"
    timestamp = int(time.time())
    date = datetime.utcfromtimestamp(timestamp).strftime("%Y-%m-%d")

    body = {
        "PhoneNumberSet": [f"+86{phone}"],
        "SmsSdkAppId": settings.tencent_sms_app_id,
        "SignName": settings.tencent_sms_sign_name,
        "TemplateId": settings.tencent_sms_template_id,
        "TemplateParamSet": [code],
    }
    payload = json.dumps(body, ensure_ascii=False)
    canonical_request = (
        "POST\n/\n\ncontent-type:application/json; charset=utf-8\n"
        f"host:{host}\n\ncontent-type;host\n"
        f"{hashlib.sha256(payload.encode()).hexdigest()}"
    )
    credential_scope = f"{date}/{service}/tc3_request"
    string_to_sign = (
        "TC3-HMAC-SHA256\n"
        f"{timestamp}\n"
        f"{credential_scope}\n"
        f"{hashlib.sha256(canonical_request.encode()).hexdigest()}"
    )

    def _hmac_sha256(key: bytes, msg: str) -> bytes:
        return hmac.new(key, msg.encode(), hashlib.sha256).digest()

    secret_date = _hmac_sha256(f"TC3{settings.tencent_secret_key}".encode(), date)
    secret_service = _hmac_sha256(secret_date, service)
    secret_signing = _hmac_sha256(secret_service, "tc3_request")
    signature = hmac.new(secret_signing, string_to_sign.encode(), hashlib.sha256).hexdigest()

    authorization = (
        "TC3-HMAC-SHA256 "
        f"Credential={settings.tencent_secret_id}/{credential_scope}, "
        "SignedHeaders=content-type;host, "
        f"Signature={signature}"
    )
    headers = {
        "Authorization": authorization,
        "Content-Type": "application/json; charset=utf-8",
        "Host": host,
        "X-TC-Action": action,
        "X-TC-Timestamp": str(timestamp),
        "X-TC-Version": version,
        "X-TC-Region": settings.tencent_sms_region,
    }
    with httpx.Client(timeout=15) as client:
        resp = client.post(f"https://{host}", content=payload.encode("utf-8"), headers=headers)
        data = resp.json()
        if data.get("Response", {}).get("Error"):
            err = data["Response"]["Error"]
            raise RuntimeError(err.get("Message") or "腾讯云短信发送失败")
