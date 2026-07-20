from fastapi import HTTPException
from sqlalchemy.orm import Session

from ..models import PlanetProgress
from ..schemas import PlanetOut

PLANET_TYPES = ("survival", "money", "beauty", "fun", "flow")
FRAGMENTS_PER_LIGHT = 7
PLANET_MAX_LEVEL = 7
PLANET_NAME = {
    "survival": "生存星球",
    "money": "赚钱星球",
    "beauty": "好看星球",
    "fun": "好玩星球",
    "flow": "心流星球",
}


def get_planet_max_level(db: Session | None = None, user_id: int | None = None, planet_type: str | None = None) -> int:
    """每个星球固定需点亮 7 次，满级后全量高亮。"""
    return PLANET_MAX_LEVEL


def compute_progress_percent(level: int, fragments: int, max_level: int = PLANET_MAX_LEVEL) -> int:
    """点亮总进度：已点亮等级 + 当前碎片进度。"""
    if max_level <= 0:
        return 0
    level = min(max(0, int(level or 0)), max_level)
    fragments = min(max(0, int(fragments or 0)), FRAGMENTS_PER_LIGHT)
    if level >= max_level:
        return 100
    total_units = max_level * FRAGMENTS_PER_LIGHT
    earned = level * FRAGMENTS_PER_LIGHT + fragments
    return min(100, round(earned / total_units * 100))


def _merge_duplicate_planets(db: Session, user_id: int) -> dict[str, PlanetProgress]:
    """同一类型只保留一行：合并等级/碎片，删除重复行。"""
    rows = (
        db.query(PlanetProgress)
        .filter(PlanetProgress.user_id == user_id)
        .order_by(PlanetProgress.id.asc())
        .all()
    )
    kept: dict[str, PlanetProgress] = {}
    dirty = False
    for planet in rows:
        key = planet.planet_type
        if key not in kept:
            kept[key] = planet
            continue
        primary = kept[key]
        primary.level = max(int(primary.level or 0), int(planet.level or 0))
        # 重复行曾分别收到碎片时用求和；同进度镜像时另一行多为 0
        primary.energy_fragments = min(
            FRAGMENTS_PER_LIGHT,
            int(primary.energy_fragments or 0) + int(planet.energy_fragments or 0),
        )
        primary.active = bool(primary.active) or bool(planet.active)
        extra_task = (planet.current_task or "").strip()
        primary_task = (primary.current_task or "").strip()
        if extra_task and (not primary_task or primary_task in {"暂未点亮", "暂无任务"}):
            primary.current_task = extra_task
        db.delete(planet)
        dirty = True
    if dirty:
        db.flush()
    return kept


def ensure_all_planets(db: Session, user_id: int) -> list[PlanetProgress]:
    """保证五种时间星球齐全，并清理历史重复行。"""
    existing = _merge_duplicate_planets(db, user_id)
    created = False
    for planet_type in PLANET_TYPES:
        if planet_type in existing:
            continue
        planet = PlanetProgress(
            user_id=user_id,
            planet_type=planet_type,
            level=0,
            current_task="暂未点亮",
            active=True,
            energy_fragments=0,
        )
        db.add(planet)
        existing[planet_type] = planet
        created = True
    if created:
        db.flush()
    return [existing[t] for t in PLANET_TYPES if t in existing]


def _get_or_create_planet(db: Session, user_id: int, planet_type: str) -> PlanetProgress:
    """始终返回去重后的唯一星球行，避免碎片写到 A、展示读到 B。"""
    planets = ensure_all_planets(db, user_id)
    for planet in planets:
        if planet.planet_type == planet_type:
            return planet
    planet = PlanetProgress(
        user_id=user_id,
        planet_type=planet_type,
        level=0,
        current_task="",
        active=True,
        energy_fragments=0,
    )
    db.add(planet)
    db.flush()
    return planet


def award_energy_fragment(
    db: Session,
    user_id: int,
    planet_type: str,
    amount: int = 1,
    task_title: str | None = None,
) -> tuple[PlanetProgress, bool]:
    """发放能量碎片（满 7 封顶，不自动点亮）。返回 (planet, 是否刚集齐可点亮)。"""
    planet = _get_or_create_planet(db, user_id, planet_type)
    before = int(planet.energy_fragments or 0)
    if task_title:
        planet.current_task = task_title[:20]
        planet.active = True
    # 已满级不再囤积碎片
    if int(planet.level or 0) >= PLANET_MAX_LEVEL:
        return planet, False
    planet.energy_fragments = min(FRAGMENTS_PER_LIGHT, before + max(0, amount))
    db.flush()
    ready = int(planet.energy_fragments or 0) >= FRAGMENTS_PER_LIGHT
    just_ready = ready and before < FRAGMENTS_PER_LIGHT
    return planet, just_ready


def light_planet(db: Session, user_id: int, planet_type: str) -> PlanetOut:
    """消耗 7 个碎片点亮一次（等级 +1，最多 7 级全量点亮）。"""
    if planet_type not in PLANET_TYPES:
        raise HTTPException(status_code=400, detail="无效的星球类型")

    planet = _get_or_create_planet(db, user_id, planet_type)
    fragments = int(planet.energy_fragments or 0)
    if fragments < FRAGMENTS_PER_LIGHT:
        raise HTTPException(
            status_code=400,
            detail=f"能量碎片不足，需集齐 {FRAGMENTS_PER_LIGHT} 个才能点亮",
        )

    level = int(planet.level or 0)
    if level >= PLANET_MAX_LEVEL:
        raise HTTPException(status_code=400, detail="该星球已完全点亮")

    planet.energy_fragments = fragments - FRAGMENTS_PER_LIGHT
    planet.level = level + 1
    planet.active = True
    db.flush()
    return planet_to_out(db, user_id, planet)


def planet_to_out(db: Session, user_id: int, planet: PlanetProgress) -> PlanetOut:
    max_level = PLANET_MAX_LEVEL
    level = min(max(0, int(planet.level or 0)), max_level)
    # 纠正历史超过 7 的等级
    if int(planet.level or 0) > max_level:
        planet.level = max_level
        db.flush()
    fragments = int(planet.energy_fragments or 0)
    percent = compute_progress_percent(level, fragments, max_level)
    ready = fragments >= FRAGMENTS_PER_LIGHT and level < max_level
    return PlanetOut(
        planet_type=planet.planet_type,
        level=level,
        max_level=max_level,
        current_task=planet.current_task or "",
        active=bool(planet.active),
        energy_fragments=min(fragments, FRAGMENTS_PER_LIGHT),
        fragments_per_light=FRAGMENTS_PER_LIGHT,
        ready_to_light=ready,
        progress_percent=min(100, percent),
    )
