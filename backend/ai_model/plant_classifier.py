import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision
import os
from PIL import Image
import logging
import gc

logger = logging.getLogger(__name__)

class PlantClassifier(nn.Module):
    def __init__(self, num_classes, label_to_idx=None, model_path=None):
        super(PlantClassifier, self).__init__()
        self.num_classes = num_classes
        self.label_to_idx = label_to_idx or {}
        self.idx_to_label = {idx: name for name, idx in self.label_to_idx.items()} if self.label_to_idx else {}
        
        # Use ResNet18 as a base with efficient memory usage
        self.base_model = torchvision.models.resnet18(weights=None)
        num_features = self.base_model.fc.in_features
        self.base_model.fc = nn.Linear(num_features, num_classes)
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.to(self.device)
        
        # Optimize image size for memory efficiency
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),  # Standard ResNet size
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        if model_path and os.path.exists(model_path):
            # Load model with memory optimization
            state_dict = torch.load(model_path, map_location=self.device)
            self.load_state_dict(state_dict, strict=False)
            logger.info(f"Model loaded from {model_path} on {self.device}")
        
        # Set model to eval mode for inference
        self.eval()
    
    def preprocess_image(self, image_path):
        try:
            # Open and process image with memory-efficient mode
            with Image.open(image_path).convert('RGB') as img:
                if img.size[0] <= 0 or img.size[1] <= 0:
                    raise ValueError("Invalid image dimensions")
                transformed = self.transform(img)
                return transformed
        except Exception as e:
            logger.error(f"Image preprocessing failed: {str(e)}")
            return None
        finally:
            # Ensure memory cleanup
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
    
    def forward(self, x):
        return self.base_model(x)
    
    def predict(self, image_path):
        self.eval()
        try:
            # Clear memory before prediction
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            # Preprocess image
            image = self.preprocess_image(image_path)
            if image is None:
                raise ValueError("Failed to preprocess image")
            
            # Move to device and predict
            image = image.to(self.device)
            with torch.no_grad():
                # Process in smaller batch for memory efficiency
                output = self.forward(image.unsqueeze(0))
                probabilities = torch.softmax(output, dim=1)[0]
                confidence, predicted = torch.max(probabilities, 0)
                
                predicted_idx = predicted.item()
                confidence_val = confidence.item()
                
                # Clear intermediate tensors
                del output, probabilities, image
                torch.cuda.empty_cache() if torch.cuda.is_available() else None
                
                return {
                    "predicted_idx": predicted_idx,
                    "confidence": confidence_val
                }
        except Exception as e:
            logger.error(f"Prediction failed: {str(e)}")
            raise
        finally:
            # Ensure memory cleanup
            gc.collect()
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
