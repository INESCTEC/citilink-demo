import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { FiSearch, FiGrid } from 'react-icons/fi';
import { FaLandmark } from 'react-icons/fa';

import Facet from '../common/search/Facet';
import ViewSwitcher from '../SearchPage/ViewSwitcher';
import ActiveFilters from '../common/search/ActiveFilters';
import GenericResultCard from '../SearchPage/GenericResultCard';
import LoadingSpinner from '../common/LoadingSpinner';
import GenericLoadingSpinner from '../common/GenericLoadingSpinner';
import Pagination from '../common/Pagination';
import ErrorState from '../common/states/ErrorState';

const CountyGridView = ({ countyId, county, API_URL }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  // State for grid view
  const [atas, setAtas] = useState([]);
  const [isLoadingGrid, setIsLoadingGrid] = useState(false);
  const [gridError, setGridError] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showFacet, setShowFacet] = useState(false);
  const [yearFilter, setYearFilter] = useState("");
  const [tipoFilter, setTipoFilter] = useState("");
  const [participanteFilter, setParticipanteFilter] = useState([]);
  const [topicoFilter, setTopicoFilter] = useState([]);
  const [availableYears, setAvailableYears] = useState([2024, 2023, 2022, 2021]);
  const [availableTipos, setAvailableTipos] = useState(["ordinaria", "extraordinaria"]);
  const [availableParticipants, setAvailableParticipants] = useState([]);
  const [availableTopicos, setAvailableTopicos] = useState([]);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastKeyword, setLastKeyword] = useState("");
  const [viewMode, setViewMode] = useState(() => localStorage.getItem("searchResultsViewMode") || "list");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalResults, setTotalResults] = useState(0);
  const [perPage, setPerPage] = useState(12);

  // Fetch participants and topics on mount
  useEffect(() => {
    if (county && county.current_participants) {
      setAvailableParticipants(county.current_participants.map(p => ({
        id: p.id,
        name: p.name,
        party: p.party,
        profile_photo: p.profile_photo || null
      })));
    }
  }, [county]);

  useEffect(() => {
    const fetchTopicos = async () => {
      if (!countyId || !API_URL) return;
      try {
        const response = await fetch(`${API_URL}/v0/public/municipios/${countyId}/topicos?demo=${DEMO_MODE}`);
        if (!response.ok) throw new Error("Failed to fetch topics");
        const data = await response.json();
        setAvailableTopicos(data || []);
      } catch (error) {
        setAvailableTopicos([]);
      }
    };
    fetchTopicos();
  }, [countyId, API_URL]);

  // --- Sync state from URL params on mount or param change ---
  useEffect(() => {
    setYearFilter(searchParams.get('year') || "");
    setTipoFilter(searchParams.get('tipo') || "");
    setSortBy(searchParams.get('sort') || "date");
    setSortOrder(searchParams.get('order') || "desc");
    setSearchQuery(searchParams.get('q') || "");
    setLastKeyword(searchParams.get('q') || "");
    setCurrentPage(Number(searchParams.get('page')) || 1);

    // Multi-value params
    const part = searchParams.getAll('participant_id');
    setParticipanteFilter(part.length ? part : []);
    const tops = searchParams.getAll('topico');
    setTopicoFilter(tops.length ? tops : []);
   
  }, [searchParams]);

  // --- Handlers that update both state and URL ---
  const updateUrlParams = (params) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(params).forEach(([key, value]) => {
      newParams.delete(key);
      if (Array.isArray(value)) {
        value.forEach(v => { if (v) newParams.append(key, v); });
      } else if (value) {
        newParams.set(key, value);
      }
    });
    // Reset page on filter change
    newParams.set('page', '1');
    setSearchParams(newParams, { replace: true });
  };

  // Fetch atas for grid view
  const fetchAtas = useCallback(async (page = 1) => {
    setIsLoadingGrid(true);
    setGridError(null);
    try {
      const apiParams = new URLSearchParams();
      apiParams.append("municipio_id", countyId);
      apiParams.append("sort", sortBy);
      apiParams.append("order", sortOrder);
      apiParams.append("page", page.toString());
      apiParams.append("per_page", perPage.toString());
      if (lastKeyword.trim()) apiParams.append("q", lastKeyword.trim());
      if (yearFilter) {
        apiParams.append("start_date", `${yearFilter}-01-01`);
        apiParams.append("end_date", `${parseInt(yearFilter) + 1}-01-01`);
      }
      if (tipoFilter) apiParams.append("tipo", tipoFilter);
      if (participanteFilter.length > 0) participanteFilter.forEach(id => apiParams.append("participant_id", id));
      if (topicoFilter.length > 0) topicoFilter.forEach(id => apiParams.append("topico", id));
      const response = await fetch(`${API_URL}/v0/public/atas/search?${apiParams}&demo=${DEMO_MODE}`);
      if (!response.ok) throw new Error("Failed to fetch atas");
      const data = await response.json();
      setAtas(data.data || []);
      setTotalResults(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 0);
      setPerPage(data.pagination?.per_page || 12);
    } catch (err) {
      setGridError(err.message);
      setAtas([]);
    } finally {
      setIsLoadingGrid(false);
    }
  }, [countyId, API_URL, sortBy, sortOrder, perPage, lastKeyword, yearFilter, tipoFilter, participanteFilter, topicoFilter]);

  useEffect(() => {
    fetchAtas(currentPage);
  }, [fetchAtas, currentPage]);

  // Handlers
  const handleSortChange = (e) => {
    const [field, order] = (e.target?.value || e).split(":");
    setSortBy(field);
    setSortOrder(order);
    updateUrlParams({ sort: field, order, page: 1 });
  };
  const handleYearFilterChange = (e) => {
    const value = e.target?.value ?? e;
    setYearFilter(value);
    updateUrlParams({ year: value });
  };
  const handleTipoFilterChange = (e) => {
    const value = e.target?.value ?? e;
    setTipoFilter(value);
    updateUrlParams({ tipo: value });
  };
  const handleTopicoFilterChange = (e) => {
    const value = e.target?.value ?? e;
    setTopicoFilter(value);
    updateUrlParams({ topico: value });
  };
  const handleParticipanteFilterChange = (e) => {
    const value = e.target?.value ?? e;
    setParticipanteFilter(value);
    updateUrlParams({ participant_id: value });
  };
  const handleSearchQueryChange = (query) => {
    setSearchQuery(query);
    // Don't update URL yet, only on submit
  };
  const handleSearch = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setLastKeyword(searchQuery.trim());
    updateUrlParams({ q: searchQuery.trim() });
  };
  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    updateUrlParams({ page });
  };
  const clearFilters = () => {
    setYearFilter(""); setTipoFilter(""); setParticipanteFilter([]); setTopicoFilter([]); setSearchQuery(""); setLastKeyword(""); setCurrentPage(1);
    setSearchParams({}, { replace: true });
  };
  const handleRemoveFilter = (filterType, filterValue) => {
    let params = {};
    if (filterType === 'yearFilter') { setYearFilter(""); params.year = ""; }
    if (filterType === 'tipoFilter' || filterType === 'tipo') { setTipoFilter(""); params.tipo = ""; }
    if (filterType === 'participanteId' || filterType === 'participant_id') {
      const newVal = participanteFilter.filter(id => id !== filterValue);
      setParticipanteFilter(newVal);
      params.participant_id = newVal;
    }
    if (filterType === 'topico') {
      const newVal = topicoFilter.filter(id => id !== filterValue);
      setTopicoFilter(newVal);
      params.topico = newVal;
    }
    if (filterType === 'keyword' || filterType === 'q') { setSearchQuery(""); setLastKeyword(""); params.q = ""; }
    updateUrlParams(params);
  };
  const handleClearAllFilters = () => clearFilters();
  const getPaginationItems = () => {
    const items = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) items.push(i); }
    else {
      items.push(1);
      if (currentPage > 3) items.push('...');
      const startPage = Math.max(2, currentPage - 1);
      const endPage = Math.min(totalPages - 1, currentPage + 1);
      for (let i = startPage; i <= endPage; i++) items.push(i);
      if (currentPage < totalPages - 2) items.push('...');
      items.push(totalPages);
    }
    return items;
  };

  // Add a safe fallback for toggleFacet
  const toggleFacet = typeof showFacet === "boolean"
    ? (() => setShowFacet(f => !f))
    : () => {};

