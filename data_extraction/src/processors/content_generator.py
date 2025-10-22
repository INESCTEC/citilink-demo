"""Module for generating content using AI models."""
import json
import logging
from typing import Dict, Any, Union, List, Optional
import re
import random
import time

from ..config import GOOGLE_API_KEY, MODEL_NAME, MAX_RETRIES
from .model_factory import ModelFactory


# Cached default generator instance
_default_generator = None

# Custom retry decorator that handles quotas better
def retry_with_exponential_backoff(max_retries=MAX_RETRIES):
    """
    Create a decorator for retrying operations with exponential backoff.
    Specifically handles quota exceeded (429) errors with appropriate waits.
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            retry_count = 0
            
            while retry_count <= max_retries:
                try:
                    return func(*args, **kwargs)
                    
                except Exception as e:
                    error_message = str(e).lower()
                    
                    # Check if it's a rate limit/quota error
                    if "429" in error_message or "quota" in error_message or "rate limit" in error_message or "quota exceeded" in error_message:
                        if retry_count >= max_retries:
                            logging.error(f"Maximum retries ({max_retries}) exceeded for rate limit. Giving up.")
                            raise
                        
                        # For the first retry, wait exactly 30 seconds
                        if retry_count == 0:
                            wait_time = 30
                        # For the second retry, wait exactly 60 seconds
                        elif retry_count == 1:
                            wait_time = 60
                        # For the third retry, wait exactly 90 seconds
                        elif retry_count == 2: 
                            wait_time = 90
                        # For additional retries, use exponential backoff with jitter
                        else:
                            base_wait_time = 120
                            jitter = random.uniform(0.8, 1.2)
                            wait_time = int(base_wait_time * jitter)
                        
                        logging.warning(f"Rate limit exceeded (429). Waiting {wait_time} seconds before retry {retry_count+1}/{max_retries}")
                        time.sleep(wait_time)
                        retry_count += 1
                    else:
                        # For other errors, log and raise immediately
                        logging.error(f"Error in {func.__name__}: {e}")
                        raise
            
            # This should never be reached but just in case
            raise Exception(f"Failed to execute {func.__name__} after maximum retries")
            
        return wrapper
    return decorator



def clean_json_text(text: str) -> str:
    """
    Clean text by removing markdown code block markers and extract JSON.
    
    Args:
        text (str): Text potentially containing JSON in code blocks
        
    Returns:
        str: Cleaned text with only the JSON content
    """
    # More robust cleaning logic to handle various markdown formats
    text = text.strip()
    
    # Remove markdown code block markers (various formats)
    text = re.sub(r'```(?:json|JavaScript|js)?', '', text)
    text = re.sub(r'```', '', text)
    
    # Remove any comments that might be present
    text = re.sub(r'//.*$', '', text, flags=re.MULTILINE)
    text = re.sub(r'/\*.*?\*/', '', text, flags=re.DOTALL)
    
    
    return text.strip()

def is_valid_json(text: str) -> bool:
    """
    Check if text contains valid JSON.
    
    Args:
        text (str): Text to validate
        
    Returns:
        bool: True if text is valid JSON, False otherwise
    """
    clean_text = clean_json_text(text)
    try:
        json.loads(clean_text)
        return True
    except json.JSONDecodeError:
        return False

def get_default_generator():
    """
    Get the default content generator based on environment configuration.
    
    Returns:
        ContentGenerator: An instance of the appropriate content generator
    """
    global _default_generator
    
    # Return cached instance if available
    if _default_generator is not None:
        return _default_generator
    

    _default_generator = ModelFactory.create_generator(
        "google_gemini", 
        api_key=GOOGLE_API_KEY, 
        model_name=MODEL_NAME
    )
    
    return _default_generator

@retry_with_exponential_backoff(max_retries=MAX_RETRIES)
def generate_content(prompt: str, max_output_tokens: int = 8192) -> str:
    """
    Generate content using the configured model with retry logic.
    
    Args:
        prompt (str): The prompt to send to the model
        max_output_tokens (int): Maximum tokens in the response
        
    Returns:
        str: The generated text response
        
    Raises:
        Exception: If generation fails after all retries
    """
    try:
        generator = get_default_generator()
        return generator.generate(prompt, max_output_tokens)
    except Exception as e:
        logging.error(f"Error generating content: {str(e)}")
        raise

def attempt_json_repair(text: str) -> str:
    """
    Apply multiple repair techniques to fix JSON.
    
    Args:
        text (str): The potentially malformed JSON text
    
    Returns:
        str: Repaired JSON text
    """
    import os
    from datetime import datetime
    
    # Create errors directory if it doesn't exist
    errors_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "errors")
    os.makedirs(errors_dir, exist_ok=True)
    
    # Try common structural fixes first
    repaired_text = text
    
    # Fix unquoted keys
    repaired_text = re.sub(r'(\s*?)(\w+)(\s*?):(\s*?)', r'\1"\2"\3:\4', repaired_text)
    
    # Fix single quoted strings to double quotes
    repaired_text = re.sub(r"'([^']*?)'(\s*?:)", r'"\1"\2', repaired_text)
    repaired_text = re.sub(r':\s*?\'([^\']*?)\'', r': "\1"', repaired_text)
    
    # Fix missing commas between objects in arrays
    repaired_text = re.sub(r'}(\s*?){', r'},\n{', repaired_text)
    
    # Fix trailing commas in objects and arrays
    repaired_text = re.sub(r',(\s*?)}', r'\1}', repaired_text)
    repaired_text = re.sub(r',(\s*?)]', r'\1]', repaired_text)
    
    # Check if our basic fixes worked
    try:
        json.loads(repaired_text)
        return repaired_text
    except json.JSONDecodeError:
        pass
    
    # If basic fixes failed, try the model as a last resort
    try:
        repair_prompt = f"""
