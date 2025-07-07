import os
import re
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms
from PIL import Image, UnidentifiedImageError
import pillow_heif
import json
from tqdm import tqdm
import polars as pl
import numpy as np
from backend.ai_model.plant_classifier import PlantClassifier
import requests
from requests.adapters import HTTPAdapter
from requests.packages.urllib3.util.retry import Retry
from io import BytesIO
import cloudinary
import cloudinary.api
from cloudinary.utils import cloudinary_url
import time
import logging
# Try to import HEIF support, but continue if not available
try:
    import pillow_heif
    pillow_heif.register_heif_opener()
    HEIF_SUPPORT = True
except ImportError:
    HEIF_SUPPORT = False
    logger.warning("pillow-heif not installed. HEIC/HEIF images will not be supported.")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configure requests session with retry strategy
session = requests.Session()
retry_strategy = Retry(
    total=3,
    backoff_factor=0.5,
    status_forcelist=[429, 500, 502, 503, 504],
)
session.mount('http://', HTTPAdapter(max_retries=retry_strategy))
session.mount('https://', HTTPAdapter(max_retries=retry_strategy))

# Configure Cloudinary
cloudinary.config(
    cloud_name=os.getenv('CLOUDINARY_CLOUD_NAME'),
    api_key=os.getenv('CLOUDINARY_API_KEY'),
    api_secret=os.getenv('CLOUDINARY_API_SECRET')
)

