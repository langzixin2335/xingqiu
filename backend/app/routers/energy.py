from fastapi import APIRouter, Depends

from ..deps import get_current_user
from ..models import User
from ..schemas import EnergyChatRequest, EnergyChatResponse
from ..services.ai_service import energy_center_chat

router = APIRouter(prefix="/energy", tags=["energy"])


@router.post("/chat", response_model=EnergyChatResponse)
async def chat_energy(
    payload: EnergyChatRequest,
    current_user: User = Depends(get_current_user),
):
    _ = current_user
    history = [m.model_dump() for m in payload.history]
    reply, source = await energy_center_chat(payload.message, history)
    return EnergyChatResponse(reply=reply, source=source)
