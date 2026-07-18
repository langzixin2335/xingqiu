from pathlib import Path

from pydantic_settings import BaseSettings

_BACKEND_DIR = Path(__file__).resolve().parent.parent
_ENV_FILE = _BACKEND_DIR / ".env"


class Settings(BaseSettings):
    app_name: str = "闪耀星球 API"
    secret_key: str = "shining-planet-dev-secret-change-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    database_url: str = "sqlite:///./shining_planet.db"
    dev_sms_code: str = "123456"

    # 短信验证码：dev | aliyun | tencent
    sms_provider: str = "dev"
    # 阿里云短信
    aliyun_access_key_id: str = ""
    aliyun_access_key_secret: str = ""
    aliyun_sms_sign_name: str = ""
    aliyun_sms_template_code: str = ""
    aliyun_sms_region: str = "cn-hangzhou"
    # 腾讯云短信
    tencent_secret_id: str = ""
    tencent_secret_key: str = ""
    tencent_sms_app_id: str = ""
    tencent_sms_sign_name: str = ""
    tencent_sms_template_id: str = ""
    tencent_sms_region: str = "ap-guangzhou"

    # AI 计划生成（DeepSeek 优先，亦兼容 OpenAI 接口）
    deepseek_api_key: str = ""
    deepseek_base_url: str = "https://api.deepseek.com/v1"
    deepseek_model: str = "deepseek-chat"
    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    # 微信 H5 登录（未配置时可用开发模式）
    wechat_app_id: str = ""
    wechat_app_secret: str = ""
    wechat_oauth_redirect: str = "http://localhost:5173/auth/wechat/callback"
    wechat_dev_mode: bool = True

    # 微信支付 V3（未配置时走演示模式）
    wechat_mch_id: str = ""
    wechat_mch_serial_no: str = ""
    wechat_mch_private_key: str = ""
    wechat_mch_private_key_path: str = ""
    wechat_pay_api_v3_key: str = ""
    wechat_pay_notify_url: str = "http://localhost:8000/api/member/pay/notify"

    # FCM 推送（未配置时仅记录消息不实际发送）
    fcm_server_key: str = ""

    # App 版本检查（与 Android versionName / versionCode 对齐）
    app_latest_version: str = "1.0"
    app_latest_version_code: int = 1
    app_min_version_code: int = 1
    app_download_url: str = "https://xq.dongme.me/downloads/shining-planet.apk"
    app_update_message: str = "发现新版本，建议更新以获得更好体验"
    app_force_update: bool = False

    class Config:
        env_file = str(_ENV_FILE)
        env_file_encoding = "utf-8"


settings = Settings()
