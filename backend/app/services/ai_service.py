import json
import logging
import re

import httpx

from ..config import settings
from .companion import companion_chat_system, companion_encourage_system, get_companion
from .plan_validator import normalize_plan_bundle, normalize_time_type

logger = logging.getLogger(__name__)

PERSONALITY_HINTS = {
    "wood": "生发成长、共情与创造，适合从帮助他人和创造表达入手",
    "fire": "热情表达、传播与行动，适合高频输出和社交练习",
    "earth": "稳重承载、守信与协调，适合规律节奏和可持续计划",
    "metal": "理性决断、正义与执行，适合目标拆解和强执行",
    "water": "通透洞察、策略与变通，适合复盘优化和深度思考",
}

UNDERSTAND_SYSTEM = """你是趁早「闪耀星球」的目标分析师。先准确理解用户真正想达成什么，不要直接给任务。
输出严格 JSON 对象（不要 markdown），字段：
- summary: 用一句话复述用户真正目标（具体、可验证）
- category: 目标类型（如：身体健康/演讲表达/职业技能/形象管理/兴趣爱好/心理状态）
- success_criteria: 周期结束时的可验证成果（含数字或明确行为）
- weekly_hours: 每周可投入小时数（整数，保守估计，3-10）
- main_obstacle: 最可能阻碍执行的1个原因
- primary_time_type: 用户目标主要归属的一颗星球，只能从 survival/money/beauty/fun/flow 中选 1 个
  （生存=作息睡眠饮食养生；赚钱=学习考证事业赚钱；好看=减肥健身塑形护肤穿搭形象；好玩=兴趣社交演讲表达才艺；心流=冥想专注情绪）
  对照示例：早睡/作息→survival；英语/考证→money；减肥/健身/护肤→beauty；演讲/摄影/旅行→fun；冥想/焦虑→flow
- 不要把一个目标拆成多颗星球；全部阶段必须使用同一颗主星球"""

PLAN_SYSTEM = """你是趁早「闪耀星球」成长教练。基于「目标理解」生成分阶段计划，以及贯穿全程的每日习惯任务。
规则：
1. 先使用目标理解里的 primary_time_type（主星球）。整个计划只围绕这一颗星球展开，不要拆成五颗星球
2. phases 共4个阶段：启动期→积累期→突破期→绽放期；全部阶段的 time_type 必须相同，都等于主星球
3. 每条 phase.action 必须写「主星球中文名：具体行为」，例如「赚钱星球：每晚阅读20分钟」
4. 星球中文名对照（禁止自造星球名）：
   - survival → 生存星球
   - money → 赚钱星球
   - beauty → 好看星球
   - fun → 好玩星球
   - flow → 心流星球
5. daily_tasks 3-5条，全部属于同一主星球；是贯穿全程的每日习惯，不是只做首周
6. 不同时刻的同类练习仍属同一星球（晨读/夜读都算赚钱星球），不要按时段拆星球
7. 每条任务含动作+时长/次数；禁止空话；贴合每日可支配时间与 weekly_hours
8. 必须与用户目标强相关

输出严格 JSON 对象（不要 markdown）：
{
  "phases": [{"period":"","goal":"","action":"赚钱星球：具体行为","time_type":"money"}],
  "daily_tasks": [{"title":"","time_type":"money","remind_time":"HH:MM","repeat_days":"1,2,3,4,5,6,7","requires_photo":false}]
}"""


def _llm_credentials() -> tuple[str, str, str]:
    if settings.deepseek_api_key:
        return settings.deepseek_api_key, settings.deepseek_base_url, settings.deepseek_model
    return settings.openai_api_key, settings.openai_base_url, settings.openai_model


def _parse_json_content(content: str) -> dict | list | None:
    text = (content or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text)
    match = re.search(r"(\{[\s\S]*\}|\[[\s\S]*\])", text)
    if not match:
        return None
    return json.loads(match.group(1))


async def _chat_json(system: str, user: str, temperature: float = 0.35) -> dict | list | None:
    api_key, base_url, model = _llm_credentials()
    if not api_key:
        logger.warning("未配置 DEEPSEEK_API_KEY，无法调用 AI")
        return None
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        content = resp.json()["choices"][0]["message"]["content"]
        return _parse_json_content(content)


def _infer_primary_time_type(goal: str) -> str:
    text = goal or ""
    rules = (
        ("beauty", ("减肥", "健身", "塑形", "瘦身", "体重", "运动", "跑步", "护肤", "穿搭", "仪容", "化妆", "形象", "好看", "美妆", "发型")),
        ("survival", ("作息", "睡眠", "饮食", "早起", "养生", "戒烟", "戒酒")),
        ("fun", ("兴趣", "旅行", "社交", "摄影", "玩", "爱好", "演讲", "表达", "朗读", "口才", "唱歌", "画画")),
        ("flow", ("冥想", "正念", "专注", "心流", "复盘", "情绪", "焦虑", "心理")),
        ("money", ("学习", "阅读", "考试", "技能", "工作", "赚钱", "英语", "考证", "副业", "写作")),
    )
    for time_type, keys in rules:
        if any(k in text for k in keys):
            return time_type
    return "money"


