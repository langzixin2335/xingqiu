import json
import logging
import re

import httpx

from ..config import settings
from .plan_validator import normalize_plan_bundle

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
- time_types_needed: 五种时间数组，从 survival/money/beauty/fun/flow 中选 2-4 个"""

PLAN_SYSTEM = """你是趁早「闪耀星球」成长教练。基于「目标理解」生成分阶段计划与首周可执行任务。
规则：
1. phases 共4个阶段：启动期(1-2周)→积累期(3-4周)→突破期(第2月)→绽放期(末期)
2. 每条 phase.goal 是阶段里程碑；phase.action 必须写「XX星球：具体行为」
3. daily_tasks 是首周每天能打卡的任务，必须含：动作+时长/次数+场景，禁止空话（坚持/努力/提升）
4. 任务示例：「每晚21:00朗读10分钟」「每周二四07:00慢跑20分钟」「阅读《原则》30页」
5. daily_tasks 3-5条，覆盖不同 time_type
6. 难度递进：首周每天总投入不超过 weekly_hours/7 小时
7. 必须与用户目标领域强相关（如演讲目标要有朗读/录像/演练，减重要有饮食运动）

输出严格 JSON 对象（不要 markdown）：
{
  "phases": [{"period":"","goal":"","action":"","time_type":"survival|money|beauty|fun|flow"}],
  "daily_tasks": [{"title":"","time_type":"","remind_time":"HH:MM","repeat_days":"1,2,3,4,5,6,7","requires_photo":false}]
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


def _template_bundle(goal: str, duration: str, personality: str | None) -> dict:
    hint = PERSONALITY_HINTS.get(personality or "", "持续积累")
    return normalize_plan_bundle(
        {
            "goal_understanding": {
                "summary": f"在{duration}内围绕「{goal}」建立可坚持的成长节奏",
                "category": "个人成长",
                "success_criteria": f"完成阶段性成果并复盘（与「{goal}」直接相关）",
                "weekly_hours": 5,
                "main_obstacle": "时间碎片化、容易中断",
            },
            "phases": [
                {
                    "period": "第1-2周 · 启动期",
                    "goal": f"为「{goal}」建立每日15分钟微习惯",
                    "action": "生存星球：每晚固定15分钟专项练习",
                    "time_type": "survival",
                },
                {
                    "period": "第3-4周 · 积累期",
                    "goal": "每周2次专项练习并记录成长日志",
                    "action": f"赚钱星球：学习相关技能课程（{hint}）",
                    "time_type": "money",
                },
                {
                    "period": "第2个月 · 突破期",
                    "goal": "完成一次可见成果输出（分享/展示/实战）",
                    "action": "好玩星球：在轻松场景中完成一次练习",
                    "time_type": "fun",
                },
                {
                    "period": f"{duration} · 绽放期",
                    "goal": f"达成「{goal}」阶段性目标并复盘",
                    "action": "心流星球：专注完成一次深度复盘",
                    "time_type": "flow",
                },
            ],
            "daily_tasks": [
                {
                    "title": "每晚21:00专项练习15分钟",
                    "time_type": "survival",
                    "remind_time": "21:00",
                    "repeat_days": "1,2,3,4,5,6,7",
                },
                {
                    "title": "阅读相关主题30分钟",
                    "time_type": "money",
                    "remind_time": "08:00",
                    "repeat_days": "1,2,3,4,5",
                },
                {
                    "title": "正念冥想10分钟",
                    "time_type": "flow",
                    "remind_time": "06:30",
                    "repeat_days": "1,2,3,4,5,6,7",
                },
            ],
        }
    )


async def generate_plan_phases(
    goal: str, duration: str = "3个月", personality: str | None = None
) -> tuple[dict, str]:
    """两步：理解目标 → 生成阶段与每日任务。返回完整 bundle 与 source。"""
    personality_hint = PERSONALITY_HINTS.get(personality or "", "未知")

    try:
        understanding = await _chat_json(
            UNDERSTAND_SYSTEM,
            f"用户原始目标：{goal}\n期望周期：{duration}\n人格特质：{personality_hint}",
            temperature=0.3,
        )
        if not isinstance(understanding, dict):
            raise ValueError("understanding parse failed")

        plan_raw = await _chat_json(
            PLAN_SYSTEM,
            "目标理解：\n"
            f"{json.dumps(understanding, ensure_ascii=False)}\n\n"
            f"期望周期：{duration}\n人格特质：{personality_hint}\n"
            f"原始目标：{goal}",
            temperature=0.35,
        )
        if not isinstance(plan_raw, dict):
            raise ValueError("plan parse failed")

        bundle = normalize_plan_bundle(
            {
                "goal_understanding": understanding,
                "phases": plan_raw.get("phases", []),
                "daily_tasks": plan_raw.get("daily_tasks", []),
            }
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


ENERGY_CHAT_SYSTEM = """你是「闪耀星球」能量中心的成长助手。
用简洁、温暖、可执行的中文回答用户关于自我成长、五种时间星球（生存/赚钱/好看/好玩/心流）、课程选择、习惯养成的问题。
请尽可能帮助用户；回答控制在 200 字以内，必要时给 2-3 条具体建议。不要输出 JSON 或 markdown 代码块。"""


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


async def energy_center_chat(message: str, history: list[dict] | None = None) -> tuple[str, str]:
    """能量中心对话。返回 (reply, source)。"""
    cleaned_history: list[dict] = []
    for item in history or []:
        role = item.get("role")
        content = (item.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            cleaned_history.append({"role": role, "content": content[:2000]})
    cleaned_history = cleaned_history[-12:]
    cleaned_history.append({"role": "user", "content": message.strip()[:2000]})

    try:
        reply = await _chat_text(ENERGY_CHAT_SYSTEM, cleaned_history, temperature=0.5)
        if reply:
            source = "deepseek" if settings.deepseek_api_key else "ai"
            return reply, source
    except Exception as exc:
        logger.exception("能量中心对话失败: %s", exc)

    return (
        "我在这儿。你可以先说说你想改善的方向，比如运动、效率、形象、兴趣或心态；"
        "我会尽量给出具体、能马上开做的小建议。",
        "fallback",
    )


# 兼容旧调用
async def generate_plan_phases_legacy(goal: str, duration: str = "3个月", personality: str | None = None):
    bundle, source = await generate_plan_phases(goal, duration, personality)
    return bundle["phases"], source
