import requests
import json
import logging
from typing import List, Dict
from pathlib import Path
from time import sleep
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from PIL import Image
from tqdm import tqdm
from datetime import datetime, timedelta

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Selected common medicinal plants (scientific names)
MEDICINAL_PLANTS = [
    "Aloe vera",           # Well-known healing plant
    "Zingiber officinale", # Ginger
    "Thymus vulgaris",     # Common thyme
    "Ocimum basilicum",    # Basil
    "Lavandula angustifolia" # Lavender
]

def fetch_plant_observations(plants: List[str], per_page: int = 20, min_images: int = 20, retries: int = 3) -> List[Dict]:
    """Fetch observations from iNaturalist API for given plant species with retries."""
    base_url = "https://api.inaturalist.org/v1/observations"
    observations = []
    
    # Set up enhanced retry strategy and session with quality verification
    session = requests.Session()
    retry_strategy = Retry(
        total=retries,
        backoff_factor=1.5,  # Increased backoff factor
        status_forcelist=[429, 500, 502, 503, 504, 520, 521, 522, 524],  # Added more error codes
        allowed_methods=["GET"],  # Only retry GET requests
        respect_retry_after_header=True,  # Honor server's Retry-After header
        raise_on_status=True  # Raise exceptions on status
    )
    adapter = HTTPAdapter(max_retries=retry_strategy, pool_maxsize=10)
    session.mount("https://", adapter)
    session.headers.update({
        'User-Agent': 'MedPlant/1.0 (Research Project)',
        'Accept': 'application/json'
    })
    
    def verify_image_quality(self, image_path):
        """Verify image quality using enhanced PIL checks."""
        try:
            with Image.open(image_path) as img:
                # Check image dimensions - require higher resolution
                width, height = img.size
                if width < 512 or height < 512:
                    return False, "Image resolution too low (minimum 512x512)"
                
                # Check aspect ratio
                aspect_ratio = width / height
                if aspect_ratio < 0.5 or aspect_ratio > 2.0:
                    return False, "Image aspect ratio too extreme"
                
                # Convert to RGB for consistent processing
                img = img.convert('RGB')
                
                # Check image mode and bit depth
                if img.mode not in ['RGB', 'RGBA']:
                    return False, "Unsupported image mode"
                
                return True, "Image OK"
        except Exception as e:
            logger.warning(f"Image quality check failed: {str(e)}")
            return False, str(e)
    
    # Initialize rate limiting
    request_timestamps = []
    rate_limit = 100  # requests per minute
    rate_window = 60  # seconds

    for plant in tqdm(plants, desc="Fetching plant observations"):
        params = {
            "taxon_name": plant,
            "taxon_rank": "species",
            "photos": True,
            "per_page": per_page,
            "quality_grade": "research",
            "order_by": "quality_grade",
            "order": "desc",
            "photos": "true",
            "identifications": "most_agree"
        }
        try:
            response = session.get(base_url, params=params, timeout=15)
            response.raise_for_status()
            data = response.json()
            
            # Validate API response structure
            if not isinstance(data, dict) or 'results' not in data:
                logger.error(f"Invalid API response format for {plant}")
                continue
                
            results = data.get("results", [])
            total_results = data.get("total_results", 0)
            logger.info(f"Fetched {len(results)} observations for {plant} (Total available: {total_results})")
            
            if not results:
                logger.warning(f"No observations found for {plant}")
                continue
            
            for result in results:
                try:
                    # Validate required fields
                    if not all(key in result for key in ["id", "taxon", "photos"]):
                        logger.warning(f"Missing required fields in observation {result.get('id', 'unknown')}")
                        continue
                        
                    photos = result["photos"]
                    if not photos or not isinstance(photos, list):
                        continue
                        
                    taxon = result["taxon"]
                    if not isinstance(taxon, dict):
                        continue
                        
                    # Create observation with validated data
                    obs = {
                        "scientific_name": taxon.get("name", plant),
                        "image_url": photos[0].get("url", "").replace("square", "large"),
                        "observation_id": result["id"],
                        "common_name": taxon.get("preferred_common_name", ""),
                        "license": photos[0].get("license_code", "CC0"),
                        "quality_grade": result.get("quality_grade", "")
                    }
                    
                    # Validate image URL
                    if not obs["image_url"].startswith("http"):
                        logger.warning(f"Invalid image URL for observation {obs['observation_id']}")
                        continue
                        
                    observations.append(obs)
                except Exception as e:
                    logger.warning(f"Error processing observation: {str(e)}")
                    continue
        except Exception as e:
            logger.error(f"Error fetching data for {plant}: {str(e)}")
        # Rate limiting
        now = datetime.now()
        request_timestamps = [ts for ts in request_timestamps if now - ts < timedelta(seconds=rate_window)]
        if len(request_timestamps) >= rate_limit:
            sleep_time = (request_timestamps[0] + timedelta(seconds=rate_window) - now).total_seconds()
            if sleep_time > 0:
                logger.info(f"Rate limit reached, waiting {sleep_time:.2f} seconds")
                sleep(sleep_time)
        request_timestamps.append(now)
    
    return observations

