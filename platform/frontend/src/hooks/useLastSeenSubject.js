import { useState, useEffect, useCallback } from 'react';

const LAST_SEEN_KEY = 'lastSeenSubject';

export const useLastSeenSubject = () => {
  const [lastSeenSubjectId, setLastSeenSubjectId] = useState(null);

  // Load the last seen subject ID from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_SEEN_KEY);
      if (stored) {
        setLastSeenSubjectId(stored);
      }
    } catch (error) {
      console.warn('Failed to load last seen subject from localStorage:', error);
    }
  }, []);

  // Function to mark a subject as last seen
  const markAsLastSeen = useCallback((subjectId) => {
    if (!subjectId) return;
    
    try {
      localStorage.setItem(LAST_SEEN_KEY, subjectId.toString());
      setLastSeenSubjectId(subjectId.toString());
    } catch (error) {
      console.warn('Failed to save last seen subject to localStorage:', error);
    }
  }, []);

  // Function to check if a subject is the last seen
  const isLastSeen = useCallback((subjectId) => {
    if (!subjectId || !lastSeenSubjectId) return false;
    return subjectId.toString() === lastSeenSubjectId;
  }, [lastSeenSubjectId]);

  // Function to clear the last seen subject
  const clearLastSeen = useCallback(() => {
    try {
      localStorage.removeItem(LAST_SEEN_KEY);
      setLastSeenSubjectId(null);
    } catch (error) {
      console.warn('Failed to clear last seen subject from localStorage:', error);
    }
  }, []);

  return {
    lastSeenSubjectId,
    markAsLastSeen,
    isLastSeen,
    clearLastSeen
  };
};
