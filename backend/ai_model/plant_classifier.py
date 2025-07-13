import torch
import torch.nn as nn
import torchvision.transforms as transforms
import torchvision
import os
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class PlantClassifier(nn.Module):
    def __init__(self, num_classes, label_to_idx=None, model_path=None):
        super(PlantClassifier, self).__init__()
        self.num_classes = num_classes
        self.label_to_idx = label_to_idx or {}
        self.idx_to_label = {idx: name for name, idx in self.label_to_idx.items()} if self.label_to_idx else {}
        
        # Use ResNet18 as a base
        self.base_model = torchvision.models.resnet18(pretrained=False)
        num_features = self.base_model.fc.in_features
        self.base_model.fc = nn.Linear(num_features, num_classes)
        
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.to(self.device)
        
        # Preprocessing (matched to training 380x380)
        self.transform = transforms.Compose([
            transforms.Resize((380, 380)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # Load checkpoint if provided
        if model_path and os.path.exists(model_path):
            try:
                checkpoint = torch.load(model_path, map_location=self.device)
                self.load_state_dict(checkpoint['model_state_dict'])
                if 'label_to_idx' in checkpoint:
                    self.label_to_idx = checkpoint['label_to_idx']
                    self.idx_to_label = {idx: name for name, idx in self.label_to_idx.items()}
                    logger.info(f"Loaded label_to_idx from checkpoint with {len(self.label_to_idx)} classes")
                logger.info(f"Loaded model from {model_path}")
            except Exception as e:
                logger.error(f"Failed to load checkpoint from {model_path}: {str(e)}")

    def preprocess_image(self, image_path):
        try:
            with Image.open(image_path) as img:
                img = img.convert('RGB')
                if img.size[0] <= 0 or img.size[1] <= 0:
                    raise ValueError("Invalid image dimensions")
                return self.transform(img)
        except Exception as e:
            logger.error(f"Image preprocessing failed for {image_path}: {str(e)}")
            return None

    def forward(self, x):
        return self.base_model(x)

    def predict(self, image_path):
        self.eval()
        try:
            image = self.preprocess_image(image_path)
            if image is None:
                raise ValueError("Failed to preprocess image")
            image = image.to(self.device)
            with torch.no_grad():
                output = self.forward(image.unsqueeze(0))
                if output.shape[1] != self.num_classes:
                    raise ValueError(f"Output shape {output.shape} does not match expected {self.num_classes} classes")
                _, predicted = torch.max(output, 1)
                confidence = torch.softmax(output, dim=1)[0, predicted.item()].item()
                predicted_idx = predicted.item()
                logger.info(f"Predicted index: {predicted_idx}, Output shape: {output.shape}, Num classes: {self.num_classes}")
                if self.idx_to_label and 0 <= predicted_idx < len(self.idx_to_label):
                    scientific_name = self.idx_to_label.get(predicted_idx, f"unknown_class_{predicted_idx}")
                    logger.info(f"Predicted: {scientific_name}, index: {predicted_idx}, confidence: {confidence}")
                    return {"predicted_idx": predicted_idx, "confidence": confidence, "scientific_name": scientific_name}
                return {"predicted_idx": predicted_idx, "confidence": confidence}
        except Exception as e:
            logger.error(f"Prediction error for {image_path}: {str(e)}")
            return {"predicted_idx": -1, "confidence": 0.0, "scientific_name": "unknown"}
