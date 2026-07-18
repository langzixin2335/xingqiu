import secrets

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import TaskInvitation, User
from ..schemas import InvitationCreateRequest, InvitationOut

router = APIRouter(prefix="/invitations", tags=["invitations"])


def _share_payload(invite: TaskInvitation, base_url: str = "https://shining.planet") -> InvitationOut:
    share_text = (
        f"✨ {invite.inviter_name} 邀请你一起在闪耀星球打卡！\n"
        f"任务：{invite.task_title}\n"
        f"邀约码：{invite.invite_code}\n"
        f"一起坚持，共同成长！"
    )
    return InvitationOut(
        id=invite.id,
        invite_code=invite.invite_code,
        task_title=invite.task_title,
        time_type=invite.time_type,
        inviter_name=invite.inviter_name,
        status=invite.status,
        share_text=share_text,
        share_url=f"{base_url}/invite/{invite.invite_code}",
    )


@router.post("", response_model=InvitationOut)
def create_invitation(
    payload: InvitationCreateRequest,
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
    return _share_payload(invite)


@router.get("/{invite_code}", response_model=InvitationOut)
def get_invitation(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invite = db.query(TaskInvitation).filter(TaskInvitation.invite_code == invite_code).first()
    if not invite:
        raise HTTPException(status_code=404, detail="邀约不存在")
    return _share_payload(invite)


@router.post("/{invite_code}/accept", response_model=InvitationOut)
def accept_invitation(
    invite_code: str,
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
    return _share_payload(invite)
