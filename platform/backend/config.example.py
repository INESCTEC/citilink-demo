# config.py
import os
from datetime import timedelta

class Config:
    # API URL (can be the local one)
    API_URL = os.getenv("API_URL", "http://localhost:5059")
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI", "")
    MONGO_URI_DEMO = os.getenv("MONGO_URI_DEMO", "")

    # json web token
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "supersecretkey")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=6)
    
    # dirs
    UPLOAD_FOLDER = "uploads"
    CM_FOLDER = os.path.join(UPLOAD_FOLDER, "municipios")
    ATAS_FOLDER = os.path.join(UPLOAD_FOLDER, "atas")
    PARTICIPANTES_FOLDER = os.path.join(UPLOAD_FOLDER, "participantes")

    # logging
    LOG_FOLDER = "logs"
    LOG_FILE = os.getenv("LOG_FILE", "citilink_backend.log")
    SEARCH_LOG_FILE = os.getenv("SEARCH_LOG_FILE", "citilink_search.log")
    ENDPOINT_LOG_FILE = os.getenv("ENDPOINT_LOG_FILE", "citilink_endpoint.log")
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")

    # Email configuration (Gmail by default) --> for the newsletter
    SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
    EMAIL_ADDRESS = os.getenv("EMAIL_ADDRESS", "your-email@gmail.com")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "your-app-password")
    EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "CitiLink")