class MedicinalPlantDataset(Dataset):
    def __init__(self, plant_data, transform=None, augment=True):
        if not plant_data:
            raise ValueError("No plant data provided to dataset.")
            
        self.plant_data = plant_data
        self.transform = transform
        self.augment = augment
        self._image_cache = {}
        self._last_api_call = 0
        self._api_call_count = 0
        self._rate_limit_reset = None
        self._min_call_interval = 0.1  # Minimum time between API calls in seconds
        self._batch_size = 50  # Number of images to fetch in one API call
        
        # Verify and normalize plant data
        self._verify_plant_data()
        # Initialize cache with normalized names
        self._initialize_cache()
        # Prefetch images
        self._prefetch_images()
        
        # Create label encoder for scientific names
        scientific_names = [plant.get('scientific_name') for plant in plant_data]
        if None in scientific_names or '' in scientific_names:
            invalid_entries = [i for i, name in enumerate(scientific_names) if not name]
            raise ValueError(f"Missing scientific names found in dataset at indices: {invalid_entries}. Please ensure all plants have valid scientific names.")
            
        self.unique_labels = sorted(set(scientific_names))
        self.label_to_idx = {label: idx for idx, label in enumerate(self.unique_labels)}
        self.idx_to_label = {idx: label for label, idx in self.label_to_idx.items()}
        
        # Define Cloudinary augmentation transformations
        self.augmentation_transforms = [
            [{'angle': 90}, {'effect': 'auto_contrast'}],  # Rotation
            [{'angle': 'hflip'}, {'effect': 'auto_contrast'}],  # Horizontal flip
            [{'effect': 'brightness:30'}, {'effect': 'auto_contrast'}],  # Brightness increase
            [{'effect': 'brightness:-30'}, {'effect': 'auto_contrast'}],  # Brightness decrease
        ] if augment else []
        
        print(f"Dataset initialized with {len(self.unique_labels)} unique plant species.")
        if not self.plant_data:
            raise ValueError("No plant data provided to dataset.")

    def __len__(self):
        base_len = len(self.plant_data)
        if self.augment:
            # Multiply by number of augmentations + 1 (original)
            return base_len * (len(self.augmentation_transforms) + 1)
        return base_len

    def _verify_plant_data(self):
        """Verify and clean plant data before processing"""
        for idx, plant in enumerate(self.plant_data):
            if not plant.get('scientific_name'):
                raise ValueError(f"Missing scientific name at index {idx}")
            if not plant.get('image_name'):
                logger.warning(f"Missing image name for {plant.get('scientific_name')} at index {idx}")
                
    def _initialize_cache(self):
        """Initialize cache with normalized plant names"""
        for plant in self.plant_data:
            image_name = plant.get('image_name')
            if image_name:
                # Add normalized versions of the name to cache
                normalized = self._normalize_name(image_name)
                if normalized not in self._image_cache:
                    self._image_cache[normalized] = []
                    
                # Add scientific name variations
                sci_name = plant.get('scientific_name')
                if sci_name:
                    normalized_sci = self._normalize_name(sci_name)
                    if normalized_sci not in self._image_cache:
                        self._image_cache[normalized_sci] = []
                        
    def _normalize_name(self, text):
        """Normalize plant name for consistent matching"""
        if not text:
            return ""
        # Convert to lowercase and remove special characters
        text = text.lower()
        # Replace common variations
        text = text.replace('-', ' ').replace('_', ' ')
        # Remove parentheses and their contents
        text = re.sub(r'\([^)]*\)', '', text)
        # Remove special characters but keep spaces
        text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
        # Normalize whitespace
        return ' '.join(text.split())
                
    def _verify_cloudinary_config(self):
        """Verify Cloudinary configuration and connectivity"""
        try:
            # Test Cloudinary configuration
            if not cloudinary.config():
                raise RuntimeError("Cloudinary is not configured. Please check your environment variables.")
            
            # Test API connectivity with a simple request
            test_result = cloudinary.api.ping()
            logger.info("Cloudinary connection test successful")
            logger.debug(f"Cloudinary configuration: {cloudinary.config().cloud_name}")
            return True
        except Exception as e:
            logger.error(f"Cloudinary configuration error: {str(e)}")
            raise RuntimeError(f"Failed to connect to Cloudinary: {str(e)}")

    def _prefetch_images(self):
        """Prefetch all images from Cloudinary and store their URLs in cache"""
        # Verify Cloudinary configuration first
        self._verify_cloudinary_config()
        
        logger.info("Starting image prefetch from Cloudinary...")
        next_cursor = None
        total_fetched = 0
        
        # Create a mapping of expected plant names
        expected_names = set()
        for plant in self.plant_data:
            if plant.get('image_name'):
                expected_names.add(self._normalize_name(plant.get('image_name')))
            if plant.get('scientific_name'):
                expected_names.add(self._normalize_name(plant.get('scientific_name')))
        
        logger.info(f"Looking for {len(expected_names)} unique plant names")
        logger.debug(f"Expected names: {sorted(list(expected_names))}")


        def process_name(name):
            """Process a name into multiple searchable variations"""
            variations = set()
            # Original name
            variations.add(name)
            # Remove file extension and convert to lowercase
            base = os.path.splitext(name)[0].lower()
            variations.add(base)
            # Split by common separators and add individual parts
            parts = re.split(r'[-_\s]', base)
            variations.update(parts)
            # Add combinations of adjacent parts
            for i in range(len(parts)-1):
                variations.add(f"{parts[i]}{parts[i+1]}")
                variations.add(f"{parts[i]} {parts[i+1]}")
            return variations

        try:
            while True:
                try:
                    # First try listing all resources in the folder
                    result = cloudinary.api.resources(
                        type='upload',
                        prefix='Dataset/',
                        resource_type='image',
                        max_results=500,
                        next_cursor=next_cursor
                    )
                    
                    if not result.get('resources'):
                        logger.warning(f"No resources found in Dataset/ folder, trying root folder...")
                        # If no results, try without folder prefix
                        result = cloudinary.api.resources(
                            type='upload',
                            resource_type='image',
                            max_results=500,
                            next_cursor=next_cursor
                        )
                    
                    # Log the search results for debugging
                    logger.debug(f"Found {len(result.get('resources', []))} resources")
                    if result.get('resources'):
                        logger.debug(f"Sample resource: {result['resources'][0]}")
                    
                except Exception as e:
                    logger.error(f"Error during Cloudinary API call: {str(e)}")
                    raise

                # Process each resource
                resources = result.get('resources', [])
                if not resources:
                    logger.warning("No resources found in current batch")
                    if not next_cursor:  # If this is the first batch
                        raise RuntimeError("No images found in Cloudinary")
                
                for resource in resources:
                    try:
                        public_id = resource['public_id']
                        filename = os.path.basename(public_id)
                        
                        # Extract metadata
                        tags = resource.get('tags', [])
                        context = resource.get('context', {})
                        
                        # Generate name variations from filename and metadata
                        name_variations = set()
                        
                        # Add filename variations
                        clean_filename = self._normalize_name(filename)
                        name_variations.add(clean_filename)
                        
                        # Add individual words from filename
                        name_variations.update(clean_filename.split())
                        
                        # Add tags as variations
                        for tag in tags:
                            if tag:
                                clean_tag = self._normalize_name(str(tag))
                                name_variations.add(clean_tag)
                                name_variations.update(clean_tag.split())
                        
                        # Add context values as variations
                        for value in context.values():
                            if value:
                                clean_value = self._normalize_name(str(value))
                                name_variations.add(clean_value)
                                name_variations.update(clean_value.split())
                        
                        # Log name variations for debugging
                        logger.debug(f"Generated variations for {filename}: {name_variations}")
                        
                        # Check if any variation matches expected names
                        matches = name_variations.intersection(expected_names)
                        if matches:
                            logger.info(f"Found match for {list(matches)} in {filename}")
                        
                        # Store URL under each variation
                        for variation in name_variations:
                            if isinstance(variation, str) and len(variation) > 2:  # Skip very short variations
                                # Normalize the variation
                                clean_variation = re.sub(r'[^a-zA-Z0-9\s]', '', variation.lower())
                                if clean_variation:
                                    try:
                                        # Get the secure URL directly from the resource
                                        secure_url = resource.get('secure_url')
                                        
                                        if not secure_url:
                                            # Fallback to generating URL if not present
                                            secure_url = cloudinary.utils.cloudinary_url(resource['public_id'])[0]
                                        
                                        if clean_variation not in self._image_cache:
                                            self._image_cache[clean_variation] = []
                                            
                                        if secure_url not in self._image_cache[clean_variation]:
                                            self._image_cache[clean_variation].append(secure_url)
                                            total_fetched += 1
                                            
                                            # Log successful cache addition
                                            logger.debug(f"Added URL for variation: {clean_variation} -> {filename}")
                                            
                                    except Exception as e:
                                        logger.warning(f"Error caching URL for {filename}: {str(e)}")
                                        continue
                    except Exception as e:
                        logger.error(f"Error processing resource {resource.get('public_id', 'unknown')}: {str(e)}")
                        continue  # Continue with next resource instead of failing completely

                # Check for more results
                next_cursor = result.get('next_cursor')
                if not next_cursor:
                    break
                
                # Progress update
                logger.info(f"Fetched {total_fetched} images so far, continuing to next page...")
                
                # Rate limiting with exponential backoff
                retry_count = 0
                max_retries = 3
                base_delay = 1
                
                while retry_count < max_retries:
                    try:
                        time.sleep(base_delay * (2 ** retry_count))  # Exponential backoff
                        break  # If successful, break the retry loop
                    except Exception as e:
                        retry_count += 1
                        if retry_count == max_retries:
                            logger.error(f"Failed to fetch next page after {max_retries} retries")
                            raise
                        logger.warning(f"Retry {retry_count}/{max_retries} after error: {str(e)}")
                        continue

            # Validate cache contents
            total_terms = len(self._image_cache)
            total_urls = sum(len(urls) if isinstance(urls, list) else 1 for urls in self._image_cache.values())
            avg_urls_per_term = total_urls / total_terms if total_terms > 0 else 0
            
            # Log detailed cache statistics
            logger.info(f"Successfully prefetched {total_fetched} images")
            logger.info("Cache statistics:")
            logger.info(f"- Total unique terms: {total_terms}")
            logger.info(f"- Total cached URLs: {total_urls}")
            logger.info(f"- Average URLs per term: {avg_urls_per_term:.2f}")
            
            # Sample some cache entries for debugging
            if total_terms > 0:
                sample_size = min(5, total_terms)
                sample_terms = list(self._image_cache.keys())[:sample_size]
                logger.debug("Sample cache entries:")
                for term in sample_terms:
                    urls = self._image_cache[term]
                    url_count = len(urls) if isinstance(urls, list) else 1
                    logger.debug(f"  - '{term}': {url_count} URL(s)")
            
            # Validate cache state
            if total_fetched == 0:
                raise RuntimeError("No images were cached during prefetch")
            if total_urls == 0:
                raise RuntimeError("No valid URLs were cached during prefetch")
            if total_terms == 0:
                raise RuntimeError("No searchable terms were generated during prefetch")
            
            logger.info("Image prefetch completed successfully")

        except Exception as e:
            logger.error(f"Error during image prefetch: {str(e)}")
            raise RuntimeError("Failed to prefetch images from Cloudinary")

    def load_image(self, url):
        """Load and validate image from URL with conditional HEIC format support"""
        try:
            response = session.get(url, stream=True)
            response.raise_for_status()
            image_data = BytesIO(response.content)
            
            try:
                # First try to open as regular image
                image = Image.open(image_data)
                
                # Check if this is a HEIC/HEIF image
                if image.format in ['HEIC', 'HEIF']:
                    if not HEIF_SUPPORT:
                        raise ValueError(f"HEIC/HEIF support not available. Please install pillow-heif package to handle {image.format} images.")
                    image = image.convert('RGB')
                
                return image
                
            except UnidentifiedImageError as e:
                # Log the error with the image format if available
                format_info = getattr(e, 'format', 'unknown')
                logger.error(f"Failed to identify image format: {format_info}")
                raise ValueError(f"Unsupported or corrupt image format: {format_info}")
                
            except Exception as e:
                logger.error(f"Error processing image: {str(e)}")
                raise
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Failed to download image from {url}: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error loading image from {url}: {str(e)}")
            raise

    def __getitem__(self, idx, skip_count=0):
        if skip_count >= len(self.plant_data):
            raise RuntimeError("Failed to find any valid images in the dataset after checking all samples")

        base_idx = idx
        aug_idx = -1
        
        if self.augment:
            # Calculate which augmentation to apply (if any)
            base_idx = idx // (len(self.augmentation_transforms) + 1)
            aug_idx = idx % (len(self.augmentation_transforms) + 1) - 1
        
        plant = self.plant_data[base_idx]
        image_name = plant.get('image_name')
        scientific_name = plant.get('scientific_name')
        
        if not image_name or not scientific_name:
            logger.warning(f"Missing data for plant at index {base_idx} - image_name: {image_name}, scientific_name: {scientific_name}")
            next_idx = (base_idx + 1) % len(self.plant_data)
            return self.__getitem__(next_idx, skip_count + 1)
            
        # Try to find image using both names
        normalized_image_name = self._normalize_name(image_name)
        normalized_scientific_name = self._normalize_name(scientific_name)
        
        # Log the search attempt
        logger.debug(f"Searching for image at index {base_idx}:\n"
                    f"  Image name: {image_name} -> {normalized_image_name}\n"
                    f"  Scientific name: {scientific_name} -> {normalized_scientific_name}")
        
        # Check cache for both names
        if normalized_image_name in self._image_cache and self._image_cache[normalized_image_name]:
            logger.info(f"Found image using normalized image name: {normalized_image_name}")
        elif normalized_scientific_name in self._image_cache and self._image_cache[normalized_scientific_name]:
            logger.info(f"Found image using normalized scientific name: {normalized_scientific_name}")
        else:
            logger.warning(f"No matching image found for plant at index {base_idx}:\n"
                          f"  Tried image name: {normalized_image_name}\n"
                          f"  Tried scientific name: {normalized_scientific_name}\n"
                          f"  Available cache keys: {sorted(list(self._image_cache.keys())[:5])}...")
            next_idx = (base_idx + 1) % len(self.plant_data)
            return self.__getitem__(next_idx, skip_count + 1)
            
        # Create cache key for the processed image
        cache_key = f"{image_name}_{aug_idx}"
        if cache_key in self._image_cache:
            return self._image_cache[cache_key]
            
        def normalize_name(text):
            """Normalize plant name for matching"""
            # Convert to lowercase and remove special characters
            text = text.lower()
            # Replace common variations
            text = text.replace('-', ' ').replace('_', ' ')
            # Remove parentheses and their contents
            text = re.sub(r'\([^)]*\)', '', text)
            # Remove special characters but keep spaces
            text = re.sub(r'[^a-zA-Z0-9\s]', '', text)
            # Normalize whitespace
            text = ' '.join(text.split())
            return text

        # Clean and normalize the image name
        clean_name = normalize_name(image_name)
        name_parts = clean_name.split()
        
        # Extract common name if present (in parentheses)
        common_name = None
        scientific_name = None
        if '(' in image_name and ')' in image_name:
            parts = image_name.split('(')
            scientific_name = parts[0].strip().lower()
            common_name = parts[1].split(')')[0].strip().lower()
        
        # Try different matching strategies
        matching_urls = []
        
        def log_match_success(strategy, query, matched_name):
            logger.info(f"Found match using {strategy}")
            logger.debug(f"  Query: '{query}' -> Matched: '{matched_name}'")

        # Common plant name variations
        name_variations = {
            'neem': ['azadirachta', 'indica'],
            'lemon': ['citrus', 'limon'],
            'bitter': ['garcinia', 'kola'],
            'kola': ['garcinia', 'bitter']
        }

        # Strategy 1: Try exact match with full name
        if clean_name in self._image_cache:
            log_match_success('exact match', clean_name, clean_name)
            matching_urls.extend(self._image_cache[clean_name])
        
        # Strategy 2: Try scientific name match
        if not matching_urls and scientific_name:
            clean_scientific = normalize_name(scientific_name)
            if clean_scientific in self._image_cache:
                log_match_success('scientific name', scientific_name, clean_scientific)
                matching_urls.extend(self._image_cache[clean_scientific])
            else:
                # Try first word of scientific name
                sci_parts = clean_scientific.split()
                if sci_parts and sci_parts[0] in self._image_cache:
                    log_match_success('scientific genus', scientific_name, sci_parts[0])
                    matching_urls.extend(self._image_cache[sci_parts[0]])
        
        # Strategy 3: Try common name match
        if not matching_urls and common_name:
            clean_common = normalize_name(common_name)
            if clean_common in self._image_cache:
                log_match_success('common name', common_name, clean_common)
                matching_urls.extend(self._image_cache[clean_common])
            else:
                # Try individual words from common name and their variations
                for word in clean_common.split():
                    # Check word and its variations
                    if word in self._image_cache:
                        log_match_success('common word', common_name, word)
                        matching_urls.extend(self._image_cache[word])
                        break
                    # Try variations
                    if word in name_variations:
                        for variation in name_variations[word]:
                            if variation in self._image_cache:
                                log_match_success('name variation', word, variation)
                                matching_urls.extend(self._image_cache[variation])
                                break
                        if matching_urls:
                            break
        
        # Strategy 4: Try individual words from full name
        if not matching_urls:
            # Try each word and its variations
            for word in name_parts:
                # Skip very common or short words
                if len(word) < 3 or word in ['and', 'the', 'of', 'or']:
                    continue
                
                # Try exact word match
                if word in self._image_cache:
                    log_match_success('individual word', clean_name, word)
                    matching_urls.extend(self._image_cache[word])
                    break
                
                # Try word variations
                if word in name_variations:
                    for variation in name_variations[word]:
                        if variation in self._image_cache:
                            log_match_success('word variation', word, variation)
                            matching_urls.extend(self._image_cache[variation])
                            break
                    if matching_urls:
                        break
                
                # Try partial matches for longer words
                if len(word) > 4:
                    for cache_key in self._image_cache.keys():
                        if word in cache_key or cache_key in word:
                            log_match_success('partial word match', word, cache_key)
                            matching_urls.extend(self._image_cache[cache_key])
                            break
                    if matching_urls:
                        break
        
        if not matching_urls:
            logger.warning(f"No matching image found for '{image_name}' at index {base_idx}")
            logger.debug(f"Matching attempts:\n"
                        f"  - Full name: '{clean_name}'\n"
                        f"  - Scientific name: '{scientific_name}'\n"
                        f"  - Common name: '{common_name}'\n"
                        f"  - Individual words: {name_parts}\n"
                        f"Available cache keys: {list(self._image_cache.keys())[:5]}...")
            next_idx = (base_idx + 1) % len(self.plant_data)
            return self.__getitem__(next_idx, skip_count + 1)
            
        try:
            # Use the first matching URL from prefetched cache
            image_url = matching_urls[0]
            
            # Process image and cache the result
            try:
                response = session.get(image_url, headers={'User-Agent': 'MedPlant/1.0'})
                response.raise_for_status()
                
                image_data = BytesIO(response.content)
                img = Image.open(image_data).convert('RGB')
                
                # Apply base transformations
                if self.transform:
                    img = self.transform(img)
                
                # Apply augmentation if needed
                if aug_idx >= 0 and aug_idx < len(self.augmentation_transforms):
                    # Apply Cloudinary transformations
                    transform_params = self.augmentation_transforms[aug_idx]
                    aug_url = cloudinary_url(image_url, **transform_params)[0]
                    
                    aug_response = session.get(aug_url, headers={'User-Agent': 'MedPlant/1.0'})
                    aug_response.raise_for_status()
                    
                    aug_data = BytesIO(aug_response.content)
                    img = Image.open(aug_data).convert('RGB')
                    if self.transform:
                        img = self.transform(img)
                
                label = self.label_to_idx[plant['scientific_name']]
                result = (img, label)
                
                # Cache the processed result
                self._image_cache[cache_key] = result
                return result
                
            except Exception as e:
                logger.error(f"Error processing image from {image_url}: {str(e)}")
                next_idx = (base_idx + 1) % len(self.plant_data)
                return self.__getitem__(next_idx, skip_count + 1)
                
        except Exception as e:
            logger.error(f"Error in __getitem__: {str(e)}")
            next_idx = (base_idx + 1) % len(self.plant_data)
            return self.__getitem__(next_idx, skip_count + 1)
            base_transforms.extend(self.augmentation_transforms[aug_idx])
        
        # Apply Cloudinary transformations
        try:
            transformed_url = cloudinary_url(
                image_url,
                transformation=base_transforms
            )[0]
        except Exception as e:
            print(f"Cloudinary transformation failed for {image_url}: {e}")
            transformed_url = image_url  # Fallback to original URL

        for attempt in range(max_retries):
            try:
                # Exponential backoff for retries
                if attempt > 0:
                    wait_time = min(2 ** attempt, 10)  # Cap at 10 seconds
                    time.sleep(wait_time)
                
                # Add user agent and accept headers
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Accept': 'image/jpeg,image/png,image/gif',
                }
                
                response = session.get(transformed_url, timeout=10, headers=headers)
                response.raise_for_status()
                
                # Validate content type and check for binary data
                content_type = response.headers.get('content-type', '')
                if not content_type.startswith('image/'):
                    raise ValueError(f"Invalid content type: {content_type}")
                
                # Create BytesIO object and validate size
                content = response.content
                if len(content) < 12:  # Minimum size for image header
                    raise ValueError("Image data too small to be valid")
                
                # Check magic numbers for common image formats
                magic_numbers = {
                    b'\x89PNG\r\n\x1a\n': 'PNG',
                    b'\xff\xd8\xff': 'JPEG',
                    b'GIF87a': 'GIF',
                    b'GIF89a': 'GIF'
                }
                
                is_valid_format = False
                for magic, format_name in magic_numbers.items():
                    if content.startswith(magic):
                        is_valid_format = True
                        break
                
                if not is_valid_format:
                    raise ValueError(f"Unsupported or invalid image format. Content-Type: {content_type}")
                
                image_data = BytesIO(content)
                if image_data.getbuffer().nbytes == 0:
                    raise ValueError("Empty image data received")
                
                # Attempt to verify it's a valid image before processing
                try:
                    with Image.open(image_data) as img:
                        # Force image load to verify integrity
                        img.load()
                        # Create a fresh copy to ensure clean state
                        image_data.seek(0)
                        image = Image.open(image_data).convert('RGB')
                except Exception as img_err:
                    raise ValueError(f"Invalid image data: {img_err}")
                finally:
                    image_data.close()
                
                if self.transform:
                    image = self.transform(image)
                
                # Convert scientific name to numeric index
                label = plant['scientific_name']
                if label not in self.label_to_idx:
                    print(f"Warning: Unknown label {label} encountered. Skipping sample.")
                    next_idx = (idx + 1) % len(self)
                    return self.__getitem__(next_idx, skip_count + 1)
                
                label_idx = self.label_to_idx[label]
                return image, label_idx
            except requests.RequestException as e:
                if attempt == max_retries - 1:  # Last attempt
                    print(f"Failed to fetch image after {max_retries} attempts: {transformed_url}")
                    next_idx = (idx + 1) % len(self)
                    return self.__getitem__(next_idx, skip_count + 1)
                print(f"Attempt {attempt + 1} failed: {e}. Retrying...")
                continue
            except Exception as e:
                print(f"Error processing image: {e}")
                next_idx = (idx + 1) % len(self)
                return self.__getitem__(next_idx, skip_count + 1)
        
        # If all retries failed
        print(f"All attempts failed for image at index {idx}")
        next_idx = (idx + 1) % len(self)
        return self.__getitem__(next_idx, skip_count + 1)

