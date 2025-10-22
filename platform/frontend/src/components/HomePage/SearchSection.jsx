import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  FiSearch, FiFilter, FiChevronUp, FiChevronDown, 
  FiCalendar, FiX, FiClock 
} from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import LangLink from "../common/LangLink";

const SearchSection = ({ municipalities, navigate }) => {
  const { t } = useTranslation();
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  return (
    <div className="w-full bg-sky-800 py-12 flex justify-center items-center">
      <div className="container px-6 font-montserrat">
        <h1 className="text-white text-2xl font-semibold inline-flex items-center">
          <FiSearch/> &nbsp; <span>{t("search_title")}</span>
        </h1>
        <h2 className="text-xl text-gray-200 mt-1 mb-6">
          {t("search_description")}
        </h2>
        
        <SearchBar 
          showAdvancedFilters={showAdvancedFilters} 
          setShowAdvancedFilters={setShowAdvancedFilters}
          municipalities={municipalities}
          navigate={navigate}
        />
        
        <QuickFilters />
      </div>
    </div>
  );
};

const SearchBar = ({ showAdvancedFilters, setShowAdvancedFilters, municipalities, navigate }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceRef = useRef(null);

  // Fetch suggestions from API
  const fetchSuggestions = async (query) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/search/suggestions?q=${encodeURIComponent(query)}&limit=8`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
        setShowSuggestions(true);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Debounced search suggestions
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Handle input change
  const handleInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === 'Enter') {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > -1 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          selectSuggestion(suggestions[selectedSuggestionIndex]);
        } else {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
        break;
    }
  };

  // Select a suggestion
  const selectSuggestion = (suggestion) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
    
    // Perform search with selected suggestion
    navigate(`/pesquisa?q=${encodeURIComponent(suggestion.text)}`);
    window.scrollTo(0, 0);
  };

  // Handle search
  const handleSearch = () => {
    const keyword = searchQuery.trim();
    if (keyword) {
      navigate(`/pesquisa?q=${encodeURIComponent(keyword)}`);
      window.scrollTo(0, 0);
      setShowSuggestions(false);
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchInputRef.current && 
        !searchInputRef.current.contains(event.target) &&
        suggestionsRef.current && 
        !suggestionsRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mt-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-grow relative">
          {/* Search Input */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              name="keyword"
              value={searchQuery}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={t("search_placeholder")}
              className="w-full p-3 pl-10 pr-4 rounded-md bg-white text-gray-900 font-montserrat focus:ring-2 focus:ring-sky-500 focus:outline-none"
              autoComplete="off"
            />
            <div className="absolute left-3 top-3.5 text-gray-500">
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-4 h-4 border-2 border-gray-300 border-t-sky-500 rounded-full"
                />
              ) : (
                <FiSearch size={18} />
              )}
            </div>
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
                        ? 'bg-sky-50 text-sky-900 border-l-2 border-sky-500' 
                        : 'hover:bg-gray-50 text-gray-700'
                      }
                      ${index === suggestions.length - 1 ? '' : 'border-b border-gray-100'}
                    `}
                    onClick={() => selectSuggestion(suggestion)}
                    onMouseEnter={() => setSelectedSuggestionIndex(index)}
                  >
                    <div className="flex items-center flex-grow">
                      <div className={`
                        mr-3 p-1.5 rounded-full
                        ${selectedSuggestionIndex === index 
                          ? 'bg-sky-100 text-sky-600' 
                          : 'bg-gray-100 text-gray-500'
                        }
                      `}>
                        <FiSearch size={14} />
                      </div>
                      <div className="flex-grow">
                        <div className="text-sm font-medium truncate">
                          {suggestion.text}
                        </div>
                        {suggestion.type && (
                          <div className="text-xs text-gray-500 capitalize">
                            {suggestion.type}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {suggestion.count > 0 && (
                      <div className="flex items-center text-xs text-gray-400 ml-2">
                        <FiTrendingUp size={12} className="mr-1" />
                        {suggestion.count}
                      </div>
                    )}
                  </motion.div>
                ))}
                
                {/* Search with current query option */}
                {searchQuery.trim() && !suggestions.find(s => s.text.toLowerCase() === searchQuery.toLowerCase()) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: suggestions.length * 0.05 + 0.1, duration: 0.2 }}
                    className="px-4 py-3 border-t border-gray-200 bg-gray-50"
                  >
                    <button
                      onClick={handleSearch}
                      className="w-full text-left text-sm text-sky-600 hover:text-sky-800 flex items-center font-medium"
                    >
                      <FiSearch size={14} className="mr-3" />
                      {t("search_for")} "{searchQuery}"
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handleSearch}
            className="text-white bg-sky-950 border font-semibold uppercase border-sky-950 hover:border-sky-900 font-montserrat px-4 py-3 rounded-md shadow-md hover:bg-sky-950/60 transition flex items-center"
          >
            <FiSearch className="mr-2" /> {t("search_button")}
          </button>
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="bg-white text-sky-950 font-montserrat px-4 py-3 rounded-md shadow-md hover:bg-gray-100 transition flex items-center"
          >
            <FiFilter className="mr-2" />
            {t("filters")}
            {showAdvancedFilters ? 
              <FiChevronUp className="ml-2" /> : 
              <FiChevronDown className="ml-2" />
            }
          </button>
        </div>
      </div>
      
      {showAdvancedFilters && (
        <AdvancedFilters 
          municipalities={municipalities}
          navigate={navigate}
        />
      )}
    </div>
  );
};

