import re

VALID_TIME_TYPES = {"survival", "money", "beauty", "fun", "flow"}
PLANET_LABELS = {
    "survival": "生存星球",
    "money": "赚钱星球",
    "beauty": "好看星球",
    "fun": "好玩星球",
    "flow": "心流星球",
}
VAGUE_WORDS = re.compile(r"(坚持|努力|提升|成为更好|自律|加油|不断进步)")
HAS_ACTION = re.compile(
    r"(\d+|分钟|小时|公里|页|次|步|遍|组|天|周|早|晚|睡|读|跑|写|练|冥想|护肤|朗读)"
)
# 纠正 AI 自造的「XX星球：」前缀
FAKE_PLANET_PREFIX = re.compile(r"^[^：:]{0,12}星球\s*[：:]\s*")


def _clip(text: str, max_len: int) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    return text[:max_len]


def normalize_time_type(value: str, fallback: str = "survival") -> str:
    if value in VALID_TIME_TYPES:
        return value
    text = value or ""
    mapping = {
        "生存": "survival",
        "赚钱": "money",
        "好看": "beauty",
        "好玩": "fun",
        "心流": "flow",
        # AI 偶发自造名 → 归入正式星球
        "阅读": "money",
        "学习": "money",
        "演讲": "fun",
        "表达": "fun",
        "分享": "fun",
        "社交": "fun",
        "运动": "beauty",
        "减肥": "beauty",
        "健身": "beauty",
        "健康": "survival",
        "护肤": "beauty",
        "冥想": "flow",
        "专注": "flow",
    }
    for key, tt in mapping.items():
        if key in text:
            return tt
    return fallback


def validate_daily_task(task: dict) -> dict | None:
    title = _clip(task.get("title", ""), 40)
    if len(title) < 4:
        return None
    if VAGUE_WORDS.search(title) and not HAS_ACTION.search(title):
        return None
    if not HAS_ACTION.search(title):
        return None
    time_type = normalize_time_type(task.get("time_type", ""))
    remind_time = task.get("remind_time", "07:00")
    if not re.match(r"^\d{2}:\d{2}$", str(remind_time)):
        remind_time = "07:00"
    return {
        "title": title,
        "time_type": time_type,
        "remind_time": remind_time,
        "repeat_days": str(task.get("repeat_days", "1,2,3,4,5,6,7")),
        "requires_photo": time_type in {"beauty", "fun"},
    }


def normalize_planet_action(action: str, time_type: str) -> str:
    """保证行动文案只使用五颗正式星球名，纠正「阅读星球/分享星球」等自造名。"""
    text = (action or "").strip()
    label = PLANET_LABELS.get(time_type, "生存星球")
    if not text:
        return f"{label}：轻轻做一件小事"
    # 已是正确前缀
    for planet_label in PLANET_LABELS.values():
        if text.startswith(f"{planet_label}：") or text.startswith(f"{planet_label}:"):
            body = re.split(r"[：:]", text, maxsplit=1)[-1].strip()
            return f"{label}：{body or '轻轻做一件小事'}"
    # 任意「XX星球：」改写成正式星球
    if FAKE_PLANET_PREFIX.match(text) or "星球" in text[:12]:
        body = FAKE_PLANET_PREFIX.sub("", text).strip()
        if not body and "：" in text:
            body = text.split("：", 1)[-1].strip()
        elif not body and ":" in text:
            body = text.split(":", 1)[-1].strip()
        return f"{label}：{body or '轻轻做一件小事'}"
    return f"{label}：{text}"


def validate_phase(phase: dict, index: int, forced_time_type: str | None = None) -> dict:
    fallback = forced_time_type or "survival"
    time_type = normalize_time_type(phase.get("time_type", ""), fallback)
    if forced_time_type in VALID_TIME_TYPES:
        time_type = forced_time_type
    action_raw = phase.get("action", "") or ""
    return {
        "period": _clip(phase.get("period", f"阶段{index + 1}"), 40),
        "goal": _clip(phase.get("goal", ""), 80),
        "action": _clip(normalize_planet_action(action_raw, time_type), 80),
        "time_type": time_type,
    }


def normalize_plan_bundle(bundle: dict, primary_time_type: str | None = None) -> dict:
    understanding = bundle.get("goal_understanding") or {}
    primary = normalize_time_type(
        primary_time_type
        or understanding.get("primary_time_type")
        or (understanding.get("time_types_needed") or [None])[0]
        or "",
        "money",
    )
    normalized_understanding = {
        "summary": _clip(understanding.get("summary", ""), 200),
        "category": _clip(understanding.get("category", "个人成长"), 30),
        "success_criteria": _clip(understanding.get("success_criteria", ""), 120),
        "weekly_hours": min(10, max(3, int(understanding.get("weekly_hours") or understanding.get("weekly_hours_estimate") or 5))),
        "main_obstacle": _clip(understanding.get("main_obstacle", ""), 80),
        "primary_time_type": primary,
    }

    phases = [
        validate_phase(p, i, forced_time_type=primary)
        for i, p in enumerate(bundle.get("phases") or [])
        if p.get("goal")
    ]
    phases = [p for p in phases if p["goal"]][:4]

    daily_tasks = []
    for raw in bundle.get("daily_tasks") or []:
        patched = {**raw, "time_type": primary}
        task = validate_daily_task(patched)
        if task:
            daily_tasks.append(task)
    daily_tasks = daily_tasks[:6]

    if not daily_tasks and phases:
        for phase in phases[:3]:
            task = validate_daily_task(
                {
                    "title": phase["action"].split("：", 1)[-1] if "：" in phase["action"] else phase["goal"],
                    "time_type": primary,
                    "remind_time": "07:00",
                }
            )
            if task:
                daily_tasks.append(task)

    return {
        "goal_understanding": normalized_understanding,
        "phases": phases,
        "daily_tasks": daily_tasks,
    }
