import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiSidebar, FiChevronDown, FiDownload, FiSearch, FiFilter, FiFile, FiList } from "react-icons/fi";
import { motion } from "framer-motion";
import GenericResultCard from "../SearchPage/GenericResultCard";
import LoadingSpinner from "../common/LoadingSpinner";
import ViewSwitcher from "../SearchPage/ViewSwitcher";
import ActiveFilters from "../common/search/ActiveFilters";
import Pagination from "../common/Pagination";
import SortDropdown from "../SearchPage/SortDropdown";

const TopicAtas = ({ 
  loading,
  data,
  facets,
  pagination,
  viewMode, 
  setViewMode,
  showFacet,
  toggleFacet,
  yearFilter,
  tipoFilter,
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
  hideActiveFilters = false,
  type,
  handleTabChange
}) => {
  const { t } = useTranslation();
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);
  
  const getActiveFiltersObject = () => {
    return {
      yearFilter: yearFilter,
      tipoFilter: tipoFilter,
      keyword: lastKeyword,
      startDate: startDate,
      endDate: endDate
    };
  };
  
  const handleLocalSearch = (e) => {
    e.preventDefault();
    // Call parent's handleSearch with the search query
    setLocalSearchQuery(localSearchQuery);
    // Update filters with the search query
    const params = new URLSearchParams(window.location.search);
    params.set("q", localSearchQuery);
    params.set("page", "1");
    window.history.pushState({}, '', `${window.location.pathname}?${params}`);
    handleSearch(e);
  };

  // Update local search query when parent's query changes
  React.useEffect(() => {
    setLocalSearchQuery(searchQuery);
  }, [searchQuery]);

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
                <FiFile className="mr-1.5" /> {t("minutes")}
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
                <FiList className="mr-1.5" /> {t("subjects")}
              </button>
            </div>
            
            <form onSubmit={handleLocalSearch} className="flex-1 sm:flex-none sm:w-80">
              <div className="flex flex-row gap-0">
                <div className="relative flex-grow">
                  <input 
                    type="text" 
                    name="search"
                    placeholder={t("search_minutes_placeholder", "Pesquisar atas...")} 
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
      
      {/* Results count */}
      
      {/* Action Buttons and Filters */}
      <div className="flex flex-col gap-3">
        {/* Desktop: Results count and controls on same row */}
        <div className="hidden sm:flex sm:items-center justify-between">
          <div className="text-gray-700 dark:text-gray-300 font-montserrat text-sm">
            {!loading && pagination.total > 0 && (
              <>
                {pagination.total === 1 
                  ? t("found_one_minute") 
                  : t("found_minutes", { count: pagination.total })}
                {lastKeyword && <span> {t("for")} <span className="font-medium">"{lastKeyword}"</span></span>}
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
            {!loading && pagination.total > 0 && (
              <>
                {pagination.total === 1 
                  ? t("found_one_minute") 
                  : t("found_minutes", { count: pagination.total })}
                {lastKeyword && <span> {t("for")} <span className="font-medium">"{lastKeyword}"</span></span>}
              </>
            )}
          </div>
        </div>
      </div>

        {!hideActiveFilters && (
          <div className="flex items-center justify-between my-2">
              <ActiveFilters
                filters={getActiveFiltersObject()}
                onRemoveFilter={handleRemoveFilter}
                onClearAll={handleClearAllFilters}
                insideCounty={false}
                facets={facets}
              />

          </div>
        )}
      {/* Results */}
      {loading ? (
        <div className="py-12 flex justify-center">
          <LoadingSpinner text={t("loading_minutes", "A carregar atas...")} color="text-sky-700" textClass="text-sky-700 font-light text-sm" />
        </div>
      ) : (
        <>  
          {pagination.total === 0 && (
              <div className="text-center py-20  rounded-md mt-4">
                <div className="flex items-center justify-center">
                  {/* <RiQuestionMarkLine className="text-6xl text-gray-400" /> */}
                </div>
                <h1 className="text-2xl font-medium">{t("no_results")}</h1>
                <p className="text-gray-500 text-lg mt-2">
                  {lastKeyword === "" ? (
                    t("no_minutes_found_simple", "Não foram encontradas atas.")
                  ) : (
                    <>
                      {t("no_minutes_found", "Não foram encontradas atas")}{" "}
                      <span className="font-medium italic">"{lastKeyword}"</span>
                    </>
                  )}
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {t("search_suggestions", "Verifique se há erros ortográficos ou tente usar palavras-chave diferentes.")} <br />
                  {t("filter_suggestions", "Pode também experimentar os diferentes filtros, para obter resultados mais precisos.")}
                </p>
              </div>
          )}
          
          {data && data.length > 0 && (
            <div className={`${viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col space-y-4"}`}>
              {data.map((ata, index) => (
                <GenericResultCard
                  key={ata.id}
                  result={ata}
                  index={index}
                  type="minute"
                  showMunicipio={true}
                  showDate={true}
                  showLocation={true}
                  useLinks={true}
                  showSeeButton={true}
                  viewMode={viewMode}
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
    </div>
  );
};

export default TopicAtas;