import os
import re
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
from torchvision import transforms
from PIL import Image, ImageOps
import requests
import json
from tqdm import tqdm
import numpy as np
from collections import Counter
from torchvision.utils import save_image
from torch.optim.lr_scheduler import ReduceLROnPlateau
import logging
import matplotlib.pyplot as plt

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class INaturalistDataset(Dataset):
    @staticmethod
    def autocontrast_transform(x):
        return ImageOps.autocontrast(x)

    def __init__(self, json_path, cache_dir, transform=None, augment=True):
        if not os.path.exists(json_path):
            raise ValueError(f"JSON file not found: {json_path}")
        
        self.json_path = json_path
        self.cache_dir = cache_dir
        self.transform = transform
        self.augment = augment
        self.data = []
        self.label_to_idx = {}
        self.idx_to_label = {}
        os.makedirs(cache_dir, exist_ok=True)
        
        # Load JSON data
        with open(json_path, 'r', encoding='utf-8') as f:
            self.data = json.load(f)
        
        # Validate and create label mappings
        scientific_names = [entry["scientific_name"].lower().strip() for entry in self.data]
        if not scientific_names:
            raise ValueError("No valid entries in JSON file")
        
        duplicates = [(name, count) for name, count in Counter(scientific_names).items() if count > 1]
        if duplicates:
            logger.warning(f"Duplicate scientific names found: {duplicates}")
        
        unique_labels = sorted(set(scientific_names))
        self.label_to_idx = {label: idx for idx, label in enumerate(unique_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        # Log class distribution
        class_counts = Counter(scientific_names)
        logger.info(f"Class distribution: {dict(class_counts)}")
        if len(class_counts) < 2:
            raise ValueError("Dataset must contain at least 2 classes")
        
        # Define augmentations
        self.augmentation_transforms = [
            transforms.Compose([transforms.RandomRotation(10), transforms.Lambda(self.autocontrast_transform)]),
            transforms.Compose([transforms.RandomHorizontalFlip(p=1.0), transforms.Lambda(self.autocontrast_transform)]),
            transforms.Compose([transforms.ColorJitter(brightness=(1, 1.2)), transforms.Lambda(self.autocontrast_transform)]),
            transforms.Compose([transforms.ColorJitter(brightness=(0.8, 1.0)), transforms.Lambda(self.autocontrast_transform)]),
        ] if augment else []
        
        # Validate sample images
        valid_images_found = 0
        for idx in range(min(10, len(self.data))):
            try:
                self.__getitem__(idx)
                valid_images_found += 1
            except Exception as e:
                logger.warning(f"Failed to load image for index {idx}: {str(e)}")
        
        if valid_images_found == 0:
            raise RuntimeError("No valid images found in first 10 samples")
        
        logger.info(f"Dataset initialized with {len(unique_labels)} species, {valid_images_found}/10 samples validated")

    def __len__(self):
        return len(self.data) * (len(self.augmentation_transforms) + 1) if self.augment else len(self.data)

    def load_image(self, image_url, observation_id):
        cache_path = os.path.join(self.cache_dir, f"{observation_id}.jpg")
        if os.path.exists(cache_path):
            try:
                return Image.open(cache_path).convert('RGB')
            except Exception as e:
                logger.warning(f"Corrupted cache file {cache_path}: {str(e)}")
        
        try:
            response = requests.get(image_url, stream=True, timeout=10)
            response.raise_for_status()
            image = Image.open(response.raw).convert('RGB')
            image.save(cache_path, 'JPEG')
            return image
        except Exception as e:
            logger.error(f"Error downloading {image_url}: {str(e)}")
            raise

    def __getitem__(self, idx):
        base_idx = idx // (len(self.augmentation_transforms) + 1) if self.augment else idx
        aug_idx = idx % (len(self.augmentation_transforms) + 1) - 1 if self.augment else -1
        
        if base_idx >= len(self.data):
            raise IndexError(f"Index {base_idx} out of range for {len(self.data)} entries")
        
        entry = self.data[base_idx]
        image_url = entry["image_url"]
        observation_id = entry["observation_id"]
        scientific_name = entry["scientific_name"].lower().strip()
        label = self.label_to_idx[scientific_name]
        
        try:
            image = self.load_image(image_url, observation_id)
            if self.augment and aug_idx >= 0:
                image = self.augmentation_transforms[aug_idx](image)
            if self.transform:
                image = self.transform(image)
            return image, label
        except Exception as e:
            logger.error(f"Error processing {image_url}: {str(e)}")
            raise

def train_model(model, train_loader, val_loader, criterion, optimizer, scheduler, artifacts_dir, num_epochs, device, resume_from=None):
    import gc
    from torch.cuda.amp import autocast, GradScaler
    
    scaler = GradScaler() if torch.cuda.is_available() else None
    start_epoch, best_val_acc = load_checkpoint(resume_from, model, optimizer, device) if resume_from else (0, 0.0)
    
    def get_memory_usage():
        try:
            import psutil
            process = psutil.Process()
            ram_usage = process.memory_info().rss / 1024 / 1024
            gpu_mem = f", GPU Memory: {torch.cuda.memory_allocated() / 1024 / 1024:.1f}MB" if torch.cuda.is_available() else ""
            return f"RAM Usage: {ram_usage:.1f}MB{gpu_mem}"
        except ImportError:
            return f"GPU Memory: {torch.cuda.memory_allocated() / 1024 / 1024:.1f}MB" if torch.cuda.is_available() else "Memory info unavailable"

    def clear_memory():
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.synchronize()
    
    train_losses, val_losses, train_accs, val_accs = [], [], [], []
    patience, best_val_loss = 20, float('inf')
    patience_counter = 0
    
    # Ensure artifacts directory exists with explicit permission check
    try:
        os.makedirs(artifacts_dir, exist_ok=True)
        with open(os.path.join(artifacts_dir, 'test_write.txt'), 'w') as f:
            f.write('test')
        os.remove(os.path.join(artifacts_dir, 'test_write.txt'))
        logger.info(f"Artifacts directory created/verified: {artifacts_dir}")
    except PermissionError:
        logger.error(f"Permission denied to write to {artifacts_dir}. Run as Administrator or adjust permissions.")
        raise
    except Exception as e:
        logger.error(f"Failed to create artifacts directory {artifacts_dir}: {str(e)}")
        raise

    for epoch in range(start_epoch, num_epochs):
        logger.info(f"\nEpoch {epoch + 1}/{num_epochs}, {get_memory_usage()}")
        model.train()
        running_loss, train_correct, train_total, batch_count = 0.0, 0, 0, 0
        
        for images, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}"):
            try:
                clear_memory()
                images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)
                
                optimizer.zero_grad(set_to_none=True)
                with autocast(enabled=torch.cuda.is_available()):
                    outputs = model(images)
                    loss = criterion(outputs, labels)
                
                if scaler:
                    scaler.scale(loss).backward()
                    scaler.step(optimizer)
                    scaler.update()
                else:
                    loss.backward()
                    optimizer.step()
                
                running_loss += loss.item()
                _, predicted = torch.max(outputs.detach(), 1)
                train_total += labels.size(0)
                train_correct += (predicted == labels).sum().item()
                batch_count += 1
            except RuntimeError as e:
                logger.error(f"Batch {batch_count+1} failed: {str(e)}")
                clear_memory()
                continue
        
        train_loss = running_loss / batch_count if batch_count > 0 else float('inf')
        train_acc = 100 * train_correct / train_total if train_total > 0 else 0.0
        train_losses.append(train_loss)
        train_accs.append(train_acc)
        logger.info(f"Epoch {epoch+1}, Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        
        model.eval()
        val_loss, val_correct, val_total, val_batch_count = 0.0, 0, 0, 0
        with torch.no_grad():
            for images, labels in tqdm(val_loader, desc=f"Validation Epoch {epoch+1}"):
                try:
                    clear_memory()
                    images, labels = images.to(device, non_blocking=True), labels.to(device, non_blocking=True)
                    with autocast(enabled=torch.cuda.amp.autocast(enabled=torch.cuda.is_available())):
                        outputs = model(images)
                        loss = criterion(outputs, labels)
                    
                    val_loss += loss.item()
                    _, predicted = torch.max(outputs.detach(), 1)
                    val_total += labels.size(0)
                    val_correct += (predicted == labels).sum().item()
                    val_batch_count += 1
                except RuntimeError as e:
                    logger.error(f"Validation batch {val_batch_count+1} failed: {str(e)}")
                    clear_memory()
                    continue
        
        val_loss = val_loss / val_batch_count if val_batch_count > 0 else float('inf')
        val_acc = 100 * val_correct / val_total if val_total > 0 else 0.0
        val_losses.append(val_loss)
        val_accs.append(val_acc)
        logger.info(f"Validation Loss: {val_loss:.4f}, Validation Acc: {val_acc:.2f}%")
        
        # Log learning rate changes
        current_lr = optimizer.param_groups[0]['lr']
        scheduler.step(val_loss)
        new_lr = optimizer.param_groups[0]['lr']
        if new_lr != current_lr:
            logger.info(f"Learning rate reduced from {current_lr:.6f} to {new_lr:.6f}")
        
        # Save checkpoint for each epoch
        checkpoint_path = os.path.join(artifacts_dir, f'plant_classifier_epoch_{epoch+1}.pth')
        try:
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'best_val_acc': best_val_acc,
                'label_to_idx': train_loader.dataset.label_to_idx
            }, checkpoint_path)
            logger.info(f"Saved checkpoint: {checkpoint_path}")
        except Exception as e:
            logger.error(f"Failed to save checkpoint {checkpoint_path}: {str(e)}")
        
        # Save best model after every epoch (debug mode)
        best_model_path = os.path.join(artifacts_dir, 'best_plant_classifier.pth')
        try:
            torch.save({
                'epoch': epoch + 1,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'best_val_acc': best_val_acc,
                'label_to_idx': train_loader.dataset.label_to_idx
            }, best_model_path)
            logger.info(f"Saved best model (epoch {epoch+1}): {best_model_path}")
        except Exception as e:
            logger.error(f"Failed to save best model at epoch {epoch+1}: {str(e)}")
        
        # Early stopping
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= patience:
                logger.info(f"Early stopping at epoch {epoch+1}")
                break
    
    # Save training metrics plot
    try:
        plt.figure(figsize=(10, 5))
        plt.subplot(1, 2, 1)
        plt.plot(train_losses, label='Train Loss')
        plt.plot(val_losses, label='Val Loss')
        plt.xlabel('Epoch')
        plt.ylabel('Loss')
        plt.legend()
        plt.subplot(1, 2, 2)
        plt.plot(train_accs, label='Train Acc')
        plt.plot(val_accs, label='Val Acc')
        plt.xlabel('Epoch')
        plt.ylabel('Accuracy (%)')
        plt.legend()
        metrics_path = os.path.join(artifacts_dir, 'training_metrics.png')
        plt.savefig(metrics_path)
        plt.close()
        logger.info(f"Saved training metrics plot: {metrics_path}")
    except Exception as e:
        logger.error(f"Failed to save training metrics plot: {str(e)}")

