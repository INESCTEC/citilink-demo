"""MongoDB database operations and utilities."""
import logging
import os
import csv
import json
import unicodedata
import re
from typing import Dict, List, Optional, Union
from datetime import datetime

from mongoengine import connect, DoesNotExist, ValidationError

from src.config import MONGO_URI, MONGO_DB
from src.utils.logging_utils import log_insertion_error, log_insertion_warning

from .models import (
    Municipio, Ata, Participante, Topico, Assunto, Voto, ErrorLog
)

def normalize_text(text: str) -> str:
    """
    Normalize text for comparison by:
    - Converting to lowercase
    - Removing accents/diacritics
    - Removing extra whitespace
    - Standardizing special characters
    """
    if not text:
        return ""
    
    # Convert to lowercase
    text = text.lower()
    
    # Remove accents/diacritics
    text = unicodedata.normalize('NFD', text)
    text = ''.join(char for char in text if unicodedata.category(char) != 'Mn')
    
    # Normalize whitespace
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def find_existing_municipio(name: str) -> Optional[Municipio]:
    """
    Find an existing municipality by name using normalized text matching.
    
    Args:
        name: Municipality name to search for
        
    Returns:
        Municipio object if found, None otherwise
    """
    if not name:
        return None
    
    # First try exact match
    try:
        return Municipio.objects.get(name=name)
    except DoesNotExist:
        pass
    
    # Try normalized match
    normalized_search = normalize_text(name)
    for municipio in Municipio.objects.all():
        if normalize_text(municipio.name) == normalized_search:
            return municipio
    
    return None

def find_existing_participantes(names: List[str], municipio: Municipio) -> List[Participante]:
    """
    Find existing participants by names within a specific municipality.
    
    Args:
        names: List of participant names to search for
        municipio: Municipality to search within
        
    Returns:
        List of found Participante objects
    """
    found_participants = []
    
    for name in names:
        if not name:
            continue
            
        # First try exact match within the municipality
        try:
            participant = Participante.objects.get(name=name, municipio=municipio)
            found_participants.append(participant)
            continue
        except DoesNotExist:
            pass
        
        # Try normalized match within the municipality
        normalized_search = normalize_text(name)
        found = False
        for participant in Participante.objects.filter(municipio=municipio):
            if normalize_text(participant.name) == normalized_search:
                found_participants.append(participant)
                found = True
                break
        
        if not found:
            logging.warning(f"Participant '{name}' not found in municipality {municipio.name}")
    
    return found_participants

def find_existing_topicos(subject_titles: List[str]) -> List[Topico]:
    """
    Find existing topics that match the subject titles using semantic similarity.
    
    Args:
        subject_titles: List of subject titles to match against existing topics
        
    Returns:
        List of matching Topico objects
    """
    found_topics = []
    all_topics = list(Topico.objects.all())
    
    for title in subject_titles:
        if not title:
            continue
            
        # First try exact match on title
        try:
            topic = Topico.objects.get(title=title)
            found_topics.append(topic)
            continue
        except DoesNotExist:
            pass
        
        # Try normalized title match
        normalized_title = normalize_text(title)
        exact_match_found = False
        for topic in all_topics:
            if normalize_text(topic.title) == normalized_title:
                found_topics.append(topic)
                exact_match_found = True
                break
        
        if exact_match_found:
            continue
        
        # Try keyword-based matching using description
        title_words = set(normalized_title.split())
        best_match = None
        best_score = 0
        
        for topic in all_topics:
            # Calculate score based on matching keywords
            topic_words = set()
            if topic.title:
                topic_words.update(normalize_text(topic.title).split())
            if topic.description:
                topic_words.update(normalize_text(topic.description).split())
            
            # Calculate overlap score
            if topic_words:
                common_words = title_words.intersection(topic_words)
                score = len(common_words) / min(len(title_words), len(topic_words))
                
                # Require at least 50% overlap for a match
                if score > best_score and score >= 0.5:
                    best_match = topic
                    best_score = score
        
        if best_match:
            found_topics.append(best_match)
        else:
            logging.warning(f"No matching topic found for subject: '{title}'")
    
    return found_topics

