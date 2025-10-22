# logger.py
import logging
from logging.handlers import TimedRotatingFileHandler
import os
from config import Config

def setup_logger(name=__name__):
    log_dir = Config.LOG_FOLDER
    os.makedirs(log_dir, exist_ok=True) 

    if name == "search":
        log_file = os.path.join(log_dir, Config.SEARCH_LOG_FILE)
    elif name == "reserved_area":
        log_file = os.path.join(log_dir, Config.RESERVED_AREA_LOG_FILE)
    elif name == "endpoint":
        log_file = os.path.join(log_dir, Config.ENDPOINT_LOG_FILE)
    elif name == "tasks":
        log_file = os.path.join(log_dir, Config.TASKS_LOG_FILE)
    else:
        log_file = os.path.join(log_dir, Config.LOG_FILE)

    file_handler = TimedRotatingFileHandler(
        log_file,
        when='W0',              # W0 = Monday
        interval=1,             # every week
        backupCount=0,          # keep forever
        encoding='utf-8',
        utc=True                
    )

    file_handler.suffix = "%Y-%W"  # (year-week format)
    log_level = getattr(logging, Config.LOG_LEVEL.upper(), logging.INFO)
    logger = logging.getLogger(name)
    logger.setLevel(log_level)
    if not logger.handlers:
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(threadName)s : %(message)s')
        file_handler = logging.FileHandler(log_file, encoding='utf-8')
        file_handler.setFormatter(formatter)
        stream_handler = logging.StreamHandler()
        stream_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        logger.addHandler(stream_handler)
    return logger