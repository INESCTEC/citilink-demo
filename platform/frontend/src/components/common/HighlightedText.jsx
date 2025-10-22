import React from 'react';

/**
 * Clean text by removing unwanted characters and artifacts
 * @param {string} text - The text to clean
 * @returns {string} The cleaned text
 */
const cleanText = (text) => {
  if (!text || typeof text !== 'string') return text;
  
  return text
    // Remove all non-printable and weird characters, keep only normal characters, spaces, and basic punctuation
    .replace(/[^\w\s\u00C0-\u017F\u0100-\u024F.,;:!?()[\]{}'"´`~@#$%^&*+=<>/-]/g, '')
    // Replace pipe characters with spaces around them with a single space
    .replace(/\s*\|\s*/g, ' ')
    // Replace multiple consecutive spaces with a single space
    .replace(/\s+/g, ' ')
    // Remove leading and trailing whitespace
    .trim();
};

/**
 * Component to render text with search highlights
 * @param {string} text - The original text to display
 * @param {Array} highlights - Array of highlight objects from search results
 * @param {string} path - The path/field name to find highlights for (e.g., 'title', 'content')
 * @param {boolean} useTopScore - If true, automatically select the highest-scored highlight for the path
 * @returns {React.ReactNode} The text with highlights applied
 */
export const renderHighlightedText = (text, highlights, path, useTopScore = false) => {
  if (!highlights || !text) return text;
  
  // Find highlights for this path
  let highlightsForPath;
  
  if (useTopScore) {
    // Get all highlights for this path and find the top-scored one
    const pathHighlights = highlights.filter(h => h.path === path);
    if (pathHighlights.length === 0) return text;
    
    highlightsForPath = pathHighlights.reduce((prev, current) => 
      (prev.score > current.score) ? prev : current
    );
  } else {
    highlightsForPath = highlights.find(h => h.path === path);
    if (!highlightsForPath) return text;
  }
  
  // Get the text with highlights
  const texts = highlightsForPath.texts || [];
  if (texts.length === 0) return text;
  
  // Render all segments in order without any special grouping
  // For shorter texts like titles and locations, we show everything with precise highlighting
  return texts.map((item, i) => {
    let cleanedValue = cleanText(item.value);
    
    // If the segment becomes empty after cleaning but originally had content,
    // it was likely a separator (like | |), so replace with a single space
    if (!cleanedValue && item.value && item.value.trim() !== '') {
      cleanedValue = ' ';
    }
    
    // Skip completely empty segments
    if (!cleanedValue) return null;
    
    if (item.type === 'hit') {
      return <span key={i} className="font-semibold text-sky-800">{cleanedValue}</span>;
    }
    return <span key={i}>{cleanedValue}</span>;
  }).filter(Boolean); // Remove null entries
};

/**
 * Process highlighted content to always show highlighted parts with context
 * @param {string} text - The original text to display
 * @param {Array} highlights - Array of highlight objects from search results
 * @param {string} path - The path/field name to find highlights for (e.g., 'content', 'summary')
 * @param {boolean} useTopScore - If true, automatically select the highest-scored highlight for the path
 * @returns {React.ReactNode} The processed text with highlights and context
 */
export const processHighlightedContent = (text, highlights, path, useTopScore = true) => {
  if (!highlights || !text) return text;
  
  let highlightsForPath;
  
  if (useTopScore) {
    // Get all highlights for this path and find the top-scored one
    const pathHighlights = highlights.filter(h => h.path === path);
    if (pathHighlights.length === 0) {
      // If no highlights for this specific path, try to get the top-scored highlight from any path (excluding title)
      const otherHighlights = highlights.filter(h => h.path !== 'title');
      if (otherHighlights.length === 0) {
        return text.substring(0, 200) + "...";
      }
      highlightsForPath = otherHighlights.reduce((prev, current) => 
        (prev.score > current.score) ? prev : current
      );
    } else {
      highlightsForPath = pathHighlights.reduce((prev, current) => 
        (prev.score > current.score) ? prev : current
      );
    }
  } else {
    highlightsForPath = highlights.find(h => h.path === path);
    if (!highlightsForPath || !highlightsForPath.texts) return text.substring(0, 200) + "...";
  }
  
  // For a single continuous text with highlights
  const MAX_CHARS = 260; // Approx chars for 3 lines, slightly increased to fit more highlights
  const MIN_CONTEXT_WORDS = 4; // Minimum words of context around highlights
  
  // First, identify all hit texts (highlighted matches)
  const allTexts = highlightsForPath.texts;
  const hitIndices = [];
  
  allTexts.forEach((item, index) => {
    if (item.type === 'hit') {
      hitIndices.push(index);
    }
  });
  
  if (hitIndices.length === 0) {
    return text.substring(0, 200) + "...";
  }
  
  // Sort hits by score if available to prioritize more relevant hits
  const sortedHits = [...hitIndices].sort((a, b) => {
    return (allTexts[b].score || 0) - (allTexts[a].score || 0);
  });
  
  // Use a greedy algorithm to include as many hits as possible
  // Start with the highest scoring hit and expand window in both directions
  let bestHit = sortedHits[0];
  let startIdx = bestHit;
  let endIdx = bestHit;
  let totalChars = allTexts[bestHit].value.length;
  let includedHits = new Set([bestHit]);
  
  // Function to count words in text
  const countWords = str => str.split(/\s+/).filter(Boolean).length;
  
  // First pass: try to include as many hits as possible
  while (totalChars < MAX_CHARS && includedHits.size < hitIndices.length) {
    // Find the closest hit to include
    let nextHitToAdd = -1;
    let minDistance = Infinity;
    
    for (let hitIdx of hitIndices) {
      if (!includedHits.has(hitIdx)) {
        const distanceToStart = Math.abs(hitIdx - startIdx);
        const distanceToEnd = Math.abs(hitIdx - endIdx);
        const minDist = Math.min(distanceToStart, distanceToEnd);
        
        if (minDist < minDistance) {
          minDistance = minDist;
          nextHitToAdd = hitIdx;
        }
      }
    }
    
    if (nextHitToAdd === -1) break; // No more hits to add
    
    // Check if we should expand the start or the end
    if (nextHitToAdd < startIdx) {
      // Calculate chars needed to include this hit
      let additionalChars = 0;
      for (let i = nextHitToAdd; i < startIdx; i++) {
        additionalChars += allTexts[i].value.length;
      }
      
      if (totalChars + additionalChars <= MAX_CHARS) {
        totalChars += additionalChars;
        startIdx = nextHitToAdd;
        includedHits.add(nextHitToAdd);
      } else {
        break; // Can't include this hit
      }
    } else {
      // Calculate chars needed to include this hit
      let additionalChars = 0;
      for (let i = endIdx + 1; i <= nextHitToAdd; i++) {
        additionalChars += allTexts[i].value.length;
      }
      
      if (totalChars + additionalChars <= MAX_CHARS) {
        totalChars += additionalChars;
        endIdx = nextHitToAdd;
        includedHits.add(nextHitToAdd);
      } else {
        break; // Can't include this hit
      }
    }
  }
  
  // Second pass: add context around the selected hits
  // Try to add minimal context before and after each hit
  let contextStartIdx = startIdx;
  let contextEndIdx = endIdx;
  
  // Add some context before the first hit if possible
  for (let i = startIdx - 1; i >= 0; i--) {
    const segment = allTexts[i];
    if (segment.type !== 'hit') {
      const wordCount = countWords(segment.value);
      if (wordCount >= MIN_CONTEXT_WORDS || totalChars + segment.value.length > MAX_CHARS) {
        // Either we have enough context words or adding more would exceed our limit
        contextStartIdx = i;
        totalChars += segment.value.length;
        break;
      }
      totalChars += segment.value.length;
      contextStartIdx = i;
    }
  }
  
  // Add some context after the last hit if possible
  for (let i = endIdx + 1; i < allTexts.length; i++) {
    const segment = allTexts[i];
    if (segment.type !== 'hit') {
      const wordCount = countWords(segment.value);
      if (wordCount >= MIN_CONTEXT_WORDS || totalChars + segment.value.length > MAX_CHARS) {
        // Either we have enough context words or adding more would exceed our limit
        contextEndIdx = i;
        totalChars += segment.value.length;
        break;
      }
      totalChars += segment.value.length;
      contextEndIdx = i;
    }
  }
  
  // If we're not starting at the beginning, add an ellipsis
  const needsStartEllipsis = contextStartIdx > 0;
  
  // If we're not ending at the end, add an ellipsis
  const needsEndEllipsis = contextEndIdx < allTexts.length - 1;
  
  // Now create a continuous text with highlights
  const result = [];
  
  if (needsStartEllipsis) {
    result.push(<span key="ellipsis-start">... </span>);
  }
  
  // Add the selected text window with appropriate highlights
  for (let i = contextStartIdx; i <= contextEndIdx; i++) {
    const segment = allTexts[i];
    let cleanedValue = cleanText(segment.value);
    
    // If the segment becomes empty after cleaning but originally had content,
    // it was likely a separator (like | |), so replace with a single space
    if (!cleanedValue && segment.value && segment.value.trim() !== '') {
      cleanedValue = ' ';
    }
    
    // Skip completely empty segments
    if (!cleanedValue) continue;
    
    if (segment.type === 'hit') {
      result.push(
        <span key={`hit-${i}`} className="font-semibold text-sky-800">
         {' '}{cleanedValue}{' '}
        </span>
      );
    } else {
      result.push(<span key={`text-${i}`}>{cleanedValue}</span>);
    }
  }
  
  if (needsEndEllipsis) {
    result.push(<span key="ellipsis-end"> ...</span>);
  }
  
  return result.length > 0 ? result : text.substring(0, 200) + "...";
};

/**
 * HighlightedText component wrapper with configurable options
 * @param {Object} props - Component props
 * @param {string} props.text - Text content to display
 * @param {Array} props.highlights - Array of highlight objects
 * @param {string} props.path - Field path to look for highlights
 * @param {boolean} props.processContent - Whether to use content processing for longer texts
 * @param {boolean} props.useTopScore - Whether to automatically select the highest-scored highlight
 * @param {number} props.maxLength - Max length for truncated text (if not processed)
 * @returns {React.ReactNode}
 */
const HighlightedText = ({ 
  text, 
  highlights, 
  path, 
  processContent = false, 
  useTopScore = true,
  maxLength = 200 
}) => {
  if (!text) return null;
  
  // Clean the input text as a fallback
  const cleanedText = cleanText(text);
  
  // No highlights or processing needed, just return truncated or full text
  if (!highlights || !path) {
    if (maxLength && cleanedText.length > maxLength) {
      return <>{cleanedText.substring(0, maxLength)}...</>;
    }
    return <>{cleanedText}</>;
  }
  
  // For longer content that needs smart processing (like summaries or content)
  if (processContent) {
    return <>{processHighlightedContent(text, highlights, path, useTopScore)}</>;
  }
  
  // For shorter text like titles where we want exact highlighting
  return <>{renderHighlightedText(text, highlights, path, useTopScore)}</>;
};

export default HighlightedText;
