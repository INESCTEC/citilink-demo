# this file servers as a utility for text processing tasks, such as cleaning and normalizing text data.

import re
import unicodedata

def create_slug(text: str) -> str:
    """
    Create a URL-friendly ID from the given text a.k.a. slug.

    Input:
        text (str): The input text to be slugified.

    Returns:
        str: A slugified version of the input text, suitable for use in URLs.
    """

    # normalizing the text to decompose characters into their base characters
    normalized_text = unicodedata.normalize('NFKD', text)

    # removing accents and other special characters
    slug = re.sub(r'[^\w\s-]', '', normalized_text).strip().lower()
    slug = re.sub(r'[-\s]+', '-', slug)
    return slug