# Setup database connection
def initialize_db(load_vereadores=True):
    """
    Initialize database connection and load essential data.
    
    Args:
        load_vereadores (bool): Whether to automatically load vereadores data if not present
    """
    try:
        # Connection with SSL options to handle TLS handshake issues
        connect(
            db=MONGO_DB, 
            host=MONGO_URI,
            alias='default'
        )
        logging.info(f"Connected to MongoDB: {MONGO_DB}")
        
        # Load vereadores data if requested and if no participants exist in the database yet
        if load_vereadores:
            participants_count = Participante.objects.count()
            if participants_count == 0:
                logging.info("No participants found in database, attempting to load from CSV...")
                csv_path = "data/vareadores.csv"
                if os.path.exists(csv_path):
                    result = import_vereadores_from_csv(csv_path)
                    logging.info(f"Loaded participants: {result}")
                else:
                    logging.warning(f"Participants CSV file not found at {csv_path}")
                # Don't raise the error - we can still use the database without participants data
                
    except Exception as e:
        logging.error(f"Failed to connect to MongoDB: {str(e)}")
        raise

def check_ata_exists(title: str) -> bool:
    """
    Check if an ata with the given title already exists in the database.
    
    Args:
        title (str): The title of the ata to check
        
    Returns:
        bool: True if ata exists, False otherwise
    """
    try:
        initialize_db()
        return Ata.objects.filter(title=title).count() > 0
    except Exception as e:
        logging.error(f"Error checking if ata exists: {str(e)}")
        return False
        
