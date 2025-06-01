from sqlmodel import SQLModel, Field, Relationship
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: Optional[int] = Field(default=None, primary_key=True)
    first_name: str
    last_name: str
    email: str = Field(unique=True, index=True)
    hashed_password: str
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    friendships: List["Friendship"] = Relationship(
        back_populates="user",
        sa_relationship_kwargs={"foreign_keys": "[Friendship.user_id]"}
    )
    friends: List["Friendship"] = Relationship(
        back_populates="friend",
        sa_relationship_kwargs={"foreign_keys": "[Friendship.friend_id]"}
    )
    identifications: List["PlantIdentification"] = Relationship(
        back_populates="user"
    )
    activities: List["Activity"] = Relationship(
        back_populates="user"
    )


class UserCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    confirm_password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class PlantIdentification(SQLModel, table=True):
    __tablename__ = "plant_identifications"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    plant_name: str
    scientific_name: str
    confidence_score: float
    image_path: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="identifications")


class Dependency(SQLModel, table=True):
    __tablename__ = "dependencies"

    id: Optional[int] = Field(default=None, primary_key=True)
    package_name: str = Field(unique=True, index=True)
    version: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MedicinalPlant(SQLModel, table=True):
    __tablename__ = "medicinal_plants"

    id: Optional[int] = Field(default=None, primary_key=True)
    image_name: str
    plant_name: str
    scientific_name: str
    local_names: str
    parts_used: str
    uses: str
    benefits: str
    side_effects: str
    location_found: Optional[str] = None
    date_collected: Optional[str] = None
    device_used: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Plant(SQLModel, table=True):
    __tablename__ = "plants"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    scientific_name: str
    description: Optional[str] = None
    uses: Optional[str] = None
    benefits: Optional[str] = None
    side_effects: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Friendship(SQLModel, table=True):
    __tablename__ = "friendships"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    friend_id: int = Field(foreign_key="users.id")

    user: User = Relationship(
        back_populates="friendships",
        sa_relationship_kwargs={"foreign_keys": "[Friendship.user_id]"}
    )
    friend: User = Relationship(
        back_populates="friends",
        sa_relationship_kwargs={"foreign_keys": "[Friendship.friend_id]"}
    )


class Activity(SQLModel, table=True):
    __tablename__ = "activities"

    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    action: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    user: User = Relationship(back_populates="activities")


# Resolve forward references after all classes are declared
User.update_forward_refs()
PlantIdentification.update_forward_refs()
Friendship.update_forward_refs()
Activity.update_forward_refs()
