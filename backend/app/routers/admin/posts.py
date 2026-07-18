from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ...admin_deps import get_current_admin
from ...database import get_db
from ...models import AdminUser, CommunityComment, CommunityPost, PostLike
from ...schemas_admin import AdminPostCreate, AdminPostListItem

router = APIRouter(prefix="/admin/posts", tags=["admin-posts"])


@router.get("", response_model=list[AdminPostListItem])
def list_posts(_: AdminUser = Depends(get_current_admin), db: Session = Depends(get_db)):
    return db.query(CommunityPost).order_by(CommunityPost.id.desc()).limit(100).all()


@router.post("", response_model=AdminPostListItem)
def create_post(
    payload: AdminPostCreate,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    post = CommunityPost(**payload.model_dump())
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    _: AdminUser = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="动态不存在")
    db.query(CommunityComment).filter(CommunityComment.post_id == post_id).delete()
    db.query(PostLike).filter(PostLike.post_id == post_id).delete()
    db.delete(post)
    db.commit()
    return {"message": "已删除"}