const AdvancedFilters = ({ municipalities, navigate }) => {
  const { t } = useTranslation();
  
  return (
    <div className="mt-4 bg-white/10 backdrop-blur-sm p-4 rounded-md shadow-md">
      <form 
        className="space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          const keyword = e.target.elements.keyword.value;
          const title = e.target.elements.title?.value;
          const municipioId = e.target.elements.municipioId.value;
          const startDate = e.target.elements.startDate.value;
          const endDate = e.target.elements.endDate.value;
          const fileType = e.target.elements.fileType?.value;
          const sortBy = e.target.elements.sortBy?.value || "score";
          const sortOrder = e.target.elements.sortOrder?.value || "desc";

          // Build search query
          const params = new URLSearchParams();
          if (keyword.trim()) params.append("q", keyword.trim());
          if (title && title.trim()) params.append("title", title.trim());
          if (municipioId) params.append("municipio_id", municipioId);
          if (startDate) params.append("start_date", startDate);
          if (endDate) params.append("end_date", endDate);
          if (fileType) params.append("file_type", fileType);
          params.append("sort", sortBy);
          params.append("order", sortOrder);

          navigate(`/pesquisa?${params.toString()}`);
          window.scrollTo(0, 0);
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Hidden keyword field that syncs with the main search bar */}
          <input 
            type="hidden" 
            name="keyword"
            defaultValue=""
            ref={(el) => {
              if (el) {
                const mainInput = document.querySelector('input[name="keyword"]');
                if (mainInput) {
                  el.value = mainInput.value;
                  mainInput.addEventListener('input', () => {
                    el.value = mainInput.value;
                  });
                }
              }
            }}
          />
          
          <FilterField 
            id="title"
            label={t("title")}
            placeholder={t("filter_by_title")}
            type="text"
          />
          
          <FilterDropdown 
            id="municipioId"
            label={t("county")}
            defaultValue=""
          >
            <option value="">{t("all_counties")}</option>
            {municipalities.map(municipio => (
              <option key={municipio.id} value={municipio.id}>
                {municipio.name}
              </option>
            ))}
          </FilterDropdown>
          
          <DateFilterField 
            id="startDate"
            label={t("from_date")}
          />
          
          <DateFilterField 
            id="endDate"
            label={t("to_date")}
          />
          
          <FilterDropdown 
            id="fileType"
            label={t("file_type")}
            defaultValue=""
          >
            <option value="">{t("all_types")}</option>
            <option value="PDF">PDF</option>
            <option value="DOC">DOC</option>
            <option value="DOCX">DOCX</option>
          </FilterDropdown>
          
          <FilterDropdown 
            id="sortBy"
            label={t("sort_by")}
            defaultValue="date"
          >
            <option value="date">{t("meeting_date")}</option>
            <option value="title">{t("title")}</option>
            <option value="uploaded_at">{t("upload_date")}</option>
          </FilterDropdown>
          
          <FilterDropdown 
            id="sortOrder"
            label={t("order")}
            defaultValue="desc"
          >
            <option value="desc">{t("descending")}</option>
            <option value="asc">{t("ascending")}</option>
          </FilterDropdown>
        </div>
        
        <div className="flex justify-end mt-4">
          <button 
            type="button"
            onClick={() => {
              // Clear all form fields
              const form = document.querySelector('form');
              if (form) {
                form.reset();
                const mainInput = document.querySelector('input[name="keyword"]');
                if (mainInput) mainInput.value = '';
              }
            }}
            className="bg-gray-300 text-gray-800 font-montserrat px-4 py-2 rounded-md hover:bg-gray-400 transition mr-2 flex items-center"
          >
            <FiX className="mr-2" />
            {t("clear_filters")}
          </button>
          
          <button 
            type="submit" 
            className="bg-sky-800 text-white px-5 py-2 rounded-md font-semibold uppercase hover:bg-sky-900 transition font-montserrat flex items-center"
          >
            <FiSearch className="mr-2" /> {t("advanced_search")}
          </button>
        </div>
      </form>
    </div>
  );
};

const FilterField = ({ id, label, placeholder, type = "text" }) => {
  const { t } = useTranslation();
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
      />
    </div>
  );
};

const DateFilterField = ({ id, label }) => {
  const { t } = useTranslation();
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">
        {label}
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          <FiCalendar size={16} />
        </div>
        <input
          id={id}
          name={id}
          type="date"
          className="w-full px-3 py-2 pl-10 bg-white border border-gray-300 rounded-md text-gray-900"
        />
      </div>
    </div>
  );
};

const FilterDropdown = ({ id, label, defaultValue, children }) => {
  const { t } = useTranslation();
  
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">
        {label}
      </label>
      <select
        id={id}
        name={id}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
        defaultValue={defaultValue}
      >
        {children}
      </select>
    </div>
  );
};

const QuickFilters = () => {
  const { t } = useTranslation();
  
  return (
    <div className="mt-6 flex flex-wrap gap-3 justify-center">
      <LangLink 
        to="/pesquisa?sort=date&order=desc" 
        className="text-gray-100 hover:text-white hover:underline inline-flex items-center"
      >
        <FiCalendar className="mr-2" /> {t("recent_minutes")}
      </LangLink>
      <span className="text-gray-400">|</span>
      <LangLink 
        to="/pesquisa?order=desc&sort=uploaded_at" 
        className="text-gray-100 hover:text-white hover:underline inline-flex items-center"
      >
        <FiClock className="mr-2" /> {t("recently_added")}
      </LangLink>
      <span className="text-gray-400">|</span>
      <LangLink 
        to="/municipios" 
        className="text-gray-100 hover:text-white hover:underline inline-flex items-center"
      >
        <FaLandmark className="mr-2" /> {t("browse_by_county")}
      </LangLink>
    </div>
  );
};

export default SearchSection;