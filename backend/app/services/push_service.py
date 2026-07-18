import json
from typing import Optional

import httpx

from ..config import settings


def is_fcm_configured() -> bool:
    return bool(settings.fcm_server_key)


def send_push_to_token(token: str, title: str, body: str, data: Optional[dict] = None) -> dict:
    """通过 FCM Legacy HTTP API 发送推送（Capacitor Android 常用）"""
    if not is_fcm_configured():
        return {"success": False, "message": "未配置 FCM_SERVER_KEY，推送仅记录不发送"}

    payload = {
        "to": token,
        "notification": {"title": title, "body": body, "sound": "default"},
        "priority": "high",
    }
    if data:
        payload["data"] = data

    with httpx.Client(timeout=15) as client:
        resp = client.post(
            "https://fcm.googleapis.com/fcm/send",
            headers={
                "Authorization": f"key={settings.fcm_server_key}",
                "Content-Type": "application/json",
            },
            content=json.dumps(payload, ensure_ascii=False).encode("utf-8"),
        )
        result = resp.json()
        success = resp.status_code == 200 and result.get("success", 0) > 0
        return {
            "success": success,
            "message": "发送成功" if success else result.get("results", result),
            "fcm_response": result,
        }


def send_push_to_tokens(tokens: list[str], title: str, body: str, data: Optional[dict] = None) -> dict:
    if not tokens:
        return {"success": False, "message": "无可用设备 Token", "sent_count": 0, "failed_count": 0}

    sent = 0
    failed = 0
    details = []
    for token in tokens:
        result = send_push_to_token(token, title, body, data)
        if result.get("success"):
            sent += 1
        else:
            failed += 1
        details.append({"token": token[:16] + "...", "result": result})

    return {
        "success": sent > 0,
        "message": f"成功 {sent} 条，失败 {failed} 条",
        "sent_count": sent,
        "failed_count": failed,
        "details": details,
    }
