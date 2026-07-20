import secrets
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import TaskInvitation, User
from ..schemas import InvitationCreateRequest, InvitationOut

router = APIRouter(prefix="/invitations", tags=["invitations"])

DEFAULT_SHARE_BASE = "https://xq.dongme.me"


def _public_base_url(request: Request | None = None) -> str:
    if request is not None:
        origin = request.headers.get("origin") or ""
        referer = request.headers.get("referer") or ""
        for raw in (origin, referer):
            if not raw:
                continue
            parsed = urlparse(raw)
            if parsed.scheme and parsed.netloc:
                return f"{parsed.scheme}://{parsed.netloc}"
    return DEFAULT_SHARE_BASE


def _share_payload(invite: TaskInvitation, base_url: str = DEFAULT_SHARE_BASE) -> InvitationOut:
    share_url = f"{base_url.rstrip('/')}/?invite={invite.invite_code}"
    share_text = (
        f"✨ {invite.inviter_name} 邀请你一起在闪耀星球打卡！\n"
        f"任务：{invite.task_title}\n"
        f"点开链接一起坚持：{share_url}"
    )
    return InvitationOut(
        id=invite.id,
        invite_code=invite.invite_code,
        task_title=invite.task_title,
        time_type=invite.time_type,
        inviter_name=invite.inviter_name,
        status=invite.status,
        share_text=share_text,
        share_url=share_url,
    )


@router.post("", response_model=InvitationOut)
def create_invitation(
    payload: InvitationCreateRequest,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = TaskInvitation(
        user_id=current_user.id,
        inviter_name=current_user.nickname,
        task_title=payload.task_title,
        time_type=payload.time_type,
        invite_code=secrets.token_urlsafe(8),
        status="open",
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)
    return _share_payload(invite, _public_base_url(request))


@router.get("/{invite_code}", response_model=InvitationOut)
def get_invitation(
    invite_code: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(TaskInvitation).filter(TaskInvitation.invite_code == invite_code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="邀约不存在")
    return _share_payload(invite, _public_base_url(request))


@router.post("/{invite_code}/accept", response_model=InvitationOut)
def accept_invitation(
    invite_code: str,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(TaskInvitation).filter(TaskInvitation.invite_code == invite_code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="邀约不存在")
    if invite.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="不能接受自己的邀约")
    if invite.status == "accepted":
        raise HTTPException(status_code=400, detail="邀约已被接受")
    invite.status = "accepted"
    invite.accepted_by_user_id = current_user.id
    invite.accepted_by_name = current_user.nickname
    db.commit()
    db.refresh(invite)
    return _share_payload(invite, _public_base_url(request))
