from fastapi import APIRouter

from ..config import settings

router = APIRouter(tags=["app"])


@router.get("/app/version")
def get_app_version():
    """公开接口：客户端对比本地 versionCode，决定是否弹更新。"""
    return {
        "latest_version": settings.app_latest_version,
        "latest_version_code": settings.app_latest_version_code,
        "min_version_code": settings.app_min_version_code,
        "download_url": settings.app_download_url,
        "force": settings.app_force_update,
        "message": settings.app_update_message,
    }
