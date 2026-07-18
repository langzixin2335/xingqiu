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


def ensure_all_planets(db: Session, user_id: int) -> list[PlanetProgress]:
    """保证五种时间星球齐全（含好看星球）。"""
    existing = {
        p.planet_type: p
        for p in db.query(PlanetProgress).filter(PlanetProgress.user_id == user_id).all()
    }
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
    # 按固定五种顺序返回，避免缺颗或乱序
    return [existing[t] for t in PLANET_TYPES if t in existing]


def _get_or_create_planet(db: Session, user_id: int, planet_type: str) -> PlanetProgress:
    planet = (
        db.query(PlanetProgress)
        .filter(PlanetProgress.user_id == user_id, PlanetProgress.planet_type == planet_type)
        .first()
    )
    if planet:
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
    percent = round(level / max_level * 100) if max_level else 0
    fragments = int(planet.energy_fragments or 0)
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
