from sqlalchemy.orm import Session

from .models import CommunityComment, CommunityPost, PostLike, User
from .schemas import CommentOut, PostOut, TaskOut
from .services.community_service import find_task_post


def _like_user_names(db: Session, post_id: int) -> list[str]:
    rows = (
        db.query(User.nickname)
        .join(PostLike, PostLike.user_id == User.id)
        .filter(PostLike.post_id == post_id)
        .order_by(PostLike.id.desc())
        .limit(20)
        .all()
    )
    return [r[0] for r in rows if r[0]]


def post_to_out(post: CommunityPost, user_id: int, db: Session) -> PostOut:
    liked = (
        db.query(PostLike)
        .filter(PostLike.post_id == post.id, PostLike.user_id == user_id)
        .first()
        is not None
    )
    comments = (
        db.query(CommunityComment)
        .filter(CommunityComment.post_id == post.id)
        .order_by(CommunityComment.id)
        .all()
    )
    return PostOut(
        id=post.id,
        author_name=post.author_name,
        avatar=post.avatar,
        content=post.content,
        task_title=post.task_title,
        time_type=post.time_type,
        likes_count=post.likes_count,
        comments_count=post.comments_count,
        liked=liked,
        like_users=_like_user_names(db, post.id),
        comments=[CommentOut.model_validate(c) for c in comments],
    )


def task_to_out(task, user_id: int, db: Session) -> TaskOut:
    base = TaskOut.model_validate(task)
    if not task.completed:
        return base

    post = find_task_post(db, user_id, task)
    if not post:
        return base

    liked = (
        db.query(PostLike)
        .filter(PostLike.post_id == post.id, PostLike.user_id == user_id)
        .first()
        is not None
    )
    comments = (
        db.query(CommunityComment)
        .filter(CommunityComment.post_id == post.id)
        .order_by(CommunityComment.id)
        .all()
    )
    return base.model_copy(
        update={
            "post_id": post.id,
            "likes_count": post.likes_count or 0,
            "comments_count": post.comments_count or 0,
            "liked": liked,
            "like_users": _like_user_names(db, post.id),
            "comments": [CommentOut.model_validate(c) for c in comments],
        }
    )