def load_checkpoint(checkpoint_path, model, optimizer, device):
    if not os.path.exists(checkpoint_path):
        return 0, 0.0
    
    logger.info(f"Loading checkpoint from {checkpoint_path}")
    checkpoint = torch.load(checkpoint_path, map_location=device)
    
    try:
        checkpoint_classes = checkpoint['model_state_dict']['classifier.1.bias'].size(0)
        current_classes = model.classifier[1].bias.size(0)
        logger.info(f"Checkpoint classes: {checkpoint_classes}, Model classes: {current_classes}")
        
        if checkpoint_classes != current_classes:
            logger.warning(f"Class mismatch. Checkpoint: {checkpoint_classes}, Model: {current_classes}")
            return 0, 0.0
        
        model.load_state_dict(checkpoint['model_state_dict'])
        optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
        start_epoch = checkpoint['epoch']
        best_val_acc = checkpoint['best_val_acc']
        logger.info(f"Resumed from epoch {start_epoch}, val acc {best_val_acc:.2f}%")
        return start_epoch, best_val_acc
    except Exception as e:
        logger.error(f"Error loading checkpoint: {str(e)}")
        return 0, 0.0

def main():
    import gc
    gc.set_debug(gc.DEBUG_STATS)
    
    artifacts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'training_artifacts')
    try:
        os.makedirs(artifacts_dir, exist_ok=True)
        logger.info(f"Artifacts directory created/verified: {artifacts_dir}")
    except Exception as e:
        logger.error(f"Failed to create artifacts directory {artifacts_dir}: {str(e)}")
        raise
    
    # Define paths
    json_path = 'C:/xampp/htdocs/MedPlant/inaturalist_plant_dataset.json'
    cache_dir = 'C:/xampp/htdocs/MedPlant/image_cache'
    if not os.path.exists(json_path):
        raise RuntimeError(f"JSON file not found: {json_path}")
    
    # Define transforms
    transform = transforms.Compose([
        transforms.Resize((380, 380)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(10),
        transforms.ColorJitter(brightness=0.1, contrast=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], 
                           std=[0.229, 0.224, 0.225])
    ])
    
    # Load dataset
    full_dataset = INaturalistDataset(json_path, cache_dir, transform=transform, augment=True)
    
    # Split into train/val
    indices = np.random.permutation(len(full_dataset.data))
    train_size = int(0.8 * len(full_dataset.data))
    train_indices = indices[:train_size]
    val_indices = indices[train_size:]
    
    train_data = [full_dataset.data[i] for i in train_indices]
    val_data = [full_dataset.data[i] for i in val_indices]
    
    train_dataset = INaturalistDataset(json_path, cache_dir, transform=transform, augment=True)
    train_dataset.data = train_data
    val_dataset = INaturalistDataset(json_path, cache_dir, transform=transform, augment=False)
    val_dataset.data = val_data
    
    # Class balancing
    class_counts = Counter(entry['scientific_name'].lower().strip() for entry in train_data)
    weights = [1.0 / class_counts[entry['scientific_name'].lower().strip()] for entry in train_data]
    sampler = WeightedRandomSampler(weights, len(weights))
    
    # Data loaders
    batch_size = 2 if torch.cuda.is_available() and torch.cuda.get_device_properties(0).total_memory / 1e9 < 4 else 4
    loader_kwargs = {
        'batch_size': batch_size,
        'num_workers': 0,
        'pin_memory': torch.cuda.is_available(),
        'persistent_workers': False
    }
    train_loader = DataLoader(train_dataset, sampler=sampler, **loader_kwargs)
    val_loader = DataLoader(val_dataset, shuffle=False, **loader_kwargs)
    
    # Initialize model
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    num_classes = len(train_dataset.label_to_idx)
    logger.info(f"Training for {num_classes} plant species")
    
    from .plant_classifier import PlantClassifier
    best_model_path = os.path.join(artifacts_dir, 'best_plant_classifier.pth')
    model = PlantClassifier(model_path=best_model_path if os.path.exists(best_model_path) else None, num_classes=num_classes)
    model = model.to(device)
    
    # Loss and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.0001, weight_decay=0.001)
    scheduler = ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    
    # Verify model
    logger.info("Verifying model...")
    try:
        test_images, test_labels = next(iter(train_loader))
        test_images, test_labels = test_images.to(device), test_labels.to(device)
        with torch.cuda.amp.autocast(enabled=torch.cuda.is_available()):
            test_output = model(test_images)
            test_loss = criterion(test_output, test_labels)
        logger.info("Model verification successful")
    except Exception as e:
        logger.error(f"Model verification failed: {str(e)}")
        raise
    
    # Save sample image
    try:
        save_image(test_images[0], os.path.join(artifacts_dir, 'sample_input.png'))
        logger.info(f"Saved sample image: {os.path.join(artifacts_dir, 'sample_input.png')}")
    except Exception as e:
        logger.error(f"Failed to save sample image: {str(e)}")
    
    # Train
    train_model(model, train_loader, val_loader, criterion, optimizer, scheduler, artifacts_dir, num_epochs=50, device=device)

if __name__ == "__main__":
    torch.manual_seed(42)
    np.random.seed(42)
    main()