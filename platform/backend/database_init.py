"""
Database Initialization Script for CitiLink
This module handles the initialization of MongoDB collections, indexes, and search indexes
"""

from pymongo import MongoClient
from mongoengine import get_connection
from bson import json_util
import logging
import json
import os
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)


def create_search_indexes(db_name: str = "citilink_demo", connection_alias: str = "demo") -> dict:
    """
    Create MongoDB Atlas Search indexes for text search functionality.
    Note: For MongoDB Atlas Local, search indexes might need to be created manually via Compass
    or may have limited support compared to cloud Atlas.
    
    Args:
        db_name: Name of the database
        connection_alias: Mongoengine connection alias
        
    Returns:
        dict: Status of index creation operations
    """
    try:
        # Get the pymongo connection from mongoengine
        conn = get_connection(alias=connection_alias)
        db = conn[db_name]
        
        results = {
            "ata_pt": None,
            "ata_en": None,
            "assunto_pt": None,
            "assunto_en": None
        }
        
        # Check if we can list existing search indexes first
        logger.info("Checking existing search indexes...")
        try:
            # Try to list existing search indexes to see if the API is available
            existing_indexes = db.command({"listSearchIndexes": "ata"})
            logger.info(f"Found {len(existing_indexes.get('cursor', {}).get('firstBatch', []))} existing search indexes on ata collection")
        except Exception as e:
            logger.warning(f"Cannot list search indexes (may not be supported): {e}")
        
        # Create Ata (Minutes) Search Indexes
        logger.info("Creating Ata search indexes...")
        
        # Portuguese search index for Ata
        try:
            result = db.command({
                "createSearchIndexes": "ata",
                "indexes": [
                    {
                        "name": "atas_search",
                        "definition": {
                            "mappings": {
                                "dynamic": False,
                                "fields": {
                                    "summary": {
                                        "type": "string",
                                        "analyzer": "lucene.portuguese",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "location": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "title": {
                                        "type": "string",
                                        "analyzer": "lucene.portuguese",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "content": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    }
                                }
                            }
                        }
                    }
                ]
            })
            results["ata_pt"] = "created"
            logger.info("✓ Ata Portuguese search index created successfully")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                results["ata_pt"] = "already_exists"
                logger.info("✓ Ata Portuguese search index already exists")
            else:
                results["ata_pt"] = f"error: {str(e)}"
                logger.warning(f"Failed to create Ata Portuguese search index: {e}")
        
        # English search index for Ata
        try:
            db.command({
                "createSearchIndexes": "ata",
                "indexes": [
                    {
                        "name": "atas_search_en",
                        "definition": {
                            "mappings": {
                                "dynamic": False,
                                "fields": {
                                    "summary_en": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "location": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "title_en": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "content_en": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    }
                                }
                            }
                        }
                    }
                ]
            })
            results["ata_en"] = "created"
            logger.info("✓ Ata English search index created successfully")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                results["ata_en"] = "already_exists"
                logger.info("✓ Ata English search index already exists")
            else:
                results["ata_en"] = f"error: {str(e)}"
                logger.warning(f"Failed to create Ata English search index: {e}")
        
        # Create Assunto (Subjects) Search Indexes
        logger.info("Creating Assunto search indexes...")
        
        # Portuguese search index for Assunto
        try:
            db.command({
                "createSearchIndexes": "assunto",
                "indexes": [
                    {
                        "name": "assuntos_search",
                        "definition": {
                            "mappings": {
                                "dynamic": False,
                                "fields": {
                                    "summary": {
                                        "type": "string",
                                        "analyzer": "lucene.portuguese",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "deliberacao": {
                                        "type": "string",
                                        "analyzer": "lucene.portuguese",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "title": {
                                        "type": "string",
                                        "analyzer": "lucene.portuguese",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    }
                                }
                            }
                        }
                    }
                ]
            })
            results["assunto_pt"] = "created"
            logger.info("✓ Assunto Portuguese search index created successfully")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                results["assunto_pt"] = "already_exists"
                logger.info("✓ Assunto Portuguese search index already exists")
            else:
                results["assunto_pt"] = f"error: {str(e)}"
                logger.warning(f"Failed to create Assunto Portuguese search index: {e}")
        
        # English search index for Assunto
        try:
            db.command({
                "createSearchIndexes": "assunto",
                "indexes": [
                    {
                        "name": "assuntos_search_en",
                        "definition": {
                            "mappings": {
                                "dynamic": False,
                                "fields": {
                                    "summary_en": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "deliberacao_en": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    },
                                    "title_en": {
                                        "type": "string",
                                        "analyzer": "lucene.standard",
                                        "indexOptions": "offsets",
                                        "store": True,
                                        "norms": "include"
                                    }
                                }
                            }
                        }
                    }
                ]
            })
            results["assunto_en"] = "created"
            logger.info("✓ Assunto English search index created successfully")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate" in str(e).lower():
                results["assunto_en"] = "already_exists"
                logger.info("✓ Assunto English search index already exists")
            else:
                results["assunto_en"] = f"error: {str(e)}"
                logger.warning(f"Failed to create Assunto English search index: {e}")
        
        return results
        
    except Exception as e:
        logger.error(f"Error creating search indexes: {e}")
        raise


def create_collections_and_indexes(db_name: str = "citilink_demo", connection_alias: str = "demo") -> dict:
    """
    Create MongoDB collections if they don't exist and ensure all indexes are created.
    Mongoengine models will automatically create indexes when documents are saved,
    but this ensures collections exist from the start.
    
    Args:
        db_name: Name of the database
        connection_alias: Mongoengine connection alias
        
    Returns:
        dict: Status of collection creation operations
    """
    try:
        # Get the pymongo connection from mongoengine
        conn = get_connection(alias=connection_alias)
        logger.info(f"Using connection alias: {connection_alias}")
        db = conn[db_name]
        
        # List of collections to create
        collections = [
            "ata",           # Minutes
            "assunto",       # Subjects
            "municipio",     # Municipalities
            "participante",  # Participants
            "topico",        # Topics
            "users",         # Users
            "newsletter"     # Newsletter subscriptions
        ]
        
        existing_collections = db.list_collection_names()
        results = {}
        
        for collection_name in collections:
            if collection_name not in existing_collections:
                db.create_collection(collection_name)
                results[collection_name] = "created"
                logger.info(f"✓ Collection '{collection_name}' created")
            else:
                results[collection_name] = "already_exists"
                logger.info(f"✓ Collection '{collection_name}' already exists")
        
        return results
        
    except Exception as e:
        logger.error(f"Error creating collections: {e}")
        raise


def load_data_from_json(db_name: str = "citilink_demo", connection_alias: str = "demo", 
                        data_dir: Optional[str] = None) -> dict:
    """
    Load data from MongoDB JSON export files into the database.
    
    Args:
        db_name: Name of the database to load data into
        connection_alias: Mongoengine connection alias
        data_dir: Directory containing JSON files (defaults to backend/data/)
        
    Returns:
        dict: Summary of data loading operations
    """
    logger.info(f"Loading data for '{db_name}' (alias: {connection_alias})")
    
    # Default data directory
    if data_dir is None:
        backend_dir = Path(__file__).parent
        data_dir = backend_dir / "data"
    else:
        data_dir = Path(data_dir)
    
    if not data_dir.exists():
        logger.warning(f"Data directory not found: {data_dir}")
        return {"status": "skipped", "reason": "data_directory_not_found"}
    
    results = {
        "status": "success",
        "collections": {},
        "total_documents": 0
    }
    
    try:
        conn = get_connection(alias=connection_alias)
        db = conn[db_name]
        
        # Map of JSON files to collection names
        # Format: {db_name}.{collection_name}.json
        json_files = list(data_dir.glob(f"{db_name}.*.json"))
        
        if not json_files:
            logger.info(f"No JSON data files found in {data_dir} for database '{db_name}'")
            return {"status": "skipped", "reason": "no_data_files"}
        
        logger.info(f"Found {len(json_files)} data files to load")
        
        for json_file in json_files:
            # Extract collection name from filename: citilink_demo.ata.json -> ata
            collection_name = json_file.stem.replace(f"{db_name}.", "")
            
            logger.info(f"Loading {collection_name} from {json_file.name}...")
            
            # Check if collection already has data
            collection = db[collection_name]
            existing_count = collection.count_documents({})
            
            if existing_count > 0:
                logger.info(f"✓ Collection '{collection_name}' already has {existing_count} documents, skipping")
                results["collections"][collection_name] = {
                    "status": "skipped",
                    "reason": "already_has_data",
                    "count": existing_count
                }
                results["total_documents"] += existing_count
                continue
            
            # Load and insert data
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    # Use json_util to properly parse MongoDB Extended JSON ($oid, $date, etc.)
                    json_content = f.read()
                    data = json_util.loads(json_content)
                
                if not data:
                    logger.warning(f"Empty data in {json_file.name}")
                    results["collections"][collection_name] = {
                        "status": "skipped",
                        "reason": "empty_file",
                        "count": 0
                    }
                    continue
                
                # Insert documents
                if isinstance(data, list):
                    collection.insert_many(data)
                    count = len(data)
                else:
                    collection.insert_one(data)
                    count = 1
                
                logger.info(f"✓ Loaded {count} documents into '{collection_name}'")
                results["collections"][collection_name] = {
                    "status": "loaded",
                    "count": count
                }
                results["total_documents"] += count
                
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON in {json_file.name}: {e}")
                results["collections"][collection_name] = {
                    "status": "error",
                    "error": f"Invalid JSON: {str(e)}"
                }
            except Exception as e:
                logger.error(f"Error loading {json_file.name}: {e}")
                results["collections"][collection_name] = {
                    "status": "error",
                    "error": str(e)
                }
        
        logger.info(f"✓ Data loading completed: {results['total_documents']} total documents")
        
    except Exception as e:
        results["status"] = "failed"
        results["error"] = str(e)
        logger.error(f"✗ Data loading failed: {e}")
    
    return results


def initialize_database(db_name: str = "citilink_demo", connection_alias: str = "demo", 
                       create_search_idx: bool = True, load_data: bool = True) -> dict:
    """
    Main function to initialize the database with all necessary collections and indexes.
    This function is idempotent and can be safely called multiple times.
    
    Args:
        db_name: Name of the database to initialize
        connection_alias: Mongoengine connection alias ('default' or 'demo')
        create_search_idx: Whether to create Atlas Search indexes (requires MongoDB Atlas)
        load_data: Whether to load initial data from JSON files
        
    Returns:
        dict: Summary of initialization operations
    """
    logger.info(f"Starting database initialization for '{db_name}' (alias: {connection_alias})")
    
    results = {
        "database": db_name,
        "connection_alias": connection_alias,
        "collections": {},
        "search_indexes": {},
        "data_loading": {},
        "status": "success"
    }
    
    try:
        # Step 1: Create collections
        logger.info("Step 1: Creating collections...")
        results["collections"] = create_collections_and_indexes(db_name, connection_alias)
        
        # Step 2: Load initial data (if requested)
        if load_data:
            logger.info("Step 2: Loading initial data from JSON files...")
            try:
                results["data_loading"] = load_data_from_json(db_name, connection_alias)
            except Exception as e:
                logger.warning(f"Data loading failed (non-fatal): {e}")
                results["data_loading"] = {"status": "failed", "error": str(e)}
        else:
            results["data_loading"] = {"status": "skipped"}
            logger.info("Step 2: Skipping data loading")
        
        # Step 3: Create search indexes (only if requested and using Atlas)
        if create_search_idx:
            logger.info("Step 3: Creating Atlas Search indexes...")
            try:
                results["search_indexes"] = create_search_indexes(db_name, connection_alias)
            except Exception as e:
                logger.warning(f"Search indexes creation failed: {e}")
                logger.info("You may need to create search indexes manually via MongoDB Compass")
                results["search_indexes"] = {
                    "error": str(e), 
                    "note": "Search indexes may need to be created manually via Compass for MongoDB Atlas Local"
                }
        else:
            results["search_indexes"] = {"skipped": True}
            logger.info("Step 3: Skipping search indexes creation")
        
        logger.info(f"✓ Database '{db_name}' initialization completed successfully")
        
    except Exception as e:
        results["status"] = "failed"
        results["error"] = str(e)
        logger.error(f"✗ Database initialization failed: {e}")
        raise
    
    return results


def check_database_status(db_name: str = "citilink_demo", connection_alias: str = "demo") -> dict:
    """
    Check the current status of the database, including existing collections and indexes.
    
    Args:
        db_name: Name of the database
        connection_alias: Mongoengine connection alias
        
    Returns:
        dict: Status information about the database
    """
    try:
        conn = get_connection(alias=connection_alias)
        db = conn[db_name]
        
        collections = db.list_collection_names()
        
        status = {
            "database": db_name,
            "connection_alias": connection_alias,
            "collections": collections,
            "collection_count": len(collections),
            "indexes": {}
        }
        
        # Get index information for each collection
        for collection_name in collections:
            collection = db[collection_name]
            indexes = list(collection.list_indexes())
            status["indexes"][collection_name] = [idx["name"] for idx in indexes]
        
        return status
        
    except Exception as e:
        logger.error(f"Error checking database status: {e}")
        raise


if __name__ == "__main__":
    """
    When run as a standalone script, initialize the database.
    This requires environment variables or manual configuration.
    """
    import sys
    from mongoengine import connect
    import os
    
    # Setup basic logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Get MongoDB URI from environment or use default
    mongo_uri = os.getenv("MONGO_URI_DEMO", "mongodb://localhost:27017/citilink_demo")
    
    # Connect to MongoDB
    connect(host=mongo_uri, alias="default")
    
    # Parse arguments
    db_name = sys.argv[1] if len(sys.argv) > 1 else "citilink_demo"
    
    # Initialize database
    try:
        results = initialize_database(db_name=db_name, connection_alias="default", create_search_idx=True)
        print("\n" + "="*60)
        print("DATABASE INITIALIZATION COMPLETE")
        print("="*60)
        print(f"\nDatabase: {results['database']}")
        print(f"Connection: {results['connection_alias']}")
        print(f"Status: {results['status']}")
        print(f"\nCollections created/verified: {len(results['collections'])}")
        for name, status in results['collections'].items():
            print(f"  • {name}: {status}")
        
        if results.get('search_indexes'):
            print(f"\nSearch indexes:")
            for name, status in results['search_indexes'].items():
                print(f"  • {name}: {status}")
        
    except Exception as e:
        print(f"\n✗ Error: {e}")
        sys.exit(1)
