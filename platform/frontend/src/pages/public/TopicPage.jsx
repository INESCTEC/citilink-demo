import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation, useSearchParams, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import { FiFolder, FiSidebar, FiChevronDown, FiList, FiFile, FiHome, FiChevronRight, FiFilter, FiX, FiSliders, FiSearch, FiChevronLeft, FiClock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import LoadingState from "../../components/common/states/LoadingState";
import ErrorState from "../../components/common/states/ErrorState";
import { useTranslation } from "react-i18next";
import { getTopicoIcon } from "../../utils/iconMappers";
import Facet from "../../components/common/search/Facet";
import { Popover } from 'flowbite-react';

import TopicAtas from "../../components/TopicPage/TopicAtas";
import TopicAssuntos from "../../components/TopicPage/TopicAssuntos";
import { SkeletonCardGrid } from "../../components/common/skeletons/SkeletonCard";
import LangLink from "../../components/common/LangLink";
import { setYear } from "date-fns";

export default function TopicPage() {
  const { t, i18n } = useTranslation();
  const { countyId, topicId } = useParams();
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
  const [aprovadoFilter, setAprovadoFilter] = useState(searchParams.get("aprovado") || "");
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // State
  const [topic, setTopic] = useState(null);
  const [county, setCounty] = useState(null);
  const [topicError, setTopicError] = useState(null);
  const [data, setData] = useState([]); // atas or assuntos
  const [facets, setFacets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, per_page: 12, pages: 1 });
  const [showFacet, setShowFacet] = useState(true);
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("searchResultsViewMode") || "list");

  // Helper function to get localized topic name
  const getLocalizedTopicName = (topic) => {
    if (i18n.language === 'en' && topic.name_en) {
      return topic.name_en;
    }
    return topic.name || topic.name_en || '';
  };

  // Clear data when switching tabs
  useEffect(() => {
    setData([]);
  }, [type]);

  // Reusable fetch function
  const fetchData = async (isInitialLoad = false) => {
    const startTime = Date.now();
    
    setLoading(true);
    setTopicError(null);
    
    if (isInitialLoad) {
      setShowLoadingState(true);
      setLoadingExiting(false);
      setContentReady(false);
    }
    
    try {
      // Fetch topic info
      const topicResponse = await fetch(`${API_URL}/v0/public/municipios/${countyId}/topicos/${topicId}?demo=${DEMO_MODE}&lang=${i18n.language}`);
      if (!topicResponse.ok) {
        throw new Error("Failed to fetch topic details");
      }
      const topicData = await topicResponse.json();
      setTopic(topicData);
      console.log(topicData);   

      // Fetch county info if countyId is provided
      if (countyId) {
        const countyResponse = await fetch(`${API_URL}/v0/public/municipios/${countyId}?demo=${DEMO_MODE}&lang=${i18n.language}`);
        if (countyResponse.ok) {
          const countyData = await countyResponse.json();
          setCounty(countyData);
        }
      }

      // search parameters
      const params = new URLSearchParams({
        page,
        per_page: perPage,
        sort: sortBy,
        order: sortOrder,
        topico: topicId,
        demo: DEMO_MODE,
        lang: i18n.language,
        municipio_id: countyId || ""
      });

      if (searchQuery) params.set("q", searchQuery);

      if (yearFilter) {
        setStartDate("");
        setEndDate("");
        params.append("start_date", `${yearFilter}-01-01`);
        params.append("end_date", `${yearFilter}-12-31`);
      } else if (startDate && endDate) {
        setYearFilter("");
        params.append("start_date", startDate);
        params.append("end_date", endDate);
      }

        // type specific filters
       if (type === "atas" && tipoFilter) {
            params.set("tipo", tipoFilter);
       } else if (type === "assuntos" && aprovadoFilter) {
            params.set("aprovado", aprovadoFilter);
      }

      let url;
      if (type === "atas") {
        url = `${API_URL}/v0/public/atas/search?${params.toString()}`;
      } else {
        url = `${API_URL}/v0/public/assuntos/search?${params.toString()}`;
      }

      const response = await fetch(url);
      const result = await response.json();
      setData(result.data|| []);
      console.log('📦 fetched data:', result);
      setFacets(result.facets || []);
      setPagination(result.pagination || { total: 0, page: 1, per_page: 12, pages: 1 });

      if (isInitialLoad) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime);
        
        setTimeout(() => {
          setContentReady(true);
          setLoadingExiting(true);

          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, remainingTime);
      }
      
    } catch (err) {
      console.error("Error fetching data:", err);
      setTopicError(err.message);
      
      if (isInitialLoad) {
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, MINIMUM_LOADING_TIME - elapsedTime);
        
        setTimeout(() => {
          setContentReady(true);
          setLoadingExiting(true);
          
          setTimeout(() => {
              setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, remainingTime);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch topic info and data (atas/assuntos) on mount or param change
  useEffect(() => {
    const isInitialLoad = !hasInitialized.current;
    if (isInitialLoad) {
      hasInitialized.current = true;
    }
    fetchData(isInitialLoad);
  }, [topicId, countyId, type, page, perPage, sortBy, sortOrder, yearFilter, startDate, endDate, tipoFilter, aprovadoFilter, searchQuery, API_URL]);

  // Robust clearFilters implementation
  const clearFilters = (fetchImmediately = true, clearQuery = false) => {
    // Clear all filter states
    setYearFilter("");
    setStartDate("");
    setEndDate("");
    setTipoFilter("");
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
      fetchData()
    }
  }

  const applyFilters = useCallback((filters) => {
    
    const { 
      yearFilter: newYearFilter, 
      tipoFilter: newTipoFilter, 
      startDate: newStartDate, 
      endDate: newEndDate, 
      aprovadoFilter: newAprovadoFilter, 
      q: newQ 
    } = filters;

    const params = new URLSearchParams(searchParams);
    
    setPage(1);
    params.set("page", "1");
    
    if (newYearFilter !== undefined) {
      setYearFilter(newYearFilter);
      if (newYearFilter) {
        params.set("year", newYearFilter);
      } else {
        params.delete("year");
      }
    }

    if (newTipoFilter !== undefined) {
      setTipoFilter(newTipoFilter);
      if (newTipoFilter) {
        params.set("tipo", newTipoFilter);
      } else {
        params.delete("tipo");
      }
    }

    if (newStartDate !== undefined) {
      setStartDate(newStartDate);
      if (newStartDate) {
        params.set("start_date", newStartDate);
      } else {
        params.delete("start_date");
      }
    }

    if (newEndDate !== undefined) {
      setEndDate(newEndDate);
      if (newEndDate) {
        params.set("end_date", newEndDate);
      } else {
        params.delete("end_date");
      }
    }

    if (newAprovadoFilter !== undefined) {
      setAprovadoFilter(newAprovadoFilter);
      if (newAprovadoFilter) {
        params.set("aprovado", newAprovadoFilter);
      } else {
        params.delete("aprovado");
      }
    }

    if (newQ !== undefined) {
      setSearchQuery(newQ);
      setLastKeyword(newQ);
      if (newQ) {
        params.set("q", newQ);
      } else {
        params.delete("q");
      }
    }

    setSearchParams(params);
  }, [searchParams, setSearchParams, type]);

const handleDateRangeChange = (newStartDate, newEndDate) => {
    const filters = {};
    
    if (newStartDate !== startDate) {
      filters.startDate = newStartDate;
    }
    
    if (newEndDate !== endDate) {
      filters.endDate = newEndDate;
    }
    
    if (Object.keys(filters).length > 0) {
      applyFilters(filters);
    }
  };

  const handleRemoveFilter = useCallback((filterType, filterValue) => {
    const params = new URLSearchParams(searchParams);
    
    if (filterType === "year") {
      setYearFilter("");
      params.delete("year");
    } else if (filterType === "tipo") {
      setTipoFilter("");
      params.delete("tipo");
    } else if (filterType === "aprovado") {
      setAprovadoFilter("");
      params.delete("aprovado");
    } else if (filterType === "dateRange") {
      setStartDate("");
      setEndDate("");
      params.delete("start_date");
      params.delete("end_date");
    }
    
    // Reset page to 1
    setPage(1);
    params.set("page", "1");
    
    setSearchParams(params);

  }, [searchParams, setSearchParams]);

  // Clear all filters
  const handleClearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    
    // Clear all filter-related params but keep essential navigation
    params.delete("year");
    params.delete("tipo");
    params.delete("aprovado");
    params.delete("start_date");
    params.delete("end_date");
    params.delete("q");
    
    // Reset to page 1
    params.set("page", "1");
    
    setSearchParams(params);
    
    // Clear all filter states
    setYearFilter("");
    setTipoFilter("");
    setAprovadoFilter("");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
    setLastKeyword("");
    setPage(1);
    
  }, [searchParams, setSearchParams]);

  // Year filter change
  const handleYearFilterChange = useCallback((e) => {
    const newYearFilter = e.target.value;
    applyFilters({
      yearFilter: newYearFilter,
      tipoFilter,
      aprovadoFilter
    });
  }, [applyFilters, tipoFilter, aprovadoFilter, type]);

  // Tipo filter change
  const handleTipoFilterChange = (e) => {
    const newTipoFilter = e.target.value;
    applyFilters({
      yearFilter,
      tipoFilter: newTipoFilter,
      aprovadoFilter
    });
  };

  // Aprovado filter change
  const handleAprovadoFilterChange = (e) => {
    const newAprovadoFilter = e.target.value;
    applyFilters({
      yearFilter,
      tipoFilter,
      aprovadoFilter: newAprovadoFilter
    });
  };

  // Sort change handler
  const handleSortChange = (field, order) => {
    setSortBy(field);
    setSortOrder(order);
    
    const params = new URLSearchParams(searchParams);
    params.set("sort", field);
    params.set("order", order);
    setSearchParams(params);
  };

  // Search submit
  const handleSearch = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const query = formData.get("search") || searchQuery;
    
    setLastKeyword(query);
    applyFilters({ q: query });
  };

  // Add handler for CSV download
  const handleDownloadCSV = async () => {
    try {
      const params = new URLSearchParams();
      params.set("topico", topicId);
      if (countyId) params.set("municipio_id", countyId);
      params.set("sort", sortBy);
      params.set("order", sortOrder);
      params.set("demo", DEMO_MODE);
      if (yearFilter) params.set("year", yearFilter);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (tipoFilter) params.set("tipo", tipoFilter);
      if (searchQuery) params.set("q", searchQuery);
      params.set("export", "csv");

      const response = await fetch(`${API_URL}/v0/public/atas/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `topic_${topicId}_atas.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  const handleDownloadCSVSubject = async () => {
    try {
      const params = new URLSearchParams();
      params.set("topico", topicId);
      if (countyId) params.set("municipio_id", countyId);
      params.set("sort", sortBy);
      params.set("order", sortOrder);
      params.set("demo", DEMO_MODE);
      if (yearFilter) params.set("year", yearFilter);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);
      if (aprovadoFilter) params.set("aprovado", aprovadoFilter);
      if (searchQuery) params.set("q", searchQuery);
      params.set("export", "csv");

      const response = await fetch(`${API_URL}/v0/public/assuntos/search?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to download CSV');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `topic_${topicId}_assuntos.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading CSV:', error);
    }
  };

  // Pagination
  const handlePageChange = (newPage) => {
    setPage(newPage);
    const params = new URLSearchParams(searchParams);
    params.set("page", newPage.toString());
    setSearchParams(params);
  };

  useEffect(() => {
    setViewMode(localStorage.getItem("searchResultsViewMode") || "list");
  }, [type]);

  // Tab switch
  const handleTabChange = (tab) => {
    if (tab === type || loading) return;
    
    setType(tab);
    setPage(1);
    
    const params = new URLSearchParams(searchParams);
    params.set("type", tab);
    params.set("page", "1");
    
    // Clean up type-specific filters when switching
    if (tab === "atas") {
      params.delete("aprovado");
      setAprovadoFilter("");
    } else if (tab === "assuntos") {
      params.delete("tipo");
      setTipoFilter("");
    }
    
    setSearchParams(params);
  };

  const getPaginationItems = (currentPage, totalPages) => {
    const items = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      items.push(1);
      if (currentPage > 3) items.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        items.push(i);
      }
      
      if (currentPage < totalPages - 2) items.push('...');
      items.push(totalPages);
    }
    
    return items;
  };

  // Facet toggle
  const toggleFacet = () => {
    setShowFacet(!showFacet);
  };
  
  // Set page title dynamically
  useEffect(() => {
    if (topic) {
      const topicName = getLocalizedTopicName(topic);
      const countyName = county ? county.name : "";
      const titleParts = [topicName];
      if (countyName) titleParts.push(countyName);
      titleParts.push("CitiLink");
      document.title = titleParts.join(" - ");
    }
  }, [topic, county]);
  
  // Render
  if (topicError) {
    return <ErrorState message={topicError} />;
  }

  return (
    <div className="min-h-screen font-montserrat">
      {contentReady && (
        <>
          <div className="bg-sky-800">
            <Navbar />
            {topic && (
              <div className="pb-3 pt-15">
                <div className="container mx-auto px-4">
                  {/* Breadcrumb */}
                  <div className="hidden sm:flex items-center mb-3">
                    <nav className="flex items-center text-sm font-montserrat bg-sky-700 rounded-md px-4 py-1" aria-label="Breadcrumb">
                      <ol className="flex flex-wrap items-center">
                        <li className="flex items-center">
                          <LangLink to="/" className="font-montserrat flex items-center space-x-2 text-white"><FiHome /></LangLink>
                        </li>
                        {county && (
                          <>
                            <li className="flex items-center">
                              <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                              <LangLink to={`/municipios/${county.slug}`} 
                               className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                                    after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white">
                                {county.name}
                              </LangLink>
                            </li>
                          </>
                        )}
                        <li className="flex items-center">
                          <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                          <span className="text-white font-medium">{getLocalizedTopicName(topic)}</span>
                        </li>
                      </ol>
                    </nav>
                  </div>
                  
                  {/* Header */}
                  <div className="overflow-hidden">
                    <div className="pt-4 pb-1">
                      <div className="flex flex-col md:flex-row items-center md:items-start w-full mb-4 text-center md:text-left">
                        <div className="flex-shrink-0 mb-3 md:mb-0 md:mr-4 text-white">
                          {getTopicoIcon(getLocalizedTopicName(topic), "w-12 h-12 md:w-16 md:h-16 mx-auto md:mx-0")}
                        </div>
                        <div className="flex flex-col items-center md:items-start">
                          <h1 className="text-lg md:text-xl font-semibold text-white mb-1">{getLocalizedTopicName(topic)}</h1>
                          {county && (
                            <div className="flex items-center mb-2">
                              <span className="text-gray-200 font-regular text-sm">
                                {county.name}
                              </span>
                            </div>
                          )}
                          <div className="flex flex-row space-x-3 items-center">
                            <div className="flex items-center text-sm text-gray-200">
                              <FiFile className="mr-1" />
                              <span>{topic.stats.total_atas || 0} {topic.stats.total_atas === 1 ? t("minute") : t("minutes")}</span>
                            </div>
                            <div className="flex items-center text-sm text-gray-200">
                              <FiList className="mr-1" />
                              <span>{topic.stats.total_assuntos || 0} {topic.stats.total_assuntos === 1 ? t("subject") : t("subjects")}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50">
            <div className="container mx-auto px-4 pt-4 mt-1 flex-1">
              {/* Content */}
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
                        startDate={startDate}
                        endDate={endDate}
                        availableYears={[2024, 2023, 2022, 2021]}
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
                        showParticipanteFilter={true}
                        showPartyFilter={true}
                        showTopicoFilter={false}
                        showDateRange={true}
                      />
                      <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>
                        <TopicAtas
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
                        availableYears={[2024, 2023, 2022, 2021]}
                        handleYearFilterChange={handleYearFilterChange}
                        handleAprovadoFilterChange={handleAprovadoFilterChange}
                        onDateRangeChange={handleDateRangeChange}
                        clearFilters={clearFilters}
                        applyFilters={applyFilters}
                        searchQuery={searchQuery}
                        handleSearchQueryChange={(e) => setSearchQuery(e.target.value)}
                        handleSearchSubmit={handleSearch}
                        showTipoFilter={false}
                        showParticipanteFilter={true}
                        showTopicoFilter={false}
                        showPartyFilter={true}
                        showAprovadoFilter={true}
                        showDateRange={true}
                      />
                      <div className={`flex-1 relative transition-all duration-400 ease-in-out ${showFacet ? 'md:ml-4' : ''}`}>
                        <TopicAssuntos
                          loading={loading}
                          data={data}
                          facets={facets}
                          pagination={pagination}
                          viewMode={viewMode}
                          setViewMode={setViewMode}
                          showFacet={showFacet}
                          toggleFacet={toggleFacet}
                          yearFilter={yearFilter}
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
        </>
      )}

      {/* Loading State */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
}