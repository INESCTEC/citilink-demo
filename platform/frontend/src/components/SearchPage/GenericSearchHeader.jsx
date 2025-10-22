import React, { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiSearch, FiFilter, FiChevronDown, FiChevronUp, FiClock, FiTrendingUp } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from 'dompurify';
import AdvancedFilters from "../common/search/AdvancedFilters";

const GenericSearchHeader = ({ 
  searchType,
  filterState, 
  usedFiltersState,
  handleSearch, 
  isLoading, 
  municipios,
  topicos,
  handleClearFilters,
  isEmbed = false,
  isModal = false,
  enableAutoSearch = false // New prop: defaults to false
}) => {
  const { t } = useTranslation();
  const [showWarning, setShowWarning] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);
  const autoSearchDebounceRef = useRef(null); // New ref for auto-search debounce

  const API_URL = import.meta.env.VITE_API_URL;
  
  const placeholderText = searchType === "atas" 
    ? t("search_minutes_keyword_placeholder") 
    : t("search_subjects_placeholder");

  // Fetch suggestions from API
  // const fetchSuggestions = async (query) => {
  //   if (!query.trim() || query.length < 2) {
  //     setSuggestions([]);
  //     setShowSuggestions(false);
  //     return;
  //   }

  //   setIsFetchingSuggestions(true);
  //   try {
  //     const response = await fetch(`${API_URL}/v0/public/search/suggestions?q=${encodeURIComponent(query)}&limit=4`);
  //     if (response.ok) {
  //       const data = await response.json();
  //       setSuggestions(data.suggestions || []);
  //       setShowSuggestions(true);
  //     }
  //   } catch (error) {
  //     console.error('Error fetching suggestions:', error);
  //     setSuggestions([]);
  //     setShowSuggestions(false);
  //   } finally {
  //     setIsFetchingSuggestions(false);
  //   }
  // };

  // // Debounced search suggestions
  // useEffect(() => {
  //   if (debounceRef.current) {
  //     clearTimeout(debounceRef.current);
  //   }

  //   debounceRef.current = setTimeout(() => {
  //     fetchSuggestions(filterState.keyword);
  //   }, 300);

  //   return () => {
  //     if (debounceRef.current) {
  //       clearTimeout(debounceRef.current);
  //     }
  //   };
  // }, [filterState.keyword]);

  // // Handle keyboard navigation for suggestions
  const handleKeyDown = (e) => {
    // if (!showSuggestions || suggestions.length === 0) {
    //   if (e.key === 'Enter') {
    //     handleSafeSearch();
    //   }
    //   return;
    // }

    if (e.key === 'Enter') {
      e.preventDefault();
      handleSafeSearch();
    }

    // switch (e.key) {
    //   case 'ArrowDown':
    //     e.preventDefault();
    //     setSelectedSuggestionIndex(prev => 
    //       prev < suggestions.length - 1 ? prev + 1 : prev
    //     );
    //     break;
    //   case 'ArrowUp':
    //     e.preventDefault();
    //     setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
    //     break;
    //   case 'Enter':
    //     e.preventDefault();
    //     if (selectedSuggestionIndex >= 0) {
    //       selectSuggestion(suggestions[selectedSuggestionIndex]);
    //     } else {
    //       handleSafeSearch();
    //     }
    //     break;
    //   case 'Escape':
    //     setShowSuggestions(false);
    //     setSelectedSuggestionIndex(-1);
    //     break;
    // }
  };

  // // Select a suggestion
  // const selectSuggestion = (suggestion) => {
  //   const sanitizedText = DOMPurify.sanitize(suggestion.text);
  //   filterState.setKeyword(sanitizedText);
  //   setShowSuggestions(false);
  //   setSelectedSuggestionIndex(-1);
    
  //   // Trigger search after a small delay to let state update
  //   setTimeout(() => {
  //     handleSafeSearch();
  //   }, 50);
  // };

  // // Close suggestions when clicking outside
  // useEffect(() => {
  //   const handleClickOutside = (event) => {
  //     if (
  //       searchInputRef.current && 
  //       !searchInputRef.current.contains(event.target) &&
  //       suggestionsRef.current && 
  //       !suggestionsRef.current.contains(event.target)
  //     ) {
  //       setShowSuggestions(false);
  //       setSelectedSuggestionIndex(-1);
  //     }
  //   };

  //   document.addEventListener('mousedown', handleClickOutside);
  //   return () => document.removeEventListener('mousedown', handleClickOutside);
  // }, []);

  useEffect(() => {
    if (filterState.keyword.trim() !== "") {
      setShowWarning(false);
    }
  }, [filterState.keyword]);

  useEffect(() => {
    // When municipio changes, reset participantes
    filterState.setParticipanteId([]);
  }, [filterState.municipioId]);

  // Auto-search effect - triggers search after 2 seconds of inactivity
  useEffect(() => {
    // Only run if auto-search is enabled
    if (!enableAutoSearch) {
      return;
    }

    // Clear any existing timeout
    if (autoSearchDebounceRef.current) {
      clearTimeout(autoSearchDebounceRef.current);
    }

    // Don't auto-search if the keyword is empty and there are no active filters
    const hasKeyword = filterState.keyword.trim() !== "";
    const hasFilters = 
      (Array.isArray(filterState.municipioId) && filterState.municipioId.length > 0) ||
      (Array.isArray(filterState.participanteId) && filterState.participanteId.length > 0) ||
      (filterState.party && filterState.party !== "") ||
      (Array.isArray(filterState.topico) && filterState.topico.length > 0) ||
      (searchType === "assuntos" && filterState.aprovado && filterState.aprovado !== "") ||
      (filterState.startDate && filterState.startDate !== "") ||
      (filterState.endDate && filterState.endDate !== "");

    // Only proceed if there's a keyword or active filters
    if (!hasKeyword && !hasFilters) {
      return;
    }

    // Set a timeout to trigger search after 2 seconds
    autoSearchDebounceRef.current = setTimeout(() => {
      // Sanitize the keyword before searching
      const sanitizedKeyword = DOMPurify.sanitize(filterState.keyword);
      
      // Update the keyword if it was sanitized differently
      if (sanitizedKeyword !== filterState.keyword) {
        filterState.setKeyword(sanitizedKeyword);
        return; // Don't trigger search if we're updating the keyword
      }

      // Close advanced filters if open
      if (filterState.showAdvancedFilters) {
        filterState.setShowAdvancedFilters(false);
      }

      // Trigger the search
      handleSearch();
    }, 500); // 500ms delay ----->> https://ux.stackexchange.com/questions/34360/delay-on-keystroke-when-search-as-you-type

    // Cleanup function
    return () => {
      if (autoSearchDebounceRef.current) {
        clearTimeout(autoSearchDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    enableAutoSearch,
    filterState.keyword,
    filterState.municipioId,
    filterState.participanteId,
    filterState.party,
    filterState.topico,
    filterState.aprovado,
    filterState.startDate,
    filterState.endDate,
    searchType
    // Note: handleSearch is intentionally excluded to prevent infinite loops
  ]);
    
  const hasActiveFilters = useMemo(() => {
    const hasNonDefaultSorting = 
      (filterState.sortBy && filterState.sortBy !== "score") ||
      (filterState.sortOrder && filterState.sortOrder !== "desc");
      
    return (
      (Array.isArray(filterState.municipioId) && filterState.municipioId.length > 0) ||
      (Array.isArray(filterState.participanteId) && filterState.participanteId.length > 0) ||
      (filterState.party && filterState.party !== "") ||
      (Array.isArray(filterState.topico) && filterState.topico.length > 0) ||
      (searchType === "assuntos" && filterState.aprovado && filterState.aprovado !== "") ||
      (filterState.startDate && filterState.startDate !== "") ||
      (filterState.endDate && filterState.endDate !== "") ||
      hasNonDefaultSorting
    );
  }, [
    filterState.municipioId,
    filterState.participanteId,
    filterState.party,
    filterState.tipo,
    filterState.topico,
    filterState.aprovado,
    filterState.startDate,
    filterState.endDate,
    filterState.sortBy,
    filterState.sortOrder,
    searchType
  ]);

  // Safe search function that sanitizes input before searching
  const handleSafeSearch = () => {
    // Sanitize all inputs before searching
    const sanitizedKeyword = DOMPurify.sanitize(filterState.keyword);
    
    // If you need to update the sanitized value in the state
    if (sanitizedKeyword !== filterState.keyword) {
      filterState.setKeyword(sanitizedKeyword);
    }
    
    // Check if keyword is empty and no other filters are active
    const hasNoKeyword = !sanitizedKeyword.trim();
    const hasNoActiveFilters = !(
      (Array.isArray(filterState.municipioId) && filterState.municipioId.length > 0) || 
      (Array.isArray(filterState.participanteId) && filterState.participanteId.length > 0) || 
      (filterState.party && filterState.party !== "") || 
      (Array.isArray(filterState.topico) && filterState.topico.length > 0) || 
      (searchType === "assuntos" && filterState.aprovado && filterState.aprovado !== "") || 
      (filterState.startDate && filterState.startDate !== "") || 
      (filterState.endDate && filterState.endDate !== "")
    );
    
    // Only show warning if keyword is empty AND no other filters are active
    if (hasNoKeyword && hasNoActiveFilters) {
      // Trigger warning effect if search is empty and no filters
      setShowWarning(true);
      return;
    }
    
    // Always show warning if keyword is empty, regardless of filters
    if (hasNoKeyword) {
      setShowWarning(true);
      return;
    }
    
    // Hide suggestions when searching
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Close the advanced filters panel if it's open
    if (filterState.showAdvancedFilters) {
      filterState.setShowAdvancedFilters(false);
    }
    
    // Call the original search handler
    handleSearch();
  };

  return (
    <div className=" pb-3 font-montserrat">
      <div className="container mx-auto">
        <h1 className="text-xl md:text-2xl text-white font-bold inline-flex items-center">
          <FiSearch/> &nbsp; 
          {searchType === "atas" ? t("search_minutes_title") : t("search_subjects_title")}
        </h1>
        
        <p className="text-gray-200 mt-2 font-montserrat">
          {searchType === "atas" ? t("search_minutes_description") : t("search_subjects_description")}
        </p>

        {/* Main Search Bar */}
        <div className="mt-4">
          <AnimatePresence>
            {showWarning && (
              <motion.span
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="text-red-500 text-xs mb-1 p-0 block"
              >
                {t("search_term_required")}
              </motion.span>
            )}
          </AnimatePresence>
          
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-grow relative">
              <motion.div
                animate={showWarning ? {
                  x: [-5, 5, -5, 5, -3, 3, -2, 2, 0],
                  borderColor: ['#f87171', '#ef4444', '#f87171', '#ef4444', '#f87171', '#d1d5db']
                } : {}}
                transition={{ duration: 0.3 }}
                className="relative w-full"
              >
                {/* Search Input */}
                <div className="relative">
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={filterState.keyword}
                    onChange={(e) => {
                      const sanitized = DOMPurify.sanitize(e.target.value);
                      filterState.setKeyword(sanitized);
                      // setSelectedSuggestionIndex(-1);
                    }}
                    onKeyDown={handleKeyDown}
                    // onFocus={() => {
                    //   if (suggestions.length > 0) {
                    //     setShowSuggestions(true);
                    //   }
                    // }}
                    placeholder={placeholderText}
                    className={`w-full font-montserrat px-3 py-2 pr-10 rounded-md 
                      ${showWarning ? 'border-2 border-red-400' : 'border border-gray-300 dark:border-sky-900'} 
                      bg-white dark:bg-sky-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-sky-500 focus:outline-none`}
                    autoComplete="on"
                  />
                  
                  {/* Loading indicator for suggestions */}
                  {isFetchingSuggestions && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-gray-300 border-t-sky-500 rounded-full"
                      />
                    </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                <AnimatePresence>
                  {showSuggestions && suggestions.length > 0 && (
                    <motion.div
                      ref={suggestionsRef}
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: "easeOut" }}
                      className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
                    >
                      {suggestions.map((suggestion, index) => (
                        <motion.div
                          key={`${suggestion.text}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05, duration: 0.2 }}
                          className={`
                            px-4 py-3 cursor-pointer transition-colors flex items-center justify-between
                            ${selectedSuggestionIndex === index 
                              ? 'bg-sky-50 text-sky-900 ' 
                              : 'hover:bg-gray-50 text-gray-700'
                            }
                            ${index === suggestions.length - 1 ? '' : 'border-b border-gray-100'}
                          `}
                          onClick={() => selectSuggestion(suggestion)}
                          onMouseEnter={() => setSelectedSuggestionIndex(index)}
                        >
                          <div className="flex items-center flex-grow">
                            {/* <div className={`
                              mr-3 p-1.5 rounded-full
                              ${selectedSuggestionIndex === index 
                                ? 'bg-sky-100 text-sky-600' 
                                : 'bg-gray-100 text-gray-500'
                              }
                            `}>
                              <FiSearch size={14} />
                            </div> */}
                            <div className="flex-grow">
                              <div className="text-sm font-medium truncate">
                                {suggestion.text}
                              </div>
                              {/* {suggestion.type && (
                                <div className="text-xs text-gray-500 capitalize">
                                  {suggestion.type}
                                </div>
                              )} */}
                            </div>
                          </div>
                          
                          {/* {suggestion.count > 0 && (
                            <div className="flex items-center text-xs text-gray-400 ml-2">
                              <FiTrendingUp size={12} className="mr-1" />
                              {suggestion.count}
                            </div>
                          )} */}
                        </motion.div>
                      ))}
                      
                      {filterState.keyword.trim() && !suggestions.find(s => s.text.toLowerCase() === filterState.keyword.toLowerCase()) && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: suggestions.length * 0.05 + 0.1, duration: 0.2 }}
                          className="px-4 py-3 border-t border-gray-200 bg-gray-50"
                        >
                          <button
                            onClick={handleSafeSearch}
                            className="w-full text-left text-sm text-sky-600 hover:text-sky-800 flex items-center font-medium"
                          >
                            <FiSearch size={14} className="mr-3" />
                            {t("search_for", "Pesquisar por") || "Pesquisar por"} "{filterState.keyword}"
                          </button>
                        </motion.div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex w-full sm:w-auto gap-2">
              <button 
                className={`flex-1 sm:flex-initial text-white font-montserrat text-xs sm:text-sm md:text-sm font-medium px-3 sm:px-6 py-2 rounded-md shadow-md hover:bg-sky-950 transition flex items-center justify-center ${isLoading ? "cursor-not-allowed bg-sky-300/10" : "cursor-pointer bg-sky-700"}`}
                onClick={handleSafeSearch}
                disabled={isLoading}
              >
                {isLoading ? (
                  <FiSearch className="mr-1 sm:mr-2" />
                ) : (
                  <FiSearch className="mr-1 sm:mr-2" />
                )}
                <span className="truncate">
                  {t("search_button")}
                </span>
              </button>
              {/* filters */}
              {!isEmbed && ( 
                <button
                  onClick={() => filterState.setShowAdvancedFilters(!filterState.showAdvancedFilters)}
                  className="flex-1 cursor-pointer sm:flex-initial bg-white text-sky-950 border border-gray-300 font-medium font-montserrat text-xs sm:text-sm md:text-sm px-2 sm:px-4 py-2 rounded-md shadow-md hover:bg-gray-100 transition flex items-center justify-center relative"
                >
                  {hasActiveFilters && (
                    <span className="absolute top-0 right-0 transform translate-x-1/3 -translate-y-1/3 w-3 h-3 bg-sky-700 ring-1 ring-white rounded-full"></span>
                  )}
                  <span className="truncate">
                    {t("filters")}
                  </span>
                  <motion.div
                    animate={{ rotate: filterState.showAdvancedFilters ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-2"
                  >
                    <FiChevronDown />
                  </motion.div>
                </button>
              )}
            </div>
          </div>
        </div>

         {/* Advanced Filters */}
        {!isEmbed && (
         <AnimatePresence>
            {filterState.showAdvancedFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className=""
              >
                <AdvancedFilters 
                  filterState={filterState}
                  usedFiltersState={usedFiltersState}
                  handleSearch={handleSafeSearch}
                  municipios={municipios}
                  topicos={topicos}
                  handleClearFilters={handleClearFilters}
                  searchType={searchType}
                  isLoading={isLoading}
                  isEmbed={isEmbed}
                  isModal={isModal}
                />
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default GenericSearchHeader;