def _template_bundle(goal: str, duration: str, personality: str | None) -> dict:
    hint = PERSONALITY_HINTS.get(personality or "", "持续积累")
    planet = _infer_primary_time_type(goal)
    label = {
        "survival": "生存星球",
        "money": "赚钱星球",
        "beauty": "好看星球",
        "fun": "好玩星球",
        "flow": "心流星球",
    }[planet]
    return normalize_plan_bundle(
        {
            "goal_understanding": {
                "summary": f"在{duration}内围绕「{goal}」建立可坚持的成长节奏",
                "category": "个人成长",
                "success_criteria": f"完成阶段性成果并复盘（与「{goal}」直接相关）",
                "weekly_hours": 5,
                "main_obstacle": "时间碎片化、容易中断",
                "primary_time_type": planet,
            },
            "phases": [
                {
                    "period": "第1-2周 · 启动期",
                    "goal": f"为「{goal}」建立每日微习惯",
                    "action": f"{label}：每晚固定一段专项练习（{hint}）",
                    "time_type": planet,
                },
                {
                    "period": "第3-4周 · 积累期",
                    "goal": "每周加练并记录一点点进步",
                    "action": f"{label}：按节奏完成专项练习并留痕",
                    "time_type": planet,
                },
                {
                    "period": "第2个月 · 突破期",
                    "goal": "完成一次可见成果输出",
                    "action": f"{label}：做一次稍有挑战的实战练习",
                    "time_type": planet,
                },
                {
                    "period": f"{duration} · 绽放期",
                    "goal": f"达成「{goal}」阶段性目标并复盘",
                    "action": f"{label}：完成一次复盘，确认习惯留下",
                    "time_type": planet,
                },
            ],
            "daily_tasks": [
                {
                    "title": "今晚做一小段专项练习",
                    "time_type": planet,
                    "remind_time": "21:00",
                    "repeat_days": "1,2,3,4,5,6,7",
                },
                {
                    "title": "用片刻时间推进目标相关练习",
                    "time_type": planet,
                    "remind_time": "08:00",
                    "repeat_days": "1,2,3,4,5",
                },
                {
                    "title": "睡前花几分钟复盘今天",
                    "time_type": planet,
                    "remind_time": "22:00",
                    "repeat_days": "1,2,3,4,5,6,7",
                },
            ],
        }
    )


async def generate_plan_phases(
    goal: str,
    duration: str = "3个月",
    personality: str | None = None,
    daily_time_budget: str = "30-60分钟",
) -> tuple[dict, str]:
    """两步：理解目标 → 生成阶段与每日任务。返回完整 bundle 与 source。"""
    personality_hint = PERSONALITY_HINTS.get(personality or "", "未知")
    budget = (daily_time_budget or "30-60分钟").strip() or "30-60分钟"

    try:
        understanding = await _chat_json(
            UNDERSTAND_SYSTEM,
            f"用户原始目标：{goal}\n期望周期：{duration}\n每日可支配时间：{budget}\n人格特质：{personality_hint}",
            temperature=0.3,
        )
        if not isinstance(understanding, dict):
            raise ValueError("understanding parse failed")

        primary = normalize_time_type(
            understanding.get("primary_time_type")
            or (understanding.get("time_types_needed") or [None])[0]
            or "",
            _infer_primary_time_type(goal),
        )
        understanding["primary_time_type"] = primary

        plan_raw = await _chat_json(
            PLAN_SYSTEM,
            "目标理解：\n"
            f"{json.dumps(understanding, ensure_ascii=False)}\n\n"
            f"期望周期：{duration}\n每日可支配时间：{budget}\n"
            f"人格特质：{personality_hint}\n"
            f"原始目标：{goal}\n"
            f"主星球（唯一）：{primary}\n"
            "请只围绕这一颗主星球生成全部阶段与每日任务，不要拆到其他星球。"
            "严格按每日可支配时间控制任务体量，不要排超。",
            temperature=0.35,
        )
        if not isinstance(plan_raw, dict):
            raise ValueError("plan parse failed")

        bundle = normalize_plan_bundle(
            {
                "goal_understanding": understanding,
                "phases": plan_raw.get("phases", []),
                "daily_tasks": plan_raw.get("daily_tasks", []),
            },
            primary_time_type=primary,
        )
        if len(bundle["phases"]) >= 3 and len(bundle["daily_tasks"]) >= 2:
            source = "deepseek" if settings.deepseek_api_key else "ai"
            return bundle, source
        logger.warning(
            "AI 结果未通过质量门槛: phases=%s tasks=%s",
            len(bundle["phases"]),
            len(bundle["daily_tasks"]),
        )
    except Exception as exc:
        logger.exception("DeepSeek 计划生成失败，回退模板: %s", exc)

    return _template_bundle(goal, duration, personality), "template"


