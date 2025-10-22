"""Logging configuration utilities."""
import os
import json
import logging
from datetime import datetime
from typing import Dict
import colorlog 

def setup_logging():
    """Configure logging for the application."""
    # Create logs directory
    log_dir = "logs"
    os.makedirs(log_dir, exist_ok=True)
    
    # Create log filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    log_file = os.path.join(log_dir, f"citilink_{timestamp}.log")
    
    # Create a color formatter for console output
    console_formatter = colorlog.ColoredFormatter(
        "%(log_color)s%(asctime)s - %(levelname)s - %(message)s",
        log_colors={
            'DEBUG': 'cyan',
            'INFO': 'green',
            'WARNING': 'yellow',
            'ERROR': 'red',
            'CRITICAL': 'red,bg_white',
        }
    )
    
    # Regular formatter for file output
    file_formatter = logging.Formatter("%(asctime)s - %(levelname)s - %(message)s")
    
    # Create and configure handlers
    file_handler = logging.FileHandler(log_file)
    file_handler.setFormatter(file_formatter)
    
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(console_formatter)
    
    # Configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    root_logger.addHandler(file_handler)
    root_logger.addHandler(console_handler)
    
    logging.info("Logging initialized")

# Database-specific logging utilities

def _make_json_serializable(obj):
    """Convert objects to JSON-serializable format."""
    if hasattr(obj, '__dict__'):
        # Handle MongoEngine documents
        if hasattr(obj, 'to_mongo'):
            return obj.to_mongo()
        else:
            return obj.__dict__
    elif isinstance(obj, dict):
        return {k: _make_json_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_make_json_serializable(item) for item in obj]
    else:
        return obj

def setup_database_error_logging():
    """Set up dedicated logger for database insertion errors."""
    db_error_logger = logging.getLogger('database_errors')
    if not db_error_logger.handlers:  # Avoid duplicate handlers
        db_error_handler = logging.FileHandler('database_insertion_errors.log')
        db_error_formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        db_error_handler.setFormatter(db_error_formatter)
        db_error_logger.addHandler(db_error_handler)
        db_error_logger.setLevel(logging.ERROR)
    return db_error_logger

def log_insertion_error(error_type: str, data: Dict, error_message: str, file_context: str = None):
    """Log insertion errors to dedicated file for later correction."""
    # Make data JSON-serializable
    safe_data = _make_json_serializable(data)
    
    error_record = {
        'timestamp': datetime.now().isoformat(),
        'error_type': error_type,
        'file_context': file_context,
        'error_message': str(error_message),
        'data': safe_data
    }
    
    # Get or create database error logger
    db_error_logger = setup_database_error_logging()
    
    # Log to dedicated error file
    db_error_logger.error(json.dumps(error_record, ensure_ascii=False, indent=2))
    
    # Also log to main logger
    logging.error(f"Database insertion failed [{error_type}]: {error_message}")
    
    # Create errors directory if it doesn't exist
    errors_dir = 'errors/database_insertions'
    os.makedirs(errors_dir, exist_ok=True)
    
    # Save individual error file with timestamp
    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # milliseconds
    error_filename = f"{errors_dir}/error_{error_type}_{timestamp_str}.json"
    
    try:
        with open(error_filename, 'w', encoding='utf-8') as f:
            json.dump(error_record, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logging.error(f"Failed to save error file {error_filename}: {str(e)}")

def log_insertion_warning(warning_type: str, data: Dict, warning_message: str, file_context: str = None):
    """Log insertion warnings (like fallbacks) to dedicated file."""
    # Make data JSON-serializable
    safe_data = _make_json_serializable(data)
    
    warning_record = {
        'timestamp': datetime.now().isoformat(),
        'warning_type': warning_type,
        'file_context': file_context,
        'warning_message': str(warning_message),
        'data': safe_data
    }
    
    # Create warnings directory if it doesn't exist
    warnings_dir = 'warnings/database_insertions'
    os.makedirs(warnings_dir, exist_ok=True)
    
    # Save individual warning file with timestamp
    timestamp_str = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]  # milliseconds
    warning_filename = f"{warnings_dir}/warning_{warning_type}_{timestamp_str}.json"
    
    try:
        with open(warning_filename, 'w', encoding='utf-8') as f:
            json.dump(warning_record, f, ensure_ascii=False, indent=2)
        
        # Also log to main logger as warning
        logging.warning(f"Database insertion warning [{warning_type}]: {warning_message}")
    except Exception as e:
        logging.error(f"Failed to save warning file {warning_filename}: {str(e)}")