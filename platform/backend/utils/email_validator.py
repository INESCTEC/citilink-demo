# utils/email_validator.py
import re
import socket
import dns.resolver

# Regular expression for email validation
EMAIL_REGEX = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'

def is_email_valid(email):
    """
    Validate email by checking format and optionally MX records
    
    Args:
        email (str): Email address to validate
        
    Returns:
        bool: True if email is valid, False otherwise
    """
    if not email or not isinstance(email, str):
        return False
    
    # Basic format validation
    if not re.match(EMAIL_REGEX, email):
        return False
    
    # Extract domain for MX validation
    domain = email.split('@')[1]
    
    try:
        # Check if MX record exists for the domain
        # This is a simple check that can help identify non-existent domains
        # but it doesn't guarantee the email address exists
        dns.resolver.resolve(domain, 'MX')
        return True
    except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers):
        # No MX records found
        try:
            # Some domains accept mail even without MX records
            # Try to check if A record exists as fallback
            dns.resolver.resolve(domain, 'A')
            return True
        except:
            return False
    except Exception:
        # If any error occurs during validation, default to basic validation
        # This ensures the system continues to work even if DNS services are unavailable
        return True
