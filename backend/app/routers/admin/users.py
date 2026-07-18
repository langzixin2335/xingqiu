from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...database import get_db
from ...models import AdminUser, User
from ...schemas_admin import AdminUserListItem, AdminUserUpdate

router = APIRouter(prefix="/admin/users", tags=["admin-users"])


@router.get("", response_model=list[AdminUserListItem])
def list_users(
    q: str = Query(default=""),
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    query = db.query(User).order_by(User.id.desc())
    if q:
        like = f"%{q}%"
        query = query.filter((User.phone.like(like)) | (User.nickname.like(like)))
    return query.limit(100).all()


@router.patch("/{user_id}", response_model=AdminUserListItem)
def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user
