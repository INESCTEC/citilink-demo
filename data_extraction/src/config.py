"""Configuration settings for the application."""
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# API configuration
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
MODEL_NAME = os.environ.get("MODEL_NAME", "gemini-2.0-flash")

# File paths
BASE_DATA_DIR = "data/extracted_txt_files_structured"
OUTPUT_DIR = "output/processed"
ERROR_DIR = "output/errors"

# Ensure directories exist
for directory in [OUTPUT_DIR, ERROR_DIR]:
    os.makedirs(directory, exist_ok=True)

# MongoDB configuration
MONGO_URI = os.getenv("MONGO_URI", "mongodb://admin:password@localhost:27018")
MONGO_DB = os.getenv("MONGO_DB", "citilink_demo")
MONGO_COLLECTION = os.getenv("MONGO_COLLECTION", "default_collection")

# Processing settings
MAX_RETRIES = int(os.environ.get("MAX_RETRIES", 3))
MAX_CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", 20000))  # For splitting long texts
MAX_DOCUMENT_LENGTH = int(os.environ.get("MAX_DOCUMENT_LENGTH", 30000))  # For splitting long texts
