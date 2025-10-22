"""Module for processing text files and extracting structured data."""
import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Tuple
import re

from ..config import OUTPUT_DIR, ERROR_DIR, MAX_CHUNK_SIZE, MAX_DOCUMENT_LENGTH
from ..prompts.votantes import query_votantes_def, json_schema_votantes
from ..prompts.metadados import query_metadados_def, json_schema_metadados
from ..prompts.votos import query_votos_def, json_schema_votos
from .content_generator import generate_valid_json
from ..models.database import save_to_database, check_ata_exists, find_existing_municipio, find_existing_participantes, initialize_db
from ..models.models import Participante, Topico
from .document_chunker import DocumentChunker  # Import the chunker

def get_reference_data_for_municipality(municipio_name: str) -> Tuple[List[str], List[str]]:
    """
    Get reference data (participants and topics) for a municipality to enhance AI prompts.
    
    Args:
        municipio_name: Name of the municipality
        
    Returns:
        Tuple of (participant_names_list, topic_titles_list)
    """
    participants_ref = []
    topics_ref = []
    
    try:
        # Ensure database is initialized
        initialize_db()
        
        # Get municipality
        municipio = find_existing_municipio(municipio_name)
        if not municipio:
            logging.warning(f"Municipality '{municipio_name}' not found for reference data")
            return participants_ref, topics_ref
        
        # Get participants for this municipality
        participants = Participante.objects.filter(municipio=municipio, active=True)
        for participant in participants:
            participant_info = f"- {participant.name}"
            # Get role and party from current mandate (if any)
            if participant.mandatos:
                current_mandato = participant.mandatos[-1]  # Get the most recent mandate
                if current_mandato.role:
                    participant_info += f" ({current_mandato.role})"
                if current_mandato.party:
                    participant_info += f" - {current_mandato.party}"
            participants_ref.append(participant_info)
        
        # Get all available topics
        topics = Topico.objects.all()
        for topic in topics:
            topic_info = f"- {topic.title}"
            if topic.description:
                topic_info += f": {topic.description}"
            topics_ref.append(topic_info)
        
        logging.info(f"Found {len(participants_ref)} participants and {len(topics_ref)} topics for reference")
        
    except Exception as e:
        logging.error(f"Error getting reference data for {municipio_name}: {str(e)}")
    
    return participants_ref, topics_ref

# Define helper functions for merging results from chunks
def merge_participants(results: List[List[Dict]]) -> List[Dict]:
    """Merge participant results from multiple chunks, avoiding duplicates."""
    merged = []
    seen_names = set()
    
    for chunk_results in results:
        for participant in chunk_results:
            if participant["name"].lower() not in seen_names:
                seen_names.add(participant["name"].lower())
                merged.append(participant)
    
    return merged


def merge_votes(results: List[List[Dict]]) -> List[Dict]:
    """Merge voting results from multiple chunks."""
    # Flatten all vote results
    all_votes = []
    
    for chunk_results in results:
        # Handle both direct list and list within list structures
        if not isinstance(chunk_results, list):
            logging.warning(f"Skipping invalid vote chunk result: {chunk_results}")
            continue
            
        all_votes.extend(chunk_results)
    
    # Group by topic to avoid duplicates - use more fields for matching
    votes_by_topic = {}
    for vote in all_votes:
        if not isinstance(vote, dict):
            logging.warning(f"Skipping invalid vote item: {vote}")
            continue
            
        # Create a more robust key using multiple fields
        topic_id = vote.get("assuntoId", "")
        topic_title = vote.get("assunto", "")
        vote_key = f"{topic_id}-{topic_title}"
        
        if vote_key and vote_key not in votes_by_topic:
            votes_by_topic[vote_key] = vote
    
    result = list(votes_by_topic.values())
    logging.info(f"Merged votes from chunks: found {len(result)} unique votes")
    return result


def save_json_to_folder(folder_path: str, file_name: str, data: Any) -> None:
    """
    Save JSON data to a file in the specified folder.
    
    Args:
        folder_path (str): Path to the folder
        file_name (str): Name of the file
        data (Any): Data to save as JSON
    """
    os.makedirs(folder_path, exist_ok=True)
    file_path = os.path.join(folder_path, file_name)
    with open(file_path, "w", encoding="utf-8") as json_file:
        json.dump(data, json_file, ensure_ascii=False, indent=4)
    logging.info(f"Saved {file_name} to {folder_path}")