def save_to_database(metadados: Dict, participantes: List[Dict], votos: List[Dict]) -> Dict:
    """
    Save extracted data to MongoDB using existing reference data for cross-referencing.
    
    Args:
        metadados (Dict): Meeting metadata
        participantes (List[Dict]): List of participants
        votos (List[Dict]): List of votes (This now contains complete information)
        
    Returns:
        Dict: Status of operation with counts of created objects
    """
    status = {
        "success": False,
        "municipio": None,
        "ata": None,
        "participants_matched": 0,
        "topics_matched": 0,
        "votes_added": 0,
        "errors": []
    }
    
    try:
        # Ensure database connection
        initialize_db()
        
        # 1. Find existing municipality (MUST exist)
        municipio_name = metadados.get("municipio")
        if not municipio_name:
            error_msg = "Municipality is missing in metadata"
            log_insertion_error("municipio_missing", metadados, error_msg, metadados.get("file_path"))
            status["errors"].append(error_msg)
            return status
            
        municipio = find_existing_municipio(municipio_name)
        if not municipio:
            error_msg = f"Municipality '{municipio_name}' not found in database. Must be added first."
            log_insertion_error("municipio_not_found", {"municipio_name": municipio_name, "metadados": metadados}, error_msg, metadados.get("file_path"))
            status["errors"].append(error_msg)
            return status
            
        status["municipio"] = municipio.name
        # Don't add the municipio object to metadados dict to avoid JSON serialization issues
        logging.info(f"Municipality found: {municipio.name} (ID: {municipio.id})")
        
        # 2. Find existing participants within this municipality
        participant_names = [p.get("nome") for p in participantes if p.get("nome")]
        participants_list = find_existing_participantes(participant_names, municipio)
        status["participants_matched"] = len(participants_list)
        
        if len(participants_list) == 0:
            error_msg = f"No participants found in municipality {municipio.name}. At least some participants must exist."
            log_insertion_error("no_participants_found", {"municipio": municipio.name, "searched_names": participant_names}, error_msg, metadados.get("file_path"))
            status["errors"].append(error_msg)
            return status
        
        logging.info(f"Found {len(participants_list)} participants in municipality {municipio.name}")
        
        # 3. Create meeting record (this is new data, so we create it)
        try:
            logging.debug(f"Creating Ata with municipio: {municipio} (type: {type(municipio)}) and {len(participants_list)} participants")
            new_ata = Ata.create_from_metadata(metadados, participants_list)
            new_ata.municipio = municipio  # Set the municipio reference properly
            new_ata.save()  # SAVE THE ATA BEFORE REFERENCING IT
            status["ata"] = new_ata.title
            logging.info(f"Created new Ata: {new_ata.title}")
        except Exception as e:
            error_msg = f"Failed to create meeting record: {str(e)}"
            log_insertion_error("ata_creation_error", 
                              {"metadados": metadados, "participants_count": len(participants_list)}, 
                              error_msg, metadados.get("file_path"))
            status["errors"].append(error_msg)
            return status  # Exit if meeting creation fails
        
        # 4. Process votes and match with existing topics
        for voto_data in votos:
            try:
                # Extract information from votos data
                assunto_title = voto_data.get("assunto", "Sem título")
                pelouro_title = voto_data.get("topico")
                deliberacao = voto_data.get("deliberacao")
                votos_list = voto_data.get("votos", [])
                
                # Find existing topico using cross-referencing
                topico = None
                if pelouro_title:
                    # Try to find matching topics
                    matching_topics = find_existing_topicos([pelouro_title])
                    if matching_topics:
                        topico = matching_topics[0]
                        status["topics_matched"] += 1
                        logging.info(f"Matched topic: '{pelouro_title}' -> '{topico.title}'")
                    else:
                        # Use fallback topic "Outras Informações"
                        try:
                            topico = Topico.objects.get(title="Outras Informações")
                            logging.warning(f"Topic '{pelouro_title}' not matched, using fallback topic '{topico.title}'")
                            
                            log_insertion_warning("topico_fallback_used", 
                                                {"original_topico": pelouro_title, "fallback_topico": topico.title, "voto_data": voto_data}, 
                                                f"Topic '{pelouro_title}' not matched, using fallback '{topico.title}'", 
                                                metadados.get("file_path"))
                        except Exception as fallback_error:
                            error_msg = f"Topic '{pelouro_title}' not matched and fallback topic 'Outras Informações' not found: {str(fallback_error)}"
                            log_insertion_error("topico_fallback_failed", 
                                              {"topico_title": pelouro_title, "voto_data": voto_data}, 
                                              error_msg, metadados.get("file_path"))
                            status["errors"].append(error_msg)
                            continue
                else:
                    # No topic specified - use fallback
                    try:
                        topico = Topico.objects.get(title="Outras Informações")
                        logging.warning(f"No topic specified, using fallback topic '{topico.title}'")
                        
                        log_insertion_warning("no_topico_fallback_used", 
                                            {"fallback_topico": topico.title, "voto_data": voto_data}, 
                                            f"No topic specified, using fallback '{topico.title}'", 
                                            metadados.get("file_path"))
                    except Exception as e:
                        error_msg = f"No topic specified and fallback topic 'Outras Informações' not found: {str(e)}"
                        log_insertion_error("no_topico_no_fallback", 
                                          {"voto_data": voto_data}, 
                                          error_msg, metadados.get("file_path"))
                        status["errors"].append(error_msg)
                        continue
                
                # Create assunto with matched topic
                try:
                    new_assunto = Assunto(
                        title=assunto_title,
                        topico=topico,
                        ata=new_ata,
                        deliberacao=deliberacao
                    )
                except Exception as e:
                    error_msg = f"Error creating assunto '{assunto_title}': {str(e)}"
                    log_insertion_error("assunto_creation_error", 
                                      {"assunto_title": assunto_title, "topico": topico.title if topico else None, "voto_data": voto_data}, 
                                      error_msg, metadados.get("file_path"))
                    status["errors"].append(error_msg)
                    continue
                
                votes_list = []
                
                # Process votes for this assunto - match participants from existing data
                for vote_data in votos_list:
                    try:
                        participant_name = vote_data.get("participante")
                        vote_type = vote_data.get("tipo")                            
                        if not participant_name or not vote_type:
                            continue
                            
                        # Skip invalid vote types (e.g., "ausente" since they didn't actually vote)
                        valid_vote_types = ["favor", "contra", "abstencao"]
                        if vote_type not in valid_vote_types:
                            logging.debug(f"Skipping invalid vote type '{vote_type}' for participant '{participant_name}'. Valid types: {valid_vote_types}")
                            continue
                            
                        # Find existing participant within municipality
                        matching_participants = find_existing_participantes([participant_name], municipio)
                        if matching_participants:
                            participant = matching_participants[0]
                            
                            new_vote = Voto(
                                participante=participant,
                                tipo=vote_type
                            )
                            votes_list.append(new_vote)
                            status["votes_added"] += 1
                            logging.debug(f"Matched participant '{participant_name}' -> '{participant.name}' for vote")
                        else:
                            logging.warning(f"Participant '{participant_name}' not found in municipality {municipio.name} for vote")

                    except Exception as e:
                        error_msg = f"Error processing vote: {str(e)}"
                        logging.error(error_msg)
                        status["errors"].append(error_msg)
                
                # Add votes to the assunto
                new_assunto.votos = votes_list
                
                # Compute vote totals
                new_assunto.compute_vote_totals()
                
                # Save the assunto
                try:
                    new_assunto.save()
                    logging.info(f"Successfully saved assunto: '{assunto_title}' with {len(votes_list)} votes")
                except Exception as e:
                    error_msg = f"Error saving assunto '{assunto_title}': {str(e)}"
                    log_insertion_error("assunto_save_error", 
                                      {"assunto_title": assunto_title, "topico": topico.title if topico else None, "deliberacao": deliberacao}, 
                                      error_msg, metadados.get("file_path"))
                    status["errors"].append(error_msg)
                    
            except Exception as e:
                error_msg = f"Error processing assunto: {str(e)}"
                log_insertion_error("assunto_processing_error", 
                                  {"voto_data": voto_data}, 
                                  error_msg, metadados.get("file_path"))
                status["errors"].append(error_msg)
        
        # Mark success if no critical errors
        status["success"] = True
        logging.info(f"Successfully processed {status['participants_matched']} participants, {status['topics_matched']} topic matches, and {status['votes_added']} votes")
        
    except Exception as e:
        error_msg = f"Database operation failed: {str(e)}"
        logging.error(error_msg)
        status["errors"].append(error_msg)
    
    return status

