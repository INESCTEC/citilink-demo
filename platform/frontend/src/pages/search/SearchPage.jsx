import { useState, useEffect, use, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronRight, FiFileText, FiList, FiHome } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { set } from "date-fns";

import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import SearchMinutes from "./SearchMinutes";
import SearchAssuntos from "./SearchAssuntos";
import GenericSearchHeader from "../../components/SearchPage/GenericSearchHeader";
import LoadingState from "../../components/common/states/LoadingState";

import { easeInScrollToTarget } from "../../utils/scroll";
import { useLangNavigate } from "../../hooks/useLangNavigate";
import LangLink from "../../components/common/LangLink";

function SearchPage() {
  const hasInitialized = useRef(false);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useLangNavigate();
  const { t, i18n } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  const EXIT_ANIMATION_DURATION = 1500; // 1.5 seconds
  const MINIMUM_LOADING_TIME = 500; // 0.5 seconds minimum display time
  
  // the view is either atas by default or comes specified in the URL
  const initialType = searchParams.get("type") === "assuntos" ? "assuntos" : "atas";
  const [searchType, setSearchType] = useState(initialType);
  
  // to track if it has been searched before, so it loads the correct component
  const [hasSearchedAtas, setHasSearchedAtas] = useState(false);
  const [hasSearchedAssuntos, setHasSearchedAssuntos] = useState(false);

  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [shouldSearchAfterTypeChange, setShouldSearchAfterTypeChange] = useState(false);


  // Search state that will be passed to both components
  const [keyword, setKeyword] = useState(searchParams.get("q") || "");
  const [lastKeyword, setLastKeyword] = useState(searchParams.get("q") || ""); // last keyword is the same as keyword on initial load
  const [title, setTitle] = useState("");
  const [municipioId, setMunicipioId] = useState(searchParams.get("municipio_id") || "");
  const [party, setParty] = useState(searchParams.get("party") || "");
  const [participanteId, setParticipanteId] = useState(() => {
    const params = searchParams.getAll("participant_id");
    return params.length > 0 ? params.map(id => String(id)) : [];
  });
  const [topico, setTopico] = useState(() => {
    const params = searchParams.getAll("topico");
    return params.length > 0 ? params.map(id => String(id)) : [];
  });
  const [aprovado, setAprovado] = useState(searchParams.get("aprovado") || "");
  const [tipo, setTipo] = useState(searchParams.get("tipo") || "");
  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "score");
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "desc");
  const [participantsLogic, setParticipantsLogic] = useState(searchParams.get("participants_logic") || "or");
  const [topicsLogic, setTopicsLogic] = useState(searchParams.get("topicos_logic") || "or");

  // Additional facet-specific filter states]
  const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");
  const [tipoFilter, setTipoFilter] = useState(searchParams.get("tipo") || "");
  const [municipioFilter, setMunicipioFilter] = useState(searchParams.get("municipio_id") || "");
  const [participanteFilter, setParticipanteFilter] = useState(() => {
    const params = searchParams.getAll("participant_id");
    return params.length > 0 ? params.map(id => String(id)) : [];
  });
  const [topicoFilter, setTopicoFilter] = useState(() => {
    const params = searchParams.getAll("topico");
    return params.length > 0 ? params.map(id => String(id)) : [];
  });
  const [partyFilter, setPartyFilter] = useState(searchParams.get("party") || "");
  const [aprovadoFilter, setAprovadoFilter] = useState(searchParams.get("aprovado") || "");

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Loading animation state
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);

  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState({});
  const [totalResults, setTotalResults] = useState(0);
  const [municipios, setMunicipios] = useState([]);
  const [topicos, setTopicos] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [totalPages, setTotalPages] = useState(0);
  const [perPage, setPerPage] = useState(12);

  const [usedKeyword, setUsedKeyword] = useState("");
  const [usedTitle, setUsedTitle] = useState("");
  const [usedMunicipioId, setUsedMunicipioId] = useState("");
  const [usedParticipanteId, setUsedParticipanteId] = useState([]);
  const [usedParticipanteNames, setUsedParticipanteNames] = useState([]);
  const [usedParty, setUsedParty] = useState("");
  const [usedTopico, setUsedTopico] = useState([]);
  const [usedAprovado, setUsedAprovado] = useState(searchType === "assuntos" ? "" : "");
  const [usedTipo, setUsedTipo] = useState(searchType === "atas" ? "" : "");
  const [usedYearFilter, setUsedYearFilter] = useState("");
  const [usedStartDate, setUsedStartDate] = useState("");
  const [usedEndDate, setUsedEndDate] = useState("");
  const [usedSortBy, setUsedSortBy] = useState("score");
  const [usedSortOrder, setUsedSortOrder] = useState("desc");

  // Facet state for both search types
  const [showFacet, setShowFacet] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('countyFacetOpen');
      return stored === null ? true : stored === 'true';
    }
    return true; 
  });

  // Additional filter states for facet functionality
  const [availableYears, setAvailableYears] = useState([2024, 2023, 2022, 2021, 2020]);
  const [availableTipos, setAvailableTipos] = useState(["ordinaria", "extraordinaria"]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [availableParty, setAvailableParty] = useState([]);
  const [availableMunicipios, setAvailableMunicipios] = useState([]);
  const [availableTopicos, setAvailableTopicos] = useState([]);

  // Fetch participants when municipio changes
  useEffect(() => {
    if (municipioFilter) {
      fetchParticipants(municipioFilter);
    } else {
      // Clear participants when no municipio is selected
      setAvailableParticipants([]);
    }
  }, [municipioFilter]);

  // SEO meta tags update based on search parameters
  useEffect(() => {
    const updateSEOTags = () => {
      const currentUrl = window.location.href;
      
      // Determine base title and description based on search type and keyword
      let pageTitle, pageDescription;
      
      // if (usedKeyword) {
      //   // With search query
      //   if (searchType === "atas") {
      //     pageTitle = t("searchPage.minutes_title_with_query", { query: usedKeyword });
      //     pageDescription = t("searchPage.description_with_query", { query: usedKeyword });
      //   } else {
      //     pageTitle = t("searchPage.topics_title_with_query", { query: usedKeyword });
      //     pageDescription = t("searchPage.description_with_query", { query: usedKeyword });
      //   }
      // } else {
        // Without search query
        if (searchType === "atas") {
          pageTitle = t("searchPage.minutes_title");
          pageDescription = t("searchPage.minutes_description");
        } else {
          pageTitle = t("searchPage.topics_title");
          pageDescription = t("searchPage.topics_description");
        }
      // }
      document.title = pageTitle;
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', pageDescription);
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', pageTitle);
      }
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', pageDescription);
      }
      const ogUrl = document.querySelector('meta[property="og:url"]');
      if (ogUrl) {
        ogUrl.setAttribute('content', currentUrl);
      }
    };

    if (contentReady) updateSEOTags();
  }, [searchType, usedKeyword, contentReady, t]);

  useEffect(() => {
  if (hasInitialized.current) return; // Prevent double execution
  hasInitialized.current = true;
  
  const fetchData = async () => {
    const startTime = Date.now();
    
    try {
      setIsLoading(true);
      setShowLoadingState(true);
      setLoadingExiting(false);
      setContentReady(false);

      await Promise.all([
        fetchMunicipios(),
        fetchTopicos()
      ]);
      
      const initialKeyword = searchParams.get("q");
      if (initialKeyword) {
        await performSearch(initialKeyword);

        if (searchType === "atas") {
          setHasSearchedAtas(true);
        } else {
          setHasSearchedAssuntos(true);
        }
      }
      
      setIsLoading(false);
      setInitialLoadComplete(true);
      const loadingTime = Date.now() - startTime;
      const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
      setTimeout(() => {
        setContentReady(true); 
        setLoadingExiting(true);
        
        setTimeout(() => {
          setShowLoadingState(false);
        }, EXIT_ANIMATION_DURATION);
      }, additionalDelay);
      
    } catch (error) {
      console.error("Error during initial data loading:", error);
      
      const loadingTime = Date.now() - startTime;
      const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
      
      setTimeout(() => {
        setIsLoading(false);
        setContentReady(true);
        setLoadingExiting(true);
        
        setTimeout(() => {
          setShowLoadingState(false);
        }, EXIT_ANIMATION_DURATION);
      }, additionalDelay);
    }
  };
  
  fetchData();
}, []);

  useEffect(() => {
    const fetchUsedParticipantNames = async () => {
      if (usedParticipanteId.length > 0) {
        const names = await getParticipanteNames(usedParticipanteId);
        setUsedParticipanteNames(names);
      } else {
        setUsedParticipanteNames([]);
      }
    };
    
    fetchUsedParticipantNames();
  }, [usedParticipanteId]);

