"""Module for chunking documents using LangChain's text splitters."""
import logging
import os
from typing import List, Dict, Any, Optional, Callable
import re

from langchain.text_splitter import RecursiveCharacterTextSplitter

class DocumentChunker:
    """Process documents by breaking them into manageable chunks using LangChain."""
    
    def __init__(self, 
                 chunk_size: int = 2000,
                 chunk_overlap: int = 200,
                 separators: Optional[List[str]] = None,
                 output_dir: Optional[str] = None):
        """
        Initialize the document chunker.
        
        Args:
            chunk_size: Maximum size of each chunk in characters
            chunk_overlap: Number of characters to overlap between chunks
            separators: List of separators to use for splitting, in order of priority
            output_dir: Directory to save chunks to (if None, chunks won't be saved)
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.output_dir = output_dir
        
        # Default separators that respect document structure
        self.separators = separators or [
            "\n\n",  # Paragraphs
            "\n",    # Lines
            ". ",    # Sentences
            ", ",    # Clauses
            " ",     # Words
            ""       # Characters
        ]
        
        # Special pattern for tables we want to keep intact
        self.table_pattern = r'\.init_table[\s\S]+?\.end_table'
        
        # Create output directory if specified and doesn't exist
        if self.output_dir and not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
    
    def save_chunks_to_files(self, chunks: List[str], prefix: str = "chunk") -> List[str]:
        """
        Save chunks to files in the output directory.
        
        Args:
            chunks: List of text chunks to save
            prefix: Prefix for the chunk filenames
            
        Returns:
            List of file paths where chunks were saved
        """
        if not self.output_dir:
            logging.warning("No output directory specified, chunks won't be saved to files")
            return []
        
        file_paths = []
        for i, chunk in enumerate(chunks):
            file_name = f"{prefix}_{i+1:03d}_of_{len(chunks):03d}.txt"
            file_path = os.path.join(self.output_dir, file_name)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(chunk)
            
            file_paths.append(file_path)
            logging.info(f"Saved chunk {i+1}/{len(chunks)} to {file_path}")
            
        return file_paths
    
    def chunk_document(self, text: str, save_to_files: bool = False, prefix: str = "chunk") -> List[str]:
        """
        Split document into chunks using LangChain's text splitter.
        
        Args:
            text: Document text to chunk
            save_to_files: Whether to save chunks to files
            prefix: Prefix for chunk filenames if saving to files
            
        Returns:
            List of text chunks
        """
        # First, protect tables by replacing them with placeholders
        tables = []
        table_placeholder = "TABLE_PLACEHOLDER_{}"
        
        def replace_table(match):
            tables.append(match.group(0))
            return table_placeholder.format(len(tables) - 1)
        
        processed_text = re.sub(self.table_pattern, replace_table, text)
        
        # Create the text splitter
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=self.separators,
            keep_separator=True
        )
        
        # Split the text
        chunks = text_splitter.split_text(processed_text)
        
        # Restore tables in chunks
        for i in range(len(chunks)):
            for j in range(len(tables)):
                chunks[i] = chunks[i].replace(table_placeholder.format(j), tables[j])
        
        # Log information about chunks
        for i, chunk in enumerate(chunks):
            logging.info(f"Chunk {i+1}/{len(chunks)}: {len(chunk)} chars")
            # Log first 100 chars of each chunk to verify content
            logging.debug(f"Chunk {i+1} start: {chunk[:100]}...")
        
        # Save chunks to files if requested
        if save_to_files:
            self.save_chunks_to_files(chunks, prefix)
            
        return chunks
    
    def process_chunks(self, 
                      text: str, 
                      processor_func: Callable, 
                      merge_func: Optional[Callable] = None, 
                      save_chunks: bool = False,
                      chunk_prefix: str = "chunk",
                      **kwargs) -> Any:
        """
        Process document in chunks and merge results.
        
        Args:
            text: Document text to chunk and process
            processor_func: Function to call on each chunk
            merge_func: Optional function to merge results
            save_chunks: Whether to save chunks to files
            chunk_prefix: Prefix for chunk filenames
            **kwargs: Additional arguments to pass to processor_func
            
        Returns:
            If merge_func provided: merged result
            Otherwise: List of results from processing each chunk
        """
        chunks = self.chunk_document(text, save_to_files=save_chunks, prefix=chunk_prefix)
        results = []
        
        for i, chunk in enumerate(chunks):
            logging.info(f"Processing chunk {i+1}/{len(chunks)} ({len(chunk)} chars)")
            result = processor_func(chunk, chunk_index=i, total_chunks=len(chunks), **kwargs)
            logging.info(f"Chunk {i+1} result: {type(result)} with {len(result) if isinstance(result, list) else '?'} items")
            
            # Optionally save intermediate results
            if save_chunks and self.output_dir:
                result_file = os.path.join(self.output_dir, f"{chunk_prefix}_{i+1:03d}_result.json")
                try:
                    import json
                    with open(result_file, 'w', encoding='utf-8') as f:
                        json.dump(result, f, ensure_ascii=False, indent=2)
                    logging.info(f"Saved result for chunk {i+1} to {result_file}")
                except Exception as e:
                    logging.warning(f"Couldn't save result for chunk {i+1}: {e}")
            
            results.append(result)
            
        # Merge results if a merge function was provided
        if merge_func and results:
            merged = merge_func(results)
            logging.info(f"Merged results: {len(merged) if isinstance(merged, list) else '1'} items")
            
            # Optionally save the merged results
            if save_chunks and self.output_dir:
                merged_file = os.path.join(self.output_dir, f"{chunk_prefix}_merged_result.json")
                try:
                    import json
                    with open(merged_file, 'w', encoding='utf-8') as f:
                        json.dump(merged, f, ensure_ascii=False, indent=2)
                    logging.info(f"Saved merged results to {merged_file}")
                except Exception as e:
                    logging.warning(f"Couldn't save merged results: {e}")
            
            return merged
        return results