# Utility functions
def get_municipality_by_name(name: str) -> Optional[Municipio]:
    """Get municipality by name."""
    try:
        return Municipio.objects.get(name=name)
    except DoesNotExist:
        logging.warning(f"Municipality not found: {name}")
        return None
    except Exception as e:
        logging.error(f"Error retrieving municipality {name}: {str(e)}")
        return None

def get_participant_by_name(name: str, municipio: Municipio) -> Optional[Participante]:
    """Get participant by name and municipality."""
    try:
        return Participante.objects.get(name=name, municipio=municipio)
    except DoesNotExist:
        return None
    except Exception as e:
        logging.error(f"Error retrieving participant {name}: {str(e)}")
        return None

def get_meetings_by_date_range(start_date: Union[str, datetime], 
                              end_date: Union[str, datetime],
                              municipio: Optional[Municipio] = None) -> List[Ata]:
    """Get meetings within a date range."""
    try:
        if isinstance(start_date, str):
            start_date = Ata._parse_date(start_date)
        if isinstance(end_date, str):
            end_date = Ata._parse_date(end_date)
        
        query = {'date__gte': start_date, 'date__lte': end_date}
        if municipio:
            query['municipio'] = municipio
            
        return Ata.objects.filter(**query).order_by('-date')
    except Exception as e:
        logging.error(f"Error retrieving meetings: {str(e)}")
        return []

def search_topics(text: str, municipio: Optional[Municipio] = None) -> List[Assunto]:
    """Search topics containing specific text."""
    try:
        query = {'title__icontains': text}
        if municipio:
            query['ata__municipio'] = municipio
            
        return Assunto.objects.filter(**query)
    except Exception as e:
        logging.error(f"Error searching topics: {str(e)}")
        return []

def clear_database(confirm: bool = False) -> Dict:
    """
    Delete all documents from all collections in the database.
    
    Args:
        confirm (bool): Safety check to confirm deletion intention
        
    Returns:
        Dict: Status of operation with counts of deleted documents
    """
    if not confirm:
        logging.warning("Database deletion aborted. Set confirm=True to proceed.")
        return {
            "success": False,
            "message": "Operation aborted. Set confirm=True to proceed with deletion."
        }
    
    result = {
        "success": True,
        "deleted": {
            "municipalities": 0,
            "participants": 0,
            "meetings": 0,
            "topics": 0,
            "departments": 0,
            "total": 0
        },
        "errors": []
    }
    
    try:
        # Initialize DB connection first
        connect(db=MONGO_DB, host=MONGO_URI)
        
        # Delete in a specific order to handle dependencies
        # 1. Delete topics first (they reference meetings)
        count = Assunto.objects.delete()
        result["deleted"]["topics"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} topics")
        
        # 3. Delete meetings (they reference municipalities and participants)
        count = Ata.objects.delete()
        result["deleted"]["meetings"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} meeting records")
        
        # 4. Delete departments (they reference municipalities and participants)
        count = Topico.objects.delete()
        result["deleted"]["departments"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} departments")
        
        # 5. Delete participants (they reference municipalities)
        count = Participante.objects.delete()
        result["deleted"]["participants"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} participants")
        
        # 6. Finally delete municipalities
        count = Municipio.objects.delete()
        result["deleted"]["municipalities"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} municipalities")
        
        logging.warning(f"Database cleared successfully. Total documents deleted: {result['deleted']['total']}")
    
    except Exception as e:
        error_msg = f"Error clearing database: {str(e)}"
        logging.error(error_msg)
        result["success"] = False
        result["errors"].append(error_msg)
    
    return result

