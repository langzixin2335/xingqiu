"""开发/测试辅助接口（仅 wechat_dev_mode 或 sms_provider=dev 时开放）。"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..models import User
from ..seed import prepare_light_planet_test

router = APIRouter(prefix="/dev", tags=["dev"])


def _ensure_dev_mode() -> None:
    if not (settings.wechat_dev_mode or settings.sms_provider == "dev"):
        raise HTTPException(status_code=404, detail="Not Found")


@router.post("/prep-light-test")
def prep_light_test(
    planet_type: str = Query("survival", description="目标星球：survival/money/beauty/fun/flow"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """测试用：今日行动只留 1 项待完成，对应星球碎片 6/7，便于测点亮。"""
    _ensure_dev_mode()
    return prepare_light_planet_test(db, current_user, planet_type=planet_type)
