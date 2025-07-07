import os
from PIL import Image
import torch
import torchvision.transforms as transforms
from typing import Dict, Any
import torchvision.models as models
from torch import nn
from sqlmodel import Session, select
from sqlalchemy import func
from backend.database import SessionLocal
from models import MedicinalPlant
from torchvision.models import EfficientNet_B4_Weights  # Import the weights enum

class PlantClassifier:
    def __init__(self, model_path: str = None):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # Load pre-trained EfficientNet-B4 with updated weights parameter
        self.model = models.efficientnet_b4(weights=EfficientNet_B4_Weights.DEFAULT)
        
        # Get number of classes from database using func.count()
        with SessionLocal() as db:
            num_classes = db.exec(select(func.count()).select_from(MedicinalPlant)).one()
            num_classes = int(num_classes)
        
        # Modify the final layer for your number of plant classes
        self.model.classifier[1] = nn.Linear(self.model.classifier[1].in_features, num_classes)
        
        # Load fine-tuned weights if they exist
        if model_path and os.path.exists(model_path):
            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
        
        self.model = self.model.to(self.device)
        self.model.eval()
        
        # Define image transformations
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Resize((380, 380)),  # EfficientNet-B4 input size
            transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                                 std=[0.229, 0.224, 0.225])
        ])
        
        # Create class mapping
        self.idx_to_plant = self._create_class_mapping()
    
    def _create_class_mapping(self) -> Dict[int, Dict[str, Any]]:
        """Create mapping from class index to plant information."""
        with SessionLocal() as db:
            plants = db.exec(select(MedicinalPlant)).all()
            return {idx: {
                'plant_name': plant.plant_name,
                'scientific_name': plant.scientific_name,
                'local_names': plant.local_names,
                'parts_used': plant.parts_used,
                'uses': plant.uses,
                'benefits': plant.benefits,
                'side_effects': plant.side_effects
            } for idx, plant in enumerate(plants)}
    
    def preprocess_image(self, image_path: str) -> torch.Tensor:
        """Preprocess the image for model input."""
        img = Image.open(image_path)
        img = img.convert('RGB')
        img_tensor = self.transform(img)
        return img_tensor.unsqueeze(0)
    
    def predict(self, image_path: str) -> Dict[str, Any]:
        """Make prediction on the input image."""
        img_tensor = self.preprocess_image(image_path)
        img_tensor = img_tensor.to(self.device)
        
        with torch.no_grad():
            outputs = self.model(img_tensor)
            probabilities = torch.nn.functional.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probabilities, 1)
            
            # Get plant information from the predicted class
            plant_info = self.idx_to_plant[predicted.item()]
            
            return {
                "plant_name": plant_info['plant_name'],
                "scientific_name": plant_info['scientific_name'],
                "confidence": confidence.item(),
                "local_names": plant_info['local_names'],
                "parts_used": plant_info['parts_used'],
                "uses": plant_info['uses'],
                "benefits": plant_info['benefits'],
                "side_effects": plant_info['side_effects']
            }
    
    def get_plant_details(self, plant_name: str) -> Dict[str, Any]:
        """Get detailed information about a plant from the database."""
        with SessionLocal() as db:
            plant = db.exec(
                select(MedicinalPlant).where(MedicinalPlant.plant_name == plant_name)
            ).first()
            
            if not plant:
                return {
                    "description": "Plant not found in database.",
                    "care_instructions": "No care instructions available.",
                    "growing_conditions": "No growing conditions available.",
                    "common_uses": "No common uses available."
                }
            
            return {
                "description": f"A medicinal plant known as {plant.plant_name} ({plant.scientific_name})",
                "care_instructions": "Consult with a healthcare professional before use.",
                "growing_conditions": "Native to various regions, consult local gardening experts for specific growing conditions.",
                "common_uses": plant.uses,
                "benefits": plant.benefits,
                "side_effects": plant.side_effects,
                "parts_used": plant.parts_used,
                "local_names": plant.local_names
            }
