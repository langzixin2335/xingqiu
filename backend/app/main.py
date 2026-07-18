from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from .database import SessionLocal, init_db
from .routers import app_version, auth, badges, community, energy, home, invitations, member, plans, push, reminders, rewards, tasks, user, wechat_auth
from .routers.admin import auth as admin_auth
from .routers.admin import dashboard as admin_dashboard
from .routers.admin import orders as admin_orders
from .routers.admin import posts as admin_posts
from .routers.admin import products as admin_products
from .routers.admin import push as admin_push
from .routers.admin import users as admin_users
from .seed import seed_admin_user, seed_global_data

app = FastAPI(title="闪耀星球 API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(app_version.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(plans.router, prefix="/api")
app.include_router(reminders.router, prefix="/api")
app.include_router(wechat_auth.router, prefix="/api")
app.include_router(member.router, prefix="/api")
app.include_router(push.router, prefix="/api")
app.include_router(badges.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(community.router, prefix="/api")
app.include_router(invitations.router, prefix="/api")
app.include_router(rewards.router, prefix="/api")
app.include_router(home.router, prefix="/api")
app.include_router(energy.router, prefix="/api")

app.include_router(admin_auth.router, prefix="/api")
app.include_router(admin_dashboard.router, prefix="/api")
app.include_router(admin_users.router, prefix="/api")
app.include_router(admin_posts.router, prefix="/api")
app.include_router(admin_products.router, prefix="/api")
app.include_router(admin_orders.router, prefix="/api")
app.include_router(admin_push.router, prefix="/api")


@app.on_event("startup")
def on_startup():
    init_db()
    db: Session = SessionLocal()
    try:
        seed_global_data(db)
        seed_admin_user(db)
    finally:
        db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}