def delete_municipality_data(municipality_name: str, confirm: bool = False) -> Dict:
    """
    Delete all data related to a specific municipality.
    
    Args:
        municipality_name (str): Name of municipality to delete
        confirm (bool): Safety check to confirm deletion intention
        
    Returns:
        Dict: Status of operation with counts of deleted documents
    """
    if not confirm:
        logging.warning(f"Deletion of {municipality_name} data aborted. Set confirm=True to proceed.")
        return {
            "success": False,
            "message": "Operation aborted. Set confirm=True to proceed with deletion."
        }
    
    result = {
        "success": True,
        "municipality": municipality_name,
        "deleted": {
            "participants": 0,
            "meetings": 0,
            "topics": 0,
            "departments": 0,
            "total": 0
        },
        "errors": []
    }
    
    try:
        # Find the municipality
        municipio = Municipio.objects.filter(name=municipality_name).first()
        
        if not municipio:
            error_msg = f"Municipality '{municipality_name}' not found"
            logging.warning(error_msg)
            result["success"] = False
            result["errors"].append(error_msg)
            return result
        
        # 1. Find and delete all topics related to this municipality's meetings
        meeting_ids = [ata.id for ata in Ata.objects(municipio=municipio)]
        if meeting_ids:
            count = Assunto.objects(ata__in=meeting_ids).delete()
            result["deleted"]["topics"] = count
            result["deleted"]["total"] += count
            logging.info(f"Deleted {count} topics for {municipality_name}")
                
        # 3. Delete meetings
        count = Ata.objects(municipio=municipio).delete()
        result["deleted"]["meetings"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} meeting records for {municipality_name}")
        
        # 4. Delete departments
        count = Topico.objects(municipio=municipio).delete()
        result["deleted"]["departments"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} departments for {municipality_name}")
        
        # 5. Delete participants
        count = Participante.objects(municipio=municipio).delete()
        result["deleted"]["participants"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} participants for {municipality_name}")
        
        # 6. Finally delete the municipality itself
        municipio.delete()
        result["deleted"]["total"] += 1
        logging.warning(f"Municipality '{municipality_name}' and all related data deleted successfully")
    
    except Exception as e:
        error_msg = f"Error deleting municipality data: {str(e)}"
        logging.error(error_msg)
        result["success"] = False
        result["errors"].append(error_msg)
    
    return result

def delete_meeting(meeting_id: str, confirm: bool = False) -> Dict:
    """
    Delete a specific meeting and all its related data.
    
    Args:
        meeting_id (str): ID of the meeting to delete
        confirm (bool): Safety check to confirm deletion intention
        
    Returns:
        Dict: Status of the operation
    """
    if not confirm:
        return {
            "success": False,
            "message": "Operation aborted. Set confirm=True to proceed with deletion."
        }
    
    result = {
        "success": True,
        "meeting_id": meeting_id,
        "deleted": {
            "topics": 0
        },
        "errors": []
    }
    
    try:
        # Find the meeting
        try:
            meeting = Ata.objects.get(id=meeting_id)
        except DoesNotExist:
            return {
                "success": False,
                "message": f"Meeting with ID {meeting_id} not found"
            }
        
        # 1. Delete all topics related to this meeting
        count = Assunto.objects(ata=meeting).delete()
        result["deleted"]["topics"] = count
        logging.info(f"Deleted {count} topics for meeting {meeting_id}")
                
        # 3. Delete the meeting
        meeting_title = meeting.title
        meeting.delete()
        logging.info(f"Deleted meeting: {meeting_title} ({meeting_id})")
        
    except Exception as e:
        error_msg = f"Error deleting meeting: {str(e)}"
        logging.error(error_msg)
        result["success"] = False
        result["errors"].append(error_msg)
    
    return result

