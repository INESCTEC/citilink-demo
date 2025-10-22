import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { useLangNavigate } from "../../hooks/useLangNavigate";

import GenericSearchHeader from "../SearchPage/GenericSearchHeader";

const SearchModal = ({ isOpen, onClose }) => {
  const navigate = useLangNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  // Search type state (atas or assuntos)
  const [searchType, setSearchType] = useState("atas");

  // Search filters state
  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [participanteId, setParticipanteId] = useState([]);  
  const [party, setParty] = useState("");
  const [topico, setTopico] = useState([]);  
  const [year, setYear] = useState("");
  const [aprovado, setAprovado] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [tipo, setTipo] = useState("");
  const [participantsLogic, setParticipantsLogic] = useState("and");
  const [topicsLogic, setTopicsLogic] = useState("and");
  const [dateMode, setDateMode] = useState(() => {
    try {
      const stored = localStorage.getItem('facetDateMode');
      return localStorage.getItem('facetDateMode' || 'year');
    } catch {
      return 'year';
    }
  });
    // Save dateMode to localStorage whenever it changes
    useEffect(() => {
      try {
        localStorage.setItem('facetDateMode', dateMode);
      } catch {}
    }, [dateMode]);

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [municipios, setMunicipios] = useState([]);
  const [topicos, setTopicos] = useState([]);

  // Extract county ID from current path
  const extractCountyIdFromPath = () => {
    const pathSegments = location.pathname.split('/');
    
    // Check for county page patterns like /municipio/123 or /en/municipio/123
    const municipioIndex = pathSegments.findIndex(segment => segment === 'municipio');
    if (municipioIndex !== -1 && pathSegments[municipioIndex + 1]) {
      return pathSegments[municipioIndex + 1];
    }
    
    // Check for county pages with names like /municipios/lisboa or /en/municipios/lisboa
    const municipiosIndex = pathSegments.findIndex(segment => segment === 'municipios');
    if (municipiosIndex !== -1 && pathSegments[municipiosIndex + 1]) {
      const countyNameOrId = pathSegments[municipiosIndex + 1];
      // If it's a number, return it directly
      if (/^\d+$/.test(countyNameOrId)) {
        return countyNameOrId;
      }
      // If it's a name, we'll need to find the ID after municipios are loaded
      return countyNameOrId;
    }
    
    // Check for county pages with names like /municipalities/lisboa or /en/municipalities/lisboa
    const municipalitiesIndex = pathSegments.findIndex(segment => segment === 'municipalities');
    if (municipalitiesIndex !== -1 && pathSegments[municipalitiesIndex + 1]) {
      const countyNameOrId = pathSegments[municipalitiesIndex + 1];
      // If it's a number, return it directly
      if (/^\d+$/.test(countyNameOrId)) {
        return countyNameOrId;
      }
      // If it's a name, we'll need to find the ID after municipios are loaded
      return countyNameOrId;
    }
    
    return null;
  };

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    // Set county when modal opens and municipios are loaded
    if (isOpen && municipios.length > 0) {
      const countyFromPath = extractCountyIdFromPath();
      
      if (countyFromPath) {
        // If it's a number, use it directly
        if (/^\d+$/.test(countyFromPath)) {
          setMunicipioId(countyFromPath);
        } else {
          // If it's a name, find the matching municipio
          const matchingMunicipio = municipios.find(m => 
            m.name.toLowerCase().replace(/\s+/g, '-') === countyFromPath.toLowerCase() ||
            m.slug === countyFromPath.toLowerCase()
          );
          
          if (matchingMunicipio) {
            setMunicipioId(matchingMunicipio.id);
          }
        }
      }
    }
  }, [isOpen, municipios, location.pathname]);

  // Reset filters when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Only reset if not coming from a county page
      const countyFromPath = extractCountyIdFromPath();
      if (!countyFromPath) {
        setMunicipioId("");
      }
      // Reset other filters that shouldn't persist
      setKeyword("");
      setTitle("");
      setParticipanteId([]);
      setParty("");
      setTopico([]);
      setYear("");
      setAprovado("");
      setStartDate("");
      setEndDate("");
      setTipo("");
    }
  }, [isOpen]);

  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch municipalities and topics in parallel
      const [municipiosResponse, topicosResponse] = await Promise.all([
        fetch(`${API_URL}/v0/public/municipios?demo=${DEMO_MODE}&lang=${i18n.language}`),
        fetch(`${API_URL}/v0/public/topicos?demo=${DEMO_MODE}&lang=${i18n.language}`)
      ]);
      
      if (municipiosResponse.ok) {
        const data = await municipiosResponse.json();
        setMunicipios(data);
      }
      
      if (topicosResponse.ok) {
        const data = await topicosResponse.json();
        setTopicos(data);
      }
    } catch (error) {
      console.error("Error fetching data for search modal:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search submit
  const handleSearch = () => {
    // Build query parameters
    const params = new URLSearchParams();
    
    if (keyword) params.append("q", keyword);
    if (title) params.append("title", title);
    if (municipioId) params.append("municipio_id", municipioId);
    if (tipo) params.append("tipo", tipo);
    
    // Handle multiple participant selection
    if (Array.isArray(participanteId) && participanteId.length > 0) {
      participanteId.forEach(id => {
        params.append("participant_id", String(id));
        if (participantsLogic) params.append("topics_logic", topicsLogic);
      });
    } else if (participanteId && participanteId !== "") {
      params.append("participant_id", String(participanteId));
      if (participantsLogic) params.append("topics_logic", topicsLogic);
    }

    
    if (party) params.append("party", party);
    
    // Handle multiple topic selection for "assuntos" search type
    if (Array.isArray(topico) && topico.length > 0) {
      topico.forEach(id => {
        params.append("topico", String(id));
      });
      if (topicsLogic) params.append("topics_logic", topicsLogic);
    } else if (topico && topico !== "") {
      params.append("topico", String(topico));
      if (topicsLogic) params.append("topics_logic", topicsLogic);
    }

    if (dateMode === "year" && year) {
      params.append("year", year);
    }
    else if (dateMode === "period") {
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
    }
    
    if (searchType === "assuntos" && aprovado !== "") params.append("aprovado", aprovado);
    params.append("sort", sortBy);
    params.append("order", sortOrder);
    params.append("type", searchType);
    params.append("demo", DEMO_MODE);
    params.append("lang", i18n.language);
    
    // Navigate to search page with these parameters
    navigate(`/pesquisa?${params.toString()}`);
    
    // Close the modal
    onClose();
  };

  // Clear all filters
  const handleClearFilters = () => {
    const countyFromPath = extractCountyIdFromPath();
    
    setTitle("");
    setKeyword("");
    // Only clear municipioId if we're not on a county page
    if (!countyFromPath) {
      setMunicipioId("");
    }
    setParticipanteId([]);
    setParty("");
    setTipo("");
    setTopico([]);
    setAprovado("");
    setStartDate("");
    setEndDate("");
    setSortBy("score");
    setSortOrder("desc");
    setParticipantsLogic("or");
    setTopicsLogic("or");
  };

  // Handle toggle between search types
  const toggleSearchType = (type) => {
    if (type !== searchType) {
      setSearchType(type);
      handleClearFilters();
    }
  };

  // Group search filter state for passing down
  const filterState = {
    keyword, setKeyword,
    title, setTitle,
    municipioId, setMunicipioId,
    participanteId, setParticipanteId,
    participantsLogic, setParticipantsLogic,
    topicsLogic, setTopicsLogic,
    dateMode, setDateMode,
    year, setYear,
    party, setParty,
    topico, setTopico,
    aprovado, setAprovado,
    startDate, setStartDate,
    endDate, setEndDate,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    showAdvancedFilters, setShowAdvancedFilters,
    tipo, setTipo
  };

  useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = "hidden";
  } else {
    document.body.style.overflow = "";
  }
  return () => {
    document.body.style.overflow = "";
  };
}, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          <motion.div
            initial={{ translateY: "-100%" }}
            animate={{ translateY: "0%" }}
            exit={{ translateY: "-100%" }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0 bg-sky-950/95 dark:bg-slate-950/95 backdrop-blur-xs z-10"
          />
          
          {/* Content container - fades in after curtain reveals */}
          <motion.div 
            className="relative z-20 h-screen overflow-y-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ 
              initial: { duration: 0.1, delay: 0 },
              opacity: { duration: 0.1, delay: 0 },
              exit: { duration: 0.1, delay: 0 }
            }}
          >
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-full px-4 py-12 relative">
                {/* Close button */}
                <motion.button
                  className="absolute top-4 right-6 text-white text-2xl p-2 rounded-md hover:bg-white/10 cursor-pointer"
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FiX />
                </motion.button>
                
                <motion.div 
                  className="max-w-6xl mx-auto"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.3 }}
                >
                  {/* Search Header */}
                  <GenericSearchHeader
                    searchType={searchType}
                    filterState={filterState}
                    handleSearch={handleSearch}
                    isLoading={isLoading}
                    municipios={municipios}
                    topicos={topicos}
                    handleClearFilters={handleClearFilters}
                  />
                  
                  {/* Search Type Toggle */}
                  <div className="flex justify-center mt-2 mb-4 font-montserrat">
                    <div className="relative inline-flex border-b-2 border-sky-300/30 px-2">
                      <button 
                        className={`px-4 py-1.5 text-sm font-medium transition-all duration-300 cursor-pointer relative
                          ${searchType === "atas" 
                            ? "text-white" 
                            : "text-sky-300/70 hover:text-sky-200"
                          }`}
                        onClick={() => toggleSearchType("atas")}
                      >
                        {t("minutes")}
                        {searchType === "atas" && (
                          <motion.div 
                            className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-white rounded-full"
                            layoutId="modal-underline"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </button>
                      
                      <button 
                        className={`px-4 py-1.5 text-sm font-medium transition-all cursor-pointer duration-300 relative
                          ${searchType === "assuntos" 
                            ? "text-white" 
                            : "text-sky-300/70 hover:text-sky-200"
                          }`}
                        onClick={() => toggleSearchType("assuntos")}
                      >
                        {t("subjects")}
                        {searchType === "assuntos" && (
                          <motion.div 
                            className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-white rounded-full"
                            layoutId="modal-underline"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                          />
                        )}
                      </button>
                    </div>
                  </div>
                  
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default SearchModal;
