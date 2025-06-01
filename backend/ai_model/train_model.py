import os
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image
import json
from tqdm import tqdm
import polars as pl
import numpy as np
from plant_classifier import PlantClassifier

class MedicinalPlantDataset(Dataset):
    def __init__(self, data, transform=None):
        self.data = data
        self.transform = transform
        # Create class mapping using Polars
        self.class_to_idx = {plant['scientific_name']: idx 
                           for idx, plant in enumerate(set(data))}
        
    def __len__(self):
        return len(self.data)
    
    def __getitem__(self, idx):
        plant = self.data[idx]
        # Construct the image path based on the folder structure
        # Assuming the folder name is the scientific name or a category
        folder_name = plant['scientific_name'].replace(" ", "_")  # Replace spaces with underscores for folder names
        image_path = f"backend/ai_model/images/{folder_name}/{plant['image_name']}"
        try:
            image = Image.open(image_path).convert('RGB')  # Ensure image is in RGB format
        except FileNotFoundError:
            print(f"Warning: Image not found at {image_path}. Returning a blank image.")
            image = Image.new('RGB', (380, 380), color=(255, 255, 255))  # Return a blank image
        
        if self.transform:
            image = self.transform(image)
            
        label = self.class_to_idx[plant['scientific_name']]
        return image, label

def train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs=10, device='cuda'):
    best_val_acc = 0.0
    
    for epoch in range(num_epochs):
        # Training phase
        model.train()
        running_loss = 0.0
        correct = 0
        total = 0
        
        train_pbar = tqdm(train_loader, desc=f'Epoch {epoch+1}/{num_epochs} [Train]')
        for images, labels in train_pbar:
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            train_pbar.set_postfix({
                'loss': running_loss/total,
                'acc': 100.*correct/total
            })
        
        # Validation phase
        model.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            val_pbar = tqdm(val_loader, desc=f'Epoch {epoch+1}/{num_epochs} [Val]')
            for images, labels in val_pbar:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                _, predicted = outputs.max(1)
                val_total += labels.size(0)
                val_correct += predicted.eq(labels).sum().item()
                
                val_pbar.set_postfix({
                    'loss': val_loss/val_total,
                    'acc': 100.*val_correct/val_total
                })
        
        val_acc = 100.*val_correct/val_total
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), 'best_model.pth')
            print(f'New best model saved with validation accuracy: {val_acc:.2f}%')

def main():
    # Load your dataset using Polars
    df = pl.read_json('medicinal_plant_dataset.csv.json')
    
    # Convert to list of dictionaries for compatibility
    plant_data = df.to_dicts()
    
    # Split data into train and validation sets using Polars
    # Create a random column for splitting
    df = df.with_columns(pl.Series(name="random", values=np.random.random(len(df))))
    train_df = df.filter(pl.col("random") < 0.8)
    val_df = df.filter(pl.col("random") >= 0.8)
    
    # Convert back to lists
    train_data = train_df.to_dicts()
    val_data = val_df.to_dicts()
    
    # Define transforms
    transform = transforms.Compose([
        transforms.Resize((380, 380)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])
    
    # Create datasets
    train_dataset = MedicinalPlantDataset(train_data, transform=transform)
    val_dataset = MedicinalPlantDataset(val_data, transform=transform)
    
    # Create data loaders
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=4)
    
    # Initialize model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    model = PlantClassifier(model_path=None)  # Modified to accept None for initial training
    model = model.to(device)
    
    # Define loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
    
    # Train the model
    train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs=20, device=device)

if __name__ == "__main__":
    main() 