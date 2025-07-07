import json
from database import engine
from sqlmodel import Session
from models import MedicinalPlant
from sqlmodel import select

def load_plants():
    # Read the JSON file
    with open('medicinal_plant_dataset.json', 'r', encoding='utf-8') as f:
        plants_data = json.load(f)
    
    # Create a database session
    db = Session(engine)
    
    try:
        # Check if we already have plants in the database
        existing_plants = db.exec(select(MedicinalPlant)).all()
        if existing_plants:
            print("Plants already exist in the database. Skipping import.")
            return
        
        # Create MedicinalPlant objects and add them to the database
        for plant_data in plants_data:
            # Skip entries with missing required fields
            if not all(key in plant_data for key in ['image_name', 'plant_name', 'scientific_name']):
                continue
                
            plant = MedicinalPlant(
                image_name=plant_data.get('image_name', ''),
                plant_name=plant_data.get('plant_name', ''),
                scientific_name=plant_data.get('scientific_name', ''),
                local_names=plant_data.get('local_names', ''),
                parts_used=plant_data.get('parts_used', ''),
                uses=plant_data.get('uses', ''),
                benefits=plant_data.get('benefits', ''),
                side_effects=plant_data.get('side_effects', ''),
                location_found=plant_data.get('location_found'),
                date_collected=plant_data.get('date_collected'),
                device_used=plant_data.get('device_used')
            )
            db.add(plant)
        
        # Commit the changes
        db.commit()
        print("Successfully loaded medicinal plants into the database!")
        
    except Exception as e:
        print(f"Error loading plants: {str(e)}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    load_plants() 