from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func

from database import Base


class Video(Base):
    __tablename__ = "videos"

    id = Column(String, primary_key=True, index=True)
    title = Column(String, nullable=False)
    channel = Column(String, nullable=False)
    url = Column(Text, nullable=False, unique=True, index=True)
    liked_at = Column(String, nullable=False)
    category = Column(String, nullable=False, default="Uncategorized")
    category_suggested = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, unique=True, index=True)


class DeletedVideo(Base):
    __tablename__ = "deleted_videos"

    id = Column(Integer, primary_key=True, index=True)
    url = Column(Text, nullable=False, unique=True, index=True)
    deleted_at = Column(DateTime(timezone=True), server_default=func.now())


class AppMetadata(Base):
    __tablename__ = "app_metadata"

    key = Column(String, primary_key=True)
    value = Column(Text, nullable=False)
