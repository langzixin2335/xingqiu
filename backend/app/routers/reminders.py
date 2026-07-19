from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import DailyReminder, User
from ..schemas import EncouragePhrasesRequest, ReminderOut
from ..services.ai_service import generate_encourage_phrases

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


@router.post("/encourage-phrases")
async def create_encourage_phrases(
    payload: EncouragePhrasesRequest,
    current_user: User = Depends(get_current_user),
):
    phrases, source = await generate_encourage_phrases(
        payload.time_type,
        payload.count,
        current_user.personality,
    )
    return {
        "phrases": phrases,
        "source": source,
        "time_type": payload.time_type,
        "personality": current_user.personality,
    }
