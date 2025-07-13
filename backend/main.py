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
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:Ivy%40123@localhost:5432/medplant?sslmode=prefer")
MODEL_PATH = os.getenv("MODEL_PATH", "C:/xampp/htdocs/MedPlant/training_artifacts/best_plant_classifier.pth")
INATURALIST_DATA_PATH = os.getenv("INATURALIST_DATA_PATH", "C:/xampp/htdocs/MedPlant/inaturalist_plant_dataset.json")
MEDICINAL_DATA_PATH = os.getenv("MEDICINAL_DATA_PATH", "C:/xampp/htdocs/MedPlant/medicinal_plant_dataset.json")
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "TcqnjHDfLA7WbmV8Uex9rltKswFYQpJX")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

# Initialize FastAPI app
app = FastAPI(title="MedPlant API")

# Configure CORS
# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Create database tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

# Model initialization
device = 'cuda' if torch.cuda.is_available() else 'cpu'
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
    
    # Load trained model weights with strict loading and mapping
    if os.path.exists(MODEL_PATH):
        checkpoint = torch.load(MODEL_PATH, map_location=device)
        model_state_dict = checkpoint.get('model_state_dict', {})
        model.load_state_dict(model_state_dict, strict=False)  # Allow missing keys
        if 'label_to_idx' in checkpoint:
            model.label_to_idx = checkpoint['label_to_idx']
            idx_to_label = {idx: name for name, idx in model.label_to_idx.items()}
            logger.info(f"Loaded label_to_idx from checkpoint with {len(model.label_to_idx)} classes")
        else:
            logger.warning("No label_to_idx in checkpoint, using inaturalist data")
        model.to(device)
        logger.info(f"Loaded model from {MODEL_PATH} with {num_classes} classes")
    else:
        raise FileNotFoundError(f"Model or inaturalist data file not found at {MODEL_PATH}")
except FileNotFoundError as e:
    raise HTTPException(status_code=500, detail=f"Model or inaturalist data file not found: {str(e)}")
except Exception as e:
    logger.error(f"Model initialization error: {str(e)}")
    raise HTTPException(status_code=500, detail=f"Error initializing model: {str(e)}")

# Load medicinal data if available
medicinal_data = {}
try:
    with open(MEDICINAL_DATA_PATH, 'r') as f:
        medicinal_data = {item["scientific_name"].lower().strip(): item for item in json.load(f)}
    logger.info(f"Loaded medicinal data for {len(medicinal_data)} species")
except FileNotFoundError:
    logger.warning(f"Medicinal data file not found at {MEDICINAL_DATA_PATH}, using basic data only")
except Exception as e:
    logger.error(f"Error loading medicinal data: {str(e)}")

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
        # Save file temporarily
        contents = await file.read()
        os.makedirs("temp", exist_ok=True)
        temp_location = os.path.join("temp", file.filename)
        with open(temp_location, "wb+") as file_object:
            file_object.write(contents)
        
        # Get prediction
        prediction = model.predict(temp_location)
        logger.info(f"Prediction result: {prediction}")
        predicted_idx = prediction.get("predicted_idx", -1)
        confidence = prediction.get("confidence", 0.0)
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(temp_location)
        image_url = upload_result['secure_url']
        
        # Remove temporary file
        os.remove(temp_location)
        
        # Validate and map index to scientific name
        if predicted_idx < 0 or predicted_idx >= len(idx_to_label):
            logger.error(f"Invalid prediction index: {predicted_idx}, confidence: {confidence}")
            raise ValueError(f"Invalid prediction index: {predicted_idx}. Falling back to unknown.")
        scientific_name = idx_to_label.get(predicted_idx, f"unknown_class_{predicted_idx}")
        plant_name = next((entry["common_name"] for entry in inaturalist_data if entry["scientific_name"].lower().strip() == scientific_name), scientific_name.split()[-1])
        
        # Enrich with medicinal data if available
        medicinal_info = medicinal_data.get(scientific_name, {
            "local_names": [],
            "uses": [],
            "benefits": [],
            "side_effects": []
        })
        enriched_prediction = {
            "plant_name": plant_name,
            "scientific_name": scientific_name,
            "confidence": confidence,
            "local_names": medicinal_info.get("local_names", []),
            "uses": medicinal_info.get("uses", []),
            "benefits": medicinal_info.get("benefits", []),
            "side_effects": medicinal_info.get("side_effects", [])
        }
        
        # Create identification record
        identification = PlantIdentification(
            plant_name=enriched_prediction["plant_name"],
            scientific_name=enriched_prediction["scientific_name"],
            confidence_score=enriched_prediction["confidence"],
            image_url=image_url,
            local_names=", ".join(enriched_prediction["local_names"]) if enriched_prediction["local_names"] else None,
            uses=", ".join(enriched_prediction["uses"]) if enriched_prediction["uses"] else None,
            benefits=", ".join(enriched_prediction["benefits"]) if enriched_prediction["benefits"] else None,
            side_effects=", ".join(enriched_prediction["side_effects"]) if enriched_prediction["side_effects"] else None,
            user_id=current_user.id
        )
        db.add(identification)
        
        # Create activity record
        activity = Activity(
            user_id=current_user.id,
            action=f"Identified {plant_name} ({scientific_name}) with {round(confidence * 100)}% confidence"
        )
        db.add(activity)
        
        db.commit()
        db.refresh(identification)
        
        return {
            "status": "success",
            "message": "Plant identification completed",
            "data": {
                "plant_name": enriched_prediction["plant_name"],
                "confidence": enriched_prediction["confidence"],
                "details": {
                    "scientific_name": enriched_prediction["scientific_name"],
                    "local_names": enriched_prediction["local_names"],
                    "uses": enriched_prediction["uses"],
                    "benefits": enriched_prediction["benefits"],
                    "side_effects": enriched_prediction["side_effects"]
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
    try:
        import uvicorn
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            reload_excludes=["**/training_images/*"]
        )
    except KeyboardInterrupt:
        print("Process interrupted. Cleaning up...")


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