def process_file(file_path: str, force_regenerate: bool = False) -> bool:
    """
    Process a single text file of meeting minutes.
    
    Args:
        file_path (str): Path to the file to process
        force_regenerate (bool): If True, regenerates all files even if already processed
        
    Returns:
        bool: True if processing was successful, False otherwise
    """
    file_name = os.path.basename(file_path)
    output_folder = os.path.join(OUTPUT_DIR, os.path.splitext(file_name)[0])
    chunks_dir = os.path.join(OUTPUT_DIR, f"{os.path.splitext(file_name)[0]}_chunks")

    
    # Check if this file has already been processed
    if os.path.exists(output_folder) and not force_regenerate:
        required_files = ["metadados.json", "participantes.json", "votos.json"]
        
        # Check if all required files exist
        all_files_exist = all(os.path.exists(os.path.join(output_folder, f)) for f in required_files)
        
        if all_files_exist:
            logging.info(f"File {file_name} has already been processed. Files found in {output_folder}")
            
            # Load existing data if available
            try:
                with open(os.path.join(output_folder, "metadados.json"), "r", encoding="utf-8") as f:
                    metadados_json = json.load(f)
                with open(os.path.join(output_folder, "participantes.json"), "r", encoding="utf-8") as f:
                    participantes_json = json.load(f)
                with open(os.path.join(output_folder, "votos.json"), "r", encoding="utf-8") as f:
                    votos_formatted_json = json.load(f)
                

                if (check_ata_exists(metadados_json["titulo"])):
                    logging.info(f"File {file_name} already exists in the database. Skipping.")
                    return True
                
                # Save to database using existing files
                logging.info("Saving existing JSON files to database...")
                save_to_database(
                    metadados_json, 
                    participantes_json, 
                    votos_formatted_json
                )
                logging.info(f"Successfully saved {file_name} to database using existing files")
                             
                return True
            except Exception as e:
                logging.error(f"Error reading existing JSON files: {e}")
                # If there's an error with existing files, we'll proceed to regenerate them
                logging.info("Will regenerate files due to error with existing ones")
    
    # If force_regenerate is True or files don't exist, clean up the directory
    if os.path.exists(output_folder) and (force_regenerate or not all_files_exist):
        logging.info(f"Cleaning up directory {output_folder} for regeneration")
        # Remove directory contents but not the directory itself
        for item in os.listdir(output_folder):
            item_path = os.path.join(output_folder, item)
            if os.path.isfile(item_path):
                os.unlink(item_path)
    
    try:
        logging.info(f"Processing file: {file_path}")
        
        with open(file_path, 'r', encoding='utf-8') as file:
            text = file.read()
        
        # Step 1: Extract metadata (use whole document as metadata is small and critical)
        logging.info("Generating metadata...")
        metadados_json = generate_valid_json(query_metadados_def(text), json_schema=json_schema_metadados)
        
        # Add the original document content to metadata for saving to database
        metadados_json["content"] = text
        metadados_json["file_path"] = file_path
        metadados_json["file_name"] = file_name
        
        save_json_to_folder(output_folder, "metadados.json", metadados_json)
        
        # Use chunking only for very large documents
        use_chunking = len(text) > MAX_DOCUMENT_LENGTH  # Higher threshold to avoid chunking for medium-sized documents
        
        municipality = metadados_json.get("municipio", "").lower()
        
        # Get reference data for enhanced prompts
        logging.info(f"Getting reference data for municipality: {municipality}")
        participants_ref, topics_ref = get_reference_data_for_municipality(municipality)
        participants_ref_str = "\n".join(participants_ref) if participants_ref else None
        topics_ref_str = "\n".join(topics_ref) if topics_ref else None
        
        # # Use standard chunk size for other municipalities
        # chunker = DocumentChunker(
        #     chunk_size=MAX_CHUNK_SIZE, 
        #     chunk_overlap=500,
        #     output_dir=chunks_dir
        # )
    
        if use_chunking:
            logging.info(f"Document is large ({len(text)} chars), using chunking")
            municipality = metadados_json.get("municipio", "unknown")
            # Process critical sections in fewer, targeted chunks
            # First, identify document sections
            sections = identify_document_sections(text, municipality)
            
            # Extract participants from the beginning section (usually contains the attendance list)
            logging.info("Generating participants from introduction section...")
            intro_text = sections.get("introduction", text[:min(len(text), 10000)])
            participantes_json = generate_valid_json(query_votantes_def(intro_text, participants_ref_str), json_schema=json_schema_votantes)
            save_json_to_folder(output_folder, "participantes.json", participantes_json)
            
            
            # Extract votes using the ordem do dia section when available
            logging.info("Generating votes...")
            participantes_str = json.dumps(participantes_json, ensure_ascii=False)
            
            # Use ordem_do_dia section for votes if available, otherwise use full text
            voting_text = sections.get("ordem_do_dia", text)
            if not voting_text or len(voting_text.strip()) < 1000:  # If section is empty or too short
                logging.info("Ordem do dia section is empty or too short, using full text for votes")
                voting_text = text
            else:
                logging.info("Using ordem do dia section for votes extraction")
            
            if len(voting_text) > MAX_DOCUMENT_LENGTH:
                # Create a votes-specific chunker with smaller chunks
                votes_chunker = DocumentChunker(
                    chunk_size=9000,  # Smaller chunk size specifically for votes
                    chunk_overlap=500,
                    output_dir=chunks_dir
                )
                
                votos_json = votes_chunker.process_chunks(
                    voting_text,
                    lambda chunk, **kwargs: generate_valid_json(
                        query_votos_def(chunk, participantes_str, topics_ref_str), 
                        json_schema=json_schema_votos
                    ),
                    merge_func=merge_votes,
                    save_chunks=True,
                    chunk_prefix="votos"
                )
            else:
                votos_json = generate_valid_json(
                    query_votos_def(voting_text, participantes_str, topics_ref_str), 
                    json_schema=json_schema_votos
                )
            
            save_json_to_folder(output_folder, "votos.json", votos_json)
        else:
            # Use the original non-chunked processing for smaller documents
            logging.info("Document is small, processing without chunking")
            
            # Step 2: Extract participants
            logging.info("Generating participants...")
            participantes_json = generate_valid_json(query_votantes_def(text, participants_ref_str), json_schema=json_schema_votantes)
            save_json_to_folder(output_folder, "participantes.json", participantes_json)
            
            # Step 3: Extract votes
            logging.info("Generating votes...")
            # Convert back to strings for the prompt
            participantes_str = json.dumps(participantes_json, ensure_ascii=False)
            
            votos_json = generate_valid_json(
                query_votos_def(text, participantes_str, topics_ref_str), json_schema=json_schema_votos)
            save_json_to_folder(output_folder, "votos.json", votos_json)

        # Step 6: Save to database
        logging.info("Saving to database...")
        save_to_database(
            metadados_json, 
            participantes_json, 
            votos_json
        )
        
        logging.info(f"Processing complete for {file_name}")
        return True
        
    except Exception as e:
        error_message = str(e)  
        logging.error(f"Error processing file {file_path}: {e}")
        
        # Save error information
        error_info = {
            "file": file_path,
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }
        
        error_file = os.path.join(ERROR_DIR, f"{os.path.splitext(file_name)[0]}_error.json")
        with open(error_file, "w", encoding="utf-8") as f:
            json.dump(error_info, f, ensure_ascii=False, indent=4)
        
            # Also save to database
        from models.database import save_error_to_database
        save_error_to_database(file_path, error_message)

        return False