def delete_meetings_by_year(year: int, municipality_name: str = None, confirm: bool = False) -> Dict:
    """
    Delete all meetings from a specific year and their related data.
    
    Args:
        year (int): Year to delete meetings from
        municipality_name (str, optional): If provided, only delete for this municipality
        confirm (bool): Safety check to confirm deletion intention
        
    Returns:
        Dict: Status of the operation
    """
    if not confirm:
        return {
            "success": False,
            "message": "Operation aborted. Set confirm=True to proceed with deletion."
        }
    
    result = {
        "success": True,
        "year": year,
        "municipality": municipality_name,
        "deleted": {
            "meetings": 0,
            "topics": 0,
            "total": 0
        },
        "errors": []
    }
    
    try:
        # Create date range for the year
        start_date = datetime(year, 1, 1)
        end_date = datetime(year, 12, 31, 23, 59, 59)
        
        # Build query
        query = {"date__gte": start_date, "date__lte": end_date}
        
        # Add municipality filter if provided
        if municipality_name:
            try:
                municipio = Municipio.objects.get(name=municipality_name)
                query["municipio"] = municipio
            except DoesNotExist:
                return {
                    "success": False,
                    "message": f"Municipality '{municipality_name}' not found"
                }
        
        # Get all meeting IDs for this query
        meetings = Ata.objects.filter(**query)
        meeting_ids = [meeting.id for meeting in meetings]
        
        if not meeting_ids:
            logging.info(f"No meetings found for {year}" + 
                         (f" in {municipality_name}" if municipality_name else ""))
            return {
                "success": True,
                "message": "No meetings found to delete",
                "deleted": result["deleted"]
            }
        
        # Delete topics first
        count = Assunto.objects(ata__in=meetings).delete()
        result["deleted"]["topics"] = count
        result["deleted"]["total"] += count
        logging.info(f"Deleted {count} topics for meetings from {year}")
        
        
        # Delete meetings
        count = len(meeting_ids)
        Ata.objects(id__in=meeting_ids).delete()
        result["deleted"]["meetings"] = count
        result["deleted"]["total"] += count
        
        msg = f"Deleted {count} meetings from {year}"
        if municipality_name:
            msg += f" for {municipality_name}"
        logging.warning(msg)
        
    except Exception as e:
        error_msg = f"Error deleting meetings: {str(e)}"
        logging.error(error_msg)
        result["success"] = False
        result["errors"].append(error_msg)
    
    return result

def save_error_to_database(file_path: str, error_message: str, error_phase: str = None) -> Dict:
    """
    Save an error record to the database for tracking processing failures.
    
    Args:
        file_path: Path to the file that had an error
        error_message: The error message to log
        error_phase: Which processing phase had the error (metadados, participantes, etc.)
        
    Returns:
        Dict containing operation status
    """
    result = {"success": False, "errors": []}
    try:
        # Extract file name from path
        file_name = os.path.basename(file_path)
        
        # Try to find an existing Ata record for this file
        try:
            # Try to match by file path first
            ata = Ata.objects(file_path=file_path).first()
            
            if not ata:
                # Try to match by file name
                ata = Ata.objects(file_path__contains=file_name).first()
            
            if not ata:
                # If no match by filename, try to infer title from filename
                title_guess = os.path.splitext(file_name)[0].replace('_', ' ')
                ata = Ata.objects(title__icontains=title_guess).first()
                
            if ata:
                # Update existing record with error information
                if not hasattr(ata, 'processing_errors') or not ata.processing_errors:
                    ata.processing_errors = []
                
                # Create formatted error entry with phase information
                formatted_error = f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}]"
                if error_phase:
                    formatted_error += f" {error_phase}:"
                formatted_error += f" {error_message}"
                
                # Add error to existing errors
                ata.processing_errors.append(formatted_error)
                ata.processed = False
                ata.status = "error"
                ata.save()
                
                logging.info(f"Updated Ata record with error information: {file_name}")
                result["success"] = True
            else:
                # No matching Ata found - create a minimal error record
                error_msg = f"Could not find matching Ata record for {file_name}"
                logging.warning(error_msg)
                result["errors"].append(error_msg)
                
                # Create a new error record in a separate collection
                ErrorLog.create(
                    file_path=file_path,
                    file_name=file_name,
                    error_message=error_message,
                    error_phase=error_phase,
                    timestamp=datetime.now()
                )
                result["success"] = True
        except Exception as e:
            error_msg = f"Error saving to database: {str(e)}"
            logging.error(error_msg)
            result["errors"].append(error_msg)
    except Exception as e:
        error_msg = f"Unexpected error in save_error_to_database: {str(e)}"
        logging.error(error_msg)
        result["errors"].append(error_msg)
        
    return result

