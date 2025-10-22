"""Main entry point for the Citilink application."""
import os
import sys
import signal
import logging
import argparse
from datetime import datetime
from typing import List, Optional
from .models.database import clear_database

from .config import BASE_DATA_DIR
from .processors.file_processor import process_file
from .utils.logging_utils import setup_logging

# Flag to track if shutdown has been initiated
shutdown_initiated = False

def signal_handler(sig, frame):
    """
    Handle termination signals like CTRL+C.
    
    Args:
        sig: Signal number
        frame: Current stack frame
    """
    global shutdown_initiated
    
    if shutdown_initiated:
        logging.warning("Forced exit requested. Terminating immediately.")
        os._exit(1)
    
    shutdown_initiated = True
    logging.warning("Interrupt received. Cleaning up and exiting gracefully...")
    
    # Perform any necessary cleanup here
    logging.info("Cleaning up resources...")
    
    # Exit with an appropriate status code
    logging.info("Exiting program.")
    sys.exit(0)

def should_continue_processing():
    """Check if processing should continue or if shutdown was requested."""
    return not shutdown_initiated

def process_year_folder(year_folder: str, limit: Optional[int] = None, specific_ata: Optional[str] = None, force_regenerate: bool = False) -> None:
    """
    Process all text files in a given year folder.
    
    Args:
        year_folder (str): Path to the year folder
        limit (Optional[int]): Maximum number of files to process
        specific_ata (Optional[str]): Name of a specific ata file to process
        force_regenerate (bool): If True, regenerates JSON files even if they already exist
    """
    if not os.path.exists(year_folder):
        logging.warning(f"Year folder {year_folder} does not exist. Skipping.")
        return
    
    # Get a sorted list of all .txt files in the year folder
    files = sorted([f for f in os.listdir(year_folder) if f.endswith(".txt")])
    
    # If a specific ata is requested, filter for it
    if specific_ata:
        files = [f for f in files if specific_ata.lower() in f.lower()]
        if not files:
            logging.warning(f"No ata matching '{specific_ata}' found in {year_folder}")
            return
    
    if limit:
        files = files[:limit]
    
    logging.info(f"Found {len(files)} txt files in {year_folder}")
    
    # Print all files that will be processed
    for i, filename in enumerate(files):
        logging.info(f"{i+1}. {filename}")
    
    # Process each file
    for i, filename in enumerate(files):
        # Check if shutdown was requested
        if not should_continue_processing():
            logging.warning("Shutdown requested. Stopping file processing.")
            return
            
        current_file = os.path.join(year_folder, filename)
        
        logging.info(f"\nProcessing file {i+1}/{len(files)}: {current_file}")
        
        try:
            # Always call process_file, which will handle existing files properly
            process_file(current_file, force_regenerate=force_regenerate)
            logging.info(f"Successfully processed {filename}")
        except Exception as e:
            logging.error(f"Error processing file {filename}: {str(e)}")


def main():
    """Main function to run the application."""
    # Register signal handlers for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)   # CTRL+C
    signal.signal(signal.SIGTERM, signal_handler)  # kill command
    
    # Set up command line arguments
    parser = argparse.ArgumentParser(description="Process municipal meeting minutes")
    parser.add_argument("--years", nargs="+", type=int, help="Years to process (e.g. 2021 2022)")
    parser.add_argument("--limit", type=int, help="Limit number of files to process per year")
    parser.add_argument("--municipality", type=str, help="Municipality to process")
    parser.add_argument("--ata", type=str, help="Specific ata to process (e.g. 'Ata n º 11')")
    parser.add_argument("--clear-db", action="store_true", help="Clear the database before processing")
    parser.add_argument("--force-generate", action="store_true", help="Force regeneration of JSON files even if they already exist")
    args = parser.parse_args()
    
    # Set up logging
    setup_logging()
    
    start_time = datetime.now()
    logging.info(f"Starting processing at {start_time}")
    logging.info("Press CTRL+C once to exit gracefully, or twice to force exit")
    
    # Clear database if requested
    if args.clear_db:
        logging.info("Clearing database before processing...")
        clear_database(confirm=True)
    
    try:
        # Determine which years to process
        years = args.years if args.years else [2021]
        
        # Process each year folder
        for year in years:
            # Check if shutdown was requested
            if not should_continue_processing():
                break
                
            if args.municipality:
                # If municipality is specified, process only that municipality
                municipality_folder = os.path.join(BASE_DATA_DIR, f"municipio_{args.municipality.lower()}")
                year_folder = os.path.join(municipality_folder, str(year))
                
                process_year_folder(year_folder, args.limit, args.ata, args.force_generate)
            else:
                # Otherwise check all municipality folders
                for folder in os.listdir(BASE_DATA_DIR):
                    # Check if shutdown was requested
                    if not should_continue_processing():
                        break
                        
                    if folder.startswith("municipio_"):
                        year_folder = os.path.join(BASE_DATA_DIR, folder, str(year))
                        if os.path.exists(year_folder):
                            logging.info(f"Processing {folder} for year {year}")
                            
                            process_year_folder(year_folder, args.limit, args.ata, args.force_generate)
        
        if not shutdown_initiated:
            end_time = datetime.now()
            duration = end_time - start_time
            logging.info(f"Processing completed at {end_time}")
            logging.info(f"Total processing time: {duration}")
            
    except Exception as e:
        logging.error(f"Unexpected error in main process: {str(e)}")
        return 1
        
    return 0

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)