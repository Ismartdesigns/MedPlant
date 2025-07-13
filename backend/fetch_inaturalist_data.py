import requests
import json
import logging
from typing import List, Dict
from pathlib import Path
from time import sleep
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Expanded list of medicinal plants (scientific names)
MEDICINAL_PLANTS = [
    "Aloe vera", "Echinacea purpurea", "Ginkgo biloba", "Hypericum perforatum", "Panax ginseng",
    "Chamomilla recutita", "Valeriana officinalis", "Mentha piperita", "Urtica dioica", "Zingiber officinale",
    "Rosmarinus officinalis", "Lavandula angustifolia", "Salvia officinalis", "Thymus vulgaris", "Camellia sinensis",
    "Arnica montana", "Calendula officinalis", "Eucalyptus globulus", "Silybum marianum", "Tilia cordata",
    "Achillea millefolium", "Crataegus monogyna", "Passiflora incarnata", "Sambucus nigra", "Withania somnifera",
    "Glycyrrhiza glabra", "Curcuma longa", "Ocimum basilicum", "Foeniculum vulgare", "Plantago major",
    "Taraxacum officinale", "Verbascum thapsus", "Melissa officinalis", "Cinnamomum verum", "Artemisia annua",
    "Centella asiatica", "Equisetum arvense", "Hyssopus officinalis", "Leonurus cardiaca", "Origanum vulgare",
    "Piper nigrum", "Rheum palmatum", "Schisandra chinensis", "Trifolium pratense", "Vaccinium myrtillus",
    "Vitex agnus-castus", "Althaea officinalis", "Angelica sinensis", "Astragalus propinquus", "Borago officinalis",
    "Capsicum annuum", "Coriandrum sativum", "Cymbopogon citratus", "Euphrasia officinalis", "Galium aparine",
    "Harpagophytum procumbens", "Lippia alba", "Marrubium vulgare", "Symphytum officinale"
]

def fetch_plant_observations(plants: List[str], per_page: int = 30, retries: int = 3) -> List[Dict]:
    """Fetch observations from iNaturalist API for given plant species with retries."""
    base_url = "https://api.inaturalist.org/v1/observations"
    observations = []
    
    # Set up retry strategy
    session = requests.Session()
    retry_strategy = Retry(total=retries, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504])
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("https://", adapter)
    
    for plant in plants:
        params = {
            "taxon_name": plant,
            "taxon_rank": "species",
            "photos": True,
            "per_page": per_page,
            "quality_grade": "research",
            "order_by": "updated_at",
            "order": "desc"
        }
        try:
            response = session.get(base_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            results = data.get("results", [])
            logger.info(f"Fetched {len(results)} observations for {plant}")
            
            if not results:
                logger.warning(f"No observations found for {plant}")
            
            for result in results:
                photos = result.get("photos", [])
                if not photos:
                    continue
                obs = {
                    "scientific_name": result.get("taxon", {}).get("name", plant),
                    "image_url": photos[0].get("url", "").replace("square", "large"),
                    "observation_id": result.get("id"),
                    "common_name": result.get("taxon", {}).get("preferred_common_name", ""),
                    "license": result.get("photos", [{}])[0].get("license_code", "CC0")
                }
                observations.append(obs)
        except Exception as e:
            logger.error(f"Error fetching data for {plant}: {str(e)}")
        sleep(0.1)  # Avoid rate limit (100 requests/minute)
    
    return observations

def load_existing_json(json_path: str) -> List[Dict]:
    """Load existing JSON data if it exists."""
    if Path(json_path).exists():
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Error loading existing JSON {json_path}: {str(e)}")
            return []
    return []

def save_to_json(observations: List[Dict], json_path: str):
    """Save observations to JSON file, ensuring unique scientific names."""
    existing_observations = load_existing_json(json_path)
    existing_ids = {obs["observation_id"] for obs in existing_observations}
    existing_species = {obs["scientific_name"].lower().strip() for obs in existing_observations}
    
    # Track unique scientific names for new observations
    seen_species = set(existing_species)
    unique_observations = []
    for obs in observations:
        sci_name = obs["scientific_name"].lower().strip()
        if obs["observation_id"] not in existing_ids and sci_name not in seen_species:
            unique_observations.append(obs)
            seen_species.add(sci_name)
    
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
    
    # Load existing species to skip
    existing_observations = load_existing_json(json_path)
    existing_species = {obs["scientific_name"].lower().strip() for obs in existing_observations}
    plants_to_fetch = [plant for plant in MEDICINAL_PLANTS if plant.lower().strip() not in existing_species]
    
    if not plants_to_fetch:
        logger.info("All specified plants already fetched. Update MEDICINAL_PLANTS with new species.")
        return
    
    logger.info(f"Fetching {len(plants_to_fetch)} new species: {plants_to_fetch}")
    observations = fetch_plant_observations(plants_to_fetch, per_page=30)
    
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