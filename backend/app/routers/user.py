from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import User
from ..deps import get_current_user
from ..schemas import OnboardingRequest, PersonalityRequest, UserOut

router = APIRouter(prefix="/user", tags=["user"])


@router.post("/personality", response_model=UserOut)
def set_personality(
    payload: PersonalityRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.personality = payload.personality
    current_user.onboarding_step = "plan"
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)


@router.post("/onboarding", response_model=UserOut)
def set_onboarding(
    payload: OnboardingRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    current_user.onboarding_step = payload.onboarding_step
    db.commit()
    db.refresh(current_user)
    return UserOut.model_validate(current_user)
