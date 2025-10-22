# utils/directory.py
import os

def ensure_directories(config):
    """Ensure all required directories exist"""
    os.makedirs(config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(config["CM_FOLDER"], exist_ok=True)
    os.makedirs(config["ATAS_FOLDER"], exist_ok=True)
    os.makedirs(config["PARTICIPANTES_FOLDER"], exist_ok=True)