async def _chat_text(system: str, messages: list[dict], temperature: float = 0.5) -> str | None:
    api_key, base_url, model = _llm_credentials()
    if not api_key:
        logger.warning("未配置 DEEPSEEK_API_KEY，无法调用 AI 对话")
        return None
    payload_messages = [{"role": "system", "content": system}, *messages]
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{base_url.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": model,
                "messages": payload_messages,
                "temperature": temperature,
            },
        )
        resp.raise_for_status()
        return (resp.json()["choices"][0]["message"]["content"] or "").strip()


async def energy_center_chat(
    message: str,
    history: list[dict] | None = None,
    personality: str | None = None,
) -> tuple[str, str, dict]:
    """你的伙伴对话。返回 (reply, source, companion)。"""
    companion = get_companion(personality)
    cleaned_history: list[dict] = []
    for item in history or []:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            cleaned_history.append({"role": role, "content": content[:2000]})
    cleaned_history = cleaned_history[-12:]
    cleaned_history.append({"role": "user", "content": message.strip()[:2000]})

    system = companion_chat_system(personality)
    try:
        reply = await _chat_text(system, cleaned_history, temperature=0.55)
        if reply:
            source = "deepseek" if settings.deepseek_api_key else "ai"
            return reply, source, companion
    except Exception as exc:
        logger.exception("伙伴对话失败: %s", exc)

    return (
        f"我是{companion['name']}，一直在这儿。"
        "你可以先说说今天想照顾哪颗星球，或随便聊聊心情；我们慢慢来。",
        "fallback",
        companion,
    )

PLANET_ENCOURAGE_FALLBACK = {
    "survival": [
        "好好吃饭睡觉，也是爱自己",
        "今天慢一点，也依然很勇敢",
        "身体安顿好了，心才会亮",
        "允许自己休息，光还在",
        "把今天过得轻一点、暖一点",
    ],
    "money": [
        "小小一步，也在靠近自由",
        "今天的努力，是未来的底气",
        "你配得上稳定又漂亮的生活",
        "慢慢攒光，也会成为星河",
        "专注当下这一件事就很好",
    ],
    "beauty": [
        "你今天的样子，值得被看见",
        "先对自己温柔，美会跟着来",
        "整理一下自己，心情也会亮",
        "你本来就闪闪发光",
        "宠爱自己，不是任性是充电",
    ],
    "fun": [
        "留给快乐一点位置吧",
        "今天也可以小小地庆祝自己",
        "玩一下，世界不会塌",
        "开心是很正经的事",
        "去做会让眼睛弯起来的事",
    ],
    "flow": [
        "沉进去一会儿，世界会安静",
        "你值得一段不被打扰的时光",
        "慢慢做，心会回到身上",
        "此刻只属于你自己",
        "深呼吸，下一秒也会发光",
    ],
}


async def generate_encourage_phrases(
    time_type: str = "survival",
    count: int = 5,
    personality: str | None = None,
) -> tuple[list[str], str]:
    planet = time_type if time_type in PLANET_ENCOURAGE_FALLBACK else "survival"
    planet_name = {
        "survival": "生存星球",
        "money": "赚钱星球",
        "beauty": "好看星球",
        "fun": "好玩星球",
        "flow": "心流星球",
    }.get(planet, "闪耀星球")
    companion = get_companion(personality)
    user_prompt = (
        f"请以伙伴「{companion['name']}」的口吻，为「{planet_name}」生成 {count} 句互不重复的每日爱的鼓励。"
        "像在用户耳边轻轻说一句，不要出现打卡/KPI/必须。"
    )
    try:
        data = await _chat_json(
            companion_encourage_system(personality),
            user_prompt,
            temperature=0.75,
        )
        phrases = []
        if isinstance(data, dict):
            raw = data.get("phrases") or []
            if isinstance(raw, list):
                phrases = [str(x).strip() for x in raw if str(x).strip()]
        if len(phrases) >= 3:
            return phrases[:count], "ai"
    except Exception as exc:
        logger.exception("生成鼓励短句失败: %s", exc)

    pool = PLANET_ENCOURAGE_FALLBACK[planet]
    return (pool * ((count // len(pool)) + 1))[:count], "template"


# 兼容旧调用
async def generate_plan_phases_legacy(goal: str, duration: str = "3个月", personality: str | None = None):
    bundle, source = await generate_plan_phases(goal, duration, personality)
    return bundle["phases"], source
