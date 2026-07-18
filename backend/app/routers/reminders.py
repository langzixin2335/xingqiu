from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import DailyReminder, User
from ..schemas import ReminderOut

router = APIRouter(prefix="/reminders", tags=["reminders"])


@router.get("", response_model=list[ReminderOut])
def list_reminders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return (
        db.query(DailyReminder)
        .filter(DailyReminder.user_id == current_user.id)
        .order_by(DailyReminder.id)
        .all()
    )
