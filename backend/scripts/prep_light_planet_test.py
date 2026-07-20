"""把测试用户调成「今日只剩 1 项待完成 + 生存星球碎片 6/7」。

用法：
  cd backend
  python -m scripts.prep_light_planet_test
  python -m scripts.prep_light_planet_test --phone 13800138002
  python -m scripts.prep_light_planet_test --all-done
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.database import SessionLocal, init_db  # noqa: E402
from app.models import User  # noqa: E402
from app.seed import prepare_light_planet_test  # noqa: E402


def main() -> None:
    init_db()
    parser = argparse.ArgumentParser()
    parser.add_argument("--phone", help="指定手机号/微信号标识")
    parser.add_argument("--user-id", type=int, help="指定用户 id")
    parser.add_argument(
        "--all-done",
        action="store_true",
        help="给所有 onboarding=done 的用户准备测试数据",
    )
    parser.add_argument(
        "--planet",
        default="survival",
        help="目标星球 time_type，默认 survival",
    )
    args = parser.parse_args()

    db = SessionLocal()
    try:
        q = db.query(User)
        if args.user_id:
            users = q.filter(User.id == args.user_id).all()
        elif args.phone:
            users = q.filter(User.phone == args.phone).all()
        elif args.all_done:
            users = q.filter(User.onboarding_step == "done").all()
        else:
            # 默认：引导完成的用户 + 有过任务的测试号
            users = q.filter(User.onboarding_step == "done").all()
            if not users:
                users = q.order_by(User.id.desc()).limit(5).all()

        if not users:
            print("未找到用户")
            return

        for user in users:
            result = prepare_light_planet_test(db, user, planet_type=args.planet)
            print(
                f"OK user={result['user_id']} phone={result['phone']} "
                f"open={result['open_task']} fragments={result['energy_fragments']}/"
                f"{result['fragments_per_light']}"
            )
    finally:
        db.close()


if __name__ == "__main__":
    main()