You are a JSON repair expert. I have a malformed JSON that needs to be fixed.
Your task is to correct any syntax errors and return ONLY the valid JSON.

Common issues might include:
- Missing quotes around keys
- Unbalanced brackets or braces
- Missing or extra commas
- Invalid escape sequences
- Trailing commas
- Single quotes instead of double quotes

Here is the malformed JSON:
```
{text}
```

Return ONLY the fixed JSON with no explanations, comments, or markdown formatting.
"""
        
        fixed_json = generate_content(repair_prompt)
        
        # Clean the response to extract just JSON
        fixed_json = clean_json_text(fixed_json)
        
        # Verify it's valid JSON now
        try:
            json.loads(fixed_json)
            logging.info("Successfully repaired JSON using model")
            return fixed_json
        except json.JSONDecodeError as e:
            # Log the failure to errors folder
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            error_file = os.path.join(errors_dir, f"json_repair_failure_{timestamp}.log")
            
            with open(error_file, "w") as f:
                f.write(f"JSON Repair Failure at {datetime.now().isoformat()}\n")
                f.write(f"Error: {str(e)}\n\n")
                f.write("Original JSON:\n")
                f.write(text)
                f.write("\n\n")
                f.write("Model repair attempt:\n")
                f.write(fixed_json)
            
            logging.error(f"Model-based JSON repair failed. Error logged to {error_file}")
            return text
            
    except Exception as e:
        # Log any other errors during the repair process
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        error_file = os.path.join(errors_dir, f"json_repair_error_{timestamp}.log")
        
        with open(error_file, "w") as f:
            f.write(f"JSON Repair Error at {datetime.now().isoformat()}\n")
            f.write(f"Error: {str(e)}\n\n")
            f.write("Original JSON:\n")
            f.write(text)
        
        logging.error(f"Error during model-based JSON repair: {str(e)}. Error logged to {error_file}")
        return text
    return text
        
def generate_valid_json(prompt: str, json_schema: Optional[Dict] = None, max_attempts: int = 3) -> Union[Dict, List]:
    """
    Generate content and ensure it returns valid JSON.
    
    Args:
        prompt (str): The prompt to send to the model
        json_schema (Optional[Dict]): Schema to use with validation
        max_attempts (int): Maximum number of attempts to generate valid JSON
        
    Returns:
        Union[Dict, List]: Parsed JSON data
        
    Raises:
        ValueError: If unable to generate valid JSON after max_attempts
    """
    # Add explicit JSON instruction if not already present
    if "json" not in prompt.lower():
        prompt += "\n\nPlease provide your response in valid JSON format."
    
    last_error = None
    last_response = None
    
    for attempt in range(max_attempts):
        try:
            # Generate content
            response = generate_content(prompt)
            last_response = response
            
            # Clean and parse JSON
            cleaned_text = clean_json_text(response)
            
            try:
                parsed_json = json.loads(cleaned_text)
            except json.JSONDecodeError as e:
                # Try repair if initial parsing fails
                logging.warning(f"JSON parsing failed: {e}. Attempting repair...")
                fixed_text = attempt_json_repair(cleaned_text)
                parsed_json = json.loads(fixed_text)
            
            # Handle schema validation if provided
            if json_schema and isinstance(json_schema, dict):
                # Convert object to array if schema requires it
                if json_schema.get("type") == "array" and isinstance(parsed_json, dict):
                    parsed_json = [parsed_json]
                    logging.warning("Auto-converted single object to array as required by schema")
                
                # Limit large arrays
                if isinstance(parsed_json, list) and len(parsed_json) > 100:
                    logging.warning(f"Large JSON array ({len(parsed_json)} items). Limiting to 100.")
                    parsed_json = parsed_json[:100]
            
            return parsed_json
            
        except json.JSONDecodeError as e:
            last_error = f"JSON decode error: {e}"
            logging.warning(f"Attempt {attempt+1}/{max_attempts} failed: {last_error}")
            
            # Add more specific instructions for next attempt
            if attempt < max_attempts - 1:
                prompt += "\n\nWARNING: Your previous response contained invalid JSON. Please provide a valid JSON response with correct formatting."
                
        except Exception as e:
            last_error = f"Other error: {e}"
            logging.warning(f"Attempt {attempt+1}/{max_attempts} failed: {last_error}")
    
    # All attempts failed - provide fallback or raise error
    logging.error(f"Failed to generate valid JSON after {max_attempts} attempts: {last_error}")
    
    # Log problematic response (truncated if large)
    if last_response:
        log_text = last_response if len(last_response) <= 1000 else f"{last_response[:500]}...{last_response[-500:]}"
        logging.error(f"Last response: {log_text}")
    
    # Return empty structure based on schema
    if json_schema and json_schema.get("type") == "array":
        logging.warning("Returning empty array as fallback")
        return []
    
    if json_schema and json_schema.get("type") == "object":
        logging.warning("Returning empty object as fallback")
        return {}
    
    raise ValueError(f"Failed to generate valid JSON after {max_attempts} attempts: {last_error}")