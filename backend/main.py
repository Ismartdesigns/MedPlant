from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from typing import List, Optional
import os
from dotenv import load_dotenv
from ai_model.plant_classifier import PlantClassifier
from database import SessionLocal, get_db, create_db_and_tables
from models import PlantIdentification, UserCreate, User, Token, Plant, Activity
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Get environment variables with defaults
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Admin123@localhost:5432/medplant?sslmode=prefer")
MODEL_PATH = os.getenv("MODEL_PATH", "./ai_model/plant_classification_model")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "TcqnjHDfLA7WbmV8Uex9rltKswFYQpJX")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Initialize FastAPI app
app = FastAPI(title="MedPlant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Model initialization
model = PlantClassifier(model_path=MODEL_PATH)

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")  # Fixed path

# Security functions
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=15))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.exec(select(User).where(User.email == email)).first()
    if user is None:
        raise credentials_exception
    return user

# Routes
@app.get("/")
async def root():
    return {"message": "Welcome to MedPlant API"}

@app.post("/api/identify")
async def identify_plant(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        file_location = f"temp/{file.filename}"
        os.makedirs("temp", exist_ok=True)
        with open(file_location, "wb+") as file_object:
            file_object.write(await file.read())
        prediction = model.predict(file_location)
        details = model.get_plant_details(prediction["plant_name"])
        identification = PlantIdentification(
            plant_name=prediction["plant_name"],
            scientific_name=prediction["scientific_name"],
            confidence_score=prediction["confidence"],
            image_path=file_location,
            user_id=current_user.id
        )
        db.add(identification)
        db.commit()
        db.refresh(identification)
        return {
            "status": "success",
            "message": "Plant identification completed",
            "data": {
                "plant_name": prediction["plant_name"],
                "confidence": prediction["confidence"],
                "details": {
                    "scientific_name": prediction["scientific_name"],
                    "local_names": prediction["local_names"],
                    "parts_used": prediction["parts_used"],
                    "description": details["description"],
                    "care_instructions": details["care_instructions"],
                },
                "medicinal_info": {
                    "uses": prediction["uses"],
                    "benefits": prediction["benefits"],
                    "side_effects": prediction["side_effects"]
                },
                "image_url": f"/temp/{file.filename}"
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/plants", response_model=List[Plant])
async def get_plants(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return db.exec(select(Plant).where(Plant.user_id == current_user.id)).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/{user_id}/plants", response_model=List[Plant])
async def get_user_plants(user_id: int, db: Session = Depends(get_db)):
    try:
        return db.exec(select(Plant).where(Plant.user_id == user_id)).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/user/stats")
async def get_user_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        plant_count = db.exec(select(Plant).where(Plant.user_id == current_user.id)).count()
        identification_count = db.exec(select(PlantIdentification).where(PlantIdentification.user_id == current_user.id)).count()
        return {
            "plants_identified": identification_count,
            "accuracyRate": "97%",  # Replace with actual logic if needed
            "saved_plants": plant_count,
            "thisMonth": 18  # Replace with dynamic calculation if needed
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.get("/api/user/identifications")
async def get_user_identifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return db.exec(select(PlantIdentification).where(PlantIdentification.user_id == current_user.id)).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.post("/api/auth/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    try:
        user = db.exec(select(User).where(User.email == form_data.username)).first()
        if not user or not pwd_context.verify(form_data.password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        access_token = create_access_token(
            data={"sub": user.email},
            expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": {
                "email": user.email,
                "first_name": user.first_name,
                "last_name": user.last_name
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/auth/signup")
async def signup(user: UserCreate, db: Session = Depends(get_db)):
    try:
        if db.exec(select(User).where(User.email == user.email)).first():
            raise HTTPException(status_code=400, detail="Email already registered")
        if user.password != user.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        hashed_password = get_password_hash(user.password)
        db_user = User(
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            hashed_password=hashed_password
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        access_token = create_access_token(data={"sub": db_user.email})
        return {
            "message": "User created successfully",
            "user": {
                "email": db_user.email,
                "first_name": db_user.first_name,
                "last_name": db_user.last_name
            },
            "access_token": access_token
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/auth/validate", response_model=User)
async def validate_token(current_user: User = Depends(get_current_user)):
    return current_user

@app.get("/api/user/plant_of_the_day")
async def get_plant_of_the_day(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return db.exec(select(Plant).where(Plant.is_plant_of_the_day == True)).first()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.get("/api/user/progress")
async def get_user_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return {
            "plants_identified": db.exec(select(PlantIdentification).where(PlantIdentification.user_id == current_user.id)).count(),
            "favorites": db.exec(select(Plant).where(Plant.user_id == current_user.id, Plant.is_favorite == True)).count(),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.get("/api/user/activity_feed")
async def get_activity_feed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        return db.exec(select(Activity).where(Activity.user_id == current_user.id)).all()
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

if __name__ == "__main__":
    try:
        import uvicorn
        uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
    except KeyboardInterrupt:
        print("Process interrupted. Cleaning up...")
