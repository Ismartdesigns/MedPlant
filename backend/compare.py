import torch
import json
import os

checkpoint_path = "C:/xampp/htdocs/MedPlant/training_artifacts/best_plant_classifier.pth"
json_path = "C:/xampp/htdocs/MedPlant/inaturalist_plant_dataset.json"

# Load checkpoint
checkpoint = torch.load(checkpoint_path, map_location='cpu')
if 'label_to_idx' in checkpoint:
    checkpoint_labels = set(checkpoint['label_to_idx'].keys())
    print("Checkpoint labels:", checkpoint_labels)

# Load current dataset
with open(json_path, 'r', encoding='utf-8') as f:
    data = json.load(f)
    current_labels = {entry["scientific_name"].lower().strip() for entry in data}
    print("Current labels:", current_labels)

match_percentage = len(checkpoint_labels & current_labels) / len(current_labels) * 100 if current_labels else 0
print(f"Match percentage: {match_percentage}%")