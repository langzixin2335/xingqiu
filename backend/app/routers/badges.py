from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, UserBadge
from ..schemas import BadgeOut

router = APIRouter(prefix="/badges", tags=["badges"])


@router.post("/{badge_id}/toggle-display", response_model=BadgeOut)
def toggle_badge_display(
    badge_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    badge = (
        db.query(UserBadge)
        .filter(UserBadge.id == badge_id, UserBadge.user_id == current_user.id)
        .first()
    )
    if not badge:
        raise HTTPException(status_code=404, detail="勋章不存在")
    if not badge.unlocked:
        raise HTTPException(status_code=400, detail="勋章尚未解锁")

    displayed_count = (
        db.query(UserBadge)
        .filter(
            UserBadge.user_id == current_user.id,
            UserBadge.displayed == True,  # noqa: E712
            UserBadge.id != badge_id,
        )
        .count()
    )

    if badge.displayed:
        badge.displayed = False
    else:
        if displayed_count >= 2:
            raise HTTPException(status_code=400, detail="最多只能展示2个勋章")
        badge.displayed = True

    db.commit()
    db.refresh(badge)
    return BadgeOut.model_validate(badge)
