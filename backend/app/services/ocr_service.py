import re

from ..config import settings

DEMO_TEXT = (
    "我想在3个月内减重10斤，提升演讲能力。\n"
    "每周运动3次，每天阅读30分钟，每晚护肤打卡。"
)


async def extract_plan_text(file_bytes: bytes, content_type: str, filename: str) -> tuple[str, str]:
    name = (filename or "").lower()
    ctype = (content_type or "").lower()

    if ctype.startswith("text/") or name.endswith(".txt"):
        try:
            return file_bytes.decode("utf-8"), "text"
        except UnicodeDecodeError:
            return file_bytes.decode("gbk", errors="ignore"), "text"

    if name.endswith(".pdf") or ctype == "application/pdf":
        return await _extract_pdf(file_bytes)

    if ctype.startswith("image/") or _is_image_filename(name):
        return await _extract_image(file_bytes)

    if name.endswith(".pdf"):
        return await _extract_pdf(file_bytes)

    return DEMO_TEXT, "demo"


def _is_image_filename(name: str) -> bool:
    return any(name.endswith(ext) for ext in (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"))


async def _extract_image(file_bytes: bytes) -> tuple[str, str]:
    try:
        from .local_ocr_service import is_ocr_available, ocr_image_bytes_async

        if is_ocr_available():
            text, engine = await ocr_image_bytes_async(file_bytes)
            return text, engine
    except Exception:
        pass

    text = await _vision_fallback(file_bytes, "image/jpeg")
    if text:
        return text, "ai-vision"
    return DEMO_TEXT, "demo"


async def _extract_pdf(file_bytes: bytes) -> tuple[str, str]:
    try:
        from .local_ocr_service import extract_pdf_text, is_ocr_available, ocr_pdf_scanned

        text = extract_pdf_text(file_bytes)
        if len(text) >= 4:
            return text, "pypdf"

        if is_ocr_available():
            text, engine = ocr_pdf_scanned(file_bytes)
            return text, f"pdf-{engine}"
    except Exception:
        pass

    return DEMO_TEXT, "demo"


async def _vision_fallback(file_bytes: bytes, content_type: str) -> str:
    api_key, base_url, model = _llm_credentials()
    if not api_key:
        return ""

    import base64

    import httpx

    b64 = base64.b64encode(file_bytes).decode()
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {
                                    "type": "text",
                                    "text": "请识别这张效率手册/计划照片中的文字，只输出原文，不要解释。",
                                },
                                {
                                    "type": "image_url",
                                    "image_url": {"url": f"data:{content_type};base64,{b64}"},
                                },
                            ],
                        }
                    ],
                    "max_tokens": 800,
                },
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"].strip()
    except Exception:
        return ""


def parse_goals_from_text(text: str) -> list[dict]:
    lines = [ln.strip() for ln in re.split(r"[\n；;。]", text) if ln.strip()]
    goals = []
    mapping = [
        (r"运动|跑步|健身|作息|睡眠|减重", "survival", "short"),
        (r"阅读|学习|演讲|课程|赚钱|职业", "money", "medium"),
        (r"护肤|好看|形象|化妆", "beauty", "short"),
        (r"摄影|绘画|玩|兴趣", "fun", "long"),
        (r"冥想|心流|正念", "flow", "short"),
    ]
    for line in lines:
        for pattern, time_type, period in mapping:
            if re.search(pattern, line):
                goals.append({"time_type": time_type, "period": period, "title": line})
                break
    if not goals and text.strip():
        goals.append({"time_type": "survival", "period": "short", "title": text.strip()[:120]})
    return goals


def _llm_credentials() -> tuple[str, str, str]:
    if settings.deepseek_api_key:
        return settings.deepseek_api_key, settings.deepseek_base_url, settings.deepseek_model
    return settings.openai_api_key, settings.openai_base_url, settings.openai_model
