from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, status, Header, Response
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import os
import json
import torch
import logging
import cloudinary
import cloudinary.uploader
from dotenv import load_dotenv
from ai_model.plant_classifier import PlantClassifier
from database import SessionLocal, get_db, create_db_and_tables
from models import PlantIdentification, UserCreate, User, Token, Plant, Activity
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

# Get environment variables with defaults
DATABASE_URL = os.getenv("DATABASE_URL")
MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(__file__), "ai_model", "best_plant_classifier.pth"))
INATURALIST_DATA_PATH = os.getenv("INATURALIST_DATA_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "inaturalist_plant_dataset.json"))
MEDICINAL_DATA_PATH = os.getenv("MEDICINAL_DATA_PATH", os.path.join(os.path.dirname(os.path.dirname(__file__)), "medicinal_plant_dataset.json"))
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "TcqnjHDfLA7WbmV8Uex9rltKswFYQpJX")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Initialize FastAPI app
app = FastAPI(title="MedPlant API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"(http://localhost:3000|https://.*\.vercel\.app|https://.*\.onrender\.com)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Global variables for lazy loading
model = None
inaturalist_data = None
default_label_to_idx = None
idx_to_label = None
device = 'cuda' if torch.cuda.is_available() else 'cpu'

def load_model_once():
    global model, inaturalist_data, default_label_to_idx, idx_to_label
    if model is None:
        try:
            # Load inaturalist data for class labels
            with open(INATURALIST_DATA_PATH, 'r') as f:
                inaturalist_data = json.load(f)
            scientific_names = {entry["scientific_name"].lower().strip() for entry in inaturalist_data}
            num_classes = len(scientific_names)
            default_label_to_idx = {name: idx for idx, name in enumerate(sorted(scientific_names))}
            idx_to_label = {idx: name for name, idx in default_label_to_idx.items()}

            # Initialize model with label_to_idx
            model = PlantClassifier(num_classes=num_classes, label_to_idx=default_label_to_idx)
            
            # Load trained model weights
            if os.path.exists(MODEL_PATH):
                checkpoint = torch.load(MODEL_PATH, map_location=device, weights_only=False)
                model_state_dict = checkpoint.get('model_state_dict', {})
                model.load_state_dict(model_state_dict, strict=False)
                if 'label_to_idx' in checkpoint:
                    model.label_to_idx = checkpoint['label_to_idx']
                    idx_to_label = {idx: name for name, idx in model.label_to_idx.items()}
                    logger.info(f"Loaded label_to_idx from checkpoint with {len(model.label_to_idx)} classes")
                model.to(device)
                logger.info(f"Loaded model from {MODEL_PATH} with {num_classes} classes")
            else:
                raise FileNotFoundError(f"Model not found at {MODEL_PATH}")
        except Exception as e:
            logger.error(f"Model initialization error: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Error initializing model: {str(e)}")

def get_medicinal_data():
    try:
        with open(MEDICINAL_DATA_PATH, 'r') as f:
            return {item["scientific_name"].lower().strip(): item for item in json.load(f)}
    except FileNotFoundError:
        logger.warning(f"Medicinal data file not found at {MEDICINAL_DATA_PATH}")
        return {}
    except Exception as e:
        logger.error(f"Error loading medicinal data: {str(e)}")
        return {}

# Security setup
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

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
        # Load model if not loaded
        load_model_once()
        
        # Create temp directory with cleanup
        temp_dir = "temp"
        os.makedirs(temp_dir, exist_ok=True)
        temp_location = os.path.join(temp_dir, file.filename)
        
        try:
            # Read file in chunks to save memory
            chunk_size = 1024 * 1024  # 1MB chunks
            with open(temp_location, "wb") as file_object:
                while chunk := await file.read(chunk_size):
                    file_object.write(chunk)
            
            # Get prediction
            prediction = model.predict(temp_location)
            logger.info(f"Prediction result: {prediction}")
            predicted_idx = prediction.get("predicted_idx", -1)
            confidence = prediction.get("confidence", 0.0)
            
            # Upload to Cloudinary with resource type auto
            upload_result = cloudinary.uploader.upload(
                temp_location,
                resource_type="auto",
                chunk_size=chunk_size
            )
            image_url = upload_result['secure_url']
        finally:
            # Ensure temp file is removed
            if os.path.exists(temp_location):
                os.remove(temp_location)
        
        # Validate and map index to scientific name
        if predicted_idx < 0 or predicted_idx >= len(idx_to_label):
            logger.error(f"Invalid prediction index: {predicted_idx}, confidence: {confidence}")
            raise ValueError(f"Invalid prediction index: {predicted_idx}. Falling back to unknown.")
        
        scientific_name = idx_to_label.get(predicted_idx, f"unknown_class_{predicted_idx}")
        plant_name = next(
            (entry["common_name"] for entry in inaturalist_data 
             if entry["scientific_name"].lower().strip() == scientific_name),
            scientific_name.split()[-1]
        )
        
        # Get medicinal data
        medicinal_info = get_medicinal_data().get(scientific_name, {
            "local_names": [],
            "uses": [],
            "benefits": [],
            "side_effects": []
        })
        
        # Create identification record
        identification = PlantIdentification(
            plant_name=plant_name,
            scientific_name=scientific_name,
            confidence_score=confidence,
            image_url=image_url,
            local_names=", ".join(medicinal_info.get("local_names", [])) or None,
            uses=", ".join(medicinal_info.get("uses", [])) or None,
            benefits=", ".join(medicinal_info.get("benefits", [])) or None,
            side_effects=", ".join(medicinal_info.get("side_effects", [])) or None,
            user_id=current_user.id
        )
        
        # Create activity record
        activity = Activity(
            user_id=current_user.id,
            action=f"Identified {plant_name} ({scientific_name}) with {round(confidence * 100)}% confidence"
        )
        
        # Batch database operations
        db.add(identification)
        db.add(activity)
        db.commit()
        db.refresh(identification)
        
        # Clean up memory
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        return {
            "status": "success",
            "message": "Plant identification completed",
            "data": {
                "plant_name": plant_name,
                "confidence": confidence,
                "details": {
                    "scientific_name": scientific_name,
                    "local_names": medicinal_info.get("local_names", []),
                    "uses": medicinal_info.get("uses", []),
                    "benefits": medicinal_info.get("benefits", []),
                    "side_effects": medicinal_info.get("side_effects", [])
                },
                "image_url": image_url
            }
        }
    except ValueError as e:
        logger.error(f"Prediction error: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Prediction error: {str(e)}")
    except Exception as e:
        logger.error(f"Unexpected error: {str(e)}")
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
        # Get total counts
        plant_count = db.exec(select(Plant).where(Plant.user_id == current_user.id)).count()
        identification_count = db.exec(select(PlantIdentification).where(PlantIdentification.user_id == current_user.id)).count()
        
        # Get this month's identifications
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_count = db.exec(
            select(PlantIdentification)
            .where(
                PlantIdentification.user_id == current_user.id,
                PlantIdentification.created_at >= current_month_start
            )
        ).count()
        
        # Calculate accuracy rate based on confidence scores
        if identification_count > 0:
            avg_confidence = db.exec(
                select(func.avg(PlantIdentification.confidence_score))
                .where(PlantIdentification.user_id == current_user.id)
            ).first()[0]
            accuracy_rate = f"{round(avg_confidence * 100)}%" if avg_confidence else "0%"
        else:
            accuracy_rate = "0%"
            
        return {
            "plants_identified": identification_count,
            "accuracyRate": accuracy_rate,
            "saved_plants": plant_count,
            "thisMonth": this_month_count
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.get("/api/user/identifications")
async def get_user_identifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        query = select(PlantIdentification)\
            .where(PlantIdentification.user_id == current_user.id)\
            .order_by(PlantIdentification.created_at.desc())\
            .limit(10)
        return db.exec(query).all()
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

@app.get("/api/auth/validate")
async def validate_token(current_user: User = Depends(get_current_user)):
    access_token = create_access_token(
        data={"sub": current_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "email": current_user.email,
        "first_name": current_user.first_name,
        "last_name": current_user.last_name,
        "access_token": access_token
    }

@app.get("/api/user/plant_of_the_day")
async def get_plant_of_the_day(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get a random plant identification from the user's history
        random_identification = db.exec(
            select(PlantIdentification)
            .where(PlantIdentification.user_id == current_user.id)
            .order_by(func.random())
            .limit(1)
        ).first()
        
        if not random_identification:
            raise HTTPException(status_code=404, detail="No plant identifications found")
            
        return {
            "name": random_identification.plant_name,
            "scientific_name": random_identification.scientific_name,
            "image_url": random_identification.image_url,
            "description": random_identification.uses or "No description available"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.get("/api/user/progress")
async def get_user_progress(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get total counts
        plants_identified = db.exec(select(PlantIdentification).where(PlantIdentification.user_id == current_user.id)).count()
        favorites = db.exec(select(PlantIdentification).where(
            PlantIdentification.user_id == current_user.id,
            PlantIdentification.is_favorite == True
        )).count()
        
        # Get this month's identifications
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        this_month_count = db.exec(
            select(PlantIdentification)
            .where(
                PlantIdentification.user_id == current_user.id,
                PlantIdentification.created_at >= current_month_start
            )
        ).count()
        
        # Calculate accuracy rate based on confidence scores
        if plants_identified > 0:
            avg_confidence = db.exec(
                select(func.avg(PlantIdentification.confidence_score))
                .where(PlantIdentification.user_id == current_user.id)
            ).first()[0]
            accuracy_rate = round(float(avg_confidence) * 100, 1) if avg_confidence else 0
        else:
            accuracy_rate = 0
            
        return {
            "plants_identified": plants_identified,
            "favorites": favorites,
            "this_month_count": this_month_count,
            "accuracy_rate": accuracy_rate
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.get("/api/user/activity_feed")
async def get_activity_feed(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        # Get the last 20 activities, ordered by most recent first
        activities = db.exec(
            select(Activity)
            .where(Activity.user_id == current_user.id)
            .order_by(Activity.timestamp.desc())
            .limit(20)
        ).all()
        
        return [
            {
                "id": activity.id,
                "action": activity.action,
                "timestamp": activity.timestamp.isoformat(),
            }
            for activity in activities
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")

@app.post("/api/auth/logout")
async def logout(current_user: User = Depends(get_current_user)):
    return {"message": "Successfully logged out"}

@app.delete("/api/user/identifications/{identification_id}")
async def delete_identification(
    identification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        identification = db.exec(
            select(PlantIdentification)
            .where(
                PlantIdentification.id == identification_id,
                PlantIdentification.user_id == current_user.id
            )
        ).first()
        
        if not identification:
            raise HTTPException(status_code=404, detail="Identification not found")
        
        db.delete(identification)
        db.commit()
        
        return {"message": "Identification deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Use Render's PORT if available
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False  # Set to True only for local dev
    )


@app.get("/api/plants/{scientific_name}")
async def get_plant_details(scientific_name: str, db: Session = Depends(get_db)):
    try:
        # Read the medicinal plant dataset
        with open('medicinal_plant_dataset.json', 'r', encoding='utf-8') as f:
            plants_data = json.load(f)
        
        # Find the plant with matching scientific name
        plant_details = next(
            (plant for plant in plants_data if plant["scientific_name"].lower() == scientific_name.lower()),
            None
        )
        
        if not plant_details:
            raise HTTPException(status_code=404, detail="Plant not found")
            
        return plant_details
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/user/identifications/{identification_id}/favorite")
async def toggle_favorite(
    identification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        identification = db.exec(
            select(PlantIdentification)
            .where(
                PlantIdentification.id == identification_id,
                PlantIdentification.user_id == current_user.id
            )
        ).first()
        
        if not identification:
            raise HTTPException(status_code=404, detail="Identification not found")
        
        identification.is_favorite = not identification.is_favorite
        db.add(identification)
        db.commit()
        db.refresh(identification)
        
        return {"is_favorite": identification.is_favorite}
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error. Please try again later.")