useEffect(() => {
  if (shouldSearchAfterTypeChange && keyword && keyword.trim() !== "" && contentReady) {
    handleSearch(keyword, 1);
    setShouldSearchAfterTypeChange(false); 
  }
}, [searchType, shouldSearchAfterTypeChange, keyword, contentReady]);

  
  const performSearch = async (searchKeyword) => {
    try {
      setLastKeyword(searchKeyword);
      
      const params = new URLSearchParams();
      if (searchKeyword) {
        params.append("q", searchKeyword); 
        setUsedKeyword(searchKeyword);
      }
      if (municipioId) {
        params.append("municipio_id", municipioId);
        setUsedMunicipioId(municipioId);
      }
      
      if (Array.isArray(participanteId) && participanteId.length > 0) {
        if (participanteId.length === 1 && participanteId[0] === "") {
          setParticipanteId([]);
        }
        else {
          participanteId.forEach(id => {
            if (id && id !== "") {
              params.append("participant_id", String(id));
            }
          });
          setUsedParticipanteId(participanteId);
        }
      } 
      // else if (participanteId && participanteId !== "") {
      //   params.append("participant_id", String(participanteId));
      //   setUsedParticipanteId([String(participanteId)]);
      // }

      if (party) {
        params.append("party", party);
        setUsedParty(party);
      }

      if (Array.isArray(topico) && topico.length > 0) {
        if (topico.length === 1 && topico[0] === "") {
          // If there's only an empty string, treat it as no topic
          console.warn("Empty topico found, treating as no topic.");
          setTopico([]);
        }
        else {
        topico.forEach(id => {
          if (id && id !== "" && id.trim() !== "") {
            params.append("topico", String(id));
          }
        });
        setUsedTopico(topico);
        }
      } 

      if (searchType === "atas" && tipo !== "") {
        params.append("tipo", tipo);
        setUsedTipo(tipo);
      }

      if (searchType === "assuntos" && aprovado !== "") {
        params.append("aprovado", aprovado);
        setUsedAprovado(aprovado);
      }
      
      // Use year if available, otherwise fall back to startDate/endDate
      if (yearFilter) {
        const startDate = `${yearFilter}-01-01`;
        const endDate = `${parseInt(yearFilter) + 1}-01-01`;
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      } else {
        if (startDate) {
          params.append("start_date", startDate);
          setUsedStartDate(startDate);
        }
        if (endDate) {
          params.append("end_date", endDate);
          setUsedEndDate(endDate);
        }
      }

      params.append("sort", sortBy);
      params.append("order", sortOrder);
      params.append("page", currentPage.toString());
      params.append("per_page", perPage.toString());
      
      // endpoint by type
      const endpoint = searchType === "atas" 
        ? `${API_URL}/v0/public/atas/search` 
        : `${API_URL}/v0/public/assuntos/search`;

      // response
      const response = await fetch(`${endpoint}?${params}&demo=${DEMO_MODE}&lang=${i18n.language}`);
      
      
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      setResults(data.data || []);
      setFacets(data.facets || {});
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setCurrentPage(data.pagination?.page || 1);
      setPerPage(data.pagination?.per_page || 12);
      
    } catch (error) {
      // console.error("Search error during initial load:", error);
      setErrorMessage("Ocorreu um erro ao pesquisar. Por favor tente novamente.");
    }
  };

  const toggleSearchType = (type) => {
  if (type !== searchType) {
    // Store current keyword before switching
    const currentKeyword = keyword;
    const currentLastKeyword = lastKeyword;
    
    setSearchType(type);

    setUsedKeyword(currentKeyword);
    
    setTitle("");
    setUsedTitle("");

    setMunicipioId("");
    setUsedMunicipioId("");
    
    setParticipanteId([]); 
    setUsedParticipanteId([]);

    setAvailableParticipants([]);

    setParty("");
    setPartyFilter("");
    setUsedParty("");

    setTopico([]); 
    setUsedTopico([]);

    setAprovado("");
    setAprovadoFilter("");
    setUsedAprovado("");

    setTipo("");
    setUsedTipo("");

    setStartDate("");
    setUsedStartDate("");

    setEndDate("");
    setUsedEndDate("");

    setYearFilter("");
    setUsedYearFilter("");

    setSortBy("score");
    setUsedSortBy("score");

    setTipoFilter("");

    setSortOrder("desc");
    setUsedSortOrder("desc");
    setCurrentPage(1);
    
    setResults([]);
    setTotalResults(0);
    setErrorMessage("");
    
    if (type === "atas") {
      setHasSearchedAtas(false);
    } else {
      setHasSearchedAssuntos(false);
    }
    
    const newParams = new URLSearchParams();
    newParams.set("type", type);
    if (currentKeyword) {
      newParams.set("q", currentKeyword);
    }
    setSearchParams(newParams);
    setKeyword(currentKeyword);
    setLastKeyword(currentLastKeyword);

    // Set flag to trigger search after state updates
    if (currentKeyword && currentKeyword.trim() !== "") {
      setShouldSearchAfterTypeChange(true);
    }
  }
};

  // fetch the counties, to populate the filter dropdown
  const fetchMunicipios = async () => {
    try {
      const response = await fetch(`${API_URL}/v0/public/municipios?demo=${DEMO_MODE}&lang=${i18n.language}`);
      if (response.ok) {
        const data = await response.json();
        setMunicipios(data);
        setAvailableMunicipios(data);
      }
    } catch (error) {
      console.error("Error fetching municipalities:", error);
    }
  };
  
  // fetch participants only when a municipio is selected
  const fetchParticipants = async (selectedMunicipioId) => {
    if (!selectedMunicipioId) {
      setAvailableParticipants([]);
      return;
    }
    
    try {
      // Using search endpoint with municipio_id filter to get participants
      const response = await fetch(`${API_URL}/v0/public/municipios/${selectedMunicipioId}?demo=${DEMO_MODE}&lang=${i18n.language}`);
      if (response.ok) {
        const data = await response.json();
        if (data.all_participants && data.all_participants.length > 0) {
          const participants = data.all_participants.map(p => ({
            id: p.id,
            name: p.name || p.id,
            party: p.party || ''
          }));
          setAvailableParticipants(participants);
        }
      }
    } catch (error) {
      console.error(`Error fetching participants for municipality ${selectedMunicipioId}:`, error);
    }
  };

  // fetch topics, to populate the filter dropdown
  const fetchTopicos = async () => {
    try {
      const response = await fetch(`${API_URL}/v0/public/topicos?demo=${DEMO_MODE}&lang=${i18n.language}`);
      if (response.ok) {
        const data = await response.json();
        setTopicos(data);
        setAvailableTopicos(data);
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
    }
  };

  // Helper function to perform search with explicit API parameters (used by applyFilters)
  const performSearchWithApiParams = async (apiParams) => {
    setIsLoading(true);
    setErrorMessage("");
    
    if (searchType === "atas") {
      setHasSearchedAtas(true);
    } else {
      setHasSearchedAssuntos(true);
    }
    
    try {
      // Extract parameters from apiParams to update "used" states
      const searchKeyword = apiParams.get("q");
      const yearFilterValue = apiParams.get("year");
      const tipoFilterValue = apiParams.get("tipo");
      const partyFilterValue = apiParams.get("party");
      const municipioFilterValue = apiParams.get("municipio_id");
      const participanteFilterValues = apiParams.getAll("participant_id");
      const topicoFilterValues = apiParams.getAll("topico");
      const aprovadoFilterValue = apiParams.get("aprovado");
      const startDateValue = apiParams.get("start_date");
      const endDateValue = apiParams.get("end_date");
      
      // Update "used" state variables for ActiveFilters display
      if (searchKeyword) {
        setUsedKeyword(searchKeyword);
      } else {
        setUsedKeyword("");
      }
      if (yearFilterValue) {
        setUsedYearFilter(yearFilterValue);
      } else {
        setUsedYearFilter("");
      }
      if (tipoFilterValue) {
        setUsedTipo(tipoFilterValue);
      } else {
        setUsedTipo("");
      }
      if (partyFilterValue) {
        setUsedParty(partyFilterValue);
      } else {
        setUsedParty("");
      }
      if (municipioFilterValue) {
        setUsedMunicipioId(municipioFilterValue);
      } else {
        setUsedMunicipioId("");
      }
      if (participanteFilterValues.length > 0) {
        setUsedParticipanteId(participanteFilterValues);
      } else {
        setUsedParticipanteId([]);
      }
      if (topicoFilterValues.length > 0) {
        setUsedTopico(topicoFilterValues);
      } else {
        setUsedTopico([]);
      }
      if (aprovadoFilterValue) {
        setUsedAprovado(aprovadoFilterValue);
      } else {
        setUsedAprovado("");
      }
      // Update date range "used" states and also the actual date states
      // This ensures both the display and the date range component stay in sync
      if (startDateValue) {
        setUsedStartDate(startDateValue);
        setStartDate(startDateValue);
      } else {
        setUsedStartDate("");
        setStartDate("");
      }
      if (endDateValue) {
        setUsedEndDate(endDateValue);
        setEndDate(endDateValue);
      } else {
        setUsedEndDate("");
        setEndDate("");
      }
      
      // Determine which endpoint to use based on search type
      const endpoint = searchType === "atas" 
        ? `${API_URL}/v0/public/atas/search` 
        : `${API_URL}/v0/public/assuntos/search`;
      
      // Fetch search results
      const response = await fetch(`${endpoint}?${apiParams}&demo=${DEMO_MODE}&lang=${i18n.language}`);
      
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      
      setResults(data.data || []);
      setFacets(data.facets || {});
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setCurrentPage(data.pagination?.page || 1);
      setPerPage(data.pagination?.per_page || 12);
      
      // Update available data from facets
      if (data.facets) {
        // Only set participants if a county is selected
        // if (municipioFilter && data.facets.participants) {
        //   setAvailableParticipants(data.facets.participants.map(p => ({
        //     id: p._id,
        //     name: p.name || p._id,
        //     party: p.party || ''
        //   })));
        // } else if (!municipioFilter) {
        //   setAvailableParticipants([]);
        // }
        
        if (data.facets.parties) {
          setAvailableParty(data.facets.parties.map(p => p._id));
        }
        
        if (data.facets.years) {
          setAvailableYears(data.facets.years.map(y => y._id).sort((a, b) => b - a));
        }
        
        if (data.facets.tipos) {
          setAvailableTipos(data.facets.tipos.map(t => t._id));
        }
        
        if (data.facets.topicos) {
          setAvailableTopicos(data.facets.topicos.map(t => ({
            id: t._id,
            name: t.name || t._id
          })));
        }
      }
      
    } catch (error) {
      console.error("Search error:", error);
      setErrorMessage("Ocorreu um erro ao pesquisar. Por favor tente novamente.");
      setResults([]);
      setFacets({});
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Generic search function for user-initiated searches
  const handleSearch = async (searchKeyword = keyword, page = null) => {
    const targetPage = page !== null ? page : (searchKeyword !== lastKeyword ? 1 : currentPage);

    setIsLoading(true);
    setErrorMessage("");
    setLastKeyword(searchKeyword);
    
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
    
    if (searchType === "atas") {
      setHasSearchedAtas(true);
    } else {
      setHasSearchedAssuntos(true);
    }
    
    try {
      const params = new URLSearchParams();
      
      if (keyword) {
        params.append("q", keyword);
        setUsedKeyword(keyword);
      }
      if (title) params.append("title", title);
      if (municipioId) {
        params.append("municipio_id", municipioId);
        setUsedMunicipioId(municipioId);
      }
      
      if (Array.isArray(participanteId) && participanteId.length > 0) {
        // Add each participant ID as a separate parameter
        participanteId.forEach(id => {
          if (id && id !== "") {
            params.append("participant_id", String(id));
          }
        });
        setUsedParticipanteId(participanteId);
      } 
      
      if (party) {
        params.append("party", party);
        setUsedParty(party);
      } 
      
      if (Array.isArray(topico) && topico.length > 0) {
        topico.forEach(id => {
          if (id && id !== "") {
            params.append("topico", String(id));
          }
        });
        setUsedTopico(topico);
      }

      if (searchType === "assuntos" && aprovado !== "") {
        params.append("aprovado", aprovado);
        setUsedAprovado(aprovado);
      }
      
      // Use year if available, otherwise fall back to startDate/endDate
      if (yearFilter) {
        const startDate = `${yearFilter}-01-01`;
        const endDate = `${parseInt(yearFilter) + 1}-01-01`;
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      } else {
        if (startDate) {
          params.append("start_date", startDate);
          setUsedStartDate(startDate);
        }
        if (endDate) {
          params.append("end_date", endDate);
          setUsedEndDate(endDate);
        }
      }

      if (searchType === "atas" && tipo !== "") {
        params.append("tipo", tipo);
        setUsedTipo(tipo);
      }

      if (aprovado !== "") {
        params.append("aprovado", aprovado);
        setUsedAprovado(aprovado);
      }
      params.append("sort", sortBy);
      params.append("order", sortOrder);
      params.append("page", targetPage.toString());
      params.append("per_page", perPage.toString());
      
      // Update search params in URL
      const urlParams = new URLSearchParams(searchParams);
      urlParams.set("type", searchType);
      urlParams.set("page", targetPage.toString());
      urlParams.set("sort", sortBy);
      urlParams.set("order", sortOrder);
      
      if (keyword) {
        urlParams.set("q", keyword);
      } else {
        urlParams.delete("q");
      }
      
      if (municipioId) {
        urlParams.set("municipio_id", municipioId);
      } else {
        urlParams.delete("municipio_id");
      }
      
      if (party) {
        urlParams.set("party", party);
      } else {
        urlParams.delete("party");
      }
      
      if (searchType === "assuntos" && aprovado !== "") {
        urlParams.set("aprovado", aprovado);
      } else {
        urlParams.delete("aprovado");
      }
      
      // Handle year filter in URL - prefer year over date range
      if (yearFilter) {
        urlParams.set("year", yearFilter);
        urlParams.delete("start_date");
        urlParams.delete("end_date");
      } else {
        urlParams.delete("year");
        if (startDate) {
          urlParams.set("start_date", startDate);
        } else {
          urlParams.delete("start_date");
        }
        
        if (endDate) {
          urlParams.set("end_date", endDate);
        } else {
          urlParams.delete("end_date");
        }
      }

      if (tipo) {
        urlParams.set("tipo", tipo);
      }
      else {
        urlParams.delete("tipo");
      }
      
      urlParams.delete("participant_id");
      if (Array.isArray(participanteId) && participanteId.length > 0) {
        participanteId.forEach(id => {
          if (id && id !== "") {
            urlParams.append("participant_id", String(id));
          }
        });
      } else if (participanteId && participanteId !== "") {
        urlParams.append("participant_id", String(participanteId));
      }
      
      // Handle topico filter in URL - add each topic ID as a separate parameter
      urlParams.delete("topico");
      if (Array.isArray(topico) && topico.length > 0) {
        topico.forEach(id => {
          if (id && id !== "") {
            urlParams.append("topico", String(id));
          }
        });
      } else if (topico && topico !== "") {
        urlParams.append("topico", String(topico));
      }
      setSearchParams(urlParams);
      
      // Determine which endpoint to use based on search type
      const endpoint = searchType === "atas" 
        ? `${API_URL}/v0/public/atas/search` 
        : `${API_URL}/v0/public/assuntos/search`;
      
      // Fetch search results
      const response = await fetch(`${endpoint}?${params}&demo=${DEMO_MODE}&lang=${i18n.language}`);
      
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }
      
      const data = await response.json();

      setResults(data.data || []);
      setFacets(data.facets || {});
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setCurrentPage(targetPage);
      setPerPage(data.pagination?.per_page || 12);
      
      // Update available data from facets
      if (data.facets) {
        // Only set participants if a county is selected
        // if (municipioFilter && data.facets.participants) {
        //   setAvailableParticipants(data.facets.participants.map(p => ({
        //     id: p._id,
        //     name: p.name || p._id,
        //     party: p.party || ''
        //   })));
        // } else if (!municipioFilter) {
        //   setAvailableParticipants([]);
        // }
        
        if (data.facets.parties) {
          setAvailableParty(data.facets.parties.map(p => p._id));
        }
        
        if (data.facets.years) {
          setAvailableYears(data.facets.years.map(y => y._id).sort((a, b) => b - a));
        }
        
        if (data.facets.tipos) {
          setAvailableTipos(data.facets.tipos.map(t => t._id));
        }
        
        if (data.facets.topicos) {
          setAvailableTopicos(data.facets.topicos.map(t => ({
            id: t._id,
            name: t.name || t._id
          })));
        }
      }
      
    } catch (error) {
      console.error("Search error:", error);
      setErrorMessage("Ocorreu um erro ao pesquisar. Por favor tente novamente.");
      setResults([]);
      setFacets({});
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear all filters but preserve the keyword and trigger search immediately
  const handleClearFilters = async () => {
    // Store current keyword for the search after filters are cleared
    const currentKeyword = lastKeyword || keyword;
    
    // Clear all filter states
    setTitle("");
    setUsedTitle("");
    setMunicipioId("");
    setUsedMunicipioId("");
    setParticipanteId([]);  
    setUsedParticipanteId([]);
    setParty("");
    setUsedParty("");
    setTopico([]);  
    setUsedTopico([]);
    setAprovado("");
    setTipo("");
    setUsedTipo("");
    setUsedAprovado("");
    setStartDate("");
    setUsedStartDate("");
    setEndDate("");
    setUsedEndDate("");
    // Clear facet filters
    setYearFilter("");
    setTipoFilter("");
    setUsedYearFilter("");
    setAprovadoFilter("");
    setMunicipioFilter("");
    setParticipanteFilter([]);
    setTopicoFilter([]);
    setPartyFilter("");
    setSortBy("score");
    setUsedSortBy("score");
    setSortOrder("desc");
    setUsedSortOrder("desc");
    setCurrentPage(1);

    // Update URL params to only include keyword and type
    const newParams = new URLSearchParams();
    newParams.set("type", searchType);
    if (currentKeyword && currentKeyword.trim() !== "") {
      newParams.set("q", currentKeyword);
    }
    setSearchParams(newParams);
    
    // Execute search immediately after clearing filters
    try {
      setIsLoading(true);
      setErrorMessage("");
      
      if (searchType === "atas") {
        setHasSearchedAtas(true);
      } else {
        setHasSearchedAssuntos(true);
      }
      
      const params = new URLSearchParams();
      
      if (currentKeyword && currentKeyword.trim() !== "") {
        params.append("q", currentKeyword);
        setUsedKeyword(currentKeyword);
      }
      
      params.append("sort", "score");
      params.append("order", "desc");
      params.append("page", "1");
      params.append("per_page", perPage.toString());
      
      const endpoint = searchType === "atas" 
        ? `${API_URL}/v0/public/atas/search` 
        : `${API_URL}/v0/public/assuntos/search`;
      
      const response = await fetch(`${endpoint}?${params}&demo=${DEMO_MODE}&lang=${i18n.language}`);
      
      if (!response.ok) {
        throw new Error(`Search request failed with status ${response.status}`);
      }
      
      const data = await response.json();

      setResults(data.data || []);
      setFacets(data.facets || {});
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setCurrentPage(1);
      setPerPage(data.pagination?.per_page || 12);
      
      // Update available data from facets
      if (data.facets) {
        // Only set participants if a county is selected
        // if (municipioFilter && data.facets.participants) {
        //   setAvailableParticipants(data.facets.participants.map(p => ({
        //     id: p._id,
        //     name: p.name || p._id,
        //     party: p.party || ''
        //   })));
        // } else if (!municipioFilter) {
        //   setAvailableParticipants([]);
        // }
        
        if (data.facets.parties) {
          setAvailableParty(data.facets.parties.map(p => p._id));
        }
        
        if (data.facets.years) {
          setAvailableYears(data.facets.years.map(y => y._id).sort((a, b) => b - a));
        }
        
        if (data.facets.tipos) {
          setAvailableTipos(data.facets.tipos.map(t => t._id));
        }
        
        if (data.facets.topicos) {
          setAvailableTopicos(data.facets.topicos.map(t => ({
            id: t._id,
            name: t.name || t._id
          })));
        }
      }
      
    } catch (error) {
      console.error("Search error after clearing filters:", error);
      setErrorMessage("Ocorreu um erro ao pesquisar. Por favor tente novamente.");
      setResults([]);
      setFacets({});
      setTotalResults(0);
      setTotalPages(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle page change
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    handleSearch(keyword, page);
    easeInScrollToTarget('#search-results', 500, -80);
  };

  // Handle sort change from SortDropdown
  const handleSortChange = (newSortBy, newSortOrder) => {
    setSortBy(newSortBy);
    setSortOrder(newSortOrder);
    setCurrentPage(1); // Reset to first page when sorting changes
  };

useEffect(() => {
  if (initialLoadComplete && (usedSortBy !== sortBy || usedSortOrder !== sortOrder)) {
    setUsedSortBy(sortBy);
    setUsedSortOrder(sortOrder);
    handleSearch(keyword, 1);
  }
}, [sortBy, sortOrder, initialLoadComplete]);
  
  // Handle removing individual filters - unified approach like CountyPage
  const handleRemoveFilter = (filterType, filterValue = null) => {
    let newYearFilter = yearFilter;
    let newTipoFilter = tipoFilter;
    let newParticipanteFilter = Array.isArray(participanteFilter) ? [...participanteFilter] : participanteFilter ? [participanteFilter] : [];
    let newTopicoFilter = Array.isArray(topicoFilter) ? [...topicoFilter] : topicoFilter ? [topicoFilter] : [];
    let newMunicipioFilter = municipioFilter;
    let newPartyFilter = partyFilter;
    let newAprovadoFilter = aprovadoFilter;
    
    // Also handle legacy filter names for backward compatibility
    switch (filterType) {
      case 'yearFilter':
      case 'year':
        newYearFilter = '';
        break;
      case 'tipoFilter':
      case 'tipo':
        newTipoFilter = '';
        break;
      case 'participanteId':
      case 'participant_id':
        if (filterValue) {
          newParticipanteFilter = newParticipanteFilter.filter(id => id !== filterValue);
        } else {
          newParticipanteFilter = [];
        }
        break;
      case 'party':
      case 'partyFilter':
        newPartyFilter = '';
        break;
      case 'municipioId':
        newMunicipioFilter = '';
        break;
      case 'topico':
        if (filterValue) {
          newTopicoFilter = newTopicoFilter.filter(id => id !== filterValue);
        } else {
          newTopicoFilter = [];
        }
        break;
      case 'aprovado':
        newAprovadoFilter = '';
        break;
      case 'startDate':
      case 'endDate':
      case 'date':
        // For date filters, clear both the year filter and the date ranges
        newYearFilter = '';
        
        // Apply date filter changes immediately
        applyFilters({
          yearFilter: '',
          tipoFilter: newTipoFilter,
          participanteFilter: newParticipanteFilter,
          topicoFilter: newTopicoFilter,
          municipioFilter: newMunicipioFilter,
          partyFilter: newPartyFilter,
          aprovadoFilter: newAprovadoFilter,
          startDate: '',
          endDate: ''
        });
        return; // Return early since we've already applied filters
        break;
      default:
        break;
    }

    // Apply the updated filters using the unified approach
    applyFilters({
      yearFilter: newYearFilter,
      tipoFilter: newTipoFilter,
      participanteFilter: newParticipanteFilter,
      topicoFilter: newTopicoFilter,
      municipioFilter: newMunicipioFilter,
      partyFilter: newPartyFilter,
      aprovadoFilter: newAprovadoFilter
    });
  };

  const handleDownloadCSV = async () => {
    try {
      // Build API parameters using the same logic as fetchAtas
      const apiParams = new URLSearchParams();
      
      if (lastKeyword.trim()) {
        apiParams.append("q", lastKeyword.trim());
      }

      if (municipioFilter) {
        apiParams.append("municipio_id", municipioFilter);
      }
      
      if (yearFilter) {
        apiParams.append("year", yearFilter);
      }
      
      if (tipoFilter) {
        apiParams.append("tipo", tipoFilter);
      }
      
      if (partyFilter) {
        apiParams.append("party", partyFilter);
      }
      
      // Multiple participants
      if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
        participanteFilter.forEach(id => {
          if (id && id.trim()) {
            apiParams.append("participant_id", id.trim());
          }
        });
        apiParams.append("participants_logic", participantsLogic);
      }
      
      // Multiple topics
      if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
        topicoFilter.forEach(id => {
          if (id && id.trim()) {
            apiParams.append("topico", id.trim());
          }
        });
        apiParams.append("topicos_logic", topicsLogic);
      }
      
      // Create and trigger download
      const downloadUrl = `${API_URL}/v0/public/atas/search/export?${apiParams.toString()}`;
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', ''); // Let the server set the filename
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (error) {
      console.error('Error downloading CSV:', error);
      // Could add a toast notification here
    }
  };

  const handleDownloadCSVSubject = async () => {
  try {
    const apiParams = new URLSearchParams();

    if (lastKeyword.trim()) {
      apiParams.append("q", lastKeyword.trim());
    }
    if (municipioFilter) {
      apiParams.append("municipio_id", municipioFilter);
    }
    if (yearFilter) {
      apiParams.append("year", yearFilter);
    }
    if (tipoFilter) {
      apiParams.append("tipo", tipoFilter);
    }
    if (partyFilter) {
      apiParams.append("party", partyFilter);
    }
    if (aprovadoFilter) {
      apiParams.append("aprovado", aprovadoFilter);
    }
    // Multiple participants
    if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
      participanteFilter.forEach(id => {
        if (id && id.trim()) {
          apiParams.append("participant_id", id.trim());
        }
      });
      apiParams.append("participants_logic", participantsLogic);
    }
    // Multiple topics
    if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
      topicoFilter.forEach(id => {
        if (id && id.trim()) {
          apiParams.append("topico", id.trim());
        }
      });
      apiParams.append("topicos_logic", topicsLogic);
    }
    // Date range
    if (startDate) {
      apiParams.append("start_date", startDate);
    }
    if (endDate) {
      apiParams.append("end_date", endDate);
    }

    // Compose download URL
    const downloadUrl = `${API_URL}/v0/public/assuntos/search/export?${apiParams.toString()}`;

    // Create a temporary link element and trigger download
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', '');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  } catch (error) {
    console.error('Error downloading CSV for assuntos:', error);
    // Optionally show a toast notification here
  }
};

  // Facet-related handlers
  const toggleFacet = () => {
    setShowFacet((prev) => {
      localStorage.setItem('searchFacetOpen', !prev ? 'true' : 'false');
      return !prev;
    });
  };

  const handleYearChange = (yearFilter) => {
    applyFilters({ yearFilter: yearFilter });
  };

  // Handler for date range changes from the DateRangeSlider
  const handleDateRangeChange = (newStartDate, newEndDate) => {
  // If both are empty, clear the date filter and apply
  if ((newStartDate === "" && newEndDate === "") || (newStartDate === undefined && newEndDate === undefined)) {
    setStartDate("");
    setEndDate("");
    setUsedStartDate("");
    setUsedEndDate("");
    setYearFilter("");
    setUsedYearFilter("");
    applyFilters({
      yearFilter: "",
      tipoFilter,
      participanteFilter,
      topicoFilter,
      municipioFilter,
      partyFilter,
      aprovadoFilter,
      startDate: "",
      endDate: ""
    });
    return;
  }
  // Only trigger if the date range actually changes and is not both empty
  if ((newStartDate !== startDate || newEndDate !== endDate) && (newStartDate || newEndDate)) {
    setStartDate(newStartDate || "");
    setEndDate(newEndDate || "");
    setUsedStartDate(newStartDate || "");
    setUsedEndDate(newEndDate || "");

    // Clear year filter when using date range
    setYearFilter("");
    setUsedYearFilter("");

    // Apply filters with the new date range
    applyFilters({
      yearFilter: "",
      tipoFilter,
      participanteFilter,
      topicoFilter,
      municipioFilter,
      partyFilter,
      aprovadoFilter,
      startDate: newStartDate,
      endDate: newEndDate
    });
  }
};
  // Unified applyFilters function similar to CountyPage - the ONLY place that updates filters and triggers search
  const applyFilters = (filters) => {
    const { yearFilter: newYearFilter, tipoFilter: newTipoFilter, partyFilter: newPartyFilter,
            participanteFilter: newParticipanteFilter, topicoFilter: newTopicoFilter, 
            municipioFilter: newMunicipioFilter, aprovadoFilter: newAprovadoFilter,
            participantsLogic: newParticipantsLogic, topicsLogic: newTopicsLogic,
            startDate: newStartDate, endDate: newEndDate } = filters;

    // Update filter states
    if (newYearFilter !== undefined) {
      setYearFilter(newYearFilter);
      // Convert year to date range if year is selected
      if (newYearFilter) {
        setStartDate(`${newYearFilter}-01-01`);
        setEndDate(`${parseInt(newYearFilter) + 1}-01-01`);
      } else if (!newStartDate && !newEndDate) {
        // Only clear dates if no specific date range is provided
        setStartDate("");
        setEndDate("");
      }
    }
    
    // Handle date range updates
    if (newStartDate !== undefined) {
      setStartDate(newStartDate || "");
    }
    if (newEndDate !== undefined) {
      setEndDate(newEndDate || "");
    }
    
    if (newTipoFilter !== undefined) {
      setTipoFilter(newTipoFilter);
    }
    
    if (newParticipanteFilter !== undefined) {
      setParticipanteId(newParticipanteFilter);
      setParticipanteFilter(newParticipanteFilter);
    }
    
    if (newTopicoFilter !== undefined) {
      setTopico(newTopicoFilter);
      setTopicoFilter(newTopicoFilter);
    }
    
    if (newMunicipioFilter !== undefined) {
      setMunicipioFilter(newMunicipioFilter);
      setMunicipioId(newMunicipioFilter);
    }
    
    if (newPartyFilter !== undefined) {
      setParty(newPartyFilter);
      setPartyFilter(newPartyFilter);
    }
    
    if (newAprovadoFilter !== undefined) {
      setAprovado(newAprovadoFilter);
      setAprovadoFilter(newAprovadoFilter);
    }
    
    // Update AND/OR logic state if provided
    if (newParticipantsLogic !== undefined) {
      setParticipantsLogic(newParticipantsLogic);
    }
    
    if (newTopicsLogic !== undefined) {
      setTopicsLogic(newTopicsLogic);
    }
    
    // Reset to first page when filters change
    setCurrentPage(1);
    
    // Update URL parameters
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set("type", searchType);
    urlParams.set("page", "1");
    
    if (lastKeyword.trim()) {
      urlParams.set("q", lastKeyword.trim());
    } else {
      urlParams.delete("q");
    }
    
    if (newYearFilter) {
      urlParams.set("year", newYearFilter);
    } else {
      urlParams.delete("year");
    }
    
    if (newTipoFilter) {
      urlParams.set("tipo", newTipoFilter);
    } else {
      urlParams.delete("tipo");
    }

    if (newPartyFilter) {
      urlParams.set("party", newPartyFilter);
    } else {
      urlParams.delete("party");
    }

    if (newMunicipioFilter) {
      urlParams.set("municipio_id", newMunicipioFilter);
    } else {
      urlParams.delete("municipio_id");
    }
    
    // Handle participante filter in URL - support for multiple values
    urlParams.delete("participant_id");
    if (Array.isArray(newParticipanteFilter) && newParticipanteFilter.length > 0) {
      newParticipanteFilter.forEach(id => {
        if (id && id !== "") urlParams.append("participant_id", id);
      });
      // Add participants logic parameter if multiple participants are selected
      const logicToUse = newParticipantsLogic || participantsLogic;
      if (newParticipanteFilter.length > 1) {
        urlParams.set("participants_logic", logicToUse);
      } else {
        urlParams.delete("participants_logic");
      }
    } else if (newParticipanteFilter && newParticipanteFilter !== "") {
      urlParams.append("participant_id", newParticipanteFilter);
      urlParams.delete("participants_logic");
    } else {
      urlParams.delete("participants_logic");
    }

    // Handle topico filter in URL - support for multiple values
    urlParams.delete("topico");
    if (Array.isArray(newTopicoFilter) && newTopicoFilter.length > 0) {
      newTopicoFilter.forEach(id => {
        if (id && id !== "") urlParams.append("topico", id);
      });
      // Add topics logic parameter if multiple topics are selected
      const logicToUse = newTopicsLogic || topicsLogic;
      if (newTopicoFilter.length > 1) {
        urlParams.set("topicos_logic", logicToUse);
      } else {
        urlParams.delete("topicos_logic");
      }
    } else if (newTopicoFilter && newTopicoFilter !== "") {
      urlParams.append("topico", newTopicoFilter);
      urlParams.delete("topicos_logic");
    } else {
      urlParams.delete("topicos_logic");
    }

    if (newAprovadoFilter) {
      urlParams.set("aprovado", newAprovadoFilter);
    } else {
      urlParams.delete("aprovado");
    }
    
    // Handle date range parameters in URL
    if (newStartDate && !newYearFilter) {
      urlParams.set("start_date", newStartDate);
    } else if (newStartDate === "") {
      urlParams.delete("start_date");
    }
    
    if (newEndDate && !newYearFilter) {
      urlParams.set("end_date", newEndDate);
    } else if (newEndDate === "") {
      urlParams.delete("end_date");
    }
    
    setSearchParams(urlParams);
    
    // Create API parameters with the new filter values and call search immediately
    const apiParams = new URLSearchParams();
    
    if (lastKeyword && lastKeyword.trim()) {
      apiParams.append("q", lastKeyword.trim());
    }
    
    // Add the new filter values directly to API params
    if (newYearFilter) {
      const startDate = `${newYearFilter}-01-01`;
      const endDate = `${parseInt(newYearFilter) + 1}-01-01`;
      apiParams.append("start_date", startDate);
      apiParams.append("end_date", endDate);
    } else {
      // Handle direct date range from DateRangeSlider
      if (newStartDate) {
        apiParams.append("start_date", newStartDate);
      }
      if (newEndDate) {
        apiParams.append("end_date", newEndDate);
      }
    }
    
    if (newTipoFilter && searchType === "atas") {
      apiParams.append("tipo", newTipoFilter);
    }
    
    if (newPartyFilter) {
      apiParams.append("party", newPartyFilter);
    }
    
    if (newMunicipioFilter) {
      apiParams.append("municipio_id", newMunicipioFilter);
    }
    
    // Handle participante filter - support for multiple values
    if (Array.isArray(newParticipanteFilter) && newParticipanteFilter.length > 0) {
      newParticipanteFilter.forEach(id => {
        if (id && id !== "") apiParams.append("participant_id", id);
      });
      // Add participants logic parameter if multiple participants are selected
      const logicToUse = newParticipantsLogic || participantsLogic;
      if (newParticipanteFilter.length > 1) {
        apiParams.append("participants_logic", logicToUse);
      }
    } else if (newParticipanteFilter && newParticipanteFilter !== "") {
      apiParams.append("participant_id", newParticipanteFilter);
    }
    
    // Handle topico filter - support for multiple values
    if (Array.isArray(newTopicoFilter) && newTopicoFilter.length > 0) {
      newTopicoFilter.forEach(id => {
        if (id && id !== "") apiParams.append("topico", id);
      });
      // Add topics logic parameter if multiple topics are selected
      const logicToUse = newTopicsLogic || topicsLogic;
      if (newTopicoFilter.length > 1) {
        apiParams.append("topicos_logic", logicToUse);
      }
    } else if (newTopicoFilter && newTopicoFilter !== "") {
      apiParams.append("topico", newTopicoFilter);
    }
    
    if (newAprovadoFilter && searchType === "assuntos") {
      apiParams.append("aprovado", newAprovadoFilter);
    }
    
    apiParams.append("sort", sortBy);
    apiParams.append("order", sortOrder);
    apiParams.append("page", "1");
    apiParams.append("per_page", perPage.toString());
    
    // Call search immediately with the API parameters
    performSearchWithApiParams(apiParams);
  };

  // Add missing handleYearFilterChange for facet compatibility
  const handleYearFilterChange = (e) => {
    let value;
    if (typeof e === 'string' || typeof e === 'number') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    // Apply filters immediately when year changes
    applyFilters({ yearFilter: value });
  };

  const handleTipoFilterChange = (e) => {
    let value;
    if (typeof e === 'string' || typeof e === 'number') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    // Apply filters immediately when tipo changes
    applyFilters({ tipoFilter: value });
  };

  const handleParticipanteFilterChange = (e) => {
    let value;
    if (Array.isArray(e)) {
      value = e;
    } else if (typeof e === 'string') {
      value = [e];
    } else if (e && e.target) {
      value = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
    } else {
      value = [];
    }
    // Apply filters immediately when participante changes
    applyFilters({ participanteFilter: value });
  };

  const handleTopicoFilterChange = (e) => {
    let value;
    if (Array.isArray(e)) {
      value = e;
    } else if (typeof e === 'string' || typeof e === 'number') {
      value = [e];
    } else if (e && e.target) {
      value = Array.isArray(e.target.value) ? e.target.value : [e.target.value];
    } else {
      value = [];
    }
    // Apply filters immediately when topico changes
    applyFilters({ topicoFilter: value });
  };

  const handleMunicipioFilterChange = (e) => {
    let value;
    if (typeof e === 'string' || typeof e === 'number') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    // Apply filters immediately when municipio changes
    applyFilters({ municipioFilter: value });
  };

  const handlePartyFilterChange = (e) => {
    let value;
    if (typeof e === 'string') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    // Apply filters immediately when party changes
    applyFilters({ partyFilter: value });
  };

  const handleAprovadoFilterChange = (e) => {
    let value;
    if (typeof e === 'string') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    // Apply filters immediately when aprovado changes
    applyFilters({ aprovadoFilter: value });
  };

  // Handlers for AND/OR logic changes - match CountyPage
  const handleParticipantsLogicChange = (logic) => {
    setParticipantsLogic(logic);
    // Trigger a new search with the updated logic
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        startDate,
        endDate,
        participanteFilter,
        topicoFilter,
        partyFilter,
        municipioFilter,
        aprovadoFilter,
        participantsLogic: logic,
        topicsLogic
      });
    }
  };

  const handleTopicsLogicChange = (logic) => {
    setTopicsLogic(logic);
    // Trigger a new search with the updated logic
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        startDate,
        endDate,
        participanteFilter,
        topicoFilter,
        partyFilter,
        municipioFilter,
        aprovadoFilter,
        participantsLogic,
        topicsLogic: logic
      });
    }
  };

  // shared filter state
  const filterState = {
    keyword, setKeyword,
    lastKeyword, setLastKeyword,
    title, setTitle,
    municipioId, setMunicipioId,
    participanteId, setParticipanteId,
    party, setParty,
    topico, setTopico,
    tipo, setTipo,
    aprovado, setAprovado,
    startDate, setStartDate,
    endDate, setEndDate,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    showAdvancedFilters, setShowAdvancedFilters
  };

  // Helper functions to get names from IDs
  const getMunicipioName = (id) => {
    const municipio = municipios.find(m => m.id === id);
    return municipio ? municipio.name : id;
  };

  const getParticipanteNames = async (ids) => {
    if (!Array.isArray(ids) || ids.length === 0) return [];
    
    try {
      // Fetch participant details for each ID
      const participantPromises = ids.map(async (id) => {
        try {
          const response = await fetch(`${API_URL}/v0/public/participantes/${id}/info?demo=${DEMO_MODE}&lang=${i18n.language}`);
          if (response.ok) {
            const data = await response.json();
            return data.name || id;
          }
          return id;
        } catch (error) {
          return id; 
        }
      });
      
      const participantNames = await Promise.all(participantPromises);
      return participantNames;
    } catch (error) {
      console.error("Error fetching participant names:", error);
      // Fallback to IDs if there's an error
      return ids.map(id => id);
    }
  };

  const getTopicoNames = (ids) => {
    if (!Array.isArray(ids)) return [];
    return ids.map(id => {
      const topico = topicos.find(t => t.id === id);
      return topico ? topico.name : id;
    });
  };

  const usedFiltersState = {
    keyword: usedKeyword,
    title: usedTitle,
    municipioId: usedMunicipioId,
    municipioName: usedMunicipioId ? getMunicipioName(usedMunicipioId) : undefined,
    participanteId: usedParticipanteId,
    participanteNames: usedParticipanteNames,
    party: usedParty,
    year: usedYearFilter,
    tipo: usedTipo,
    topico: usedTopico,
    topicoNames: getTopicoNames(usedTopico),
    aprovado: usedAprovado,
    startDate: usedStartDate,
    endDate: usedEndDate,
    sortBy: usedSortBy,
    sortOrder: usedSortOrder,
    page: currentPage,
    perPage: perPage,
    // Add facet-specific filter properties for ActiveFilters
    yearFilter: yearFilter,
    tipoFilter: tipoFilter,
    partyFilter: partyFilter,
    municipioFilter: municipioFilter,
    participanteFilter: participanteFilter,
    topicoFilter: topicoFilter,
    aprovadoFilter: aprovadoFilter
  };
  
  // shared search props
  const searchProps = {
    results,
    facets,
    isLoading,
    totalResults,
    errorMessage,
    currentPage,
    totalPages,
    perPage,
    handlePageChange,
    hasFilters: false,
    selectedFilters: filterState,
    municipios,
    topicos,
    showFacet,
    toggleFacet,
    yearFilter,
    tipoFilter,
    municipioFilter,
    participanteFilter,
    topicoFilter,
    partyFilter,
    aprovadoFilter,
    availableYears,
    availableTipos,
    availableMunicipios,
    availableParticipants,
    availableTopicos,
    availableParty,
    participantsLogic,
    topicsLogic,
    // Date range props
    startDate,
    endDate,
    onDateRangeChange: handleDateRangeChange,
    showDateRange: true, 
    handleYearChange,
    handleYearFilterChange,
    handleTipoFilterChange,
    handleParticipanteFilterChange,
    handleTopicoFilterChange,
    handleMunicipioFilterChange,
    handlePartyFilterChange,
    handleAprovadoFilterChange,
    handleParticipantsLogicChange,
    handleTopicsLogicChange,
    handleDownloadCSV,
    handleDownloadCSVSubject,
    applyFilters,
    onRemoveFilter: handleRemoveFilter,
    onClearAllFilters: handleClearFilters,
    usedFiltersState,
  };


  return (
    <div className="min-h-screen bg-stone-50 dark:bg-sky-900">
      {contentReady && (
        <>
          <Navbar />
          
          <div className="bg-sky-800 dark:bg-sky-950 pt-15 pb-8">
            <div className="container mx-auto px-4">
              {/* breadcrumb */}
              <div className="hidden sm:flex items-center mb-7">
                <nav className="flex items-center text-sm font-montserrat bg-sky-700 rounded-md px-4 py-1" aria-label="Breadcrumb">
                  <ol className="flex flex-wrap items-center">
                    <li className="flex items-center">
                      <LangLink
                        to="/"
                        className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                          after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                      >
                        <FiHome />
                      </LangLink>
                    </li>
                    <li className="flex items-center">
                      <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                      <span className="text-white font-medium">
                        {t("search")}
                      </span>
                    </li>
                    {searchType === "atas" ? (
                      <>
                        <li className="flex items-center">
                          <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                          <span className="text-white font-medium">
                            {t("minutes")}
                          </span>
                        </li>
                      </>
                    ) : ( 
                      <>
                        <li className="flex items-center">
                          <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                          <span className="text-white font-medium">
                            {t("subjects")}
                          </span>
                        </li>
                      </>
                    )}
                    {usedKeyword && (
                      <>
                        <li className="flex items-center">
                          <FiChevronRight className="mx-2 text-sky-100 opacity-70 " />
                          <span className="text-white font-medium">
                            "{usedKeyword}"
                          </span>
                        </li>
                      </>
                    )}
                  </ol>
                </nav>
              </div>
              
              {/* shared search header for both Atas and Assuntos */}
              <GenericSearchHeader
                searchType={searchType}
                filterState={filterState}
                usedFiltersState={usedFiltersState}
                handleSearch={handleSearch}
                isLoading={isLoading}
                municipios={municipios}
                topicos={topicos}
                handleClearFilters={handleClearFilters}
                isEmbed={true}
                enableAutoSearch={true}
              />

              <div className="flex justify-center mb-0 font-montserrat">
                <div className="relative inline-flex border-b-2 border-sky-300/30 px-2">
                  <button 
                    className={`px-4 py-1.5 text-sm font-medium transition-all duration-300 relative cursor-pointer
                      ${searchType === "atas" 
                        ? "text-white" 
                        : "text-sky-300/70 hover:text-sky-200"
                      }
                      ${isLoading ? "cursor-not-allowed opacity-50" : ""}`
                    }
                    disabled={isLoading}
                    onClick={() => 
                      toggleSearchType("atas")
                    }
                  >
                    {t("minutes")}
                    {searchType === "atas" && (
                      <motion.div 
                        className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-white rounded-full"
                        layoutId="underline"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                  
                  <button 
                    className={`px-4 py-1.5 text-sm font-medium transition-all duration-300 relative cursor-pointer
                      ${searchType === "assuntos" 
                        ? "text-white" 
                        : "text-sky-300/70 hover:text-sky-200"
                      }
                      ${isLoading ? "cursor-not-allowed opacity-50" : ""}`
                    }
                    disabled={isLoading}
                      // on click it will clear all filters and change the search type
                    onClick={() => 
                      toggleSearchType("assuntos")}
                  >
                    {t("subjects")}
                    {searchType === "assuntos" && (
                      <motion.div 
                        className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-white rounded-full"
                        layoutId="underline"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        
          <AnimatePresence mode="wait">
            <motion.div
              key={searchType}
              initial={{ opacity: 0, x: searchType === "atas" ? -20 : 20 }}
              animate={{ opacity: 1, x: 0}}
              exit={{ opacity: 0, x: searchType === "atas" ? 20 : -20 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {searchType === "atas" ? (
                <SearchMinutes 
                  isEmbedded={true}
                  skipHeader={true}
                  searchProps={{
                    ...searchProps,
                    usedFiltersState,
                    onRemoveFilter: handleRemoveFilter,
                    onClearAllFilters: handleClearFilters,
                    onSortChange: handleSortChange,
                    hasSearched: hasSearchedAtas
                  }}
                />
              ) : (
                <SearchAssuntos 
                  isEmbedded={true}
                  skipHeader={true}
                  searchProps={{
                    ...searchProps,
                    usedFiltersState,
                    onRemoveFilter: handleRemoveFilter,
                    onClearAllFilters: handleClearFilters,
                    onSortChange: handleSortChange,
                    hasSearched: hasSearchedAssuntos
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
          
          <Footer />
        </>
      )}

      {/* Loading state */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default SearchPage;
