/*
- 
*/

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom"; 
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion"; 
import { format, set } from "date-fns";
import { el, pt } from "date-fns/locale"; 
import { FiClock, FiGrid, FiLayout, FiCalendar, FiList, FiChevronLeft, FiChevronRight, FiSearch, FiFilter, FiSliders, FiX, FiChevronDown, FiSidebar, FiFileText, FiArrowDown, FiArrowUp, FiDownload } from "react-icons/fi"; // Added icons
import { easeInScrollTo } from "../../utils/scroll"; 

import ViewSwitcher from "../../components/SearchPage/ViewSwitcher";
import ActiveFilters from "../../components/common/search/ActiveFilters";
import Facet from "../../components/common/search/Facet";

import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import CountyHeader from "../../components/PublicCountyPage/CountyHeader";
import CountyParticipants from "../../components/PublicCountyPage/CountyParticipants";
import CountyTopics from "../../components/PublicCountyPage/CountyTopics";
import CountyRecentMinutes from "../../components/PublicCountyPage/CountyRecentMinutes";
import CountyLoadingState from "../../components/common/states/LoadingState";
import CountyErrorState from "../../components/PublicCountyPage/CountyErrorState";
import ErrorState from "../../components/common/states/ErrorState";
import NavigationTimeline from "../../components/Timeline/NavigationTimeline";
import GenericLoadingSpinner from "../../components/common/GenericLoadingSpinner";
import GenericResultCard from "../../components/SearchPage/GenericResultCard";
import Pagination from "../../components/common/Pagination"; 
import { SkeletonCardGrid } from "../../components/common/skeletons/SkeletonCard";
import SortDropdown from "../../components/SearchPage/SortDropdown";

// Debug utility
const isDebugMode = import.meta.env.VITE_DEBUG === 'true';
const debugLog = (message, data = null) => {
  if (isDebugMode) {
    if (data) {
      console.log(`[MunicipioPage DEBUG] ${message}:`, data);
    } else {
      console.log(`[MunicipioPage DEBUG] ${message}`);
    }
  }
};

