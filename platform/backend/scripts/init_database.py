#!/usr/bin/env python3
"""
Standalone script to initialize CitiLink databases.
Can be run independently or as part of deployment process.

Usage:
    python scripts/init_database.py                     # Initialize both databases with data loading
    python scripts/init_database.py --db default        # Initialize only default database
    python scripts/init_database.py --db demo           # Initialize only demo database
    python scripts/init_database.py --check             # Check database status without changes
    python scripts/init_database.py --skip-data         # Skip data loading from JSON files
    python scripts/init_database.py --force-search      # Force search index creation
    python scripts/init_database.py --verbose           # Verbose output
"""

import sys
import os
import argparse
import logging
from pathlib import Path

# Add parent directory to path to import from backend
sys.path.insert(0, str(Path(__file__).parent.parent))

from mongoengine import connect, disconnect
from database_init import initialize_database, check_database_status
from config import Config


def setup_logging(verbose: bool = False):
    """Setup logging configuration"""
    level = logging.DEBUG if verbose else logging.INFO
    logging.basicConfig(
        level=level,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )


def print_status(status: dict):
    """Pretty print database status"""
    print("\n" + "="*70)
    print(f"DATABASE: {status['database']}")
    print(f"CONNECTION: {status['connection_alias']}")
    print("="*70)
    print(f"\nTotal Collections: {status['collection_count']}")
    print("\nCollections:")
    for collection in sorted(status['collections']):
        print(f"  ✓ {collection}")
    
    print("\nIndexes per Collection:")
    for collection, indexes in sorted(status['indexes'].items()):
        print(f"\n  {collection}:")
        for idx in indexes:
            print(f"    • {idx}")


def print_init_results(results: dict):
    """Pretty print initialization results"""
    print("\n" + "="*70)
    print("DATABASE INITIALIZATION RESULTS")
    print("="*70)
    print(f"\nDatabase: {results['database']}")
    print(f"Connection: {results['connection_alias']}")
    print(f"Status: {results['status'].upper()}")
    
    if results['status'] == 'failed':
        print(f"\n❌ Error: {results.get('error', 'Unknown error')}")
        return
    
    print(f"\n📦 Collections ({len(results['collections'])}):")
    for name, status in sorted(results['collections'].items()):
        icon = "✓" if status == "already_exists" else "+"
        print(f"  {icon} {name}: {status}")
    
    # Data loading results
    if results.get('data_loading') and results['data_loading'].get('status') != 'skipped':
        data_result = results['data_loading']
        print(f"\n📊 Data Loading:")
        if data_result['status'] == 'success':
            print(f"  Total documents: {data_result.get('total_documents', 0)}")
            if data_result.get('collections'):
                for coll_name, coll_info in sorted(data_result['collections'].items()):
                    status_icon = "✓" if coll_info['status'] == 'loaded' else "↷"
                    if coll_info['status'] == 'loaded':
                        print(f"  {status_icon} {coll_name}: loaded {coll_info['count']} documents")
                    elif coll_info['status'] == 'skipped':
                        print(f"  {status_icon} {coll_name}: {coll_info.get('reason', 'skipped')} ({coll_info.get('count', 0)} existing)")
        elif data_result['status'] == 'failed':
            print(f"  ❌ Error: {data_result.get('error', 'Unknown error')}")
    
    if results.get('search_indexes') and not results['search_indexes'].get('skipped'):
        print(f"\n🔍 Search Indexes:")
        for name, status in sorted(results['search_indexes'].items()):
            if name == "note":
                print(f"  ℹ️  {status}")
            elif name == "error":
                print(f"  ⚠️  Error: {status}")
            else:
                icon = "✓" if status in ["already_exists", "created"] else "⚠️"
                print(f"  {icon} {name}: {status}")
    elif results.get('search_indexes', {}).get('skipped'):
        print(f"\n🔍 Search Indexes: Skipped (use --force-search to create)")