def import_vereadores_from_csv(csv_file_path: str, clear_existing: bool = False) -> Dict:
    """
    Import participants (vereadores) data from CSV file.
    
    Args:
        csv_file_path (str): Path to the CSV file containing participants data
        clear_existing (bool): Whether to clear existing participants before import
        
    Returns:
        Dict: Status of operation with counts of created objects
    """
    status = {
        "success": False,
        "created": 0,
        "updated": 0,
        "errors": [],
        "municipalities_created": 0
    }
    
    try:
        # Ensure database connection
        initialize_db()
        
        # Clear existing data if requested
        if clear_existing:
            count = Participante.objects.delete()
            logging.info(f"Cleared {count} existing participants")
        
        # Open and read the CSV file
        with open(csv_file_path, 'r', encoding='utf-8') as file:
            csv_reader = csv.reader(file)
            headers = next(csv_reader)  # Skip header row
            
            # Verify CSV structure (should have Camara, Nome, Partido columns)
            if len(headers) < 2 or "Camara" not in headers or "Nome" not in headers:
                error_msg = f"Invalid CSV format. Expected columns: Camara, Nome, Partido. Found: {headers}"
                logging.error(error_msg)
                status["errors"].append(error_msg)
                return status
            
            # Find column indices
            camara_idx = headers.index("Camara")
            nome_idx = headers.index("Nome")
            partido_idx = headers.index("Partido") if "Partido" in headers else None
            
            for row in csv_reader:
                try:
                    if len(row) <= max(camara_idx, nome_idx):
                        continue  # Skip incomplete rows
                    
                    # Extract data from row
                    municipio_name = row[camara_idx].strip()
                    vereador_name = row[nome_idx].strip()
                    partido = row[partido_idx].strip() if partido_idx is not None and partido_idx < len(row) else None
                    
                    # Skip rows with empty municipality or name
                    if not municipio_name or not vereador_name:
                        continue
                    
                    # Get or create municipality
                    try:
                        municipio = Municipio.get_or_create(name=municipio_name)
                    except Exception as e:
                        error_msg = f"Error creating municipality {municipio_name}: {str(e)}"
                        logging.error(error_msg)
                        status["errors"].append(error_msg)
                        continue
                    
                    # Check if participant already exists
                    try:
                        participant = Participante.objects.filter(name=vereador_name, municipio=municipio).first()
                        if participant:
                            # Update if party has changed (check mandatos for existing party info)
                            if partido and not any(m.party == partido for m in participant.mandatos):
                                # Add new mandato with updated party
                                from .models import Mandato
                                new_mandato = Mandato(role="Vereador", party=partido)
                                if not participant.mandatos:
                                    participant.mandatos = [new_mandato]
                                else:
                                    participant.mandatos.append(new_mandato)
                                participant.save()
                                status["updated"] += 1
                        else:
                            # Create new participant with Vereador role
                            from .models import Mandato
                            mandato = Mandato(role="Vereador", party=partido) if partido else Mandato(role="Vereador")
                            new_participant = Participante(
                                name=vereador_name, 
                                municipio=municipio, 
                                mandatos=[mandato],
                                slug=vereador_name.lower().replace(" ", "-")
                            )
                            new_participant.save()
                            status["created"] += 1
                    except Exception as e:
                        error_msg = f"Error processing participant {vereador_name}: {str(e)}"
                        logging.error(error_msg)
                        status["errors"].append(error_msg)
                
                except Exception as e:
                    error_msg = f"Error processing row {row}: {str(e)}"
                    logging.error(error_msg)
                    status["errors"].append(error_msg)
            
        # Mark as successful if we imported any data
        if status["created"] > 0 or status["updated"] > 0:
            status["success"] = True
            logging.info(f"Successfully imported {status['created']} new vereadores and updated {status['updated']} existing ones")
            
    except Exception as e:
        error_msg = f"CSV import failed: {str(e)}"
        logging.error(error_msg)
        status["errors"].append(error_msg)
    
    return status