from database import engine, create_db_and_tables
import os
from dotenv import load_dotenv
from models import MedicinalPlant, User

def init_db():
    # Load environment variables
    load_dotenv()
    
    # Create all tables
    create_db_and_tables()
    print("Database tables created successfully!")

if __name__ == "__main__":
    init_db() 