import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import { FiUser, FiSidebar, FiChevronDown, FiList, FiFile, FiHome, FiChevronRight, FiFilter, FiX, FiSliders, FiSearch, FiChevronLeft, FiClock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LoadingState from "../../components/common/states/LoadingState";
import ErrorState from "../../components/common/states/ErrorState";
import { useTranslation } from "react-i18next";
import ImageModal from "../../components/common/ImageModal";
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import Facet from "../../components/common/search/Facet";
import { Popover } from 'flowbite-react';


import ParticipanteAtas from "../../components/ParticipantePage/ParticipanteAtas";
import ParticipanteAssuntos from "../../components/ParticipantePage/ParticipanteAssuntos";
import { SkeletonCardGrid } from "../../components/common/skeletons/SkeletonCard";
import LangLink from "../../components/common/LangLink";

export default function ParticipantePage() {
  const { t, i18n } = useTranslation();
  const { participanteId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  const EXIT_ANIMATION_DURATION = 1500; 
  const MINIMUM_LOADING_TIME = 500;
  
  const hasInitialized = useRef(false);
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  const [lastKeyword, setLastKeyword] = useState(searchParams.get("q") || "");
  const [type, setType] = useState(searchParams.get("type") || "atas");
  const [page, setPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [perPage, setPerPage] = useState(parseInt(searchParams.get("per_page")) || 12);
  const [sortBy, setSortBy] = useState(searchParams.get("sort") || "date");
  const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "desc");
  const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");
  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");
  const [tipoFilter, setTipoFilter] = useState(searchParams.get("tipo") || "");
  const [topicoFilter, setTopicoFilter] = useState(searchParams.get("topico") || "");
  const [aprovadoFilter, setAprovadoFilter] = useState(searchParams.get("aprovado") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // State
  const [participante, setParticipante] = useState(null);
  const [participanteError, setParticipanteError] = useState(null);
  const [countyId, setCountyId] = useState(null);
  const [data, setData] = useState([]); // atas or assuntos
  const [facets, setFacets] = useState([]);
  const [availableTopicos, setAvailableTopicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 12, pages: 1 });
  const [showFacet, setShowFacet] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("searchResultsViewMode") || "list");
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // Clear data when switching tabs
  useEffect(() => {
    setData([]);
  }, [type]);

    
// Timeline component for mandatos
 const MandatosTimeline = ({ mandatos }) => {
  if (!mandatos || mandatos.length === 0) return null;

  const sortedMandatos = [...mandatos].sort((a, b) => {
    const startA = a.term_start || 0;
    const startB = b.term_start || 0;
    return startA - startB;
  });

  // Calculate timeline span
  const startYear = Math.min(...sortedMandatos.map(m => m.term_start || new Date().getFullYear()));
  const endYear = Math.max(...sortedMandatos.map(m => m.term_end || new Date().getFullYear()));
  const totalYears = endYear - startYear;

  // Get all unique years that need markers
  const getAllYears = () => {
    const yearSet = new Set();
    sortedMandatos.forEach(mandate => {
      if (mandate.term_start) yearSet.add(mandate.term_start);
      if (mandate.term_end) yearSet.add(mandate.term_end);
    });
    return Array.from(yearSet).sort((a, b) => a - b);
  };

  const uniqueYears = getAllYears();

  // Calculate position for each mandate
  const getMandatePosition = (mandate) => {
    const mandateStart = mandate.term_start || startYear;
    const mandateEnd = mandate.term_end || endYear;
    
    if (totalYears === 0) {
      return { left: 5, width: 90 };
    }
    
    const startPercent = ((mandateStart - startYear) / totalYears) * 90 + 5;
    const endPercent = ((mandateEnd - startYear) / totalYears) * 90 + 5;
    const width = Math.max(endPercent - startPercent, 5);
    return { left: startPercent, width };
  };

  return (
    <div className="w-full md:w-1/3 mt-4 md:mt-0 md:ml-6">
      <div className="flex items-center mb-3">
        <h3 className="text-sm font-medium text-white/90">Mandatos</h3>
      </div>
      
      <div className="relative px-1">
        {/* Year markers */}
        <div className="relative h-5 mb-2">
          {uniqueYears.map((year) => {
            const position = totalYears === 0 ? 50 : ((year - startYear) / totalYears) * 90 + 5;
            return (
              <div
                key={year}
                className="absolute text-xs text-white/60 transform -translate-x-1/2"
                style={{ left: `${position}%` }}
              >
                {year}
              </div>
            );
          })}
        </div>
        
        {/* Timeline base */}
        <div className="relative h-3 bg-white/20 rounded-sm mb-3">
          {/* Year marker lines */}
          {uniqueYears.map((year) => {
            const position = totalYears === 0 ? 50 : ((year - startYear) / totalYears) * 90 + 5;
            return (
              <div
                key={`line-${year}`}
                className="absolute -top-1 w-0.5 h-5 bg-white/60"
                style={{ left: `${position}%` }}
              />
            );
          })}
          
          {/* Mandate segments */}
          {sortedMandatos.map((mandato, index) => {
            const position = getMandatePosition(mandato);
            return (
              <Popover
                key={index}
                trigger="hover"
                placement="top"
                content={
                  <div className="w-64 p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-xs">
                        {mandato.role || "Membro"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-sm text-white font-medium ${getPartyColorClass(mandato.party)}`}>
                        {mandato.party || "Independente"}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-700 mb-2">
                      <div className="flex items-center text-gray-600">
                        <FiClock className="mr-2" size={14} />
                        {mandato.term_start && mandato.term_end ? (
                          <span>{mandato.term_start} - {mandato.term_end}</span>
                        ) : mandato.term_start ? (
                          <span>{mandato.term_start} - Presente</span>
                        ) : (
                          <span>Período não especificado</span>
                        )}
                      </div>
                    </div>
                    
                    {mandato.description && (
                      <div className="text-sm text-gray-600 border-t border-gray-100 pt-2">
                        {mandato.description}
                      </div>
                    )}
                  </div>
                }
              >
                <div
                  className={`absolute top-0.5 h-2 rounded-xs ${getPartyColorClass(mandato.party)} opacity-80 hover:opacity-100 transition-opacity cursor-pointer`}
                  style={{
                    left: `${position.left}%`,
                    width: `${position.width}%`,
                  }}
                />
              </Popover>
            );
          })}
        </div>

        {/* Legend */}
        {/* <div className="flex flex-wrap gap-x-3 gap-y-1">
          {sortedMandatos.map((mandato, index) => (
            <div key={index} className="flex items-center text-xs">
              <div className={`w-2 h-2 rounded-sm mr-1.5 ${getPartyColorClass(mandato.party)}`}></div>
              <span className="text-white/80">{mandato.role || "Membro"}</span>
            </div>
          ))}
        </div> */}
      </div>
    </div>
  );
};

  // Reusable fetch function
  const fetchData = async (isInitialLoad = false) => {
    const startTime = Date.now();
    
    setLoading(true);
    setParticipanteError(null);
    
    if (isInitialLoad) {
      setShowLoadingState(true);
      setLoadingExiting(false);
      setContentReady(false);
    }
    
    try {
      // Fetch participant info
      const resP = await fetch(`${API_URL}/v0/public/participantes/${participanteId}/info?demo=${DEMO_MODE}`);
      const participanteData = await resP.json();
      
      if (!resP.ok) throw new Error(participanteData?.error || "Erro ao carregar participante");
      setCountyId(participanteData.municipio_id || null);
      setParticipante(participanteData);
      
      const trueId = participanteData.id;
      if (!trueId) throw new Error("API response didn't include participant ID");

      // Build params for atas/assuntos
      const params = new URLSearchParams({
        page,
        per_page: perPage,
        sort: sortBy,
        order: sortOrder,
        participant_id: trueId,
        demo: DEMO_MODE,
        lang: i18n.language,
      });
      
      // Add search query if present
      if (searchQuery) params.append("q", searchQuery);
      
      // Handle date filters
      if (yearFilter) {
        // If year filter is active, use it to create date range
        setStartDate("")
        setEndDate("")
        params.append("start_date", `${yearFilter}-01-01`);
        params.append("end_date", `${parseInt(yearFilter) + 1}-01-01`);
      } else if (startDate && endDate) {
        // Otherwise use explicit date range if provided
        setYearFilter("");
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }
      
      // Type-specific filters
      if (type === "atas" && tipoFilter) {
        params.append("tipo", tipoFilter);
      } else if (type === "assuntos" && aprovadoFilter) {
        params.append("aprovado", aprovadoFilter);
      }
      
      // Add topico filter if present
      if (topicoFilter) params.append("topico", topicoFilter);

      // Fetch atas or assuntos
      let url;
      if (type === "atas") {
        url = `${API_URL}/v0/public/atas/search?${params.toString()}`;
      } else {
        url = `${API_URL}/v0/public/assuntos/search?${params.toString()}`;
      }
      
      const resD = await fetch(url);
      const dataJson = await resD.json();
      
      if (!resD.ok) throw new Error(dataJson?.error || "Erro ao carregar dados");
      
      setData(dataJson.data || []);
      console.log("Fetched data:", dataJson.data);
      setFacets(dataJson.facets || []);
      setPagination(dataJson.pagination || { 
        total: 0, 
        page: 1, 
        per_page: perPage, 
        pages: 1 
      });

      if (isInitialLoad) {
        const loadingTime = Date.now() - startTime;
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        setTimeout(() => {
          setContentReady(true);
          setLoadingExiting(true);
          
          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay);
      }
    } catch (err) {
      setParticipanteError(err.message || "Erro ao carregar participante");
      
      if (isInitialLoad) {
        const loadingTime = Date.now() - startTime;
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        
        setTimeout(() => {
          setContentReady(true);
          setLoadingExiting(true);
          
          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch participant info and data (atas/assuntos) on mount or param change
  useEffect(() => {
    const isInitialLoad = !hasInitialized.current;
    if (isInitialLoad) {
      hasInitialized.current = true;
    }
    fetchData(isInitialLoad);
  }, [participanteId, type, page, perPage, sortBy, sortOrder, yearFilter, startDate, endDate, tipoFilter, topicoFilter, aprovadoFilter, searchQuery, API_URL]);

  // Robust clearFilters implementation
  const clearFilters = (fetchImmediately = true, clearQuery = false) => {
    // Clear all filter states
    setYearFilter("");
    setStartDate("");
    setEndDate("");
    setTipoFilter("");
    setTopicoFilter("");
    setAprovadoFilter("");
    
    // Reset to page 1
    setPage(1);
    
    // Clear search query if requested
    if (clearQuery) {
      setSearchQuery("");
      setLastKeyword("");
    }

    // Update URL parameters - preserve only essential navigation params
    const urlParams = new URLSearchParams();
    urlParams.set("type", type);
    urlParams.set("page", "1");
    urlParams.set("sort", sortBy);
    urlParams.set("order", sortOrder);
    
    // Keep search query unless explicitly clearing it
    if (searchQuery) {
      urlParams.set("q", searchQuery);
    }
    
    setSearchParams(urlParams);

    // Only fetch data if explicitly requested
    if (fetchImmediately) {
      fetchData();
    }
  }

  const applyFilters = useCallback((filters) => {
    
    const { 
      yearFilter: newYearFilter, 
      tipoFilter: newTipoFilter, 
      topicoFilter: newTopicoFilter, 
      startDate: newStartDate, 
      endDate: newEndDate, 
      aprovadoFilter: newAprovadoFilter, 
      q: newQ 
    } = filters;

    const params = new URLSearchParams(searchParams);
    
    // Reset page to 1 when applying filters
    setPage(1);
    params.set("page", "1");
    
    // Year filter or date range (mutually exclusive)
    if (newYearFilter) {
      console.log('Setting year filter:', newYearFilter);
      setYearFilter(newYearFilter);
      params.set("year", newYearFilter);
      // Clear date range when using year filter
      setStartDate("");
      setEndDate("");
      params.delete("start_date");
      params.delete("end_date");
    } else if (newStartDate !== undefined || newEndDate !== undefined) {
      console.log('Setting date range:', newStartDate, 'to', newEndDate);
      setYearFilter("");
      params.delete("year");
      setStartDate(newStartDate || "");
      setEndDate(newEndDate || "");
      // Update URL parameters for date range
      if (newStartDate) {
        params.set("start_date", newStartDate);
      } else {
        params.delete("start_date");
      }
      if (newEndDate) {
        params.set("end_date", newEndDate);
      } else {
        params.delete("end_date");
      }
    }
    
    // Tipo filter (for atas only)
    if (type === "atas") {
      if (newTipoFilter !== undefined) {
        setTipoFilter(newTipoFilter || "");
        if (newTipoFilter) {
          params.set("tipo", newTipoFilter);
        } else {
          params.delete("tipo");
        }
      }
    }
    
    // Topico filter
    if (newTopicoFilter !== undefined) {
      setTopicoFilter(newTopicoFilter || "");
      if (newTopicoFilter && newTopicoFilter.length > 0) {
        params.set("topico", newTopicoFilter);
      } else {
        params.delete("topico");
      }
    }
    
    // Aprovado filter (for assuntos only)
    if (type === "assuntos") {
      if (newAprovadoFilter !== undefined) {
        setAprovadoFilter(newAprovadoFilter || "");
        if (newAprovadoFilter) {
          params.set("aprovado", newAprovadoFilter);
        } else {
          params.delete("aprovado");
        }
      }
    }
    
    // Search query
    if (newQ !== undefined) {
      setSearchQuery(newQ || "");
      setLastKeyword(newQ || "");
      if (newQ) {
        params.set("q", newQ);
      } else {
        params.delete("q");
      }
    }
    
    console.log('About to update URL with params:', params.toString());
    setSearchParams(params);
  }, [searchParams, setSearchParams, type]);

const handleDateRangeChange = (newStartDate, newEndDate) => {
  console.log('ParticipantePage handleDateRangeChange called with:', newStartDate, newEndDate);
  
  // If both are empty, clear the date filter and apply
  if ((newStartDate === "" && newEndDate === "") || (newStartDate === undefined && newEndDate === undefined)) {
    console.log('Clearing date filters');
    setStartDate("");
    setEndDate("");
    setYearFilter("");
    applyFilters({
      yearFilter: "",
      startDate: "",
      endDate: "",
      tipoFilter,
      topicoFilter,
      aprovadoFilter
    });
    return;
  }
  // Only trigger if the date range actually changes and is not both empty
  if (  
    (newStartDate !== startDate || newEndDate !== endDate) &&
    (newStartDate || newEndDate)
  ) {
    console.log('Applying new date range filters');
    setStartDate(newStartDate || "");
    setEndDate(newEndDate || "");
    setYearFilter("");
    applyFilters({
      yearFilter: "",
      startDate: newStartDate,
      endDate: newEndDate,
      tipoFilter,
      topicoFilter,
      aprovadoFilter
    });
  } else {
    console.log('Date range not changed or both empty, skipping update');
  }
};

  const handleRemoveFilter = useCallback((filterType, filterValue) => {
    const params = new URLSearchParams(searchParams);
    
    switch (filterType) {
      case 'yearFilter':
        setYearFilter("");
        params.delete("year");
        break;
      case 'tipoFilter':
        setTipoFilter("");
        params.delete("tipo");
        break;
      case 'topico':
        setTopicoFilter("");
        params.delete("topico");
        break;
      case 'aprovadoFilter':
        setAprovadoFilter("");
        params.delete("aprovado");
        break;
      case 'startDate':
        setStartDate("");
        params.delete("start_date");
        break;
      case 'endDate':
        setEndDate("");
        params.delete("end_date");
        break;
      case 'keyword':
      case 'q':
        setSearchQuery("");
        setLastKeyword("");
        params.delete("q");
        break;
      default:
        console.warn(`Unknown filter type: ${filterType}`);
        return; // Early return only for unknown filter types
    }
    
    // Reset to page 1 when removing a filter
    setPage(1);
    params.set("page", "1");
    
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    // Reset all filter states
    setYearFilter("");
    setStartDate("");
    setEndDate("");
    setTipoFilter("");
    setTopicoFilter("");
    setAprovadoFilter("");
    // Don't clear search query - preserve it
    // setSearchQuery("");
    // setLastKeyword("");
    
    // Reset to page 1
    setPage(1);
    
    // Update URL parameters - preserve only essential navigation params
    const params = new URLSearchParams(searchParams);
    params.delete("year");
    params.delete("tipo");
    params.delete("topico");
    params.delete("aprovado");
    // Don't remove search query from URL - preserve it
    // params.delete("q");
    params.delete("start_date");
    params.delete("end_date");
    params.set("page", "1");
    
    setSearchParams(params);
  }, [searchParams, setSearchParams]);

  // Year filter change
  const handleYearFilterChange = useCallback((e) => {
    // Extract the year value whether it's coming from an event or direct value
    let value;
    if (typeof e === 'string' || typeof e === 'number') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }

    // Use applyFilters to ensure consistent state updates
    applyFilters({
      yearFilter: value,
      tipoFilter: type === "atas" ? tipoFilter : undefined,
      topicoFilter,
      aprovadoFilter: type === "assuntos" ? aprovadoFilter : undefined,
      startDate: "",
      endDate: ""
    });
  }, [applyFilters, tipoFilter, topicoFilter, aprovadoFilter, type]);

  // Tipo filter change
  const handleTipoFilterChange = (e) => {
    const selectedTipo = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (selectedTipo) {
      params.set("tipo", selectedTipo);
    } else {
      params.delete("tipo");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  // Aprovado filter change
  const handleAprovadoFilterChange = (e) => {
    const selectedAprovado = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (selectedAprovado) {
      params.set("aprovado", selectedAprovado);
    } else {
      params.delete("aprovado");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  // Sort change handler
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    setPage(1);
    
    // Update URL params
    const params = new URLSearchParams(searchParams);
    params.set("sort", field);
    params.set("order", order);
    params.set("page", "1");
    setSearchParams(params);
  };

  // Search submit
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    
    // Extract search query - either from the local component or from parent state
    let queryToUse = searchQuery;
    
    // If search is coming from a child component with localQuery
    if (e && e.localQuery !== undefined) {
      queryToUse = e.localQuery;
      // Update parent state to match child component
      setSearchQuery(e.localQuery);
    }
    
    const params = new URLSearchParams(searchParams);
    if (queryToUse && queryToUse.trim()) {
      params.set("q", queryToUse.trim());
      setLastKeyword(queryToUse.trim());
    } else {
      params.delete("q");
      setLastKeyword("");
    }
    params.set("page", "1");
    setSearchParams(params);
  };

  // Add handler for CSV download
  const handleDownloadCSV = async () => {
    try {
      // Build API parameters using the same logic as fetchData
      const apiParams = new URLSearchParams({
        participant_id: participante.id
      });
      
      if (lastKeyword.trim()) {
        apiParams.append("q", lastKeyword.trim());
      }
      
      if (yearFilter) {
        apiParams.append("year", yearFilter);
      }
      
      if (tipoFilter) {
        apiParams.append("tipo", tipoFilter);
      }
      
      if (topicoFilter) {
        apiParams.append("topico", topicoFilter);
      }
      
      if (aprovadoFilter) {
        apiParams.append("aprovado", aprovadoFilter);
      }
      
      if (startDate) {
        apiParams.append("start_date", startDate);
      }
      
      if (endDate) {
        apiParams.append("end_date", endDate);
      }
      
      // Create and trigger download
      const endpoint = type === "atas" 
        ? `${API_URL}/v0/public/atas/search/export` 
        : `${API_URL}/v0/public/assuntos/search/export`;
      
      const downloadUrl = `${endpoint}?${apiParams.toString()}`;
      
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

  // Pagination
  const handlePageChange = (newPage) => {
    // Update local state first
    setPage(parseInt(newPage));
    
    // Then update URL parameters
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    setSearchParams(params);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    setData([]);
    setLoading(true);
    // Reset pagination when tab changes
    setPage(1);
  }, [type]);

  useEffect(() => {
      const fetchTopicos = async () => {
        if (!countyId) return;
        
        try {
          const response = await fetch(`${API_URL}/v0/public/municipios/${countyId}/topicos?demo=${DEMO_MODE}`);
          if (!response.ok) {
            throw new Error("Failed to fetch topics");
          }
          
          const data = await response.json();
          setAvailableTopicos(data.topicos || []);
        } catch (error) {
          console.error("Error fetching topics:", error);
        }
      };
      
      fetchTopicos();
    }, [countyId, API_URL]);

  // Tab switch
  const handleTabChange = (tab) => {
    // Only update if the tab is different from current type
    if (tab !== type) {
      // Update local state immediately
      setType(tab);
      
      // Reset pagination to page 1 when switching tabs
      setPage(1);
      
      // Update URL parameters
      const params = new URLSearchParams(searchParams);
      params.set("type", tab);
      params.set("page", "1");
      
      // Clear any type-specific filters when switching tabs
      if (tab === "atas") {
        // Clear assuntos-specific filters
        setAprovadoFilter("");
        params.delete("aprovado");
      } else if (tab === "assuntos") {
        // Clear atas-specific filters
        setTipoFilter("");
        params.delete("tipo");
      }
      
      setSearchParams(params);
    }
  };

  const getPaginationItems = (currentPage, totalPages) => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    
    const items = [1];
    if (currentPage > 3) items.push('...');
    
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    
    for (let i = start; i <= end; i++) {
      items.push(i);
    }
    
    if (currentPage < totalPages - 2) items.push('...');
    items.push(totalPages);
    
    return items;
  };

  // Facet toggle
  const toggleFacet = () => {
    setShowFacet((prev) => {
      localStorage.setItem('countyFacetOpen', !prev ? 'true' : 'false');
      return !prev;
    });
  };
  
  // Render
 if (participanteError) {
    return <ErrorState title={t("participante.error")} message={participanteError} />;
  }

  return (
    <div className="min-h-screen font-montserrat">
      {contentReady && (
        <>
          <div className="bg-sky-800">
            <Navbar />
        {participante && (
          <div className="pb-3 pt-15">
            <div className="container mx-auto px-4">
              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center mb-3">
                <nav className="flex items-center text-sm font-montserrat bg-sky-700 rounded-md px-4 py-1" aria-label="Breadcrumb">
                  <ol className="flex flex-wrap items-center">
                    <li className="flex items-center">
                      <LangLink to="/" className="font-montserrat flex items-center space-x-2 text-white"><FiHome /></LangLink>
                    </li>
                    <li className="flex items-center">
                      <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                      <LangLink to={`/municipios/${participante.municipio_slug}`} className="font-montserrat flex items-center space-x-2 text-white">
                        {participante.municipio_name || t("participants")}
                      </LangLink>
                    </li>
                    <li className="flex items-center">
                      <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                      <span className="text-white font-medium">{participante.name}</span>
                    </li>
                  </ol>
                </nav>
              </div>
              
              {/* Participant info card */}
              <div className="overflow-hidden">
                <div className="pt-4 pb-1">
                  <div className="flex flex-col md:flex-row md:justify-between">
                    {/* Photo and name section */}
                    <div className="flex items-start w-full mb-4 md:mb-0 md:w-1/2">
                      {participante.profile_photo ? (
                        <div className="relative group mr-4">
                          <img 
                            src={`${API_URL}/${participante.profile_photo}`} 
                            alt={participante.name} 
                            className="w-24 h-24 rounded-md object-cover cursor-pointer shadow-sm" 
                            loading="lazy"
                            onClick={() => { 
                              setSelectedImage(`${API_URL}/${participante.profile_photo}`); 
                              setImageModalOpen(true); 
                            }} 
                          />
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-md bg-gray-200 flex items-center justify-center mr-4">
                          <FiUser size={32} className="text-gray-400" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-lg md:text-xl font-semibold text-white mb-1">{participante.name}</h1>
                        <div className="flex items-center mb-2">
                          <span className={`text-white font-regular text-xs px-2 py-0.5 rounded-md mr-2 ${getPartyColorClass(participante.party)}`}>
                            {participante.party || "Sem partido"}
                          </span>
                          <span className="text-gray-200 font-regular text-sm">
                            {participante.role || "Membro"} do {participante.municipio_name}
                          </span>
                        </div>
                        <div className="flex space-x-3">
                          <div className="flex items-center text-sm text-gray-200">
                            <FiFile className="mr-1" />
                            <span>{participante.total_atas || 0} atas</span>
                          </div>
                          <div className="flex items-center text-sm text-gray-200">
                            <FiList className="mr-1" />
                            <span>{participante.total_assuntos || 0} assuntos</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mandatos timeline section */}
                    {participante.mandatos && participante.mandatos.length > 0 && (
                      <MandatosTimeline mandatos={participante.mandatos} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-50">
        <div className="container mx-auto px-4 pt-4 mt-1 flex-1">
          {/* Results & Facet per type */}
          {!loading && (

          <div className="flex flex-row">
            {type === "atas" && (
              <>
                <Facet
                  isGridLoading={loading}
                  isShown={showFacet}
                  toggleFacet={toggleFacet}
                  facets={facets}
                  yearFilter={yearFilter}
                  tipoFilter={tipoFilter}
                  topicoFilter={topicoFilter}
                  startDate={startDate}
                  endDate={endDate}
                  availableYears={[2024, 2023, 2022, 2021]}
                  availableTopicos={availableTopicos}
                  availableTipos={["ordinaria", "extraordinaria"]}
                  handleYearFilterChange={handleYearFilterChange}
                  handleTipoFilterChange={handleTipoFilterChange}
                  onDateRangeChange={handleDateRangeChange}
                  clearFilters={clearFilters}
                  applyFilters={applyFilters}
                  searchQuery={searchQuery}
                  handleSearchQueryChange={(e) => setSearchQuery(e.target.value)}
                  handleSearchSubmit={handleSearch}
                  showTipoFilter={true}
                  showParticipanteFilter={false}
                  showDateRange={true}
                />
                <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>
                  <ParticipanteAtas
                    loading={loading}
                    data={data}
                    facets={facets}
                    pagination={pagination}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    showFacet={showFacet}
                    toggleFacet={toggleFacet}
                    yearFilter={yearFilter}
                    tipoFilter={tipoFilter}
                    topicoFilter={topicoFilter}
                    startDate={startDate}
                    endDate={endDate}
                    searchQuery={searchQuery}
                    lastKeyword={lastKeyword}
                    clearFilters={clearFilters}
                    applyFilters={applyFilters}
                    handleYearFilterChange={handleYearFilterChange}
                    handleTipoFilterChange={handleTipoFilterChange}
                    handleDateRangeChange={handleDateRangeChange}
                    handleRemoveFilter={handleRemoveFilter}
                    handleClearAllFilters={handleClearAllFilters}
                    handlePageChange={handlePageChange}
                    getPaginationItems={getPaginationItems}
                    handleSearch={handleSearch}
                    handleSearchQueryChange={(e) => setSearchQuery(e.target.value)}
                    handleDownloadCSV={handleDownloadCSV}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    handleSortChange={handleSortChange}
                    hideActiveFilters={false}
                    type={type}
                    handleTabChange={handleTabChange}
                  />
                </div>
              </>
            )}
            {type === "assuntos" && (
              <>
                <Facet
                  isGridLoading={loading}
                  isShown={showFacet}
                  toggleFacet={toggleFacet}
                  facets={facets}
                  yearFilter={yearFilter}
                  startDate={startDate}
                  endDate={endDate}
                  aprovadoFilter={aprovadoFilter}
                  topicoFilter={topicoFilter}
                  availableYears={[2024, 2023, 2022, 2021]}
                  availableTopicos={availableTopicos}
                  handleYearFilterChange={handleYearFilterChange}
                  handleAprovadoFilterChange={handleAprovadoFilterChange}
                  onDateRangeChange={handleDateRangeChange}
                  clearFilters={clearFilters}
                  applyFilters={applyFilters}
                  searchQuery={searchQuery}
                  handleSearchQueryChange={(e) => setSearchQuery(e.target.value)}
                  handleSearchSubmit={handleSearch}
                  showTipoFilter={false}
                  showParticipanteFilter={false}
                  showPartyFilter={true}
                  showAprovadoFilter={true}
                  showDateRange={true}
                />
                <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>
                  <ParticipanteAssuntos
                    loading={loading}
                    data={data}
                    facets={facets}
                    pagination={pagination}
                    viewMode={viewMode}
                    setViewMode={setViewMode}
                    showFacet={showFacet}
                    toggleFacet={toggleFacet}
                    yearFilter={yearFilter}
                    topicoFilter={topicoFilter}
                    aprovadoFilter={aprovadoFilter}
                    startDate={startDate}
                    endDate={endDate}
                    searchQuery={searchQuery}
                    lastKeyword={lastKeyword}
                    clearFilters={clearFilters}
                    applyFilters={applyFilters}
                    handleYearFilterChange={handleYearFilterChange}
                    handleAprovadoFilterChange={handleAprovadoFilterChange}
                    handleDateRangeChange={handleDateRangeChange}
                    handleRemoveFilter={handleRemoveFilter}
                    handleClearAllFilters={handleClearAllFilters}
                    handlePageChange={handlePageChange}
                    getPaginationItems={getPaginationItems}
                    handleSearch={handleSearch}
                    handleDownloadCSV={handleDownloadCSVSubject}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    handleSortChange={handleSortChange}
                    API_URL={API_URL}
                    hideActiveFilters={false}
                    type={type}
                    handleTabChange={handleTabChange}
                    participanteId={participanteId}
                  />
                </div>
              </>
            )}
          </div>
          )}
          {loading && (
            <div className="py-6">
              <SkeletonCardGrid count={12} viewMode={viewMode} />
            </div>
          )}
        </div>
      </div>
      <Footer />
      {/* Image Modal */}
      <ImageModal src={selectedImage} alt={participante?.name || "Participant image"} isOpen={imageModalOpen} onClose={() => setImageModalOpen(false)} />
        </>
      )}

      {/* Loading animation */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
}