def identify_document_sections(text: str, municipality: str = None) -> Dict[str, str]:
    """
    Identify logical sections in the document based on municipality patterns.
    
    Args:
        text: The full document text
        municipality: The municipality name (already known from metadados)
        
    Returns:
        Dictionary with identified sections (introduction, ordem_do_dia)
    """
    sections = {}
    
    # Check for required municipality information
    if not municipality or municipality.lower() == "unknown":
        logging.error("Municipality not provided or unknown. Cannot proceed with document parsing.")
        raise ValueError("Municipality information is required for document processing")
    
    logging.info(f"Using municipality: {municipality}")
    
    # Simplified introduction detection - just use the first part of the document
    # Typically the first ~10-15% of the document is introduction, or at least the first 3000 chars
    intro_length = min(max(3000, len(text) // 10), 15000)
    sections["introduction"] = text[:intro_length].strip()
    
    # More robust detection of "Ordem do Dia" section
    ordem_markers = [
        r"\bORDEM\s+DO\s+DIA\b", 
        r"\bOrdem\s+do\s+Dia\b", 
        r"\bOrdem\s+do\s+dia\b",
        r"\bordem\s+do\s+dia\b",
        r"\bPERÍODO\s+DA\s+ORDEM\s+DO\s+DIA\b", 
        r"\bPeríodo\s+da\s+Ordem\s+do\s+Dia\b"
    ]
    
    # Find all potential "Ordem do Dia" section headers
    ordem_positions = []
    for marker in ordem_markers:
        for match in re.finditer(marker, text):
            # Check if this appears to be a section header (should be at the start of a line or after paragraph)
            pos = match.start()
            if pos < 20 or text[pos-20:pos].find("\n") >= 0:
                ordem_positions.append(pos)
    
    # Sort positions and use the most appropriate one (typically the last occurrence is the actual section)
    if ordem_positions:
        # If there's only one occurrence, use it
        if len(ordem_positions) == 1:
            ordem_start = ordem_positions[0]
        else:
            # If we found multiple occurrences, use the one after the first 25% of the document
            # This helps skip mentions of "Ordem do Dia" in the introduction
            doc_quarter = len(text) // 4
            filtered_positions = [pos for pos in ordem_positions if pos > doc_quarter]
            
            # If we found any positions after the first quarter, use the earliest one
            if filtered_positions:
                ordem_start = min(filtered_positions)
            else:
                # Otherwise fall back to the latest occurrence
                ordem_start = max(ordem_positions)
        
        # Find end of "Ordem do dia" section - typically ends with keywords
        end_markers = [
            r"\bENCERRAMENTO\b", r"\bEncerramento\b", r"\bencerramento\b",
            r"\bPERÍODO\s+DE\s+INTERVENÇÃO\s+DO\s+PÚBLICO\b", 
            r"\bPeríodo\s+de\s+Intervenção\s+do\s+Público\b",
            r"\bE\s+nada\s+mais\s+havendo\b", 
            r"\bNão\s+havendo\s+mais\s+assuntos\b",
            r"\bNada\s+mais\s+havendo\s+a\s+tratar\b"
        ]
        
        ordem_end = len(text)
        for marker in end_markers:
            for match in re.finditer(marker, text[ordem_start:]):
                position = ordem_start + match.start()
                if position > ordem_start:
                    ordem_end = min(ordem_end, position)
        
        # Make sure the section is substantial (at least 1000 characters)
        if ordem_end - ordem_start >= 1000:
            sections["ordem_do_dia"] = text[ordem_start:ordem_end].strip()
            logging.info(f"Found 'Ordem do Dia' section ({len(sections['ordem_do_dia'])} chars)")
        else:
            # If the section seems too small, it might be incorrectly identified
            logging.warning("Found 'Ordem do Dia' section but it's too small, using fallback")
            sections["ordem_do_dia"] = text[ordem_start:].strip()  # Use the rest of the document
    else:
        logging.warning("Could not find 'Ordem do Dia' section marker")
        sections["ordem_do_dia"] = ""
    
    # Add metadata about which section should be used for assuntos based on municipality
    special_municipalities = ["alandroal", "covilha", "covilhã", "fundao", "fundão"]
    standard_municipalities = ["porto", "guimaraes", "guimarães", "campo maior"]
    
    # Determine which section to use for assuntos based on municipality
    municipality = municipality.lower()
    if any(muni in municipality for muni in special_municipalities):
        sections["assuntos_section"] = "introduction"
        logging.info(f"Using introduction section for assuntos in {municipality}")
    elif any(muni in municipality for muni in standard_municipalities):
        sections["assuntos_section"] = "ordem_do_dia"
        logging.info(f"Using ordem do dia section for assuntos in {municipality}")
    else:
        # Default behavior for unrecognized municipalities
        # If ordem_do_dia exists and is substantial, use it; otherwise, use introduction
        if sections.get("ordem_do_dia") and len(sections["ordem_do_dia"]) > 2000:
            sections["assuntos_section"] = "ordem_do_dia"
        else:
            sections["assuntos_section"] = "introduction"
        
        logging.info(f"Municipality {municipality} not in known list, using {sections['assuntos_section']} for assuntos")
    
    # Always include the full text as a fallback
    sections["full_text"] = text
    
    return sections