const MunicipioPage = () => {
  const hasInitialized = useRef(false);

  const { countyId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  const EXIT_ANIMATION_DURATION = 1500;
  const MINIMUM_LOADING_TIME = 500;
  
  const [county, setCounty] = useState(null);
  const [atas, setAtas] = useState([]);
  const [facets, setFacets] = useState([]);
  const [isGridLoading, setisGridLoading] = useState(false); 
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  const [error, setError] = useState(null);
  const [gridError, setGridError] = useState(null); 

  const [gridParams, setGridParams] = useState({
    page: parseInt(searchParams.get("page")) || 1,
    sort: searchParams.get("sort") || "date",
    order: searchParams.get("order") || "desc",
    search: searchParams.get("q") || "",
    yearFilter: searchParams.get("year") || "",
    tipoFilter: searchParams.get("tipo") || "",
    partyFilter: searchParams.get("party") || "",
    ata: searchParams.get("ata") || ""
  });

    const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalResults, setTotalResults] = useState(0);
    const [perPage, setPerPage] = useState(12);
    
    const [sortBy, setSortBy] = useState(searchParams.get("sort") || "date");
    const [sortOrder, setSortOrder] = useState(searchParams.get("order") || "desc");

  const [viewType, setViewType] = useState(searchParams.get("view") || "geral");
  const [previousViewType, setPreviousViewType] = useState(null);
  
  const [showFacet, setShowFacet] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('countyFacetOpen');
      return stored === null ? true : stored === 'true';
    }
    return true;
  });

  const [yearFilter, setYearFilter] = useState(searchParams.get("year") || "");
  const [tipoFilter, setTipoFilter] = useState(searchParams.get("tipo") || "");
  const [participanteFilter, setParticipanteFilter] = useState(() => {
    const params = searchParams.getAll("participant_id");
    return params.length > 0 ? params : "";
  });
  const [topicoFilter, setTopicoFilter] = useState(() => {
    const params = searchParams.getAll("topico");
    return params.length > 0 ? params : "";
  });
  const [availableYears, setAvailableYears] = useState([]);
  const [availableTipos, setAvailableTipos] = useState(["ordinaria", "extraordinaria"]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [availableTopicos, setAvailableTopicos] = useState([]);
  
  const [partyFilter, setPartyFilter] = useState(searchParams.get("party") || "");
  const [availableParty, setAvailableParty] = useState([]);
  
  const [startDate, setStartDate] = useState(searchParams.get("start_date") || "");
  const [endDate, setEndDate] = useState(searchParams.get("end_date") || "");

  // AND/OR Logic state for facets
  const [participantsLogic, setParticipantsLogic] = useState(searchParams.get("participants_logic") || "or");
  const [topicsLogic, setTopicsLogic] = useState(searchParams.get("topicos_logic") || "or");

  const [timelineAtas, setTimelineAtas] = useState([]);
  const [timelineYears, setTimelineYears] = useState([]);
  const [isTimelineLoading, setIsTimelineLoading] = useState(true);
  const [timelineError, setTimelineError] = useState(null);

  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [lastKeyword, setLastKeyword] = useState(searchParams.get("q") || "");
  
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("searchResultsViewMode") || "list";
  });

  const toggleViewType = (type) => {
    if (type !== viewType) {
      setPreviousViewType(viewType);
      
      setYearFilter("");
      setTipoFilter("");
      setStartDate("");
      setEndDate("");
      setParticipanteFilter([]);
      setTopicoFilter([]);
      setPartyFilter("");
      setCurrentPage(1);
      setSearchQuery("");
      setLastKeyword("");
      
      setGridParams({
        page: "",
        sort: "",
        order: "",
        search: "",
        yearFilter: "",
        startDate: "",
        endDate: "",
        tipoFilter: "",
        ata: "",
        partyFilter: ""
      });
      
      const newParams = new URLSearchParams();
      newParams.set("view", type);
      setSearchParams(newParams);
      
      setViewType(type);
      if (type === 'timeline' && timelineAtas.length === 0 && !timelineError) {
        fetchTimelineOverviewData(countyId);
      }
    }
  };

  // allows switchign to the grid view with a specific filter applied
  // useful for topics
  const switchToGridWithFilter = (filterType, filterValue) => {
    setPreviousViewType(viewType);
    setViewType('grid');

    if (filterType !== 'year') setYearFilter("");
    if (filterType !== 'tipo') setTipoFilter("");
    if (filterType !== 'participant_id') setParticipanteFilter([]);
    if (filterType !== 'topico') setTopicoFilter([]);
    if (filterType !== 'party') setPartyFilter("");
    
    if (filterType === 'year') {
      setYearFilter(filterValue);
    } else if (filterType === 'tipo') {
      setTipoFilter(filterValue);
    } else if (filterType === 'participant_id') {
      setParticipanteFilter([filterValue]);
    } else if (filterType === 'topico') {
      setTopicoFilter([filterValue]);
    } else if (filterType === 'party') {
      setPartyFilter(filterValue);
    }

    setCurrentPage(1);
    setGridParams(prev => ({
      ...prev,
      page: 1,
      sort: "date",
      order: "desc",
      search: "",
      yearFilter: filterType === 'year' ? filterValue : "",
      tipoFilter: filterType === 'tipo' ? filterValue : "",
      partyFilter: filterType === 'party' ? filterValue : "",
      startDate: "",
      endDate: "",
    }));

    const newParams = new URLSearchParams();
    newParams.set("view", 'grid');
    newParams.set("page", "1");
    newParams.set("sort", "date");
    newParams.set("order", "desc");
    
    if (filterType === 'year') {
      newParams.set("year", filterValue);
    } else if (filterType === 'tipo') {
      newParams.set("tipo", filterValue);
    } else if (filterType === 'participant_id') {
      newParams.append("participant_id", filterValue);
    } else if (filterType === 'topico') {
      newParams.append("topico", filterValue);
    } else if (filterType === 'party') {
      newParams.set("party", filterValue);
    }
    
    setSearchParams(newParams);
    easeInScrollTo(1, 500);
  };

  const switchToGridWithFilters = (filters = {}) => {
  setPreviousViewType(viewType);
  setViewType("grid");

  // reset all filters first
  setYearFilter("");
  setTipoFilter("");
  setParticipanteFilter([]);
  setTopicoFilter([]);
  setPartyFilter("");

  // then apply from provided filters
  if (filters.year) setYearFilter(filters.year);
  if (filters.tipo) setTipoFilter(filters.tipo);
  if (filters.participant_id) setParticipanteFilter(
    Array.isArray(filters.participant_id) ? filters.participant_id : [filters.participant_id]
  );
  if (filters.topico) setTopicoFilter(
    Array.isArray(filters.topico) ? filters.topico : [filters.topico]
  );
  if (filters.party) setPartyFilter(filters.party);

  setCurrentPage(1);
  setGridParams(prev => ({
    ...prev,
    page: 1,
    sort: "date",
    order: "desc",
    search: "",
    yearFilter: filters.year || "",
    tipoFilter: filters.tipo || "",
    partyFilter: filters.party || "",
    startDate: "",
    endDate: "",
  }));

  // URL params
  const newParams = new URLSearchParams();
  newParams.set("view", "grid");
  newParams.set("page", "1");
  newParams.set("sort", "date");
  newParams.set("order", "desc");

  if (filters.year) newParams.set("year", filters.year);
  if (filters.tipo) newParams.set("tipo", filters.tipo);

  if (filters.participant_id) {
    (Array.isArray(filters.participant_id) ? filters.participant_id : [filters.participant_id])
      .forEach(id => newParams.append("participant_id", id));
  }

  if (filters.topico) {
    (Array.isArray(filters.topico) ? filters.topico : [filters.topico])
      .forEach(topic => newParams.append("topico", topic));
  }

  if (filters.party) newParams.set("party", filters.party);

  setSearchParams(newParams);
  easeInScrollTo(1, 500);
};

  // Fetch and process timeline data
  const fetchTimelineOverviewData = useCallback(async (municipioId) => {
    if (!municipioId) return;
    
    setIsTimelineLoading(true);
    setTimelineError(null);

    try {
      const response = await fetch(
        `${API_URL}/v0/public/municipios/${municipioId}/atas/timeline?demo=${DEMO_MODE}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch timeline data");
      }
      
      const data = await response.json();
      const fetchedAtas = data.atas || [];
      const fetchedMetadata = data.metadata || {};
      
      if (fetchedAtas.length === 0) {
        setTimelineAtas([]);
        setTimelineYears([]);
        setIsTimelineLoading(false);
        return; 
      }

      const byYear = {};
      const yearsList = [];
      
      const processedAtas = fetchedAtas
        .map(ata => {
          const date = new Date(ata.date);
          const year = date.getFullYear();
          return {
            ...ata,
            municipio: fetchedMetadata.municipio.name,
            date: date,
            year: year,
            formattedDate: format(date, "d/MM/yyyy HH:mm", { locale: pt }),
            formattedMonth: format(date, "MMM", { locale: pt }),
            formattedDay: format(date, "d", { locale: pt })
          };
        })
        .sort((a, b) => a.date - b.date); 
      
      processedAtas.forEach(ata => {
        if (!byYear[ata.year]) {
          byYear[ata.year] = [];
          yearsList.push(ata.year);
        }
        byYear[ata.year].push(ata);
      });
      
      yearsList.sort((a, b) => a - b);
      
      setTimelineAtas(processedAtas);
      setTimelineYears(yearsList);
      
    } catch (err) {
      setTimelineError(err.message);
      setTimelineAtas([]);
      setTimelineYears([]);
    } finally {
      setIsTimelineLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
  
    const fetchCounty = async () => {
      const startTime = Date.now();
      
      try {
        setShowLoadingState(true);
        setLoadingExiting(false);
        setContentReady(false);
 
        if (!searchParams.has("view")) {
          const newParams = new URLSearchParams(searchParams);
          newParams.set("view", viewType);
          setSearchParams(newParams);
        }
        
        const response = await fetch(`${API_URL}/v0/public/municipios/${countyId}?demo=${DEMO_MODE}`);
        if (!response.ok) {
          throw new Error("County not found");
        }
        const data = await response.json();
        setCounty(data);
        
        if (viewType === 'timeline' && timelineAtas.length === 0) {
          await fetchTimelineOverviewData(countyId);
        }
        
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
        console.error("Error fetching county:", error);
        setError(error.message);
        
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
    };

    fetchCounty();
    
    if (viewType === 'grid') {
      fetchAtas(currentPage);
    }
  }, [countyId, API_URL]);

  useEffect(() => {
  if (viewType === 'grid') {
    const shouldUpdate = 
      currentPage !== gridParams.page ||
      sortBy !== gridParams.sort ||
      sortOrder !== gridParams.order ||
      searchQuery !== gridParams.search ||
      yearFilter !== gridParams.yearFilter ||
      tipoFilter !== gridParams.tipoFilter ||
      partyFilter !== gridParams.partyFilter;
      
    if (shouldUpdate) {
      setGridParams({
        page: currentPage,
        sort: sortBy,
        order: sortOrder, 
        search: searchQuery,
        yearFilter: yearFilter,
        tipoFilter: tipoFilter,
        partyFilter: partyFilter,
      });
    }
  }
}, [currentPage, sortBy, sortOrder, searchQuery, yearFilter, tipoFilter, viewType, partyFilter]);
  
  useEffect(() => {
    if (viewType === 'grid' && !isGridLoading && county) {
      if (previousViewType && previousViewType !== 'grid') {
        setCurrentPage(1);
        if (county) {
          fetchAtas(1);
        }
      } else {
        if (county) {
          fetchAtas(gridParams.page);
        }
      }
    }
  }, [viewType, previousViewType, county]);
  

  useEffect(() => {
    const viewFromUrl = searchParams.get("view");
    if (viewFromUrl && viewFromUrl !== viewType) {
      setPreviousViewType(viewType);
      setViewType(viewFromUrl);
      
      if (viewFromUrl === 'grid') {
        setCurrentPage(1);

        setGridParams({
          page: 1,
          sort: "",
          order: "",
          search: "",
          yearFilter: "",
          tipoFilter: "",
          partyFilter: "",
          startDate: "",
          endDate: ""
        });
      }
      
      setYearFilter("");
      setStartDate("");
      setEndDate("");
      setTipoFilter("");
      setPartyFilter("");
      setParticipanteFilter([]);
      setTopicoFilter([]);
      setSearchQuery("");
      setLastKeyword("");
    }
  }, [searchParams]);

  useEffect(() => {
    if (viewType === 'timeline' && timelineAtas.length === 0 && !timelineError && !isTimelineLoading && county) {
      fetchTimelineOverviewData(countyId);
    }
  }, [viewType, county, countyId, timelineAtas.length, timelineError, isTimelineLoading, fetchTimelineOverviewData]);

  useEffect(() => {
    const viewFromUrl = searchParams.get("view");
    const justSwitchedView = viewType && viewFromUrl && viewType !== previousViewType;
    
    if (justSwitchedView) {
      return;
    }

    let filtersChanged = false;
    const searchFromUrl = searchParams.get("q");
    if (searchFromUrl !== searchQuery) {
      setSearchQuery(searchFromUrl || "");
      setLastKeyword(searchFromUrl || "");
      filtersChanged = true;
    }
    const yearFromUrl = searchParams.get("year");
    if (yearFromUrl !== yearFilter) {
      setYearFilter(yearFromUrl || "");
    }
    const tipoFromUrl = searchParams.get("tipo");
    if (tipoFromUrl !== tipoFilter) {
      setTipoFilter(tipoFromUrl || "");
    }
    const partyFromUrl = searchParams.get("party");
    if (partyFromUrl !== partyFilter) {
      setPartyFilter(partyFromUrl || "");
    }
    const participanteFromUrl = searchParams.getAll("participant_id");
    const currentParticipanteFilter = Array.isArray(participanteFilter) ? participanteFilter : [participanteFilter].filter(Boolean);
    if (JSON.stringify(participanteFromUrl.sort()) !== JSON.stringify(currentParticipanteFilter.sort())) {
      setParticipanteFilter(participanteFromUrl.length > 0 ? participanteFromUrl : []);
    }
    const topicoFromUrl = searchParams.getAll("topico");
    const currentTopicoFilter = Array.isArray(topicoFilter) ? topicoFilter : [topicoFilter].filter(Boolean);
    if (JSON.stringify(topicoFromUrl.sort()) !== JSON.stringify(currentTopicoFilter.sort())) {
      setTopicoFilter(topicoFromUrl.length > 0 ? topicoFromUrl : []);
    }
    const pageFromUrl = parseInt(searchParams.get("page"));
    if (pageFromUrl && !isNaN(pageFromUrl) && currentPage !== pageFromUrl) {
      setCurrentPage(pageFromUrl);
      filtersChanged = true;
    }
    
    const sortFromUrl = searchParams.get("sort") || "date";
    const orderFromUrl = searchParams.get("order") || "desc";
    if (sortFromUrl !== sortBy || orderFromUrl !== sortOrder) {
      setSortBy(sortFromUrl);
      setSortOrder(orderFromUrl);
      filtersChanged = true;
    }

    const startDateFromUrl = searchParams.get("start_date");
    if (startDateFromUrl && startDateFromUrl !== startDate) {
      setStartDate(startDateFromUrl);
      filtersChanged = true;
    }
    const endDateFromUrl = searchParams.get("end_date");
    if (endDateFromUrl && endDateFromUrl !== endDate) {
      setEndDate(endDateFromUrl);
      filtersChanged = true;
    }
    
    // Update gridParams to match URL parameters
    if (viewType === 'grid') {
      setGridParams({
        page: pageFromUrl || currentPage,
        sort: sortFromUrl,
        order: orderFromUrl,
        search: searchFromUrl || "",
        yearFilter: yearFromUrl || "",
        tipoFilter: tipoFromUrl || "",
        party: partyFromUrl || "",
        startDate: startDateFromUrl || "",
        endDate: endDateFromUrl || "",
      });
    }

    // only fetch if the filters did change or it's initial load
    const isInitialLoad = !atas.length;
    if ((filtersChanged || isInitialLoad) && viewType === 'grid' && county) {
      console.log("CALLING SEARCH ENDPOINT LINE 592");
      fetchAtas(pageFromUrl || currentPage);
    }
  }, [searchParams, viewType, previousViewType]);

  // refactor this !!!
  const fetchAtas = async (page = 1) => {
    try {
      setisGridLoading(true);
      setGridError(null);

      if (viewType === 'grid') {
        setGridParams(prevParams => ({
          ...prevParams,
          page: page
        }));
      }
      
      // Build API parameters
      const apiParams = new URLSearchParams();
      apiParams.append("municipio_id", countyId);
      apiParams.append("sort", sortBy);
      apiParams.append("order", sortOrder);
      apiParams.append("page", page.toString());
      apiParams.append("per_page", perPage.toString());
      
      if (lastKeyword.trim()) {
        apiParams.append("q", lastKeyword.trim());
      }
      
      // Add year filter if selected
      if (yearFilter) {
        const startDate = `${yearFilter}-01-01`;
        const endDate = `${parseInt(yearFilter) + 1}-01-01`;
        apiParams.append("start_date", startDate);
        apiParams.append("end_date", endDate);
      }
      
      // tipo - ordinária or extraordinaria
      if (tipoFilter) {
        apiParams.append("tipo", tipoFilter);
      }
      
      // party filter
      if (partyFilter) {
        apiParams.append("party", partyFilter);
      }
      
      // multiple participants
      if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
        participanteFilter.forEach(id => {
          if (id && id !== "") apiParams.append("participant_id", id);
        });
        // Add participants logic parameter if multiple participants are selected
        if (participanteFilter.length > 1) {
          apiParams.append("participants_logic", participantsLogic);
        }
      } else if (participanteFilter && participanteFilter !== "") {
        apiParams.append("participant_id", participanteFilter);
      }
      
      // multiple topics
      if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
        topicoFilter.forEach(id => {
          if (id && id !== "") apiParams.append("topico", id);
        });
        // Add topics logic parameter if multiple topics are selected
        if (topicoFilter.length > 1) {
          apiParams.append("topicos_logic", topicsLogic);
        }
      } else if (topicoFilter && topicoFilter !== "") {
        apiParams.append("topico", topicoFilter);
      }
      
      // updating the parameters
      const urlParams = new URLSearchParams(searchParams);
      urlParams.set("view", viewType);
      urlParams.set("page", page.toString());
      urlParams.set("sort", sortBy);
      urlParams.set("order", sortOrder);
      
      if (lastKeyword.trim()) {
        urlParams.set("q", lastKeyword.trim());
      } else {
        urlParams.delete("q");
      }
      
      if (yearFilter) {
        urlParams.set("year", yearFilter);
      } else {
        urlParams.delete("year");
      }
      
      if (tipoFilter) {
        urlParams.set("tipo", tipoFilter);
      } else {
        urlParams.delete("tipo");
      }
      
      if (partyFilter) {
        urlParams.set("party", partyFilter);
      } else {
        urlParams.delete("party");
      }
      
      // deleting participants
      urlParams.delete("participant_id");
      if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
        participanteFilter.forEach(id => {
          if (id && id !== "") urlParams.append("participant_id", id);
        });
        if (participanteFilter.length > 1) {
          urlParams.set("participants_logic", participantsLogic);
        } else {
          urlParams.delete("participants_logic");
        }
      } else if (participanteFilter && participanteFilter !== "") {
        urlParams.append("participant_id", participanteFilter);
        urlParams.delete("participants_logic");
      } else {
        urlParams.delete("participants_logic");
      }
      
      // delete topics
      urlParams.delete("topico");
      if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
        topicoFilter.forEach(id => {
          if (id && id !== "") urlParams.append("topico", id);
        });
        // Add topics logic parameter to URL if multiple topics are selected
        if (topicoFilter.length > 1) {
          urlParams.set("topicos_logic", topicsLogic);
        } else {
          urlParams.delete("topicos_logic");
        }
      } else if (topicoFilter && topicoFilter !== "") {
        urlParams.append("topico", topicoFilter);
        urlParams.delete("topicos_logic");
      } else {
        urlParams.delete("topicos_logic");
      }
      
      setSearchParams(urlParams);
      
      // fetch the endpoint
      const response = await fetch(`${API_URL}/v0/public/atas/search?${apiParams}&demo=${DEMO_MODE}`);
      if (!response.ok) {
        throw new Error("Failed to fetch atas");
      }
      
      const data = await response.json();
  
      setAtas(data.data || []);
      setFacets(data.facets || []);
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setPerPage(data.pagination?.per_page || 12);
      setAvailableYears([2024, 2023, 2022, 2021]); // hardcoded, because why calculating it everytime, unnecessary
    } catch (err) {
      console.error("Error fetching atas grid data:", err);
      setGridError(err.message);
      setAtas([]);
      setFacets([]);
    } finally {
      setisGridLoading(false);
    }
  };
  
  // function to fetch the Atas with explicit parameters
  const fetchAtasWithParams = async (apiParams) => {
    debugLog('fetchAtasWithParams called', Object.fromEntries(apiParams));
    
    try {
      setisGridLoading(true);
      setGridError(null);
      debugLog('Starting data fetch, isGridLoading set to true');
      
      // Extract values from apiParams to update gridParams
      if (viewType === 'grid') {
        const page = apiParams.get("page") ? parseInt(apiParams.get("page")) : 1;
        const sort = apiParams.get("sort") || "date";
        const order = apiParams.get("order") || "desc";
        const search = apiParams.get("q") || "";

        debugLog("Extracted API params", { sort, order, page, search });
        
        // Extract year from start_date if it exists
        let yearFilter = "";
        const startDate = apiParams.get("start_date");
        if (startDate) {
          const yearMatch = startDate.match(/^(\d{4})/);
          if (yearMatch) {
            yearFilter = yearMatch[1];
          }
        }
        
        const tipoFilter = apiParams.get("tipo") || "";
        const partyFilter = apiParams.get("party") || "";
        
        // Update gridParams to match API params
        const newGridParams = {
          page,
          sort,
          order,
          search,
          yearFilter,
          tipoFilter,
          partyFilter
        };
        debugLog('Updating gridParams in fetchAtasWithParams', newGridParams);
        setGridParams(newGridParams);
      }
      
      const apiUrl = `${API_URL}/v0/public/atas/search?${apiParams}&demo=${DEMO_MODE}`;
      debugLog('Making API request to:', apiUrl);
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch atas");
      }
      
      const data = await response.json();
      debugLog('API response received', {
        resultsCount: data.data?.length || 0,
        totalResults: data.pagination?.total || 0,
        totalPages: data.pagination?.pages || 0
      });
      
      setAtas(data.data || []);
      setFacets(data.facets || []);
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setPerPage(data.pagination?.per_page || 12);
      setAvailableYears([2024, 2023, 2022, 2021]); // Example years, replace with actual data
      
      debugLog('Data fetch completed successfully');
    } catch (err) {
      console.error("Error fetching atas grid data:", err);
      debugLog('Error in fetchAtasWithParams', err.message);
      setGridError(err.message);
      setAtas([]);
      setFacets([]);
    } finally {
      setisGridLoading(false);
      debugLog('fetchAtasWithParams completed, isGridLoading set to false');
    }
  };

  // Handle selecting an ata in the timeline
  const handleSelectAta = (ataId) => {
    // Implementation for timeline ata selection
  };
  
  // Add handler for CSV download
  const handleDownloadCSV = async () => {
    try {
      // Build API parameters using the same logic as fetchAtas
      const apiParams = new URLSearchParams();
      apiParams.append("municipio_id", countyId);
      
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
  
  // Add handler for sorting changes
  const handleSortChange = (field, order) => {
    debugLog('handleSortChange called', { field, order, currentSort: sortBy, currentOrder: sortOrder });
    
    setSortBy(field);
    setSortOrder(order);
    setCurrentPage(1);
    
    // Apply filters with new sort parameters to trigger data fetch
    applyFilters({
      yearFilter,
      startDate,
      endDate,
      tipoFilter,
      participanteFilter,
      topicoFilter,
      partyFilter,
      participantsLogic,
      topicsLogic,
      sortBy: field,
      sortOrder: order
    });
    
    debugLog('handleSortChange completed', { newField: field, newOrder: order });
  };
  
  // Handler for year filter change
  const handleYearFilterChange = (e) => {
    let value;
    if (typeof e === 'string' || typeof e === 'number') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    setYearFilter(value);
  };
  
  // Handler for tipo (file type) filter change
  const handleTipoFilterChange = (e) => {
    let value;
    if (typeof e === 'string' || typeof e === 'number') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    setTipoFilter(value);
  };
  
  // Handler for participante (participant) filter change (multi-select)
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
    setParticipanteFilter(value);
  };
  
  // Handler for topico (topic) filter change (multi-select)
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
    setTopicoFilter(value);
  };
  
  // Handler for party filter change
  const handlePartyFilterChange = (e) => {
    let value;
    if (typeof e === 'string') {
      value = e;
    } else if (e && e.target) {
      value = e.target.value;
    } else {
      value = '';
    }
    setPartyFilter(value);
  };
  
  // Handler for date range changes
const handleDateRangeChange = (newStartDate, newEndDate) => {
  // If both are empty, clear the date filter and apply
  if ((newStartDate === "" && newEndDate === "") || (newStartDate === undefined && newEndDate === undefined)) {
    setStartDate("");
    setEndDate("");
    setYearFilter("");
    applyFilters({
      yearFilter: "",
      startDate: "",
      endDate: "",
      tipoFilter,
      participanteFilter,
      topicoFilter,
      partyFilter
    });
    return;
  }
  // Only trigger if the date range actually changes and is not both empty
  if (  
    (newStartDate !== startDate || newEndDate !== endDate) &&
    (newStartDate || newEndDate)
  ) {
    setStartDate(newStartDate || "");
    setEndDate(newEndDate || "");
    setYearFilter("");
    applyFilters({
      yearFilter: "",
      startDate: newStartDate,
      endDate: newEndDate,
      tipoFilter,
      participanteFilter,
      topicoFilter,
      partyFilter
    });
  }
};
  // Handlers for AND/OR logic changes
  const handleParticipantsLogicChange = (logic) => {
    setParticipantsLogic(logic);
    // Trigger a new search with the updated logic
    if (applyFilters) {
      applyFilters({
        yearFilter,
        startDate,
        endDate,
        tipoFilter,
        participanteFilter,
        topicoFilter,
        partyFilter,
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
        startDate,
        endDate,
        tipoFilter,
        participanteFilter,
        topicoFilter,
        partyFilter,
        participantsLogic,
        topicsLogic: logic
      });
    }
  };
  
  // Toggle filter panel visibility
  const toggleFacet = () => {
    setShowFacet((prev) => {
      localStorage.setItem('countyFacetOpen', !prev ? 'true' : 'false');
      return !prev;
    });
  };

  // Improved page change handler with better scrolling
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    
    // Update state
    setCurrentPage(page);
    
    // Create API parameters explicitly
    const apiParams = new URLSearchParams();
    apiParams.append("municipio_id", countyId);
    apiParams.append("sort", sortBy);
    apiParams.append("order", sortOrder);
    apiParams.append("page", page.toString());
    apiParams.append("per_page", perPage.toString());
    
    // Add search query only if non-empty
    if (lastKeyword.trim()) {
      apiParams.append("q", lastKeyword.trim());
    }
    
    // Add year filter if selected
    if (yearFilter) {
      const startDate = `${yearFilter}-01-01`;
      const endDate = `${parseInt(yearFilter) + 1}-01-01`;
      apiParams.append("start_date", startDate);
      apiParams.append("end_date", endDate);
    }

    if (startDate) apiParams.append("start_date", startDate);
    if (endDate)  apiParams.append("end_date", endDate);
    if (tipoFilter) apiParams.append("tipo", tipoFilter);

    if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
      participanteFilter.forEach(id => {
        if (id && id !== "") apiParams.append("participant_id", id);
      });
    } else if (participanteFilter && participanteFilter !== "") {
      apiParams.append("participant_id", participanteFilter);
    }
    
    // Add topico filter if selected - support for multiple values
    if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
      topicoFilter.forEach(id => {
        if (id && id !== "") apiParams.append("topico", id);
      });
    } else if (topicoFilter && topicoFilter !== "") {
      apiParams.append("topico", topicoFilter);
    }
    
    // Add party filter if selected
    if (partyFilter && partyFilter.trim()) {
      apiParams.append("party", partyFilter.trim());
    }
    
    // Update URL parameters
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set("view", viewType);
    urlParams.set("page", page.toString());
    urlParams.set("sort", sortBy);
    urlParams.set("order", sortOrder);
    
    if (lastKeyword.trim()) {
      urlParams.set("q", lastKeyword.trim());
    } else {
      // Explicitly remove the q parameter if search is empty
      urlParams.delete("q");
    }
    
    if (yearFilter) urlParams.set("year", yearFilter);
    if (startDate) urlParams.set("start_date", startDate);
    if (endDate) urlParams.set("end_date", endDate);
    if (tipoFilter) urlParams.set("tipo", tipoFilter);

    
    // Handle participante filter in URL - support for multiple values
    urlParams.delete("participant_id");
    if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
      participanteFilter.forEach(id => {
        if (id && id !== "") urlParams.append("participant_id", id);
      });
    } else if (participanteFilter && participanteFilter !== "") {
      urlParams.append("participant_id", participanteFilter);
    }
    // If empty, do not append at all

    // Handle topico filter in URL - support for multiple values
    urlParams.delete("topico");
    if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
      topicoFilter.forEach(id => {
        if (id && id !== "") urlParams.append("topico", id);
      });
    } else if (topicoFilter && topicoFilter !== "") {
      urlParams.append("topico", topicoFilter);
    }
    // If empty, do not append at all
    
    // Handle party filter in URL
    if (partyFilter && partyFilter.trim()) {
      urlParams.set("party", partyFilter.trim());
    } else {
      urlParams.delete("party");
    }
    
    setSearchParams(urlParams);
    
    // Call function with explicit parameters
    fetchAtasWithParams(apiParams);
    
    // Improved scroll behavior - use setTimeout to ensure it happens after state updates
    setTimeout(() => {
        easeInScrollTo(1);
    }, 300); // Small delay to ensure state updates have been processed
  };
  
  // Handler for clearing all filters
  const clearFilters = (fetchImmediately = true, clearQuery = false) => {
    // Clear state filters
    if (clearQuery) {
      setSearchQuery("");
      setLastKeyword("");
    }
    setYearFilter("");
    setStartDate("");
    setEndDate("");
    setTipoFilter("");
    setParticipanteFilter([]);
    setTopicoFilter([]);
    setPartyFilter("");
    setCurrentPage(1);
    
    // Reset grid params when clearing filters
    if (viewType === 'grid') {
      setGridParams(prev => ({
        ...prev,
        page: 1,
        search: clearQuery ? "" : prev.search,
        yearFilter: "",
        tipoFilter: ""
      }));
    }
    
    // Update URL parameters - remove all filters
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set("view", viewType);
    urlParams.set("page", "1");
    urlParams.set("sort", sortBy);
    urlParams.set("order", sortOrder);
    
    if (lastKeyword.trim() && !clearQuery) {
      urlParams.set("q", lastKeyword.trim());
    } else {
      urlParams.delete("q");
    }
    
    // Remove filter parameters
    urlParams.delete("year");
    urlParams.delete("start_date");
    urlParams.delete("end_date");
    urlParams.delete("tipo"); 
    urlParams.delete("participant_id");
    urlParams.delete("topico");
    urlParams.delete("party");
    urlParams.delete("participants_logic");
    urlParams.delete("topicos_logic");
    
    setSearchParams(urlParams);
    
    // Only fetch data if explicitly requested (e.g., from clear button in drawer)
    if (fetchImmediately) {
      // Create API parameters without any filters
      const apiParams = new URLSearchParams();
      apiParams.append("municipio_id", countyId);
      apiParams.append("sort", sortBy);
      apiParams.append("order", sortOrder);
      apiParams.append("page", "1");
      apiParams.append("per_page", perPage.toString());
      
      if (lastKeyword.trim() && !clearQuery) {
        apiParams.append("q", lastKeyword.trim());
      }
      
      // Call function with explicit parameters
      fetchAtasWithParams(apiParams);
    }
  };
  
  // Add function to get pagination items
  const getPaginationItems = () => {
    const items = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      // Always show first, last, and pages around current
      items.push(1);
      
      if (currentPage > 3) {
        items.push('...');
      }
      
      // Pages around current
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = startPage; i <= endPage; i++) {
        items.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        items.push('...');
      }
      
      items.push(totalPages);
    }
    
    return items;
  };

  // Add handler for search submission
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    
    const trimmedSearchQuery = searchQuery.trim();
    
    // Update lastKeyword to track what was actually searched
    setLastKeyword(trimmedSearchQuery);

    let currentSortBy = sortBy;
    let currentSortOrder = sortOrder;
  
     if (!trimmedSearchQuery && sortBy === "score") {
      currentSortBy = "date";
      currentSortOrder = "desc";
      setSortBy("date");
      setSortOrder("desc");
    }
    
    if (viewType === 'grid') {
      setGridParams(prev => ({
        ...prev,
        page: 1,
        search: trimmedSearchQuery,
        sort: currentSortBy,
        order: currentSortOrder
      }));
    }
    
    // Create API parameters explicitly
    const apiParams = new URLSearchParams();
    apiParams.append("municipio_id", countyId);
    apiParams.append("sort", currentSortBy);
    apiParams.append("order", currentSortOrder);
    apiParams.append("page", "1");
    apiParams.append("per_page", perPage.toString());
    
    // Add search query only if non-empty
    if (trimmedSearchQuery) {
      apiParams.append("q", trimmedSearchQuery);
    }
    
    // Add year filter if selected
    if (yearFilter) {
      const startDate = `${yearFilter}-01-01`;
      const endDate = `${parseInt(yearFilter) + 1}-01-01`;
      apiParams.append("start_date", startDate);
      apiParams.append("end_date", endDate);
    }
    if (startDate) apiParams.append("start_date", startDate);
    if (endDate) apiParams.append("end_date", endDate);
    if (tipoFilter) apiParams.append("tipo", tipoFilter);
    
    // Add participante filter if selected - support for multiple values
    if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
      participanteFilter.forEach(id => {
        if (id && id !== "") apiParams.append("participant_id", id);
      });
    } else if (participanteFilter && participanteFilter !== "") {
      apiParams.append("participant_id", participanteFilter);
    }
    
    // Add topico filter if selected - support for multiple values
    if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
      topicoFilter.forEach(id => {
        if (id && id !== "") apiParams.append("topico", id);
      });
    } else if (topicoFilter && topicoFilter !== "") {
      apiParams.append("topico", topicoFilter);
    }
    
    // Add party filter if selected
    if (partyFilter && partyFilter.trim()) {
      apiParams.append("party", partyFilter.trim());
    }
    
    // Update URL parameters
    const urlParams = new URLSearchParams(searchParams);
    urlParams.set("view", viewType);
    urlParams.set("page", "1");
    urlParams.set("sort", currentSortBy);
    urlParams.set("order", currentSortOrder);
    
    if (trimmedSearchQuery) {
      urlParams.set("q", trimmedSearchQuery);
    } else {
      // Explicitly remove the q parameter if search is empty
      urlParams.delete("q");
    }
    
    if (yearFilter) {
      urlParams.set("year", yearFilter);
    }

    if (startDate) {
      urlParams.set("start_date", startDate);
    }
    if (endDate) {
      urlParams.set("end_date", endDate);
    }
    
    if (tipoFilter) {
      urlParams.set("tipo", tipoFilter);
    }
    
    // Handle participante filter in URL - support for multiple values
    urlParams.delete("participant_id");
    if (Array.isArray(participanteFilter) && participanteFilter.length > 0) {
      participanteFilter.forEach(id => {
        if (id && id !== "") urlParams.append("participant_id", id);
      });
    } else if (participanteFilter && participanteFilter !== "") {
      urlParams.append("participant_id", participanteFilter);
    }
    // If empty, do not append at all

    // Handle topico filter in URL - support for multiple values
    urlParams.delete("topico");
    if (Array.isArray(topicoFilter) && topicoFilter.length > 0) {
      topicoFilter.forEach(id => {
        if (id && id !== "") urlParams.append("topico", id);
      });
    } else if (topicoFilter && topicoFilter !== "") {
      urlParams.append("topico", topicoFilter);
    }
    // If empty, do not append at all
    
    // Handle party filter in URL
    if (partyFilter && partyFilter.trim()) {
      urlParams.set("party", partyFilter.trim());
    } else {
      urlParams.delete("party");
    }
    
    setSearchParams(urlParams);
    
    // Call function with explicit parameters
    fetchAtasWithParams(apiParams);
  };

  // Extract participants when county data loads
  useEffect(() => {
    if (county && county.all_participants) {
      const participants = county.all_participants.map(participant => ({
        id: participant.id,
        name: participant.name,
        party: participant.party,
        profile_photo: participant.profile_photo || null
      }));
      setAvailableParticipants(participants);
      
      // Extract unique parties
      const parties = [...new Set(county.all_participants
        .map(p => p.party)
        .filter(party => party && party.trim() !== '')
      )].sort();
      setAvailableParty(parties);
    }
  }, [county]);
  
  // Fetch available topics for the county
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

  // Handle removing individual filters
  const handleRemoveFilter = (filterType, filterValue) => {
    let newYearFilter = yearFilter;
    let newStartDate = startDate;
    let newEndDate = endDate;
    let newTipoFilter = tipoFilter;
    let newParticipanteFilter = Array.isArray(participanteFilter) ? [...participanteFilter] : participanteFilter ? [participanteFilter] : [];
    let newTopicoFilter = Array.isArray(topicoFilter) ? [...topicoFilter] : topicoFilter ? [topicoFilter] : [];
    let newSearchQuery = searchQuery;
    let newPartyFilter = partyFilter;

    switch (filterType) {
      case 'yearFilter':
        newYearFilter = '';
        break;
      case 'startDate':
        newStartDate = '';
        break;
      case 'endDate':
        newEndDate = '';
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
        newPartyFilter = '';
        setPartyFilter('');
        break;
      case 'keyword':
      case 'q':
        newSearchQuery = '';
        setSearchQuery('');
        setLastKeyword('');
        break;
      case 'topico':
        if (filterValue) {
          newTopicoFilter = newTopicoFilter.filter(id => id !== filterValue);
        } else {
          newTopicoFilter = [];
        }
        break;
      default:
        break;
    }

    // Apply the updated filters
    applyFilters({
      yearFilter: newYearFilter,
      startDate: newStartDate,
      endDate: newEndDate,
      tipoFilter: newTipoFilter,
      participanteFilter: newParticipanteFilter,
      topicoFilter: newTopicoFilter,
      partyFilter: newPartyFilter
    });
  };

  // Handle clearing all filters
  const handleClearAllFilters = () => {
    setYearFilter('');
    setStartDate('');
    setEndDate('');
    setTipoFilter('');
    setParticipanteFilter([]);
    setTopicoFilter([]);
    setSearchQuery('');
    setPartyFilter('');
    // setLastKeyword('');

    // Apply the updated filters (all empty)
    applyFilters({
      yearFilter: '',
      startDate: '',
      endDate: '',
      tipoFilter: '',
      participanteFilter: [],
      topicoFilter: [],
      partyFilter: '',
    });
  };

  // Helper function to normalize filter values with defaults
  const normalizeFilters = (filters) => {
    const normalized = {
      yearFilter: filters.yearFilter || "",
      startDate: filters.startDate || "",
      endDate: filters.endDate || "",
      tipoFilter: filters.tipoFilter || "",
      participanteFilter: Array.isArray(filters.participanteFilter) ? filters.participanteFilter : [],
      topicoFilter: Array.isArray(filters.topicoFilter) ? filters.topicoFilter : [],
      partyFilter: filters.partyFilter || "",
      participantsLogic: filters.participantsLogic || participantsLogic,
      topicsLogic: filters.topicsLogic || topicsLogic,
      sortBy: filters.sortBy || sortBy,
      sortOrder: filters.sortOrder || sortOrder
    };

    // Handle date logic: yearFilter takes priority over date range
    if (normalized.yearFilter) {
      normalized.startDate = "";
      normalized.endDate = "";
    } else if (normalized.startDate || normalized.endDate) {
      normalized.yearFilter = "";
    }

    return normalized;
  };

  // Helper function to build API parameters
  const buildApiParams = (normalizedFilters) => {
    const apiParams = new URLSearchParams();
    
    // Basic parameters
    apiParams.append("municipio_id", countyId);
    apiParams.append("sort", normalizedFilters.sortBy);
    apiParams.append("order", normalizedFilters.sortOrder);
    apiParams.append("page", "1");
    apiParams.append("per_page", perPage.toString());
    
    // Search query
    if (searchQuery.trim()) {
      apiParams.append("q", searchQuery.trim());
    }
    
    // Date filters - yearFilter takes priority
    if (normalizedFilters.yearFilter) {
      apiParams.append("start_date", `${normalizedFilters.yearFilter}-01-01`);
      apiParams.append("end_date", `${parseInt(normalizedFilters.yearFilter) + 1}-01-01`);
    } else {
      if (normalizedFilters.startDate) apiParams.append("start_date", normalizedFilters.startDate);
      if (normalizedFilters.endDate) apiParams.append("end_date", normalizedFilters.endDate);
    }
    
    // Simple filters
    if (normalizedFilters.tipoFilter) apiParams.append("tipo", normalizedFilters.tipoFilter);
    if (normalizedFilters.partyFilter) apiParams.append("party", normalizedFilters.partyFilter);
    
    // Multi-value filters with logic
    if (normalizedFilters.participanteFilter.length > 0) {
      normalizedFilters.participanteFilter.forEach(id => {
        if (id && id !== "") apiParams.append("participant_id", id);
      });
      if (normalizedFilters.participanteFilter.length > 1) {
        apiParams.append("participants_logic", normalizedFilters.participantsLogic);
      }
    }
    
    if (normalizedFilters.topicoFilter.length > 0) {
      normalizedFilters.topicoFilter.forEach(id => {
        if (id && id !== "") apiParams.append("topico", id);
      });
      if (normalizedFilters.topicoFilter.length > 1) {
        apiParams.append("topicos_logic", normalizedFilters.topicsLogic);
      }
    }
    
    return apiParams;
  };

  // Helper function to build URL parameters
  const buildUrlParams = (normalizedFilters) => {
    const urlParams = new URLSearchParams(searchParams);
    
    // Basic parameters
    urlParams.set("view", viewType);
    urlParams.set("page", "1");
    urlParams.set("sort", normalizedFilters.sortBy);
    urlParams.set("order", normalizedFilters.sortOrder);
    
    // Search query
    if (searchQuery.trim()) {
      urlParams.set("q", searchQuery.trim());
    } else {
      urlParams.delete("q");
    }
    
    // Date filters - yearFilter takes priority
    if (normalizedFilters.yearFilter) {
      urlParams.set("year", normalizedFilters.yearFilter);
      urlParams.delete("start_date");
      urlParams.delete("end_date");
    } else {
      urlParams.delete("year");
      if (normalizedFilters.startDate) {
        urlParams.set("start_date", normalizedFilters.startDate);
      } else {
        urlParams.delete("start_date");
      }
      if (normalizedFilters.endDate) {
        urlParams.set("end_date", normalizedFilters.endDate);
      } else {
        urlParams.delete("end_date");
      }
    }
    
    // Simple filters
    if (normalizedFilters.tipoFilter) {
      urlParams.set("tipo", normalizedFilters.tipoFilter);
    } else {
      urlParams.delete("tipo");
    }
    
    if (normalizedFilters.partyFilter) {
      urlParams.set("party", normalizedFilters.partyFilter);
    } else {
      urlParams.delete("party");
    }
    
    // Multi-value filters
    urlParams.delete("participant_id");
    if (normalizedFilters.participanteFilter.length > 0) {
      normalizedFilters.participanteFilter.forEach(id => {
        if (id && id !== "") urlParams.append("participant_id", id);
      });
      if (normalizedFilters.participanteFilter.length > 1) {
        urlParams.set("participants_logic", normalizedFilters.participantsLogic);
      } else {
        urlParams.delete("participants_logic");
      }
    } else {
      urlParams.delete("participants_logic");
    }
    
    urlParams.delete("topico");
    if (normalizedFilters.topicoFilter.length > 0) {
      normalizedFilters.topicoFilter.forEach(id => {
        if (id && id !== "") urlParams.append("topico", id);
      });
      if (normalizedFilters.topicoFilter.length > 1) {
        urlParams.set("topicos_logic", normalizedFilters.topicsLogic);
      } else {
        urlParams.delete("topicos_logic");
      }
    } else {
      urlParams.delete("topicos_logic");
    }
    
    return urlParams;
  };

  // Main applyFilters function - now much cleaner and focused
  const applyFilters = (filters) => {
    debugLog('applyFilters called', { inputFilters: filters, viewType });
    
    // 1. Normalize and validate input
    const normalizedFilters = normalizeFilters(filters);
    debugLog('Filters normalized', normalizedFilters);
    
    // 2. Update component state
    setYearFilter(normalizedFilters.yearFilter);
    setStartDate(normalizedFilters.startDate);
    setEndDate(normalizedFilters.endDate);
    setTipoFilter(normalizedFilters.tipoFilter);
    setParticipanteFilter(normalizedFilters.participanteFilter);
    setTopicoFilter(normalizedFilters.topicoFilter);
    setPartyFilter(normalizedFilters.partyFilter);
    setParticipantsLogic(normalizedFilters.participantsLogic);
    setTopicsLogic(normalizedFilters.topicsLogic);
    setSortBy(normalizedFilters.sortBy);
    setSortOrder(normalizedFilters.sortOrder);
    setCurrentPage(1);
    
    debugLog('Component state updated');
    
    // 3. Update grid params if in grid view
    if (viewType === 'grid') {
      const newGridParams = {
        page: 1,
        sort: normalizedFilters.sortBy,
        order: normalizedFilters.sortOrder,
        search: searchQuery,
        yearFilter: normalizedFilters.yearFilter,
        tipoFilter: normalizedFilters.tipoFilter,
        partyFilter: normalizedFilters.partyFilter
      };
      debugLog('Updating grid params', newGridParams);
      setGridParams(newGridParams);
    }
    
    // 4. Build parameters and update URL
    const urlParams = buildUrlParams(normalizedFilters);
    debugLog('URL params built', Object.fromEntries(urlParams));
    setSearchParams(urlParams);
    
    // 5. Fetch data with new filters
    const apiParams = buildApiParams(normalizedFilters);
    debugLog('API params built', Object.fromEntries(apiParams));
    debugLog('Calling fetchAtasWithParams');
    fetchAtasWithParams(apiParams);
  };

  // Set page title dynamically (no Helmet)
  useEffect(() => {
    if (county && county.name) {
      let pageTitle = `${county.name} | CitiLink`;
      if (viewType === 'timeline') {
        pageTitle = `${t("timeline")} - ${county.name} | CitiLink`;
      } else if (viewType === 'grid') {
        pageTitle = `${t("minutes")} - ${county.name} | CitiLink`;
      } else if (viewType === 'geral') {
        pageTitle = `${t("general_view")} - ${county.name} | CitiLink`;
      }
      document.title = pageTitle;
    } else {
      document.title = 'CitiLink';
    }
  }, [county, viewType]);

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-sky-900">
      {/* Show content when it's ready and there's no error */}
      {contentReady && !error && (
        <>
          <Navbar />
          <CountyHeader county={county} viewType={viewType} toggleViewType={toggleViewType} />
          
       {/* view toggle */}
        <div className="container mx-auto px-4 pt-3 font-montserrat">
          <div className="flex justify-between items-center border-b-2 border-gray-200 dark:border-sky-700">
            
            {/* general view - visão geral */}
            <div className="flex items-center">
              <button
                className={`capitalize flex items-center px-4 py-1.5 cursor-pointer text-xs md:text-sm font-medium transition-all duration-300 relative
                  ${viewType === 'geral'
                    ? 'text-sky-700 font-semibold dark:text-sky-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-sky-600 dark:hover:text-sky-500'
                  }`}
                onClick={() => toggleViewType('geral')}
              >
                <FiLayout className="mr-1.5" /> <span className="">{t("general_view")}</span>
                {viewType === 'geral' && (
                  <motion.div
                    className="absolute bottom-[-3px] left-0 right-0 h-[3px] bg-sky-600 dark:bg-sky-100"
                    layoutId="viewModeUnderline"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
              </button>
            </div>

            <div className="flex items-center">
              <div className="flex items-start">
                {/* label - ata */}
                <span className="text-xs font-medium text-sky-950 dark:text-sky-500 tracking-wide mr-3 pl-2">{t("minutes")}:</span>
              </div>
              <div className="flex items-center bg-gray-200 dark:bg-sky-950 rounded-t-md">
                {/* grid */}
                <button
                  className={`capitalize flex items-center cursor-pointer px-3 py-1.5 text-xs md:text-sm font-medium transition-all duration-300 relative
                    ${viewType === 'grid'
                      ? 'text-sky-700 font-semibold dark:text-sky-100'
                      : 'text-gray-500 hover:text-gray-700 dark:text-sky-600 dark:hover:text-sky-500'
                    }`}
                  onClick={() => toggleViewType('grid')}
                >
                  <FiGrid className="mr-1.5" /> {t("list_view")}
                  {viewType === 'grid' && (
                    <motion.div
                      className="absolute bottom-[-3px] left-0 right-0 h-[3px] bg-sky-700 dark:bg-sky-100"
                      layoutId="viewModeUnderline"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
                
                {/* timeline */}
                <button
                  className={`capitalize flex items-center cursor-pointer px-3 py-1.5 text-xs md:text-sm font-medium transition-all duration-300 relative
                    ${viewType === 'timeline'
                      ? 'text-sky-700 font-semibold dark:text-sky-100'
                    : 'text-gray-500 hover:text-gray-700 dark:text-sky-600 dark:hover:text-sky-500'
                    }`}
                  onClick={() => toggleViewType('timeline')}
                >
                  <FiClock className="mr-1.5" /> {t("timeline")}
                  {viewType === 'timeline' && (
                    <motion.div
                      className="absolute bottom-[-3px] left-0 right-0 h-[3px] bg-sky-700 dark:bg-sky-100"
                      layoutId="viewModeUnderline"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
                    
          <div className="min-h-[50vh] relative">
          {/* general view */}
            {viewType === 'geral' && (
              <div className="container mx-auto px-4 pt-6 pb-12">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-1 order-last lg:order-none">
                    {/* <CountyStats 
                      stats={{
                        totalAtas: county?.stats?.total_atas || stats.totalAtas || 0,
                        totalPages: county?.stats?.total_pages || stats.totalPages || 0,
                        totalSubjectsWithVotes: county?.stats?.total_assuntos_com_votos || stats.totalSubjectsWithVotes || 0,
                        totalSubjects: county?.stats?.total_assuntos || stats.totalSubjects || 0
                      }} 
                    /> */}
                     <CountyRecentMinutes
                      countyId={countyId}
                      API_URL={API_URL}
                    />
                    <CountyParticipants
                      county={county}
                      currentParticipants={county.current_participants || []} 
                      API_URL={API_URL}
                      // onParticipantClick={(participantId) => switchToGridWithFilter('participant_id', participantId)}
                    />
                  </div>
                  
                  <div className="lg:col-span-2 order-first lg:order-none">
                      
                    <CountyTopics
                      countyId={countyId}
                      API_URL={API_URL}
                      useDirectNavigation={true}
                      // onTopicClick={(topicId) => switchToGridWithFilter('topico', topicId)}
                      onTopicClick={(topicId, year) => {
                        switchToGridWithFilters({ topico: [topicId], year: year });
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
            
            {viewType === 'timeline' && (
              <div className="container mx-auto px-4 py-6">
                {isTimelineLoading ? (
                  <div className="flex items-center min-h-96 my-10 justify-center font-montserrat">
                    <GenericLoadingSpinner
                      icon={FiClock}
                      color="text-sky-700"
                      text="Aguarde por favor, estamos a criar a linha temporal..."
                      iconSize="text-5xl"
                    />
                  </div>
                ) : timelineError ? (
                  <div className="text-center text-red-600">
                    <ErrorState message={timelineError} />
                  </div>
                ) : (
                  <NavigationTimeline 
                    timelineAtas={timelineAtas}
                    timelineYears={timelineYears}
                    onSelectAta={handleSelectAta}
                  />
                )}
              </div>
            )}

            {viewType === 'grid' && (
              <div className="container mx-auto px-4 py-6 font-montserrat" id="grid-container">
              {isGridLoading ? (
                <div className="flex flex-col md:flex-row">
                  <Facet
                    isGridLoading={isGridLoading}
                    isShown={showFacet} 
                    toggleFacet={toggleFacet}
                    facets={facets}
                    yearFilter={yearFilter}
                    tipoFilter={tipoFilter}
                    participanteFilter={participanteFilter}
                    topicoFilter={topicoFilter}
                    partyFilter={partyFilter}
                    availableYears={availableYears}
                    availableTipos={availableTipos}
                    availableParticipants={availableParticipants}
                    availableTopicos={availableTopicos}
                    availableParty={availableParty}
                    participantsLogic={participantsLogic}
                    topicsLogic={topicsLogic}
                    onParticipantsLogicChange={handleParticipantsLogicChange}
                    onTopicsLogicChange={handleTopicsLogicChange}
                    handleYearFilterChange={handleYearFilterChange}
                    handleTipoFilterChange={handleTipoFilterChange}
                    handleParticipanteFilterChange={handleParticipanteFilterChange}
                    handleTopicoFilterChange={handleTopicoFilterChange}
                    handlePartyFilterChange={handlePartyFilterChange}
                    handleSortChange={handleSortChange}
                    clearFilters={clearFilters}
                    applyFilters={applyFilters}
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    searchQuery={searchQuery}
                    handleSearchQueryChange={(query) => setSearchQuery(query)}
                    handleSearchSubmit={handleSearch}
                    showTipoFilter={true}
                    showParticipanteFilter={true}
                  
                    startDate={startDate}
                    endDate={endDate}
                    onDateRangeChange={handleDateRangeChange}
                    showDateRange={true}
                  />
                  <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>
                    <div className="font-montserrat">
                      {/* <GenericLoadingSpinner
                        icon={FiGrid}
                        color="text-sky-700"
                        text="Aguarde por favor..."
                        iconSize="text-5xl"
                      /> */}

                      <SkeletonCardGrid count={12} viewMode={viewMode} />
                    </div>
                  </div>
                  </div>
              ) : gridError ? (
                <ErrorState message={error} />
              ) : atas.length === 0 ? (
                  <div className="container mx-auto pb-6 font-montserrat">
                    <div className="flex flex-col md:flex-row">
                      <Facet
                        isGridLoading={isGridLoading}
                        isShown={showFacet} 
                        toggleFacet={toggleFacet}
                        facets={facets}
                        yearFilter={yearFilter}
                        tipoFilter={tipoFilter}
                        participanteFilter={participanteFilter}
                        topicoFilter={topicoFilter}
                        partyFilter={partyFilter}
                        availableYears={availableYears}
                        availableTipos={availableTipos}
                        availableParticipants={availableParticipants}
                        availableTopicos={availableTopicos}
                        availableParty={availableParty}
                        participantsLogic={participantsLogic}
                        topicsLogic={topicsLogic}
                        onParticipantsLogicChange={handleParticipantsLogicChange}
                        onTopicsLogicChange={handleTopicsLogicChange}
                        handleYearFilterChange={handleYearFilterChange}
                        handleTipoFilterChange={handleTipoFilterChange}
                        handleParticipanteFilterChange={handleParticipanteFilterChange}
                        handleTopicoFilterChange={handleTopicoFilterChange}
                        handlePartyFilterChange={handlePartyFilterChange}
                        handleSortChange={handleSortChange}
                        clearFilters={clearFilters}
                        applyFilters={applyFilters}
                        sortBy={sortBy}
                        sortOrder={sortOrder}
                        searchQuery={searchQuery}
                        handleSearchQueryChange={(query) => setSearchQuery(query)}
                        handleSearchSubmit={handleSearch}
                        showTipoFilter={true}
                        showParticipanteFilter={true}
                        // Date range props
                        startDate={startDate}
                        endDate={endDate}
                        onDateRangeChange={handleDateRangeChange}
                        showDateRange={true}
                      />
                      <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>
                        {/* Search bar at the top */}
                          <div className="flex items-center justify-start gap-x-2">
                        {viewType === 'grid' && !showFacet && (
                          <motion.button
                            onClick={toggleFacet}
                            className="z-20 text-sm cursor-pointer bg-sky-700 hover:bg-sky-800 text-white py-2 px-2 rounded-md shadow-md border-l-2 border-sky-700 border-l-sky-900 flex flex-shrink-0"
                          >
                            <FiSidebar className="" />
                            <FiChevronDown className="rotate-[-90deg]" />
                          </motion.button>
                      )}
                          <form onSubmit={handleSearch}>
                            <div className="flex flex-row gap-0">
                              <div className="relative">
                                <input
                                  type="text"
                                  placeholder={t("search_minutes_of_county", { countyName: county?.name || t("county") })}
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="pl-3 pr-3 py-1 w-full rounded-md rounded-r-none border border-gray-300 bg-white text-sm text-gray-700 focus:ring-1 focus:ring-sky-700 focus:border-sky-700"
                                />
                              </div>
                              <button
                                type="submit"
                                className="px-4 py-1 bg-sky-700 text-white rounded-md rounded-s-none text-sm hover:bg-sky-800 transition-colors flex items-center cursor-pointer"
                              >
                                <FiSearch />
                              </button>
                            </div>
                          </form>
                        </div>

                        {/* ActiveFilters without results */}
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between mt-2 gap-x-2">
                          <ActiveFilters 
                            filters={{
                              keyword: lastKeyword,
                              municipioId: countyId,
                              municipioName: county?.name,
                              participanteId: participanteFilter,
                              participanteNames: availableParticipants
                                .filter(p => Array.isArray(participanteFilter) 
                                  ? participanteFilter.includes(p.id) 
                                  : participanteFilter === p.id)
                                .map(p => p.name || p.id),
                              topico: topicoFilter,
                              topicoNames: availableTopicos
                                .filter(t => Array.isArray(topicoFilter) 
                                  ? topicoFilter.includes(t.id) 
                                  : topicoFilter === t.id)
                                .map(t => t.name || t.id),
                              yearFilter: yearFilter,
                              partyFilter: partyFilter,
                              tipoFilter: tipoFilter,
                              onRemoveFilter: handleRemoveFilter,
                              onClearAllFilters: handleClearAllFilters
                            }} 
                            onRemoveFilter={handleRemoveFilter}
                            onClearAll={handleClearAllFilters}
                            insideCounty={true}
                            facets={{
                              topicos: availableTopicos.map(t => ({ _id: t.id, title: t.name, title_en: t.name_en })),
                              participants: availableParticipants.map(p => ({ _id: p.id, name: p.name, name_en: p.name_en }))
                            }}
                          />
                        </div>

                        {/* 0 results text */}
                        <div className="text-center py-20  rounded-md mt-4">
                          <div className="flex items-center justify-center">
                           {/* <RiQuestionMarkLine className="text-6xl text-gray-400" /> */}
                          </div>
                          <h1 className="text-2xl font-medium">{t("no_results")}</h1>
                          <p className="text-gray-500 text-lg mt-2">
                            {lastKeyword === "" ? (
                              totalResults === 1 ? t("no_atas_found_simple") : t("no_atas_found_simple")
                            ) : (
                              <>
                                {totalResults === 1 ? t("no_atas_found") : t("no_atas_found")}{" "}
                                <span className="font-medium italic">"{lastKeyword}"</span>
                              </>
                            )}
                          </p>
                          <p className="text-gray-400 text-sm mt-2">
                            {t("search_suggestions", "Verifique se há erros ortográficos ou tente usar palavras-chave diferentes.")} <br />
                            {t("filter_suggestions", "Pode também experimentar os diferentes filtros, para obter resultados mais precisos.")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
              ) : (
                  <div className="container mx-auto pb-6 font-montserrat">

                    {/* filter panel/facet - very nice */}
                    <div className="flex flex-col md:flex-row">
                      <Facet
                        isShown={showFacet} 
                        toggleFacet={toggleFacet}
                        facets={facets}
                        yearFilter={yearFilter}
                        tipoFilter={tipoFilter}
                        partyFilter={partyFilter}
                        participanteFilter={participanteFilter}
                        topicoFilter={topicoFilter}
                        availableYears={availableYears}
                        availableTipos={availableTipos}
                        availableParticipants={availableParticipants}
                        availableParty={availableParty}
                        availableTopicos={availableTopicos}
                        participantsLogic={participantsLogic} 
                        topicsLogic={topicsLogic}
                        onParticipantsLogicChange={handleParticipantsLogicChange}
                        onTopicsLogicChange={handleTopicsLogicChange}
                        handleYearFilterChange={handleYearFilterChange}
                        handleTipoFilterChange={handleTipoFilterChange}
                        handleParticipanteFilterChange={handleParticipanteFilterChange}
                        handleTopicoFilterChange={handleTopicoFilterChange}
                        handlePartyFilterChange={handlePartyFilterChange}
                        clearFilters={clearFilters}
                        applyFilters={applyFilters}
                        searchQuery={searchQuery}
                        handleSearchQueryChange={(query) => setSearchQuery(query)}
                        handleSearchSubmit={handleSearch}
                        showTipoFilter={true}
                        showParticipanteFilter={true}
                        // Date range props
                        startDate={startDate}
                        endDate={endDate}
                        onDateRangeChange={handleDateRangeChange}
                        showDateRange={true}
                      />
                      <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>

                        {/* Search bar and sort at the top */}
                        <div className="flex items-start md:items-center justify-start gap-x-2">
                        {viewType === 'grid' && !showFacet && (
                            <motion.button
                              onClick={toggleFacet}
                              className="z-20 text-sm cursor-pointer bg-sky-700 hover:bg-sky-800 text-white py-2 px-2 rounded-md shadow-md border-l-2 border-sky-700 border-l-sky-900 flex flex-shrink-0"
                            >
                              <FiSidebar className="" />
                              <FiChevronDown className="rotate-[-90deg]" />
                            </motion.button>
                        )}
                          {/* search bar */}
                         <div className="flex items-start justify-between w-full gap-2 flex-col md:flex-row">
                          {/* search bar */}
                          <form onSubmit={handleSearch} className="w-full md:w-auto flex-1 max-w-md">
                            <div className="flex flex-row gap-0">
                              <div className="relative flex-1">
                                <input
                                  type="text"
                                  placeholder={t("search_minutes_of_county", { countyName: county?.name || t("county") })}
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  className="pl-3 pr-3 py-1 w-full rounded-md rounded-r-none border border-gray-300 bg-white text-sm text-gray-700 focus:ring-1 focus:ring-sky-700 focus:border-sky-700"
                                />
                              </div>
                              <button
                                type="submit"
                                className="px-4 py-1 bg-sky-700 text-white rounded-md rounded-s-none text-sm hover:bg-sky-800 transition-colors flex items-center cursor-pointer"
                              >
                                <FiSearch />
                              </button>
                            </div>
                          </form>

                          {/* sort dropdown */}
                          <div className=" md:w-xxs mt-2 md:mt-0">
                            <SortDropdown 
                              sortBy={sortBy}
                              sortOrder={sortOrder}
                              searchQuery={searchQuery}
                              onSortChange={handleSortChange}
                              hasSearchQuery={!!searchQuery.trim()}
                              disabled={isGridLoading}
                            />
                          </div>
                        </div>
                        </div>
                        
                        <div className="flex flex-col  md:flex-row md:items-center md:justify-between mt-2 gap-x-2">
                          <ActiveFilters 
                            filters={{
                              keyword: lastKeyword,
                              municipioId: countyId,
                              municipioName: county?.name,
                              participanteId: participanteFilter,
                              participanteNames: availableParticipants
                                .filter(p => Array.isArray(participanteFilter) 
                                  ? participanteFilter.includes(p.id) 
                                  : participanteFilter === p.id)
                                .map(p => p.name || p.id),
                              topico: topicoFilter,
                              topicoNames: availableTopicos
                                .filter(t => Array.isArray(topicoFilter) 
                                  ? topicoFilter.includes(t.id) 
                                  : topicoFilter === t.id)
                                .map(t => t.name || t.id),
                              startDate: startDate,
                              endDate: endDate,
                              yearFilter: yearFilter,
                              tipoFilter: tipoFilter,
                              partyFilter: partyFilter,
                              onRemoveFilter: handleRemoveFilter,
                              onClearAllFilters: handleClearAllFilters
                            }} 
                            onRemoveFilter={handleRemoveFilter}
                            onClearAll={handleClearAllFilters}
                            insideCounty={true}
                            facets={{
                              topicos: availableTopicos.map(t => ({ _id: t.id, title: t.name, title_en: t.name_en })),
                              participants: availableParticipants.map(p => ({ _id: p.id, name: p.name, name_en: p.name_en }))
                            }}
                          />
                        </div>

                        {/* results count directly below search bar */}
                        <div className="flex items-center justify-between mt-0">
                          <div className="mt-2 text-gray-700 font-normal text-sm">
                          <span> 
                            {
                              lastKeyword === ""
                                ? `${totalResults === 1 ? t("found_one_minute") : t("found_minutes", { count: totalResults })}`
                                : <>
                                    {totalResults === 1 ? t("found_one_minute_for_simple") : t("found_minutes_for_simple", { count: totalResults})}{" "}
                                    <span className="font-medium">"{lastKeyword}"</span>
                                  </>
                            }
                          </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {!isGridLoading && atas.length > 0 && (
                              <button
                                onClick={handleDownloadCSV}
                                className="flex items-center cursor-pointer px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200"
                                title={`${t("export", "Exportar")} .csv`}
                              >
                                <FiDownload className="mr-1.5 h-4 w-4" />
                                {t("export", "Exportar")}
                              </button>
                            )}
                            <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                          </div>
                        </div>

                        {/* Grid/List - Atas */}
                        {isGridLoading ? (
                          <SkeletonCardGrid count={12} viewMode={viewMode} />
                        ) : (
                          <motion.div
                            className={`${
                              viewMode === "grid"
                                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2"
                                : "flex flex-col space-y-4 mt-2"
                            }`}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={{
                              hidden: { opacity: 0, y: 20 },
                              visible: { opacity: 1, y: 0 },
                              exit: { opacity: 0, y: -20 }
                            }}
                            transition={{ duration: 0.4, ease: "easeInOut" }}
                            id="grid-content"
                          >
                            {atas.map((ata, index) => (
                              <GenericResultCard
                                key={ata.id}
                                result={ata}
                                index={index}
                                type="minute"
                                showMunicipio={false}
                                showDate={true}
                                showLocation={true}
                                useLinks={true}
                                showSeeButton={true}
                                viewMode={viewMode}
                              />
                            ))}
                          </motion.div>
                        )}
                        

                        {/* Pagination */}
                        {!isGridLoading && totalPages > 1 && (
                          <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          handlePageChange={handlePageChange}
                          paginationItems={getPaginationItems()}
                          />
                        )}

                        {/* Results count */}
                        {!isGridLoading && atas.length > 0 && (
                          <div className="mt-6 text-center text-sm text-gray-600">
                            {t("showing_results_minutes", {
                              start: ((currentPage - 1) * perPage) + 1, 
                              end: Math.min(currentPage * perPage, totalResults), 
                              total: totalResults
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              )}
            </div>
            )}
          </div>
          
          <Footer />
        </>
      )}

      {/* Add AnimatePresence for LoadingState - this will be on top */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <CountyLoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>

      {/* Show error state when error exists and loading animation is complete */}
      {error && contentReady && (
        <>
          <Navbar />
          <CountyErrorState error={error} />
          <Footer />
        </>
      )}
    </div>
  );
};

export default MunicipioPage;