"""
Example script demonstrating programmatic use of database initialization.
This can be adapted for custom deployment scenarios.
"""

from mongoengine import connect, disconnect
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from database_init import initialize_database, check_database_status
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def example_basic_initialization():
    """Basic example: Initialize a single database"""
    print("\n" + "="*70)
    print("EXAMPLE 1: Basic Initialization")
    print("="*70)
    
    # Connect to database
    connect(host="mongodb://localhost:27018/citilink_demo", alias="default")
    
    try:
        # Initialize database
        results = initialize_database(
            db_name="citilink_demo",
            connection_alias="default",
            create_search_idx=False  # False for local MongoDB
        )
        
        print(f"\nStatus: {results['status']}")
        print(f"Collections created: {len(results['collections'])}")
        
        # Check the database status
        status = check_database_status(
            db_name="citilink_demo",
            connection_alias="default"
        )
        print(f"Total collections: {status['collection_count']}")
        
    finally:
        disconnect(alias="default")


def example_with_error_handling():
    """Example with comprehensive error handling"""
    print("\n" + "="*70)
    print("EXAMPLE 2: With Error Handling")
    print("="*70)
    
    try:
        # Connect
        connect(host="mongodb://localhost:27018/citilink_demo", alias="default")
        
        # Initialize with error handling
        results = initialize_database(
            db_name="citilink_demo",
            connection_alias="default",
            create_search_idx=False
        )
        
        if results['status'] == 'success':
            logger.info("✓ Database initialized successfully")
            
            # Report on collections
            for name, status in results['collections'].items():
                if status == 'created':
                    logger.info(f"  + Created collection: {name}")
                else:
                    logger.info(f"  ✓ Collection already exists: {name}")
        else:
            logger.error(f"✗ Initialization failed: {results.get('error')}")
            
    except Exception as e:
        logger.error(f"✗ Error during initialization: {e}")
        raise
    finally:
        disconnect(alias="default")


def example_atlas_with_search():
    """Example for MongoDB Atlas with search indexes"""
    print("\n" + "="*70)
    print("EXAMPLE 3: MongoDB Atlas with Search Indexes")
    print("="*70)
    
    # This example requires MongoDB Atlas credentials
    # Replace with your actual Atlas connection string
    atlas_uri = "mongodb+srv://user:password@cluster.mongodb.net/citilink"
    
    print("⚠️  This example requires MongoDB Atlas.")
    print(f"Connection: {atlas_uri[:20]}...")
    print("Skipping - update with your Atlas URI to run")
    
    # Uncomment to use:
    """
    try:
        connect(host=atlas_uri, alias="default")
        
        results = initialize_database(
            db_name="citilink",
            connection_alias="default",
            create_search_idx=True  # Enable search indexes for Atlas
        )
        
        if results['status'] == 'success':
            logger.info("✓ Database and search indexes initialized")
            
            # Report on search indexes
            if results.get('search_indexes'):
                for name, status in results['search_indexes'].items():
                    logger.info(f"  Search index {name}: {status}")
                    
    finally:
        disconnect(alias="default")
    """


def example_check_status_only():
    """Example: Check database status without modifications"""
    print("\n" + "="*70)
    print("EXAMPLE 4: Check Status Only (No Modifications)")
    print("="*70)
    
    connect(host="mongodb://localhost:27018/citilink_demo", alias="default")
    
    try:
        status = check_database_status(
            db_name="citilink_demo",
            connection_alias="default"
        )
        
        print(f"\nDatabase: {status['database']}")
        print(f"Collections: {status['collection_count']}")
        print("\nCollections found:")
        for collection in sorted(status['collections']):
            indexes = status['indexes'].get(collection, [])
            print(f"  • {collection} ({len(indexes)} indexes)")
            
    finally:
        disconnect(alias="default")


def example_multiple_databases():
    """Example: Initialize multiple databases"""
    print("\n" + "="*70)
    print("EXAMPLE 5: Multiple Databases")
    print("="*70)
    
    databases = [
        {
            'name': 'citilink_prod',
            'alias': 'prod',
            'uri': 'mongodb://localhost:27018/citilink_prod'
        },
        {
            'name': 'citilink_dev',
            'alias': 'dev',
            'uri': 'mongodb://localhost:27018/citilink_dev'
        }
    ]
    
    for db_info in databases:
        print(f"\nInitializing {db_info['name']}...")
        
        try:
            # Connect
            connect(host=db_info['uri'], alias=db_info['alias'])
            
            # Initialize
            results = initialize_database(
                db_name=db_info['name'],
                connection_alias=db_info['alias'],
                create_search_idx=False
            )
            
            print(f"  Status: {results['status']}")
            
        except Exception as e:
            logger.error(f"  Error: {e}")
        finally:
            disconnect(alias=db_info['alias'])


def main():
    """Run all examples"""
    print("\n" + "="*70)
    print("DATABASE INITIALIZATION EXAMPLES")
    print("="*70)
    print("\nThese examples demonstrate different ways to use the")
    print("database initialization system programmatically.")
    
    # Run examples
    example_basic_initialization()
    example_with_error_handling()
    example_atlas_with_search()
    example_check_status_only()
    example_multiple_databases()
    
    print("\n" + "="*70)
    print("EXAMPLES COMPLETE")
    print("="*70)
    print("\nNote: These examples use 'citilink_demo' database.")
    print("To clean up: mongosh citilink_demo --eval 'db.dropDatabase()'")
    print()


if __name__ == "__main__":
    main()