const toggleFilters = typeof showFilters === "boolean"
  ? (() => setShowFilters(f => !f))
  : () => {};

  // Facet/Drawer "applyFilters" handler: called when user clicks "Apply" in Facet/Drawer
  const applyFilters = ({
    yearFilter: newYear,
    tipoFilter: newTipo,
    participanteFilter: newParticipantes,
    topicoFilter: newTopicos,
    sortValue: newSortValue,
  }) => {
    // Parse sort
    let sortField = sortBy, sortOrd = sortOrder;
    if (newSortValue) {
      const [field, order] = newSortValue.split(":");
      sortField = field;
      sortOrd = order;
    }
    // Update state
    setYearFilter(newYear ?? "");
    setTipoFilter(newTipo ?? "");
    setParticipanteFilter(newParticipantes ?? []);
    setTopicoFilter(newTopicos ?? []);
    setSortBy(sortField);
    setSortOrder(sortOrd);
    setCurrentPage(1);

    // Update URL
    updateUrlParams({
      year: newYear ?? "",
      tipo: newTipo ?? "",
      participant_id: newParticipantes ?? [],
      topico: newTopicos ?? [],
      sort: sortField,
      order: sortOrd,
      page: 1,
    });
  };

  // Prepare leftSideOutsideComponent (search bar)
  const leftSideOutsideComponent = (
    <form onSubmit={handleSearch} className="w-full">
      <div className="flex flex-row gap-0">
        <div className="relative flex-grow">
          <input
            type="text"
            placeholder={t("search_minutes")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-3 pr-3 py-1 w-full rounded-md rounded-r-none border border-gray-300 bg-white text-sm text-gray-700 focus:ring-1 focus:ring-sky-700 focus:border-sky-700"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-1 bg-sky-700 text-white rounded-md rounded-s-none text-sm hover:bg-sky-800 transition-colors flex items-center cursor-pointer"
        >
          <FiSearch className="" />
        </button>
      </div>
    </form>
  );

  return (
    <div className="container mx-auto px-4 py-6" id="grid-container">
      {isLoadingGrid ? (
        <div className="font-montserrat">
          <GenericLoadingSpinner
            icon={FiGrid}
            color="text-sky-700"
            text="Aguarde por favor..."
            iconSize="text-5xl"
          />
        </div>
      ) : gridError ? (
        <ErrorState message={error} />
      ) : (
        <div className="container mx-auto pb-6 font-montserrat">  
        {/* <div className="mb-4">
                {leftSideOutsideComponent}
              </div> */}
          <div className="flex flex-col md:flex-row">
            {/* Facet panel on the left */}
            <Facet 
              isShown={showFacet}
              toggleFacet={toggleFacet}
              yearFilter={yearFilter}
              tipoFilter={tipoFilter}
              participanteFilter={participanteFilter}
              topicoFilter={topicoFilter}
              availableYears={availableYears}
              availableTipos={availableTipos}
              availableParticipants={availableParticipants}
              availableTopicos={availableTopicos}
              handleYearFilterChange={handleYearFilterChange}
              handleTipoFilterChange={handleTipoFilterChange}
              handleParticipanteFilterChange={handleParticipanteFilterChange}
              handleTopicoFilterChange={handleTopicoFilterChange}
              handleSortChange={handleSortChange}
              clearFilters={clearFilters}
              sortBy={sortBy}
              sortOrder={sortOrder}
              searchQuery={searchQuery}
              handleSearchQueryChange={handleSearchQueryChange}
              handleSearchSubmit={handleSearch}
              applyFilters={applyFilters}
            />
            {/* Main content on the right */}
            <div className={`flex-1 transition-all ${showFacet ? 'md:ml-4' : ''}`}>
            <div className='flex justify-between'>
              {/* Search bar before results */}
              <div>

              <div className="flex flex-wrap items center">
                <div className="text-gray-700 font-normal text-sm mt-2">
                  <span>
                    {totalResults} {totalResults === 1 ? 'resultado obtido' : 'resultados obtidos'}
                    {lastKeyword ? ` para "${lastKeyword}"` : ''}
                  </span>
                </div>
              </div>
              {/* Active Filters Display */}
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
              <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
              </div>
              
              {/* Grid/List Results */}
              {isLoadingGrid ? (
                <div className="flex justify-center items-center py-20">
                  <LoadingSpinner 
                    color="text-sky-800" 
                    text={t("loading_page_number", { page: currentPage })} 
                  />
                </div>
              ) : atas.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-md">
                  <FaLandmark className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="text-gray-500 text-lg mt-1">{t("no_minutes_found")}</p>
                </div>
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
                      viewMode={viewMode}
                    />
                  ))}
                </motion.div>
              )}
              
              {/* Results count */}
              {!isLoadingGrid && atas.length > 0 && (
                <div className="mt-6 text-center text-sm text-gray-600">
                  {t("showing_results_minutes", {
                    start: ((currentPage - 1) * perPage) + 1, 
                    end: Math.min(currentPage * perPage, totalResults), 
                    total: totalResults
                  })}
                </div>
              )}
              
              {/* Pagination Component */}
              {!isLoadingGrid && totalPages > 1 && (
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  handlePageChange={handlePageChange}
                  paginationItems={getPaginationItems()}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountyGridView;
