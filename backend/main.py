import json
import time

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db


Base.metadata.create_all(bind=engine)

app = FastAPI(title="YouTube Interest API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def ensure_default_categories(db: Session) -> None:
    defaults = [
        "Uncategorized",
        "Coding",
        "German",
        "Fitness",
        "Fashion",
        "Music",
        "Life",
        "Research",
        "Random",
    ]

    for name in defaults:
        get_or_create_category(db, name)


def clean_name(name: str) -> str:
    cleaned = (name or "").strip()
    if not cleaned:
        raise HTTPException(status_code=400, detail="Category name is required.")
    return cleaned


def get_or_create_category(db: Session, name: str) -> models.Category:
    clean = clean_name(name)
    existing = db.query(models.Category).filter(models.Category.name == clean).first()
    if existing:
        return existing

    category = models.Category(name=clean)
    db.add(category)
    db.flush()
    return category


def video_id_for(video: schemas.VideoCreate) -> str:
    if video.id:
        return video.id
    return f"imported-{int(time.time() * 1000)}-{abs(hash(video.url))}"


def upsert_video(db: Session, video: schemas.VideoCreate) -> models.Video | None:
    deleted = db.query(models.DeletedVideo).filter(models.DeletedVideo.url == video.url).first()
    if deleted:
        return None

    category = video.category or "Uncategorized"
    get_or_create_category(db, category)

    existing = db.query(models.Video).filter(models.Video.url == video.url).first()
    if existing:
        existing.title = video.title
        existing.channel = video.channel
        existing.liked_at = video.liked_at
        if existing.category == "Uncategorized":
            existing.category = category
            existing.category_suggested = video.category_suggested
        return existing

    created = models.Video(
        id=video_id_for(video),
        title=video.title,
        channel=video.channel,
        url=video.url,
        liked_at=video.liked_at,
        category=category,
        category_suggested=video.category_suggested,
    )
    db.add(created)
    return created


def metadata_dict(db: Session) -> dict:
    rows = db.query(models.AppMetadata).all()
    result = {}
    for row in rows:
        try:
            result[row.key] = json.loads(row.value)
        except json.JSONDecodeError:
            result[row.key] = row.value
    return result


def set_metadata(db: Session, metadata: dict) -> None:
    for key, value in metadata.items():
        serialized = json.dumps(value)
        row = db.query(models.AppMetadata).filter(models.AppMetadata.key == key).first()
        if row:
            row.value = serialized
        else:
            db.add(models.AppMetadata(key=key, value=serialized))


def state_payload(db: Session) -> schemas.StateOut:
    ensure_default_categories(db)
    videos = db.query(models.Video).order_by(models.Video.liked_at.desc(), models.Video.title.asc()).all()
    categories = [item.name for item in db.query(models.Category).order_by(models.Category.name.asc()).all()]
    deleted_urls = [item.url for item in db.query(models.DeletedVideo).order_by(models.DeletedVideo.deleted_at.desc()).all()]
    return schemas.StateOut(
        videos=videos,
        categories=categories,
        deleted_video_urls=deleted_urls,
        metadata=metadata_dict(db),
    )


@app.get("/state", response_model=schemas.StateOut)
def get_state(db: Session = Depends(get_db)):
    payload = state_payload(db)
    db.commit()
    return payload


@app.put("/state", response_model=schemas.StateOut)
def put_state(state: schemas.StateIn, db: Session = Depends(get_db)):
    db.query(models.Video).delete()
    db.query(models.Category).delete()
    db.query(models.DeletedVideo).delete()
    db.query(models.AppMetadata).delete()

    for category in state.categories:
        get_or_create_category(db, category)

    get_or_create_category(db, "Uncategorized")

    for url in state.deleted_video_urls:
        clean_url = (url or "").strip()
        if clean_url:
            db.add(models.DeletedVideo(url=clean_url))

    for video in state.videos:
        upsert_video(db, video)

    set_metadata(db, state.metadata)
    db.commit()
    return state_payload(db)


@app.get("/videos", response_model=list[schemas.VideoOut])
def get_videos(db: Session = Depends(get_db)):
    return db.query(models.Video).order_by(models.Video.liked_at.desc(), models.Video.title.asc()).all()


@app.post("/videos/import", response_model=schemas.StateOut)
def import_videos(payload: schemas.VideoImport, db: Session = Depends(get_db)):
    for category in payload.categories:
        get_or_create_category(db, category)

    for url in payload.deleted_video_urls:
        clean_url = (url or "").strip()
        if clean_url and not db.query(models.DeletedVideo).filter(models.DeletedVideo.url == clean_url).first():
            db.add(models.DeletedVideo(url=clean_url))

    for video in payload.videos:
        upsert_video(db, video)

    db.commit()
    return state_payload(db)


@app.patch("/videos/{video_id}", response_model=schemas.VideoOut)
def update_video(video_id: str, payload: schemas.VideoUpdate, db: Session = Depends(get_db)):
    video = db.get(models.Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    updates = payload.model_dump(exclude_unset=True)
    if "category" in updates and updates["category"]:
        get_or_create_category(db, updates["category"])

    for key, value in updates.items():
        setattr(video, key, value)

    db.commit()
    db.refresh(video)
    return video


@app.delete("/videos/{video_id}")
def delete_video(video_id: str, db: Session = Depends(get_db)):
    video = db.get(models.Video, video_id)
    if not video:
        raise HTTPException(status_code=404, detail="Video not found.")

    if not db.query(models.DeletedVideo).filter(models.DeletedVideo.url == video.url).first():
        db.add(models.DeletedVideo(url=video.url))

    db.delete(video)
    db.commit()
    return {"ok": True}


@app.get("/categories", response_model=list[schemas.CategoryOut])
def get_categories(db: Session = Depends(get_db)):
    ensure_default_categories(db)
    db.commit()
    return db.query(models.Category).order_by(models.Category.name.asc()).all()


@app.post("/categories", response_model=schemas.CategoryOut)
def create_category(payload: schemas.CategoryCreate, db: Session = Depends(get_db)):
    category = get_or_create_category(db, payload.name)
    db.commit()
    db.refresh(category)
    return category


@app.patch("/categories/{category_id}", response_model=schemas.CategoryOut)
def update_category(category_id: int, payload: schemas.CategoryUpdate, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")

    old_name = category.name
    new_name = clean_name(payload.name)
    duplicate = db.query(models.Category).filter(models.Category.name == new_name).first()
    if duplicate and duplicate.id != category_id:
        raise HTTPException(status_code=409, detail="Category already exists.")

    category.name = new_name
    db.query(models.Video).filter(models.Video.category == old_name).update({"category": new_name})
    db.commit()
    db.refresh(category)
    return category


@app.delete("/categories/{category_id}")
def delete_category(category_id: int, db: Session = Depends(get_db)):
    category = db.get(models.Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
    if category.name == "Uncategorized":
        raise HTTPException(status_code=400, detail="Uncategorized cannot be deleted.")

    db.query(models.Video).filter(models.Video.category == category.name).update(
        {"category": "Uncategorized", "category_suggested": False}
    )
    db.delete(category)
    get_or_create_category(db, "Uncategorized")
    db.commit()
    return {"ok": True}
