from sqlmodel import SQLModel, Session, create_engine
import os
from dotenv import load_dotenv

load_dotenv()

SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Admin123@localhost:5432/medplant")

engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Use SQLModel as the base class
Base = SQLModel

# Create a session factory
SessionLocal = lambda: Session(engine)

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_db():
    with Session(engine) as session:
        yield session 