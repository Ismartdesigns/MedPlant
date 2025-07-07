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
import requests
from io import BytesIO

class MedicinalPlantDataset(Dataset):
    def __init__(self, plant_data, transform=None):
        self.plant_data = plant_data
        self.transform = transform

    def __len__(self):
        return len(self.plant_data)

    def __getitem__(self, idx):
        plant = self.plant_data[idx]
        # Use image_url as URL instead of local path
        image_url = plant['image_url']
        
        # Download and load image from URL
        try:
            response = requests.get(image_url)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert('RGB')
        except Exception as e:
            print(f"Error loading image {image_url}: {e}")
            # Return a default image or skip
            image = Image.new('RGB', (224, 224), color=(0, 0, 0))
        
        if self.transform:
            image = self.transform(image)
            
        # Use scientific_name as label (adjust based on your PlantClassifier requirements)
        return image, plant['scientific_name']

def fetch_plant_data(api_key, num_plants=200):
    plants_data = []
    page = 1
    
    while len(plants_data) < num_plants:
        try:
            # Fetch plant list from Trefle API
            url = f"https://trefle.io/api/v1/species?page={page}&token={api_key}"
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()
            
            for plant in data.get('data', []):
                # Get detailed plant info
                detail_url = f"https://trefle.io/api/v1/species/{plant['id']}?token={api_key}"
                detail_response = requests.get(detail_url)
                detail_response.raise_for_status()
                detail_data = detail_response.json().get('data', {})
                
                if 'image_url' in detail_data and detail_data['image_url']:
                    plants_data.append({
                        'scientific_name': detail_data.get('scientific_name', ''),
                        'common_name': detail_data.get('common_name', ''),
                        'image_url': detail_data['image_url'],
                        'type': detail_data.get('growth', {}).get('growth_form', ''),
                        'cycle': detail_data.get('growth', {}).get('duration', '')
                    })
                
                if len(plants_data) >= num_plants:
                    break
            
            page += 1
            
            # Check if there are more pages
            if not data.get('links', {}).get('next'):
                break
                
        except Exception as e:
            print(f"Error fetching data: {e}")
            break
    
    # Save to JSON file
    with open('medicinal_plant_dataset.json', 'w', encoding='utf-8') as f:
        json.dump(plants_data, f, ensure_ascii=False, indent=2)
    
    return plants_data

def train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs, device):
    best_val_acc = 0.0
    for epoch in range(num_epochs):
        model.train()
        running_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for images, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}/{num_epochs}"):
            images, labels = images.to(device), labels.to(device)
            
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
        
        train_acc = 100 * train_correct / train_total
        print(f"Epoch {epoch+1}, Train Loss: {running_loss/len(train_loader):.4f}, Train Acc: {train_acc:.2f}%")
        
        # Validation phase
        model.eval()
        val_correct = 0
        val_total = 0
        val_loss = 0.0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_acc = 100 * val_correct / val_total
        print(f"Validation Loss: {val_loss/len(val_loader):.4f}, Validation Acc: {val_acc:.2f}%")
        
        # Save best model
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save(model.state_dict(), 'best_plant_classifier.pth')

def main():
    # API configuration
    API_KEY = os.getenv('TREFLE_API_KEY', 'your_trefle_api_key')  # Replace with your Trefle API key or use env variable
    
    # Fetch plant data from Trefle API
    print("Fetching plant data...")
    plant_data = fetch_plant_data(API_KEY, num_plants=200)
    
    # Save the fetched data
    with open('medicinal_plant_dataset.json', 'w') as f:
        json.dump(plant_data, f)
    
    # Convert to Polars DataFrame
    df = pl.DataFrame(plant_data)
    
    # Split data into train and validation sets
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
    model = PlantClassifier(model_path=None)  # Assumes PlantClassifier accepts None for initial training
    model = model.to(device)
    
    # Define loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
    
    # Train the model
    train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs=20, device=device)

if __name__ == "__main__":
    main()