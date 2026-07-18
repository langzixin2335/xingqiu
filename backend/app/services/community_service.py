TIME_TAG_LABEL = {
    "survival": "生存",
    "money": "赚钱",
    "beauty": "好看",
    "fun": "好玩",
    "flow": "心流",
}

PLANET_NAME = {
    "survival": "生存星球",
    "money": "赚钱星球",
    "beauty": "好看星球",
    "fun": "好玩星球",
    "flow": "心流星球",
}


def create_task_completion_post(db, user, task):
    from ..models import CommunityPost

    existing = (
        db.query(CommunityPost)
        .filter(CommunityPost.task_id == task.id, CommunityPost.user_id == user.id)
        .first()
    )
    if existing:
        return existing

    post = CommunityPost(
        user_id=user.id,
        task_id=task.id,
        author_name=user.nickname,
        avatar=user.avatar or "👩",
        content=f"刚刚完成了「{task.title}」，继续闪耀 ✨",
        task_title=task.title,
        time_type=task.time_type,
        likes_count=0,
        comments_count=0,
    )
    db.add(post)
    db.flush()
    return post


def find_task_post(db, user_id: int, task):
    from ..models import CommunityPost

    post = (
        db.query(CommunityPost)
        .filter(CommunityPost.task_id == task.id, CommunityPost.user_id == user_id)
        .order_by(CommunityPost.id.desc())
        .first()
    )
    if post:
        return post
    return (
        db.query(CommunityPost)
        .filter(
            CommunityPost.user_id == user_id,
            CommunityPost.task_title == task.title,
            CommunityPost.time_type == task.time_type,
        )
        .order_by(CommunityPost.id.desc())
        .first()
    )
