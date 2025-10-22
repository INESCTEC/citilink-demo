import { useState, useEffect, useCallback } from 'react';

const LAST_SEEN_KEY = 'lastSeenMinute';

export const useLastSeenMinute = () => {
  const [lastSeenMinuteId, setLastSeenMinuteId] = useState(null);

  // Load the last seen minute ID from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(LAST_SEEN_KEY);
      if (stored) {
        setLastSeenMinuteId(stored);
      }
    } catch (error) {
      console.warn('Failed to load last seen minute from localStorage:', error);
    }
  }, []);

  // Function to mark a minute as last seen
  const markAsLastSeen = useCallback((minuteId) => {
    if (!minuteId) return;
    
    try {
      localStorage.setItem(LAST_SEEN_KEY, minuteId.toString());
      setLastSeenMinuteId(minuteId.toString());
    } catch (error) {
      console.warn('Failed to save last seen minute to localStorage:', error);
    }
  }, []);

  // Function to check if a minute is the last seen
  const isLastSeen = useCallback((minuteId) => {
    if (!minuteId || !lastSeenMinuteId) return false;
    return minuteId.toString() === lastSeenMinuteId;
  }, [lastSeenMinuteId]);

  // Function to clear the last seen minute
  const clearLastSeen = useCallback(() => {
    try {
      localStorage.removeItem(LAST_SEEN_KEY);
      setLastSeenMinuteId(null);
    } catch (error) {
      console.warn('Failed to clear last seen minute from localStorage:', error);
    }
  }, []);

  return {
    lastSeenMinuteId,
    markAsLastSeen,
    isLastSeen,
    clearLastSeen
  };
};
