#!/usr/bin/env python
"""CLI tool to clear the database."""
import sys
import argparse
import logging
import mongoengine
from src.utils.logging_utils import setup_logging
from src.config import MONGO_URI, MONGO_DB
from src.models.database import (
    clear_database, delete_municipality_data, delete_meetings_by_year,
    initialize_db, Ata, Assunto, Municipio, Participante, Topico
)

def main():
    """Main entry point for database management CLI."""
    # Set up argument parser
    parser = argparse.ArgumentParser(description="Database management tools")
    
    # Create subparsers for different commands
    subparsers = parser.add_subparsers(dest="command", help="Command to execute")
    
    # Clear entire database command
    clear_parser = subparsers.add_parser("clear-all", help="Clear the entire database")
    clear_parser.add_argument("--force", action="store_true", help="Force deletion without confirmation")
    
    # Delete municipality data
    muni_parser = subparsers.add_parser("clear-municipality", help="Delete data for a specific municipality")
    muni_parser.add_argument("name", help="Municipality name")
    muni_parser.add_argument("--force", action="store_true", help="Force deletion without confirmation")
    
    # Delete data by year
    year_parser = subparsers.add_parser("clear-year", help="Delete all meetings from a specific year")
    year_parser.add_argument("year", type=int, help="Year to delete (e.g., 2023)")
    year_parser.add_argument("--municipality", help="Optional: limit to specific municipality")
    year_parser.add_argument("--force", action="store_true", help="Force deletion without confirmation")
    
    # Parse arguments
    args = parser.parse_args()
    
    # Set up logging
    setup_logging()
    
    # If no command provided, show help
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    # Initialize database connection
    try:
        initialize_db()
        # Show database connection info
        logging.info(f"Connected to MongoDB: {MONGO_DB} at {MONGO_URI}")
    except Exception as e:
        print(f"Error connecting to database: {str(e)}")
        sys.exit(1)
    
    # Get confirmation if --force is not used
    confirm = args.force
    
    if not confirm:
        print("\n⚠️  WARNING: This will permanently delete data from your database! ⚠️")
        if args.command == "clear-all":
            print("You are about to DELETE ALL DATA in the database.")
        elif args.command == "clear-municipality":
            print(f"You are about to delete all data for municipality: {args.name}")
        elif args.command == "clear-year":
            target = f"year {args.year}"
            if args.municipality:
                target += f" for municipality {args.municipality}"
            print(f"You are about to delete all data for {target}")
            
        confirmation = input("\nType 'yes' to confirm: ")
        confirm = confirmation.lower() == 'yes'
    
    # Execute the requested command
    if args.command == "clear-all":
        if confirm:
            # ALTERNATIVE APPROACH: Direct deletion without using the function that has email/phone references
            try:
                result = {"success": True, "deleted": {"total": 0}}
                
                # 1. Delete topics first (they reference meetings)
                count = Assunto.objects.delete()
                result["deleted"]["topics"] = count
                result["deleted"]["total"] += count
                print(f"Deleted {count} topics")
                
           
                # 3. Delete meetings (they reference municipalities and participants)
                count = Ata.objects.delete()
                result["deleted"]["meetings"] = count
                result["deleted"]["total"] += count
                print(f"Deleted {count} meeting records")
                
                # 4. Delete departments (they reference municipalities and participants)
                count = Topico.objects.delete()
                result["deleted"]["departments"] = count
                result["deleted"]["total"] += count
                print(f"Deleted {count} departments")
                
                # 5. Delete participants (they reference municipalities)
                count = Participante.objects.delete()
                result["deleted"]["participants"] = count
                result["deleted"]["total"] += count
                print(f"Deleted {count} participants")
                
                # 6. Finally delete municipalities
                count = Municipio.objects.delete()
                result["deleted"]["municipalities"] = count
                result["deleted"]["total"] += count
                print(f"Deleted {count} municipalities")
                
                print(f"\nSuccess! Deleted {result['deleted']['total']} items from database.")
                
            except Exception as e:
                print(f"Error clearing database: {str(e)}")
        else:
            print("Operation cancelled.")
            
    elif args.command == "clear-municipality":
        if confirm:
            result = delete_municipality_data(args.name, confirm=True)
            if result["success"]:
                print(f"Success! Deleted all data for municipality '{args.name}'")
                for category, count in result["deleted"].items():
                    if category != "total":
                        print(f"  - {category}: {count}")
            else:
                print(f"Error deleting municipality '{args.name}':")
                for error in result["errors"]:
                    print(f"  - {error}")
        else:
            print("Operation cancelled.")
            
    elif args.command == "clear-year":
        if confirm:
            result = delete_meetings_by_year(args.year, args.municipality, confirm=True)
            if result["success"]:
                total = result["deleted"]["meetings"]
                target = f"year {args.year}"
                if args.municipality:
                    target += f" for municipality {args.municipality}"
                print(f"Success! Deleted {total} meetings from {target}")
                for category, count in result["deleted"].items():
                    if category not in ["total", "meetings"]:
                        print(f"  - {category}: {count}")
            else:
                print(f"Error deleting meetings:")
                for error in result["errors"]:
                    print(f"  - {error}")
        else:
            print("Operation cancelled.")

if __name__ == "__main__":
    main()