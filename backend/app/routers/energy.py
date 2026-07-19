from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import User
from ..schemas import EnergyChatRequest, EnergyChatResponse
from ..services.ai_service import energy_center_chat
from ..services.companion import get_companion

router = APIRouter(prefix="/energy", tags=["energy"])


@router.get("/companion")
def get_my_companion(current_user: User = Depends(get_current_user)):
    companion = get_companion(current_user.personality)
    return {
        "personality": current_user.personality,
        "name": companion["name"],
        "title": companion["title"],
        "display": companion["display"],
        "avatar": companion["avatar"],
        "greeting": companion["greeting"],
        "checkin_lines": companion["checkin_lines"],
    }


@router.post("/chat", response_model=EnergyChatResponse)
async def chat_energy(
    payload: EnergyChatRequest,
    current_user: User = Depends(get_current_user),
):
    history = [m.model_dump() for m in payload.history]
    reply, source, companion = await energy_center_chat(
        payload.message,
        history,
        current_user.personality,
    )
    return EnergyChatResponse(
        reply=reply,
        source=source,
        companion_name=companion["name"],
        companion_display=companion["display"],
        companion_avatar=companion["avatar"],
        personality=current_user.personality,
    )
