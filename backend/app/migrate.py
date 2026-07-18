from sqlalchemy import inspect, text

from .database import engine


def migrate_db() -> None:
    """轻量 SQLite 迁移：为已有库补充新字段"""
    if not str(engine.url).startswith("sqlite"):
        return

    with engine.connect() as conn:
        inspector = inspect(conn)
        if "users" not in inspector.get_table_names():
            return

        columns = {col["name"] for col in inspector.get_columns("users")}
        alters = []
        if "wechat_openid" not in columns:
            alters.append("ALTER TABLE users ADD COLUMN wechat_openid VARCHAR(64)")
        if "avatar" not in columns:
            alters.append("ALTER TABLE users ADD COLUMN avatar VARCHAR(10) DEFAULT '👤'")
        if "member_expire" not in columns:
            alters.append("ALTER TABLE users ADD COLUMN member_expire VARCHAR(20) DEFAULT '2026-12-31'")

        for sql in alters:
            conn.execute(text(sql))

        if "community_posts" in inspector.get_table_names():
            post_cols = {col["name"] for col in inspector.get_columns("community_posts")}
            if "user_id" not in post_cols:
                conn.execute(text("ALTER TABLE community_posts ADD COLUMN user_id INTEGER"))
            if "task_id" not in post_cols:
                conn.execute(text("ALTER TABLE community_posts ADD COLUMN task_id INTEGER"))

        if "payment_orders" in inspector.get_table_names():
            order_cols = {col["name"] for col in inspector.get_columns("payment_orders")}
            if "prepay_id" not in order_cols:
                conn.execute(text("ALTER TABLE payment_orders ADD COLUMN prepay_id VARCHAR(128)"))
            if "transaction_id" not in order_cols:
                conn.execute(text("ALTER TABLE payment_orders ADD COLUMN transaction_id VARCHAR(64)"))

        if "plan_goals" in inspector.get_table_names():
            goal_cols = {col["name"] for col in inspector.get_columns("plan_goals")}
            if "phase_label" not in goal_cols:
                conn.execute(text("ALTER TABLE plan_goals ADD COLUMN phase_label VARCHAR(100) DEFAULT ''"))
            if "action" not in goal_cols:
                conn.execute(text("ALTER TABLE plan_goals ADD COLUMN action TEXT DEFAULT ''"))
            if "sort_order" not in goal_cols:
                conn.execute(text("ALTER TABLE plan_goals ADD COLUMN sort_order INTEGER DEFAULT 0"))

        if "daily_tasks" in inspector.get_table_names():
            task_cols = {col["name"] for col in inspector.get_columns("daily_tasks")}
            if "task_date" not in task_cols:
                conn.execute(text("ALTER TABLE daily_tasks ADD COLUMN task_date VARCHAR(10)"))

        if "planet_progress" in inspector.get_table_names():
            planet_cols = {col["name"] for col in inspector.get_columns("planet_progress")}
            if "energy_fragments" not in planet_cols:
                conn.execute(
                    text("ALTER TABLE planet_progress ADD COLUMN energy_fragments INTEGER DEFAULT 0")
                )

        conn.commit()

        if "wechat_openid" not in columns:
            try:
                conn.execute(text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS ix_users_wechat_openid ON users (wechat_openid)"
                ))
                conn.commit()
            except Exception:
                pass
