from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from .auth_utils import decode_access_token
from .database import get_db
from .models import AdminUser

admin_security = HTTPBearer(auto_error=False)


def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(admin_security),
    db: Session = Depends(get_db),
) -> AdminUser:
    if not credentials:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登录")
    subject = decode_access_token(credentials.credentials)
    if not subject or not str(subject).startswith("admin:"):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="无管理员权限")
    admin_id = int(str(subject).split(":", 1)[1])
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id, AdminUser.is_active == True).first()
    if not admin:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="管理员不存在")
    return admin
