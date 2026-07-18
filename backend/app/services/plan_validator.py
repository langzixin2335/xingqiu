import re

VALID_TIME_TYPES = {"survival", "money", "beauty", "fun", "flow"}
VAGUE_WORDS = re.compile(r"(坚持|努力|提升|成为更好|自律|加油|不断进步)")
HAS_ACTION = re.compile(
    r"(\d+|分钟|小时|公里|页|次|步|遍|组|天|周|早|晚|睡|读|跑|写|练|冥想|护肤|朗读)"
)


def _clip(text: str, max_len: int) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    return text[:max_len]


def normalize_time_type(value: str, fallback: str = "survival") -> str:
    if value in VALID_TIME_TYPES:
        return value
    mapping = {
        "生存": "survival",
        "赚钱": "money",
        "好看": "beauty",
        "好玩": "fun",
        "心流": "flow",
    }
    for key, tt in mapping.items():
        if key in (value or ""):
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


def validate_phase(phase: dict, index: int) -> dict:
    time_type = normalize_time_type(
        phase.get("time_type", ""),
        ["survival", "money", "beauty", "fun", "flow"][index % 5],
    )
    return {
        "period": _clip(phase.get("period", f"阶段{index + 1}"), 40),
        "goal": _clip(phase.get("goal", ""), 80),
        "action": _clip(phase.get("action", ""), 80),
        "time_type": time_type,
    }


def normalize_plan_bundle(bundle: dict) -> dict:
    understanding = bundle.get("goal_understanding") or {}
    normalized_understanding = {
        "summary": _clip(understanding.get("summary", ""), 200),
        "category": _clip(understanding.get("category", "个人成长"), 30),
        "success_criteria": _clip(understanding.get("success_criteria", ""), 120),
        "weekly_hours": min(10, max(3, int(understanding.get("weekly_hours") or understanding.get("weekly_hours_estimate") or 5))),
        "main_obstacle": _clip(understanding.get("main_obstacle", ""), 80),
    }

    phases = [validate_phase(p, i) for i, p in enumerate(bundle.get("phases") or []) if p.get("goal")]
    phases = [p for p in phases if p["goal"]][:4]

    daily_tasks = []
    for raw in bundle.get("daily_tasks") or []:
        task = validate_daily_task(raw)
        if task:
            daily_tasks.append(task)
    daily_tasks = daily_tasks[:6]

    if not daily_tasks and phases:
        for phase in phases[:3]:
            task = validate_daily_task(
                {
                    "title": phase["action"].split("：", 1)[-1] if "：" in phase["action"] else phase["goal"],
                    "time_type": phase["time_type"],
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
