from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...auth_utils import create_access_token, verify_password
from ...database import get_db
from ...models import AdminUser
from ...schemas_admin import AdminLoginRequest, AdminOut, AdminTokenResponse

router = APIRouter(prefix="/admin/auth", tags=["admin-auth"])


@router.post("/login", response_model=AdminTokenResponse)
def admin_login(payload: AdminLoginRequest, db: Session = Depends(get_db)):
    admin = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if not admin or not verify_password(payload.password, admin.password_hash):
        raise HTTPException(status_code=400, detail="用户名或密码错误")
    if not admin.is_active:
        raise HTTPException(status_code=403, detail="账号已禁用")
    token = create_access_token(f"admin:{admin.id}")
    return AdminTokenResponse(access_token=token, admin=AdminOut.model_validate(admin))


@router.get("/me", response_model=AdminOut)
def admin_me(admin: AdminUser = Depends(get_current_admin)):
    return AdminOut.model_validate(admin)
