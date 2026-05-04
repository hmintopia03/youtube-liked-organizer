from typing import Any

from pydantic import BaseModel, Field


class VideoBase(BaseModel):
    title: str
    channel: str
    url: str
    liked_at: str
    category: str = "Uncategorized"
    category_suggested: bool = False


class VideoCreate(VideoBase):
    id: str | None = None


class VideoUpdate(BaseModel):
    title: str | None = None
    channel: str | None = None
    url: str | None = None
    liked_at: str | None = None
    category: str | None = None
    category_suggested: bool | None = None


class VideoOut(VideoBase):
    id: str

    model_config = {"from_attributes": True}


class VideoImport(BaseModel):
    videos: list[VideoCreate]
    categories: list[str] = Field(default_factory=list)
    deleted_video_urls: list[str] = Field(default_factory=list)


class CategoryCreate(BaseModel):
    name: str


class CategoryUpdate(BaseModel):
    name: str


class CategoryOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class StateIn(BaseModel):
    videos: list[VideoCreate] = Field(default_factory=list)
    categories: list[str] = Field(default_factory=list)
    deleted_video_urls: list[str] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class StateOut(BaseModel):
    videos: list[VideoOut]
    categories: list[str]
    deleted_video_urls: list[str]
    metadata: dict[str, Any]