def fetch_plant_data(api_key, num_plants=200):
    plants_data = []
    page = 1
    dataset_path = 'c:/xampp/htdocs/MedPlant/backend/medicinal_plant_dataset.json'
    
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
    with open(dataset_path, 'w', encoding='utf-8') as f:
        json.dump(plants_data, f, ensure_ascii=False, indent=2)
    print(f"Saved dataset to {dataset_path}")
    
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
            model_path = os.path.join(artifacts_dir, 'best_plant_classifier.pth')
            torch.save(model.state_dict(), model_path)
            print(f"Saved best model to {model_path}")

def main():
    # Create training artifacts directory
    artifacts_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'training_artifacts')
    os.makedirs(artifacts_dir, exist_ok=True)
    
    # API configuration
    API_KEY = os.getenv('TREFLE_API_KEY')
    if not API_KEY:
        raise ValueError("TREFLE_API_KEY environment variable is not set. Please add it to your .env file.")
    
    dataset_path = 'c:/xampp/htdocs/MedPlant/backend/medicinal_plant_dataset.json'
    
    # Try to load existing data first
    try:
        print("Loading existing plant data...")
        with open(dataset_path, 'r', encoding='utf-8') as f:
            plant_data = json.load(f)
        if not plant_data:  # If file is empty
            raise FileNotFoundError
    except (FileNotFoundError, json.JSONDecodeError):
        # If local file doesn't exist or is invalid, try fetching from API
        print("Fetching plant data from API...")
        plant_data = fetch_plant_data(API_KEY, num_plants=200)
        
    if not plant_data:
        raise ValueError("No plant data available. Please ensure either the API is accessible or medicinal_plant_dataset.json contains valid data.")
    
    print(f"Loaded {len(plant_data)} plants for training.")
    
    # Save the data (in case it was fetched from API)
    if plant_data:
        os.makedirs(os.path.dirname(dataset_path), exist_ok=True)
        with open(dataset_path, 'w', encoding='utf-8') as f:
            json.dump(plant_data, f, ensure_ascii=False, indent=2)
    
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
    num_classes = len(train_dataset.unique_labels)
    print(f"Training model for {num_classes} plant species classification")
    
    model = PlantClassifier(model_path=None, num_classes=num_classes)
    model = model.to(device)
    
    # Define loss function and optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.AdamW(model.parameters(), lr=0.001, weight_decay=0.01)
    
    # Train the model
    train_model(model, train_loader, val_loader, criterion, optimizer, num_epochs=20, device=device)

if __name__ == "__main__":
    main()