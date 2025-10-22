import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiSidebar, FiChevronDown, FiDownload, FiSearch, FiFilter, FiFile, FiList } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import DOMPurify from 'dompurify';
import GenericResultCard from "../SearchPage/GenericResultCard";
import LoadingSpinner from "../common/LoadingSpinner";
import AssuntoModal from "../PublicAtaPage/AssuntoModal";
import ViewSwitcher from "../SearchPage/ViewSwitcher";
import ActiveFilters from "../common/search/ActiveFilters";
import Pagination from "../common/Pagination";
import SortDropdown from "../SearchPage/SortDropdown";
import { RiQuestionMark } from "react-icons/ri";

const ParticipanteAssuntos = ({ 
  loading,
  data,
  pagination,
  viewMode, 
  setViewMode,
  showFacet,
  toggleFacet,
  yearFilter,
  topicoFilter,
  aprovadoFilter,
  startDate,
  endDate,
  searchQuery,
  lastKeyword,
  handleRemoveFilter,
  handleClearAllFilters,
  handlePageChange,
  getPaginationItems,
  handleSearch,
  handleDownloadCSV,
  sortBy,
  sortOrder,
  handleSortChange,
  API_URL,
  hideActiveFilters = false,
  type,
  handleTabChange,
  participanteId // Add this to know which participant we're viewing
}) => {
  const { t } = useTranslation();
  const [selectedAssuntoId, setSelectedAssuntoId] = useState(null);
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  const autoSearchDebounceRef = useRef(null);
  const searchInputRef = useRef(null);
  const shouldMaintainFocus = useRef(false);
  
  const getActiveFiltersObject = () => {
    return {
      yearFilter: yearFilter,
      aprovadoFilter: aprovadoFilter,
      topico: topicoFilter,
      keyword: lastKeyword,
      startDate: startDate,
      endDate: endDate
    };
  };
  
  const handleLocalSearch = (e) => {
    e.preventDefault();
    // Update parent's searchQuery state
    handleSearch({
      preventDefault: () => {},
      localQuery: localSearchQuery
    });
  };

  // Update local search query when parent's query changes
  React.useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

  // Auto-search effect - triggers search after 500ms of inactivity
  useEffect(() => {
    // Clear any existing timeout
    if (autoSearchDebounceRef.current) {
      clearTimeout(autoSearchDebounceRef.current);
    }

    // Don't auto-search if the query is empty
    if (!localSearchQuery.trim()) {
      return;
    }

    // Set a timeout to trigger search after 500ms
    autoSearchDebounceRef.current = setTimeout(() => {
      // Sanitize the keyword before searching
      const sanitizedKeyword = DOMPurify.sanitize(localSearchQuery);
      
      // Update the keyword if it was sanitized differently
      if (sanitizedKeyword !== localSearchQuery) {
        setLocalSearchQuery(sanitizedKeyword);
        return; // Don't trigger search if we're updating the keyword
      }

      // Mark that we should maintain focus after the search
      shouldMaintainFocus.current = true;

      // Trigger the search by calling handleLocalSearch programmatically
      handleSearch({
        preventDefault: () => {},
        localQuery: sanitizedKeyword
      });
    }, 500); // 500ms delay

    // Cleanup function
    return () => {
      if (autoSearchDebounceRef.current) {
        clearTimeout(autoSearchDebounceRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localSearchQuery]);

  // Effect to restore focus after auto-search
  useEffect(() => {
    if (shouldMaintainFocus.current && searchInputRef.current) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        searchInputRef.current?.focus();
        shouldMaintainFocus.current = false;
      }, 100);
    }
  }, [data, loading]); // Re-run when data changes (after search completes)

  return (
    <div className="relative">
      
      {/* Floating Facet Button for Mobile */}
      {!showFacet && (
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={toggleFacet}
          className="fixed bottom-8 left-4 md:hidden p-3 cursor-pointer bg-sky-700 text-white rounded-md shadow-lg hover:bg-sky-800 transition-colors duration-300 z-40"
          aria-label="Open filters"
        >
          <FiFilter size={24} />
        </motion.button>
      )}
      {/* Tab Switcher and Search Bar */}
      <div className="flex flex-col gap-3 mb-2 w-full">
        {/* Search Row with Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full">
          {/* Toggle Facet Button, Tab Switcher and Search Form */}
          <div className="flex items-center gap-3 flex-1">
            {!showFacet && (
              <div className="hidden md:flex items-center justify-start">
                <motion.button
                  onClick={toggleFacet}
                  className="z-20 text-sm cursor-pointer bg-sky-700 hover:bg-sky-800 text-white py-2 px-2 rounded-md shadow-md border-l-2 border-sky-700 border-l-sky-900 flex flex-shrink-0"
                >
                  <FiSidebar className="mr-1" />
                  <FiChevronDown className="rotate-[-90deg]" />
                </motion.button>
              </div>
            )}
            
            {/* Tab Switcher */}
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden flex-shrink-0">
              <button
                onClick={() => handleTabChange('atas')}
                disabled={loading}
                className={`flex items-center px-3 py-1.5 text-xs font-medium transition-all duration-300 ${
                  type === 'atas' 
                    ? 'bg-sky-700 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                  ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <FiFile className="mr-1.5" /> Atas
              </button>
              
              <button
                onClick={() => handleTabChange('assuntos')}
                disabled={loading}
                className={`flex items-center px-3 py-1.5 text-xs font-medium transition-all duration-300 border-l border-gray-300 ${
                  type === 'assuntos' 
                    ? 'bg-sky-700 text-white' 
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                   ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <FiList className="mr-1.5" /> Assuntos
              </button>
            </div>
            
            <form onSubmit={handleLocalSearch} className="flex-1 sm:flex-none sm:w-80">
              <div className="flex flex-row gap-0">
                <div className="relative flex-grow">
                  <input 
                    ref={searchInputRef}
                    type="text" 
                    placeholder="Pesquisar assuntos..." 
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    className="pl-3 pr-3 py-1 w-full rounded-md rounded-r-none border border-gray-300 bg-white text-sm text-gray-700 focus:ring-1 focus:ring-sky-700 focus:border-sky-700" 
                  />
                </div>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 bg-sky-700 text-white rounded-md rounded-s-none text-sm hover:bg-sky-800 transition-colors flex items-center cursor-pointer"
                >
                  <FiSearch />
                </button>
              </div>
            </form>
          </div>
          
          {/* Sort Dropdown - Desktop */}
          <div className="hidden sm:block w-auto flex-shrink-0">
            <SortDropdown 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              hasSearchQuery={!!searchQuery}
              disabled={loading}
            />
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="flex flex-col gap-3">
        {/* Desktop: Results count and controls on same row */}
        <div className="hidden sm:flex sm:items-center justify-between">
          <div className="text-gray-700 dark:text-gray-300 font-montserrat text-sm">
            {!loading && data && data.length > 0 && (
              <>
                {pagination.total === 1 
                  ? t("found_one_subject") 
                  : t("found_subjects", { count: pagination.total })}
                {lastKeyword && <span> para <span className="font-medium">"{lastKeyword}"</span></span>}
              </>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {!loading && data && data.length > 0 && (
              <button
                onClick={handleDownloadCSV}
                className="flex items-center px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex-shrink-0"
                title={`${t("export", "Exportar")} .csv`}
              >
                <FiDownload className="mr-1.5 h-4 w-4" />
                {t("export", "Exportar")}
              </button>
            )}
            <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} disabled={loading} />
          </div>
        </div>
        
        {/* Mobile: Controls only */}
        <div className="flex sm:hidden items-center justify-end gap-2">
          {/* Sort Dropdown - Mobile */}
          <div className="flex-1">
            <SortDropdown 
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSortChange={handleSortChange}
              hasSearchQuery={!!searchQuery}
              disabled={loading}
            />
          </div>
          
          {!loading && data && data.length > 0 && (
            <button
              onClick={handleDownloadCSV}
              className="flex items-center px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex-shrink-0"
              title={`${t("export", "Exportar")} .csv`}
            >
              <FiDownload className="mr-1.5 h-4 w-4" />
              {t("export", "Exportar")}
            </button>
          )}
          <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} disabled={loading} />
        </div>
        
        {/* Mobile: Results count on bottom */}
        <div className="flex sm:hidden">
          <div className="text-gray-700 dark:text-gray-300 font-montserrat text-sm">
            {!loading && data && data.length > 0 && (
              <>
                {pagination.total === 1 
                  ? t("found_one_subject") 
                  : t("found_subjects", { count: pagination.total })}
                {lastKeyword && <span> para <span className="font-medium">"{lastKeyword}"</span></span>}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters */}
      {!hideActiveFilters && (
        <div className="flex items-center justify-between my-2">
          <ActiveFilters
            filters={getActiveFiltersObject()}
            onRemoveFilter={handleRemoveFilter}
            onClearAll={handleClearAllFilters}
            insideCounty={false}
            facets={{}}
          />
        </div>
      )}
      
      {/* Results */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner text="A carregar assuntos..." color="text-sky-700" textClass="text-sky-700 font-light text-sm" />
        </div>
      ) : (
        <>
          {(!data || data.length === 0) && (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
              <div className="text-gray-400 mb-3"><RiQuestionMark size={48} className="mx-auto" /></div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">Nenhum assunto encontrado</h3>
              <p className="text-gray-500">Este participante ainda não possui assuntos registados.</p>
            </div>
          )}
          
          {data && data.length > 0 && (
            <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col space-y-4"}`}>
              {data.map((assunto, index) => (
                <GenericResultCard
                  key={assunto.id}
                  result={{
                    ...assunto,
                    ata: assunto.ata || {},
                  }}
                  index={index}
                  type="subject"
                  deliberacao={true}
                  showMunicipio={false}
                  showDate={true}
                  useLinks={false}
                  viewMode={viewMode}
                  onClick={() => setSelectedAssuntoId(assunto.id)}
                  showParticipantVote={true}
                  viewLocation="participante"
                />
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Pagination */}
      {pagination.pages > 1 && (
        <Pagination
          currentPage={pagination.page}
          totalPages={pagination.pages}
          handlePageChange={handlePageChange}
          paginationItems={getPaginationItems(pagination.page, pagination.pages)}
        />
      )}
      
      {pagination.total > 0 && (
        <div className="mt-6 mb-10 text-center text-sm text-gray-600 font-montserrat">
          {t("showing_results", {
            start: ((pagination.page - 1) * pagination.per_page) + 1,
            end: Math.min(pagination.page * pagination.per_page, pagination.total),
            total: pagination.total
          })}
        </div>
      )}

      {/* Assunto Modal */}
      <AnimatePresence>
        {selectedAssuntoId && (
          <AssuntoModal
            assuntoId={selectedAssuntoId}
            onClose={() => setSelectedAssuntoId(null)}
            API_URL={API_URL}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ParticipanteAssuntos;
