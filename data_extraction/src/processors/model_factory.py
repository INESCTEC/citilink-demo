"""Module for AI model abstractions and factory."""
from abc import ABC, abstractmethod
import logging

import google.generativeai as genai


class ContentGenerator(ABC):
    """Abstract base class for content generator models."""
    
    @abstractmethod
    def generate(self, prompt: str, max_output_tokens: int = 4096) -> str:
        """
        Generate content based on the provided prompt.
        
        Args:
            prompt: The input prompt
            max_output_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        pass


class GoogleGeminiGenerator(ContentGenerator):
    """Content generator using Google's Gemini models."""
    
    def __init__(self, api_key: str, model_name: str, verbose: bool = True):
        """
        Initialize a Google Gemini model generator.
        
        Args:
            api_key: Google API key
            model_name: Name of the Gemini model to use
            verbose: Whether to log initialization message
        """
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
        if verbose:
            logging.info(f"Initialized Google Gemini generator with model: {model_name}")
        
    def generate(self, prompt: str, max_output_tokens: int = 4096) -> str:
        """
        Generate content using Google Gemini model.
        
        Args:
            prompt: The input prompt
            max_output_tokens: Maximum tokens to generate
            
        Returns:
            Generated text response
        """
        response = self.model.generate_content(
            contents=prompt,
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": max_output_tokens
            }
        )
        return response.text


class ModelFactory:
    """Factory class for creating ContentGenerator and specialized model instances."""
    
    # Cache for generator instances
    _generator_cache = {}
    
    @classmethod
    def create_generator(cls, generator_type: str, **kwargs) -> ContentGenerator:
        """
        Create a content generator of the specified type.

        Args:
            generator_type: Type of generator to create ("google_gemini")
            **kwargs: Additional arguments to pass to the generator constructor

        Returns:
            A ContentGenerator instance

        Raises:
            ValueError: If generator_type is unknown
        """
        # Create a cache key based on generator_type and relevant kwargs
        if generator_type == "google_gemini":
            cache_key = f"{generator_type}_{kwargs.get('model_name')}"
        else:
            raise ValueError(f"Unknown generator type: {generator_type}")
        
        # Check if we already have a generator instance in cache
        if cache_key in cls._generator_cache:
            return cls._generator_cache[cache_key]
        
        # Create a new instance
        if generator_type == "google_gemini":
            generator = GoogleGeminiGenerator(
                kwargs.get("api_key"),
                kwargs.get("model_name"),
                verbose=kwargs.get("verbose", True)
            )
        else:
            raise ValueError(f"Unknown generator type: {generator_type}")
        
        # Cache the instance for future use
        cls._generator_cache[cache_key] = generator
        return generator