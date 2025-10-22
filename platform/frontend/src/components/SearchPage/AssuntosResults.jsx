import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { FiAlertCircle, FiSearch, FiSidebar, FiChevronDown, FiDownload, FiFilter } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import GenericResultCard from "./GenericResultCard";
import LoadingSpinner from "../common/LoadingSpinner";
import AssuntoModal from "../PublicAtaPage/AssuntoModal";
import ViewSwitcher from "./ViewSwitcher";
import ActiveFilters from "../common/search/ActiveFilters";
import SortDropdown from "./SortDropdown";
import Facet from "../common/search/Facet";
import { RiQuestionMark, RiSearchLine } from "react-icons/ri";
import Pagination from "../common/Pagination";
import ResultsInfo from "./ResultsInfo";
import { set } from "date-fns";

const AssuntosResults = ({ 
  searchProps,
  isLoading, 
  viewMode, 
  setViewMode,
}) => {
  const { t } = useTranslation();
  const [selectedAssuntoId, setSelectedAssuntoId] = useState(null);
  const [position, setPosition] = useState(0);
  const [currentUrl, setCurrentUrl] = useState("");
  const API_URL = import.meta.env.VITE_API_URL;

  const search_text = t("performing_search", { search: searchProps.usedFiltersState?.keyword || "assuntos" });

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
  
  return (
    <div id="search-results" className="dark:bg-gray-800 font-montserrat">
      <div className="container mx-auto p-0 font-montserrat">
        {searchProps.errorMessage && (
          <div className="my-6 p-4 bg-red-100 text-red-700 rounded-md">
            {searchProps.errorMessage}
          </div>
        )}
        
        {isLoading ? (
          <LoadingSpinner
            text={search_text}
            textClass="font-montserrat"
          />
        ) : searchProps.results && searchProps.results.length > 0 ? (
          <div className="flex flex-col md:flex-row">
            {/* Facet Panel */}
            <Facet
               isGridLoading={isLoading}
              isShown={searchProps.showFacet}
              toggleFacet={searchProps.toggleFacet}
              facets={searchProps.facets}
              yearFilter={searchProps.yearFilter}
              participanteFilter={searchProps.usedFiltersState?.participanteId || []}
              topicoFilter={searchProps.usedFiltersState?.topico || []}
              municipioFilter={searchProps.usedFiltersState?.municipioId || ""}
              aprovadoFilter={searchProps.usedFiltersState?.aprovado || ""}
              partyFilter={searchProps.usedFiltersState?.party || ""}
              availableYears={searchProps.availableYears}
              availableParticipants={searchProps.availableParticipants}
              availableTopicos={searchProps.topicos}
              availableMunicipios={searchProps.municipios}
              availableParty={searchProps.availableParty}
              participantsLogic={searchProps.participantsLogic}
              topicsLogic={searchProps.topicsLogic}
              onParticipantsLogicChange={searchProps.handleParticipantsLogicChange}
              onTopicsLogicChange={searchProps.handleTopicsLogicChange}
              handleYearFilterChange={searchProps.handleYearFilterChange}
              handleAprovadoFilterChange={searchProps.handleAprovadoFilterChange}
              handleParticipanteFilterChange={searchProps.handleParticipanteFilterChange}
              handleTopicoFilterChange={searchProps.handleTopicoFilterChange}
              handleMunicipioFilterChange={searchProps.handleMunicipioFilterChange}
              handlePartyFilterChange={searchProps.handlePartyFilterChange}
              clearFilters={searchProps.onClearFilters}
              applyFilters={searchProps.applyFilters}
              searchQuery={searchProps.usedFiltersState?.keyword || ""}
              handleSearchQueryChange={() => {}}
              handleSearchSubmit={() => {}}
              showTipoFilter={false}
              showParticipanteFilter={true}
              showPartyFilter={true}
              showAprovadoFilter={true}
              startDate={searchProps.startDate}
              endDate={searchProps.endDate}
              onDateRangeChange={searchProps.onDateRangeChange}
              showDateRange={searchProps.showDateRange || true}
            />
            
            {/* Main Content */}
            <div className={`flex-1 relative transition-all duration-400 ease-in-out ${searchProps.showFacet ? 'md:ml-4' : ''}`}>
              {/* Floating Facet Button for Mobile */}
              {!searchProps.showFacet && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={searchProps.toggleFacet}
                  className="fixed bottom-8 left-4 md:hidden p-3 cursor-pointer bg-sky-700 text-white rounded-md shadow-lg hover:bg-sky-800 transition-colors duration-300 z-40"
                  aria-label="Open filters"
                >
                  <FiFilter size={24} />
                </motion.button>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {/* Desktop: Results count and controls on same row */}
                <div className="hidden sm:flex sm:items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* Toggle Facet Button - Desktop */}
                    {!searchProps.showFacet && (
                      <motion.button
                        onClick={searchProps.toggleFacet}
                        className="z-20 text-sm cursor-pointer bg-sky-700 hover:bg-sky-800 text-white py-2 px-2 rounded-md shadow-md border-l-2 border-sky-700 border-l-sky-900 flex flex-shrink-0"
                      >
                        <FiSidebar className="mr-1" />
                        <FiChevronDown className="rotate-[-90deg]" />
                      </motion.button>
                    )}
                    <div className="text-gray-700 dark:text-gray-300 font-montserrat text-sm">
                      {searchProps.totalResults === 1 
                        ? t("found_one_subject_for", { search: searchProps.usedFiltersState?.keyword ? `"${searchProps.usedFiltersState.keyword}"` : "" })
                        : t("found_subjects_for", { count: searchProps.totalResults, search: searchProps.usedFiltersState?.keyword ? `"${searchProps.usedFiltersState.keyword}"` : "" })}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <SortDropdown 
                      sortBy={searchProps.usedFiltersState?.sortBy || "score"}
                      sortOrder={searchProps.usedFiltersState?.sortOrder || "desc"}
                      onSortChange={searchProps.onSortChange}
                      hasSearchQuery={!!searchProps.usedFiltersState?.keyword?.trim()}
                    />
                    {!isLoading && searchProps.totalResults > 0 && (
                      <button
                        onClick={searchProps.handleDownloadCSVSubject}
                        className="flex items-center px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex-shrink-0"
                        title={`${t("export", "Exportar")} .csv`}
                      >
                        <FiDownload className="mr-1.5 h-4 w-4" />
                        {t("export", "Exportar")}
                      </button>
                    )}
                    <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                  </div>
                </div>
                
                {/* Mobile: Controls only */}
                <div className="flex sm:hidden items-center justify-end gap-2">
                  {/* Sort Dropdown - Mobile */}
                  <div className="flex-1">
                    <SortDropdown 
                      sortBy={searchProps.usedFiltersState?.sortBy || "score"}
                      sortOrder={searchProps.usedFiltersState?.sortOrder || "desc"}
                      onSortChange={searchProps.onSortChange}
                      hasSearchQuery={!!searchProps.usedFiltersState?.keyword?.trim()}
                    />
                  </div>
                  
                  {!isLoading && searchProps.totalResults > 0 && (
                    <button
                      onClick={searchProps.handleDownloadCSVSubject}
                      className="flex items-center px-3 py-1.5 text-xs bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors duration-200 flex-shrink-0"
                      title={`${t("export", "Exportar")} .csv`}
                    >
                      <FiDownload className="mr-1.5 h-4 w-4" />
                      {t("export", "Exportar")}
                    </button>
                  )}
                  <ViewSwitcher viewMode={viewMode} setViewMode={setViewMode} />
                </div>
                
                {/* Mobile: Results count on bottom */}
                <div className="flex sm:hidden">
                  <div className="text-gray-700 dark:text-gray-300 font-montserrat text-sm">
                    {searchProps.totalResults === 1 
                      ? t("found_one_subject_for", { search: searchProps.usedFiltersState?.keyword ? `"${searchProps.usedFiltersState.keyword}"` : "" })
                      : t("found_subjects_for", { count: searchProps.totalResults, search: searchProps.usedFiltersState?.keyword ? `"${searchProps.usedFiltersState.keyword}"` : "" })}
                  </div>
                </div>
              </div>

              {/* Active Filters */}
              <div className="flex items-center justify-between my-2">
                <ActiveFilters 
                  filters={searchProps.usedFiltersState} 
                  onRemoveFilter={searchProps.onRemoveFilter} 
                  onClearAll={searchProps.onClearAllFilters}
                  facets={searchProps.facets}
                />
              </div>
              <div className={`${
                viewMode === "grid" 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                  : "flex flex-col space-y-4"
              }`}>
                {searchProps.results && searchProps.results.map((result, index) => (
                  <GenericResultCard 
                    key={result.id} 
                    result={result} 
                    index={index}
                    type="subject"
                    deliberacao={true}
                    useLinks={false}
                    position={result.position}
                    showSeeButton={true}
                    onClick={() => {
                      setSelectedAssuntoId(result.id)
                      setPosition(result.position)
                      setCurrentUrl(window.location.href)
                    }}
                    showVoting={true}
                    viewMode={viewMode}
                    viewLocation="search"
                  />
                ))}
              </div>

              {/* Pagination and Results Info */}
              {searchProps.results.length > 0 && searchProps.totalPages > 1 && (
                 <Pagination
                  currentPage={searchProps.currentPage}
                  totalPages={searchProps.totalPages}
                  handlePageChange={searchProps.handlePageChange}
                  paginationItems={getPaginationItems(searchProps.currentPage, searchProps.totalPages)}
                />
              )}

              {searchProps.results.length > 0 && (
                <ResultsInfo
                  currentPage={searchProps.currentPage}
                  perPage={searchProps.perPage}
                  totalResults={searchProps.totalResults}
                />
              )}
            </div>
          </div>
        ) : searchProps.hasSearched ? (
          <div className="flex flex-col md:flex-row">
            {/* Facet Panel */}
            <Facet
              isGridLoading={isLoading}
              isShown={searchProps.showFacet}
              toggleFacet={searchProps.toggleFacet}
              facets={searchProps.facets}
              yearFilter={searchProps.yearFilter}
              participanteFilter={searchProps.usedFiltersState?.participanteId || []}
              topicoFilter={searchProps.usedFiltersState?.topico || []}
              municipioFilter={searchProps.usedFiltersState?.municipioId || ""}
              aprovadoFilter={searchProps.usedFiltersState?.aprovado || ""}
              partyFilter={searchProps.usedFiltersState?.party || ""}
              availableYears={searchProps.availableYears}
              availableParticipants={searchProps.availableParticipants}
              availableTopicos={searchProps.topicos}
              availableMunicipios={searchProps.municipios}
              availableParty={searchProps.availableParty}
              participantsLogic={searchProps.participantsLogic}
              topicsLogic={searchProps.topicsLogic}
              onParticipantsLogicChange={searchProps.handleParticipantsLogicChange}
              onTopicsLogicChange={searchProps.handleTopicsLogicChange}
              handleYearFilterChange={searchProps.handleYearFilterChange}
              handleTipoFilterChange={searchProps.handleTipoFilterChange}
              handleAprovadoFilterChange={searchProps.handleAprovadoFilterChange}
              handleParticipanteFilterChange={searchProps.handleParticipanteFilterChange}
              handleTopicoFilterChange={searchProps.handleTopicoFilterChange}
              handleMunicipioFilterChange={searchProps.handleMunicipioFilterChange}
              handlePartyFilterChange={searchProps.handlePartyFilterChange}
              clearFilters={searchProps.onClearFilters}
              applyFilters={searchProps.applyFilters}
              searchQuery={searchProps.usedFiltersState?.keyword || ""}
              handleSearchQueryChange={() => {}}
              handleSearchSubmit={() => {}}
              showTipoFilter={false}
              showParticipanteFilter={true}
              showPartyFilter={true}
              showAprovadoFilter={true}
              startDate={searchProps.startDate}
              endDate={searchProps.endDate}
              onDateRangeChange={searchProps.onDateRangeChange}
              showDateRange={searchProps.showDateRange || true}
            />
            
            {/* Main Content */}
            <div className={`flex-1 relative transition-all duration-400 ease-in-out ${searchProps.showFacet ? 'md:ml-4' : ''}`}>
              {/* Floating Facet Button for Mobile */}
              {!searchProps.showFacet && (
                <motion.button
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  onClick={searchProps.toggleFacet}
                  className="fixed bottom-8 left-4 md:hidden p-3 cursor-pointer bg-sky-700 text-white rounded-md shadow-lg hover:bg-sky-800 transition-colors duration-300 z-40"
                  aria-label="Open filters"
                >
                  <FiFilter size={24} />
                </motion.button>
              )}

              {/* Toggle Facet Button - Desktop */}
              {!searchProps.showFacet && (
                <div className="hidden md:flex items-center justify-start mb-4">
                  <motion.button
                    onClick={searchProps.toggleFacet}
                    className="z-20 text-sm cursor-pointer bg-sky-700 hover:bg-sky-800 text-white py-2 px-2 rounded-md shadow-md border-l-2 border-sky-700 border-l-sky-900 flex flex-shrink-0"
                  >
                    <FiSidebar className="mr-1" />
                    <FiChevronDown className="rotate-[-90deg]" />
                  </motion.button>
                </div>
              )}
              
              {/* Active Filters Display */}
              <div className="flex items-start justify-start gap-2 mb-4">
                <ActiveFilters 
                  filters={searchProps.usedFiltersState} 
                  onRemoveFilter={searchProps.onRemoveFilter} 
                  onClearAll={searchProps.onClearAllFilters}
                  facets={searchProps.facets}
                />
              </div>

              <div className="text-center py-30 rounded-md">
                <div className="flex items-center justify-center mb-2">
                <RiQuestionMark className="text-6xl text-gray-800 " />
                </div>
                <h1 className="text-2xl font-medium text-gray-800">{t("no_results")}</h1>
                <p className="text-gray-500 text-lg mt-2">
                  {searchProps.usedFiltersState.keyword === "" ? t("no_assuntos_found_simple")
                  : (
                    <>
                      {t("no_assuntos_found")}{" "}
                      <span className="font-medium italic">"{searchProps.usedFiltersState.keyword}"</span>
                    </>
                  )}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  {t("search_suggestions", "Verifique se há erros ortográficos ou tente usar palavras-chave diferentes.")} <br />
                  {t("filter_suggestions", "Pode também experimentar os diferentes filtros, para obter resultados mais precisos.")}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-30 rounded-md">
            <div className="flex items-center justify-center mb-2">
              <RiSearchLine className="text-2xl text-gray-800 " />
            </div>
            <h1 className="text-xl font-medium text-gray-800">{t("search_subjects")}</h1>
            <p className="text-gray-500 text-md mt-2">
              {t("search_subjects_description")}
            </p>
          </div>
        )}
      </div>

      {/* Assunto Modal */}
      <AnimatePresence>
        {selectedAssuntoId && (
          <AssuntoModal
            assuntoId={selectedAssuntoId}
            position={position}
            currentUrl={currentUrl}
            onClose={() => 
              {setSelectedAssuntoId(null)
              setPosition(0)
              setCurrentUrl("")
              }}
            API_URL={API_URL}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssuntosResults;