def main():
    parser = argparse.ArgumentParser(
        description='Initialize CitiLink MongoDB databases',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                      Initialize both databases
  %(prog)s --db default         Initialize only default database
  %(prog)s --db demo            Initialize only demo database
  %(prog)s --check              Check database status
  %(prog)s --force-search       Force search index creation (Atlas only)
  %(prog)s --verbose            Enable verbose logging
        """
    )
    
    parser.add_argument(
        '--db',
        choices=['default', 'demo', 'both'],
        default='both',
        help='Which database to initialize (default: both)'
    )
    
    parser.add_argument(
        '--check',
        action='store_true',
        help='Only check database status without making changes'
    )
    
    parser.add_argument(
        '--force-search',
        action='store_true',
        help='Force creation of search indexes (requires MongoDB Atlas)'
    )
    
    parser.add_argument(
        '--load-data',
        action='store_true',
        help='Load initial data from JSON files (if available)'
    )
    
    parser.add_argument(
        '--skip-data',
        action='store_true',
        help='Skip data loading even if JSON files are available'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    setup_logging(args.verbose)
    logger = logging.getLogger(__name__)
    
    try:
        # Load configuration
        config = Config()
        
        # Disconnect any existing connections
        disconnect(alias='default')
        disconnect(alias='demo')
        
        # Determine which databases to process
        databases = []
        if args.db in ['default', 'both']:
            # Extract database name from URI
            db_name = "citilink"
            if "mongodb+srv://" in config.MONGO_URI or "mongodb://" in config.MONGO_URI:
                db_name = config.MONGO_URI.split("/")[-1].split("?")[0]
            
            databases.append({
                'name': db_name,
                'alias': 'default',
                'uri': config.MONGO_URI,
                'is_atlas': "mongodb+srv://" in config.MONGO_URI
            })
        
        if args.db in ['demo', 'both']:
            # Extract database name from URI
            db_name = "citilink_demo"
            if "mongodb+srv://" in config.MONGO_URI_DEMO or "mongodb://" in config.MONGO_URI_DEMO:
                db_name = config.MONGO_URI_DEMO.split("/")[-1].split("?")[0]
            
            databases.append({
                'name': db_name,
                'alias': 'demo',
                'uri': config.MONGO_URI_DEMO,
                'is_atlas': "mongodb+srv://" in config.MONGO_URI_DEMO
            })
        
        # Process each database
        success_count = 0
        for db_info in databases:
            print(f"\n{'='*70}")
            print(f"Processing: {db_info['name']} ({db_info['alias']})")
            print(f"{'='*70}")
            
            # Connect to database
            logger.info(f"Connecting to {db_info['alias']} database...")
            connect(host=db_info['uri'], alias=db_info['alias'])
            
            try:
                if args.check:
                    # Just check status
                    logger.info("Checking database status...")
                    status = check_database_status(
                        db_name=db_info['name'],
                        connection_alias=db_info['alias']
                    )
                    print_status(status)
                else:
                    # Initialize database
                    logger.info("Initializing database...")
                    create_search = args.force_search or db_info['is_atlas']
                    
                    # Determine if we should load data
                    load_data = not args.skip_data  # Load by default unless --skip-data is specified
                    if args.load_data:
                        load_data = True
                    
                    if not db_info['is_atlas'] and args.force_search:
                        logger.warning("⚠️  Search indexes require MongoDB Atlas. They may fail with local MongoDB.")
                    
                    results = initialize_database(
                        db_name=db_info['name'],
                        connection_alias=db_info['alias'],
                        create_search_idx=create_search,
                        load_data=load_data
                    )
                    print_init_results(results)
                    
                    if results['status'] == 'success':
                        success_count += 1
                
            except Exception as e:
                logger.error(f"❌ Error processing {db_info['alias']}: {e}")
                if args.verbose:
                    import traceback
                    traceback.print_exc()
            finally:
                # Disconnect
                disconnect(alias=db_info['alias'])
        
        # Summary
        print(f"\n{'='*70}")
        if args.check:
            print("✓ Database status check complete")
        else:
            print(f"✓ Processed {success_count}/{len(databases)} databases successfully")
        print("="*70 + "\n")
        
        return 0 if success_count == len(databases) else 1
        
    except Exception as e:
        logger.error(f"❌ Fatal error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
