from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import CommunityComment, CommunityPost, PostLike, User
from ..schemas import CommentCreateRequest, CommentOut, PostOut, ReflectionRequest
from ..serializers import post_to_out

router = APIRouter(prefix="/community", tags=["community"])


@router.get("/feed", response_model=list[PostOut])
def get_feed(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    posts = db.query(CommunityPost).order_by(CommunityPost.created_at.desc()).limit(20).all()
    return [post_to_out(p, current_user.id, db) for p in posts]


@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="动态不存在")

    existing = (
        db.query(PostLike)
        .filter(PostLike.post_id == post_id, PostLike.user_id == current_user.id)
        .first()
    )
    if existing:
        db.delete(existing)
        post.likes_count = max(0, post.likes_count - 1)
        liked = False
    else:
        db.add(PostLike(post_id=post_id, user_id=current_user.id))
        post.likes_count += 1
        liked = True
    db.commit()
    return {"liked": liked, "likes_count": post.likes_count}


@router.post("/reflection", response_model=PostOut)
def post_reflection(
    payload: ReflectionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = CommunityPost(
        user_id=current_user.id,
        author_name=current_user.nickname,
        avatar=current_user.avatar or "👩",
        content=payload.content,
        task_title=payload.task_title or "今日成长感悟",
        time_type=payload.time_type or "flow",
        likes_count=0,
        comments_count=0,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post_to_out(post, current_user.id, db)


@router.post("/posts/{post_id}/comments", response_model=CommentOut)
def add_comment(
    post_id: int,
    payload: CommentCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(CommunityPost).filter(CommunityPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="动态不存在")

    comment = CommunityComment(
        post_id=post_id,
        user_id=current_user.id,
        author_name=current_user.nickname,
        content=payload.content,
    )
    db.add(comment)
    post.comments_count += 1
    db.commit()
    db.refresh(comment)
    return CommentOut.model_validate(comment)