def load_existing_json(json_path: str) -> List[Dict]:
    """Load and validate existing JSON data."""
    if Path(json_path).exists():
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # Validate data structure
            valid_data = []
            for entry in data:
                if all(key in entry for key in ['scientific_name', 'image_url', 'observation_id']):
                    # Verify image URL is valid
                    if entry['image_url'].startswith('http'):
                        valid_data.append(entry)
                    else:
                        logger.warning(f"Invalid image URL in entry: {entry['observation_id']}")
                else:
                    logger.warning(f"Missing required fields in entry: {entry}")
            
            if len(valid_data) < len(data):
                logger.warning(f"Filtered out {len(data) - len(valid_data)} invalid entries")
            
            return valid_data
        except Exception as e:
            logger.error(f"Error loading existing JSON {json_path}: {str(e)}")
            return []
    return []

def save_to_json(observations: List[Dict], json_path: str):
    """Save observations to JSON file, ensuring quality and uniqueness."""
    existing_observations = load_existing_json(json_path)
    existing_ids = {obs["observation_id"] for obs in existing_observations}
    
    # Count observations per species
    species_count = {}
    for obs in existing_observations:
        species = obs["scientific_name"].lower().strip()
        species_count[species] = species_count.get(species, 0) + 1
    
    # Filter and add new observations
    unique_observations = []
    for obs in observations:
        sci_name = obs["scientific_name"].lower().strip()
        
        # Skip if we already have enough images for this species
        if species_count.get(sci_name, 0) >= 20:
            continue
            
        # Add observation if it's new and we need more images
        if obs["observation_id"] not in existing_ids:
            unique_observations.append(obs)
            species_count[sci_name] = species_count.get(sci_name, 0) + 1
            
        # Stop if we have enough images for this species
        if species_count[sci_name] >= 20:
            logger.info(f"Collected 20 images for {sci_name}")

    
    all_observations = existing_observations + unique_observations
    
    try:
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(all_observations, f, indent=2)
        logger.info(f"Appended {len(unique_observations)} new observations to {json_path}. Total: {len(all_observations)}")
    except Exception as e:
        logger.error(f"Error saving JSON: {str(e)}")
        raise

def main():
    json_path = "C:/xampp/htdocs/MedPlant/inaturalist_plant_dataset.json"
    
    # Load existing species and count their observations
    existing_observations = load_existing_json(json_path)
    species_count = {}
    for obs in existing_observations:
        species = obs["scientific_name"].lower().strip()
        species_count[species] = species_count.get(species, 0) + 1
    
    # Only fetch species with fewer than min_images observations
    plants_to_fetch = [plant for plant in MEDICINAL_PLANTS 
                      if species_count.get(plant.lower().strip(), 0) < 20]
    
    if not plants_to_fetch:
        logger.info("All specified plants already fetched. Update MEDICINAL_PLANTS with new species.")
        return
    
    logger.info(f"Fetching {len(plants_to_fetch)} new species: {plants_to_fetch}")
    observations = fetch_plant_observations(plants_to_fetch, per_page=20, min_images=20)
    
    # Save or append to JSON
    save_to_json(observations, json_path)
    
    # Log unique species and missing ones
    with open(json_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    unique_species = set(obs["scientific_name"] for obs in data)
    logger.info(f"Dataset now contains {len(unique_species)} unique species")
    missing_species = [plant for plant in plants_to_fetch if plant not in unique_species]
    if missing_species:
        logger.warning(f"No observations found for: {missing_species}")

if __name__ == "__main__":
    main()