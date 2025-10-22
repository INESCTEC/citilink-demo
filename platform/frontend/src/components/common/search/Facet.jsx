import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiChevronLeft, FiFilter, FiSliders, FiX, FiCheck, FiArrowDown, FiArrowUp, FiSearch, FiSidebar, FiCalendar } from "react-icons/fi";
import { useTranslation } from 'react-i18next';
import { getPartyColorClass } from "../../../utils/PartyColorMapper";
import { getTopicoIcon } from "../../../utils/iconMappers";
import { getLocalizedTopicName, getLocalizedMunicipioName } from "../../../utils/translationHelpers";
import DateRangeSlider from './DateRangeSlider';
import DateModeToggle from "../toggles/DateModeToggle";
import LogicSwitchToggle from "../toggles/LogicSwitchToggle";
import { SkeletonItem, SkeletonList } from "../skeletons/facetSkeleton";
import { subDays, subMonths, subYears, format, parse } from "date-fns";

// Add custom scrollbar styles
const customScrollbarStyle = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
};


// Extracted FacetContent component for reuse between desktop and mobile
const FacetContent = ({
  isGridLoading,
  safeToggleFacet,
  t,
  leftSideOutsideComponent,
  leftSideComponent,
  showDateRange,
  dateMode,
  setDateMode,
  datePresets,
  selectedDatePreset,
  handleDatePresetChange,
  startDate,
  endDate,
  handleDateRangeChange,
  showTipoFilter,
  availableTipos,
  tipoFilter,
  handleTipoChange,
  facets,
  availableMunicipios,
  municipioFilter,
  handleMunicipioChange,
  showPartyFilter,
  availableParty,
  partyFilter,
  handlePartyChange,
  showParticipanteFilter,
  showTopicoFilter,
  normalizedParticipanteFilter,
  participantsLogic,
  onParticipantsLogicChange,
  participantSearchTerm,
  setParticipantSearchTerm,
  availableParticipants,
  filteredParticipants,
  handleParticipanteChange,
  applyFilters,
  yearFilter,
  participanteFilter,
  topicoFilter,
  normalizedTopicoFilter,
  topicsLogic,
  onTopicsLogicChange,
  topicSearchTerm,
  setTopicSearchTerm,
  availableTopicos,
  filteredTopics,
  handleTopicoChange,
  showAprovadoFilter,
  aprovadoFilter,
  handleAprovadoChange,
  rightSideComponent,
  handleClearFilters,
  isMobile,
  availableYears,
  handleYearChange,
  setSelectedDatePreset,
  isInitialCustomPeriod,
  setIsInitialCustomPeriod,
  currentLanguage
}) => {
  return (
    <div className={`relative bg-white dark:bg-sky-950 shadow-md pb-4 ${isMobile ? 'rounded-t-md max-h-[85vh] flex flex-col' : 'rounded-s-md'}`}>
      {/* Header */}
      <div className={`flex items-center justify-between mb-4 bg-sky-700 dark:bg-sky-600 p-4 py-0.5 ${isMobile ? 'rounded-t-md' : ''}`}>
        <h3 className="text-xs font-medium text-white flex items-center">
          <FiFilter className="mr-2" />
          {t('filters', 'Filters')}
        </h3>
        <button
          onClick={safeToggleFacet}
          className="text-white cursor-pointer text-sm flex items-center focus:outline-none py-1.5"
        >
          {isMobile ? (
            <FiX className="w-5 h-5" />
          ) : (
            <>
              <FiSidebar className="" />
              <FiChevronLeft />
            </>
          )}
        </button>
      </div>

      {/* Custom components (optional) */}
      {leftSideOutsideComponent && <div className="mb-2 px-4">{leftSideOutsideComponent}</div>}
      {leftSideComponent && <div className="mb-2 px-4">{leftSideComponent}</div>}

      {/* Scrollable content area for mobile */}
      <div className={`${isMobile ? 'flex-1 overflow-y-auto' : ''}`} style={isMobile ? customScrollbarStyle : {}}>
        {/* Filters as always-visible lists */}
        <div className="space-y-4 px-4">
          {/* Date Mode Toggle and Conditional Filter UI */}
          {showDateRange && (
            <div className="mb-4">
              {isGridLoading ? (
                <></>
              ) : (
                <DateModeToggle mode={dateMode} onChange={setDateMode} />
              )}
              {dateMode === 'period' ? (
                isGridLoading ? (
                  <SkeletonList itemCount={6} showCounts={true} />
                ) : (
                  <>
                    <ul className={`border border-gray-200 bg-white divide-y divide-gray-100 ${selectedDatePreset === "custom_period" ? 'mb-0' : 'mb-3'}`}> 
                      {datePresets.map(preset => (
                        <li
                          key={preset.value}
                          className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${selectedDatePreset === preset.value ? 'text-sky-700 font-semibold' : ''}`}
                          onClick={() => handleDatePresetChange(preset.value)}
                        >
                          <div className="flex items-center gap-x-2">
                            {selectedDatePreset === preset.value && (
                              <FiCheck className="w-4 h-4 text-sky-600" />
                            )}
                            <span>{preset.label}</span>
                          </div>
                          {preset.count !== undefined && preset.value !== 'custom' && preset.value !== "all" && preset.count !== 0 && (
                            <span className="text-xs text-gray-500 font-mono">
                              ({preset.count})
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                    {/* Only show the calendar when custom period is selected */}
                    {/* {selectedDatePreset === "custom_period" && ( */}
                      <div className="bg-white rounded-b-md border-b border-s border-e border-gray-200 p-3">
                        <DateRangeSlider 
                          startDate={startDate}
                          endDate={endDate}
                          onDateChange={(start, end) => {
                            // If this is the initial custom period selection, just update the flag and don't trigger search
                            if (isInitialCustomPeriod) {
                              setIsInitialCustomPeriod(false);
                              return;
                            }
                            setSelectedDatePreset("custom_period");
                            handleDateRangeChange(start, end);
                          }}
                          isEmbed={true}
                          key={`date-range-${startDate || 'start'}-${endDate || 'end'}`}
                        />
                      </div>
                    {/* )} */}
                  </>
                )
              ) : (
                isGridLoading ? (
                  <SkeletonList itemCount={6} showCounts={true} />
                ) : (
                  <ul className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
                    <li
                      className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${yearFilter === '' ? 'text-sky-700 font-semibold' : ''}`}
                      onClick={() => handleYearChange('')}
                    >
                      <div className="flex items-center gap-x-2">
                        {yearFilter === '' && (
                          <FiCheck className="w-4 h-4 text-sky-600" />
                        )}
                        <span>{t("all_years")}</span>
                      </div>
                    </li>
                    {(availableYears || [])
                      .map(year => ({
                        year,
                        facet: facets?.years?.find(f => f._id == year),
                        count: facets?.years?.find(f => f._id == year)?.count || 0
                      }))
                      .sort((a, b) => b.year - a.year)
                      .map(({ year, facet, count }) => {
                        return (
                          <li
                            key={year}
                            className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${yearFilter == year ? 'text-sky-700 font-semibold' : ''}`}
                            onClick={() => handleYearChange(year)}
                          >
                            <div className="flex items-center gap-x-2">
                              {yearFilter == year && (
                                <FiCheck className="w-4 h-4 text-sky-600" />
                              )}
                              <span>{year}</span>
                            </div>
                            <span className="font-mono text-xs text-gray-500">
                              {count === 0 ? "" : `(${count})`}
                            </span>
                          </li>
                        );
                      })}
                  </ul>
                )
              )}
            </div>
          )}

          {/* Type */}
          {showTipoFilter && (
            <div className="mb-4">
              {isGridLoading ? (
                <SkeletonList itemCount={4} showCounts={true} />
              ) : (
                <ul className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
                  <li
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${tipoFilter === '' ? 'text-sky-700 font-semibold' : ''}`}
                    onClick={() => handleTipoChange('')}
                  >
                    <div className="flex items-center gap-x-2">
                      {tipoFilter === '' && (
                        <FiCheck className="w-4 h-4 text-sky-600" />
                      )}
                      <span>{t("all_types")}</span>
                    </div>
                  </li>
                  {(availableTipos || [])
                    .map(tipo => ({
                      tipo,
                      facet: facets?.tipos?.find(f => f._id === tipo),
                      count: facets?.tipos?.find(f => f._id === tipo)?.count || 0
                    }))
                    .sort((a, b) => a.tipo.localeCompare(b.tipo))
                    .map(({ tipo, facet, count }) => {
                      return (
                        <li
                          key={tipo}
                          className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${tipoFilter === tipo ? 'text-sky-700 font-semibold' : ''}`}
                          onClick={() => handleTipoChange(tipo)}
                        >
                          <div className="flex items-center gap-x-2">
                            {tipoFilter === tipo && (
                              <FiCheck className="w-4 h-4 text-sky-600" />
                            )}
                            <span>{t(tipo)}</span>
                          </div>
                          <span className="font-mono text-xs text-gray-500">
                            {count === 0 ? "" : `(${count})`}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}

          {/* Municipality Filter (single-select) */}
          {availableMunicipios && availableMunicipios.length > 0 && (
            <div className="mb-4">
              {isGridLoading ? (
                <SkeletonList itemCount={6} showCounts={true} />
              ) : (
                <ul className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
                  <li
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${municipioFilter === '' ? 'text-sky-700 font-semibold' : ''}`}
                    onClick={() => handleMunicipioChange('')}
                  >
                    <div className="flex items-center gap-x-2">
                      {municipioFilter === '' && (
                        <FiCheck className="w-4 h-4 text-sky-600" />
                      )}
                      <span>{t("all_counties")}</span>
                    </div>
                  </li>
                  {availableMunicipios
                    .map(municipio => ({
                      municipio,
                      facet: facets?.municipios?.find(f => f._id === municipio.id),
                      count: facets?.municipios?.find(f => f._id === municipio.id)?.count || 0
                    }))
                    .sort((a, b) => {
                      const aName = getLocalizedMunicipioName(a.municipio, currentLanguage);
                      const bName = getLocalizedMunicipioName(b.municipio, currentLanguage);
                      return aName.localeCompare(bName);
                    })
                    .map(({ municipio, facet, count }) => {
                      const isSelected = municipioFilter === municipio.id;
                      return (
                        <li
                          key={municipio.id}
                          className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${isSelected ? 'text-sky-700 font-semibold' : ''}`}
                          onClick={() => handleMunicipioChange(municipio.id)}
                        >
                          <div className="flex items-center gap-x-2">
                            {isSelected && (
                              <FiCheck className="w-4 h-4 text-sky-600" />
                            )}
                            <span>{getLocalizedMunicipioName(municipio, currentLanguage)}</span>
                          </div>
                          <span className="font-mono text-xs text-gray-500">
                            {count === 0 ? "" : `(${count})`}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}

          {/* Party Filter (single-select) */}
          {showPartyFilter && availableParty && availableParty.length > 0 && (
            <div className="mb-4">
              {isGridLoading ? (
                <SkeletonList itemCount={6} showCounts={true} />
              ) : (
                <ul className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
                  <li
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${partyFilter === '' ? 'text-sky-700 font-semibold' : ''}`}
                    onClick={() => handlePartyChange('')}
                  >
                    <div className="flex items-center gap-x-2">
                      {partyFilter === '' && (
                        <FiCheck className="w-4 h-4 text-sky-600" />
                      )}
                      <span>{t("all_parties")}</span>
                    </div>
                  </li>

                  {availableParty
                    .filter(party => !!party)
                    .map(party => ({
                      party,
                      facet: facets?.parties?.find(f => f._id === party),
                      count: facets?.parties?.find(f => f._id === party)?.count || 0
                    }))
                    .sort((a, b) => a.party.localeCompare(b.party))
                    .map(({ party, facet, count }) => {
                      const isSelected = partyFilter === party;
                      return (
                        <li
                          key={party}
                          className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${isSelected ? 'text-sky-700 font-semibold' : ''}`}
                          onClick={() => handlePartyChange(party)}
                        >
                          <div className="flex items-center gap-x-2">
                            {isSelected && (
                              <FiCheck className="w-4 h-4 text-sky-600" />
                            )}
                            <span className={`inline-block w-3 h-3 rounded-sm flex-shrink-0 ${getPartyColorClass(party)}`}></span>
                            <span>{party}</span>
                          </div>
                          <span className="font-mono text-xs text-gray-500">
                            {count === 0 ? "" : `(${count})`}
                          </span>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
          )}

          {/* Participants (multi-select) */}
          {showParticipanteFilter && (
            <div className="mb-4">
              {isGridLoading ? (
                <SkeletonList itemCount={8} showCounts={true} />
              ) : (
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                  <LogicSwitchToggle 
                    logic={participantsLogic}
                    onChange={onParticipantsLogicChange}
                    label={t("logic", "Lógica")}
                    disabled={normalizedParticipanteFilter.length <= 1}
                  />
                  
                  <div className="px-3 py-2 border-b border-gray-100">
                    <div className="relative">
                      <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <input
                        type="text"
                        value={participantSearchTerm}
                        onChange={(e) => setParticipantSearchTerm(e.target.value)}
                        placeholder={t("searchPage.search_participants", "Search participants...")}
                        className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                      />
                      {participantSearchTerm && (
                        <button
                          onClick={() => setParticipantSearchTerm("")}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                    <li
                      className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${normalizedParticipanteFilter.length === 0 ? 'text-sky-700 font-semibold' : ''}`}
                      onClick={() => {
                        setParticipantSearchTerm("");
                        if (applyFilters) {
                          applyFilters({
                            yearFilter,
                            tipoFilter,
                            municipioFilter,
                            participanteFilter: [],
                            topicoFilter,
                            partyFilter
                          });
                        }
                      }}
                    >
                      <div className="flex items-center gap-x-2">
                        {normalizedParticipanteFilter.length === 0 && (
                          <FiCheck className="w-4 h-4 text-sky-600" />
                        )}
                        <span>{t("all_participants")}</span>
                      </div>
                    </li>
                    {availableParticipants && availableParticipants.length > 0 ? (() => {
                      if (filteredParticipants.length === 0 && participantSearchTerm) {
                        return (
                          <li className="px-3 py-4 text-sm text-gray-500 text-center italic">
                            {t("no_participants_found", "No participants found")}
                          </li>
                        );
                      }
                      
                      return filteredParticipants
                        .map(p => ({
                          participant: p,
                          facet: facets?.participants?.find(f => f._id === p.id),
                          count: facets?.participants?.find(f => f._id === p.id)?.count || 0
                        }))
                        .sort((a, b) => b.count - a.count) 
                        .map(({ participant: p, facet, count }) => {
                          const isDisabled = count === 0;
                          const isSelected = normalizedParticipanteFilter.includes(p.id);
                          return (
                            <li
                              key={p.id}
                              className={`px-3 py-2 text-sm flex items-center justify-between ${
                                isDisabled 
                                  ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                                  : `cursor-pointer hover:bg-gray-50 ${isSelected ? 'text-sky-700 font-semibold' : ''}`
                              }`}
                              onClick={() => !isDisabled && handleParticipanteChange(p.id)}
                            >
                              <div className="flex items-center min-w-0 flex-1 gap-x-2">
                                {isSelected && !isDisabled && (
                                  <FiCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                                )}
                                <span className={`inline-block w-3 h-3 rounded-sm flex-shrink-0 ${getPartyColorClass(p.party)} ${isDisabled ? 'opacity-50' : ''}`}></span>
                                <span className={`truncate ${isDisabled ? 'text-gray-400' : ''}`}>
                                  {p.party ? `${p.name} (${p.party})` : p.name}
                                </span>
                              </div>
                              <span className={`font-mono text-xs flex-shrink-0 ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                                {count === 0 ? "" : `(${count})`}
                              </span>
                            </li>
                          );
                        });
                    })() : null
                    }
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Topics (multi-select) */}
          {showTopicoFilter && (
            <div className="mb-4">
              {isGridLoading ? (
                <SkeletonList itemCount={6} showCounts={true} />
              ) : (
                <div className="rounded-md border border-gray-200 bg-white overflow-hidden">
                <LogicSwitchToggle 
                  logic={topicsLogic}
                  onChange={onTopicsLogicChange}
                  label={t("logic", "Lógica")}
                  disabled={normalizedTopicoFilter.length <= 1}
                />
                
                <div className="px-3 py-2 border-b border-gray-100">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      value={topicSearchTerm}
                      onChange={(e) => setTopicSearchTerm(e.target.value)}
                      placeholder={t("searchPage.search_topics", "Search topics...")}
                      className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                    />
                    {topicSearchTerm && (
                      <button
                        onClick={() => setTopicSearchTerm("")}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                
                <ul className="max-h-60 overflow-y-auto divide-y divide-gray-100">
                  <li
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${normalizedTopicoFilter.length === 0 ? 'text-sky-700 font-semibold' : ''}`}
                    onClick={() => {
                      setTopicSearchTerm("");
                      if (applyFilters) {
                        applyFilters({
                          yearFilter,
                          tipoFilter,
                          municipioFilter,
                          participanteFilter,
                          topicoFilter: [],
                          partyFilter
                        });
                      }
                    }}
                  >
                    <div className="flex items-center gap-x-2">
                      {normalizedTopicoFilter.length === 0 && (
                        <FiCheck className="w-4 h-4 text-sky-600" />
                      )}
                      <span>{t("all_topics")}</span>
                    </div>
                  </li>
                  {availableTopicos && availableTopicos.length > 0 ? (() => {
                      if (filteredTopics.length === 0 && topicSearchTerm) {
                        return (
                          <li className="px-3 py-4 text-sm text-gray-500 text-center italic">
                            {t("no_topics_found", "No topics found")}
                          </li>
                        );
                      }
                      
                      return filteredTopics
                        .map(t => ({
                          topico: t,
                          facet: facets?.topicos?.find(f => f._id === t.id),
                          count: facets?.topicos?.find(f => f._id === t.id)?.count || 0
                        }))
                        .sort((a, b) => getLocalizedTopicName(a.topico, currentLanguage).localeCompare(getLocalizedTopicName(b.topico, currentLanguage)))
                      .map(({ topico: t, facet, count }) => {
                        const isDisabled = count === 0;
                        const isSelected = normalizedTopicoFilter.includes(t.id);
                        // console.log("Rendering topic:", t, "Selected:", isSelected, "Disabled:", isDisabled, "Count:", count);
                        return (
                          <li
                            key={t.id}
                            className={`px-3 py-2 text-sm flex items-center justify-between ${
                              isDisabled 
                                ? 'opacity-50 cursor-not-allowed bg-gray-50' 
                                : `cursor-pointer hover:bg-gray-50 ${isSelected ? 'text-sky-700 font-semibold' : ''}`
                            }`}
                            onClick={() => !isDisabled && handleTopicoChange(t.id)}
                          >
                            <div className="flex items-center gap-x-2">
                              {isSelected && !isDisabled && (
                                <FiCheck className="w-4 h-4 text-sky-600" />
                              )}
                              <span className={`flex w-4 h-4 items-center justify-center ${isDisabled ? 'opacity-50' : ''}`}>
                                {getTopicoIcon(getLocalizedTopicName(t, currentLanguage), "w-4 h-4")}
                              </span>
                              <span className={isDisabled ? 'text-gray-400' : ''}>{getLocalizedTopicName(t, currentLanguage)}</span>
                            </div>
                            <span className={`font-mono text-xs ${isDisabled ? 'text-gray-400' : 'text-gray-500'}`}>
                              {count === 0 ? "" : `(${count})`}
                            </span>
                          </li>
                        );
                      });
                    })() : null
                  }
                </ul>
              </div>
            )}
          </div>
          )}

          {/* Aprovado Filter (single-select) - Only for Assuntos search */}
          {showAprovadoFilter && (
            <div className="mb-4">
              {isGridLoading ? (
                <SkeletonList itemCount={3} showCounts={true} />
              ) : (
                <ul className="max-h-60 overflow-y-auto rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
                  <li
                    className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${aprovadoFilter === '' ? 'text-sky-700 font-semibold' : ''}`}
                    onClick={() => handleAprovadoChange('')}
                  >
                    <div className="flex items-center gap-x-2">
                      {aprovadoFilter === '' && (
                        <FiCheck className="w-4 h-4 text-sky-600" />
                      )}
                      <span>{t("all_statuses")}</span>
                    </div>
                  </li>

                  {facets?.aprovado?.find(f => f._id === true) && (
                    <li
                      className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${aprovadoFilter === 'true' ? 'text-sky-700 font-semibold' : ''}`}
                      onClick={() => handleAprovadoChange('true')}
                    >
                      <div className="flex items-center gap-x-2">
                        {aprovadoFilter === 'true' && (
                          <FiCheck className="w-4 h-4 text-sky-600" />
                        )}
                        <span className="inline-block w-3 h-3 rounded-sm bg-green-500 flex-shrink-0"></span>
                        <span>{t("approved")}</span>
                      </div>
                      <span className="font-mono text-xs text-gray-500">
                        ({facets.aprovado.find(f => f._id === true)?.count || 0})
                      </span>
                    </li>
                  )}

                  {facets?.aprovado?.find(f => f._id === false) && (
                    <li
                      className={`px-3 py-2 cursor-pointer text-sm flex items-center justify-between hover:bg-gray-50 ${aprovadoFilter === 'false' ? 'text-sky-700 font-semibold' : ''}`}
                      onClick={() => handleAprovadoChange('false')}
                    >
                      <div className="flex items-center gap-x-2">
                        {aprovadoFilter === 'false' && (
                          <FiCheck className="w-4 h-4 text-sky-600" />
                        )}
                        <span className="inline-block w-3 h-3 rounded-sm bg-red-500 flex-shrink-0"></span>
                        <span>{t("rejected")}</span>
                      </div>
                      <span className="font-mono text-xs text-gray-500">
                        ({facets.aprovado.find(f => f._id === false)?.count || 0})
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom right component */}
      {rightSideComponent && <div className="mt-4 px-4">{rightSideComponent}</div>}

      {/* Actions - Only Clear Filters button now */}
      <div className={`mt-6 space-y-2 px-4 ${isMobile ? 'pb-safe' : ''}`}>
        {isGridLoading ? (
          <div className="w-full py-1.5 px-4">
            <SkeletonItem width="w-full" height="h-8" />
          </div>
        ) : (
          <button
            onClick={handleClearFilters}
            className="w-full py-1.5 px-4 border uppercase tracking-widest border-gray-200 hover:border-gray-300 rounded-md text-xs text-gray-900 bg-gray-200 hover:bg-gray-300 cursor-pointer focus:outline-none focus:ring-1 focus:ring-sky-500"
          >
            {t('clear_filters')}
          </button>
        )}
      </div>
    </div>
  );
};

const Facet = ({
  isGridLoading,
  isShown,
  toggleFacet,
  yearFilter,
  tipoFilter,
  participanteFilter,
  topicoFilter,
  availableYears,
  availableTipos,
  availableParticipants,
  availableTopicos,
  availableParty,
  facets,
  municipioFilter,
  availableMunicipios,
  partyFilter,
  availableParties,
  aprovadoFilter,
  searchQuery = "",
  // Date range props
  startDate,
  endDate,
  onDateRangeChange,
  showDateRange = false, // Toggle to show/hide date range functionality
  // New props for AND/OR logic
  participantsLogic = "or",
  topicsLogic = "or",
  onParticipantsLogicChange,
  onTopicsLogicChange,

  clearFilters,
  applyFilters,
  showTipoFilter = true,
  showParticipanteFilter = true,
  showPartyFilter = true,
  showTopicoFilter = true,
  showAprovadoFilter = false,
  leftSideOutsideComponent,
  leftSideComponent,
  rightSideComponent,
}) => {
  const { t, i18n } = useTranslation();

  const [hasData, setHasData] = useState(true);
  const [selectedDatePreset, setSelectedDatePreset] = useState("all");
  const [participantSearchTerm, setParticipantSearchTerm] = useState("");
  const [topicSearchTerm, setTopicSearchTerm] = useState("");
  const [isInitialCustomPeriod, setIsInitialCustomPeriod] = useState(false);

  const [dateMode, setDateMode] = useState(() => {
    try {
      const stored = localStorage.getItem('facetDateMode');
      // console.log(stored === null ? "No stored value, defaulting to year" : `Stored value is: ${stored}`);
      return stored === null ? 'year' : stored;
    } catch {
      // console.log("Error accessing localStorage, defaulting to year");
      return 'year';
    }
  });

  // Save dateMode to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('facetDateMode', dateMode);
    } catch {}
  }, [dateMode]);

  // Memoized filtered participants for better performance
  const filteredParticipants = useMemo(() => {
    if (!availableParticipants || availableParticipants.length === 0) return [];
    
    return availableParticipants.filter(p => {
      if (!participantSearchTerm) return true;
      const searchLower = participantSearchTerm.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(searchLower);
      const partyMatch = p.party ? p.party.toLowerCase().includes(searchLower) : false;
      return nameMatch || partyMatch;
    });
  }, [availableParticipants, participantSearchTerm]);

  // Memoized filtered topics for better performance
  const filteredTopics = useMemo(() => {
    if (!availableTopicos || availableTopicos.length === 0) return [];
    
    return availableTopicos.filter(t => {
      if (!topicSearchTerm) return true;
      const searchLower = topicSearchTerm.toLowerCase();
      const localizedName = getLocalizedTopicName(t, i18n.language);
      const nameMatch = localizedName.toLowerCase().includes(searchLower);
      // Also search in the other language name as fallback
      const altNameMatch = i18n.language === 'en' 
        ? (t.name && t.name.toLowerCase().includes(searchLower))
        : (t.name_en && t.name_en.toLowerCase().includes(searchLower));
      return nameMatch || altNameMatch;
    });
  }, [availableTopicos, topicSearchTerm, i18n.language]);

  const isMobileDevice = () => {
  return window.innerWidth < 768; // md breakpoint in Tailwind
};

// Then modify the safeToggleFacet function:
const safeToggleFacet = () => {
  if (typeof toggleFacet === "function") {
    setHasData(false);
    toggleFacet();
    
    // Only save to localStorage on desktop
    if (!isMobileDevice()) {
      try {
        localStorage.setItem("countyFacetOpen", !isShown ? "true" : "false");
      } catch {}
    }
  }
};

  const handleYearChange = (year) => {
    // console.log("Facet: Year change detected:", year);
    if (applyFilters) {
      applyFilters({
        yearFilter: year,
        tipoFilter,
        municipioFilter, 
        participanteFilter,
        topicoFilter,
        partyFilter,
        startDate: "",
        endDate: ""
      });
    }
  };

  const handleTipoChange = (tipo) => {
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter: tipo,
        municipioFilter,
        participanteFilter,
        topicoFilter,
        partyFilter,
        startDate,
        endDate
      });
    }
  };

  const handleParticipanteChange = (participantId) => {
    const currentFilter = Array.isArray(participanteFilter) ? participanteFilter : 
                         participanteFilter ? [participanteFilter] : [];
    
    let newFilter;
    if (currentFilter.includes(participantId)) {
      newFilter = currentFilter.filter(id => id !== participantId);
    } else {
      newFilter = [...currentFilter, participantId];
    }
    
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        municipioFilter,
        participanteFilter: newFilter,
        topicoFilter,
        partyFilter,
        startDate,
        endDate
      });
      setHasData(true);
    }
  };

  const handleTopicoChange = (topicoId) => {
    const currentFilter = Array.isArray(topicoFilter) ? topicoFilter : 
                         topicoFilter ? [topicoFilter] : [];
    
    let newFilter;
    if (currentFilter.includes(topicoId)) {
      newFilter = currentFilter.filter(id => id !== topicoId);
    } else {
      newFilter = [...currentFilter, topicoId];
    }
    
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        municipioFilter,
        participanteFilter,
        topicoFilter: newFilter,
        partyFilter,
        startDate,
        endDate
      });
    }
  };

  const handleMunicipioChange = (municipioId) => {
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        municipioFilter: municipioId,
        participanteFilter,
        topicoFilter,
        partyFilter,
        startDate,
        endDate
      });
    }
  };

  const handlePartyChange = (party) => {
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        municipioFilter,
        participanteFilter,
        topicoFilter,
        partyFilter: party,
        startDate,
        endDate
      });
    }
  };

  const handleAprovadoChange = (aprovado) => {
    if (applyFilters) {
      applyFilters({
        yearFilter,
        tipoFilter,
        municipioFilter,
        participanteFilter,
        topicoFilter,
        partyFilter,
        aprovadoFilter: aprovado,
        startDate,
        endDate
      });
    }
  };

  // Date presets - use server-provided facets if available, otherwise use defaults
  const datePresets = facets && facets.date_presets ? 
    facets.date_presets.map(preset => ({
      value: preset._id,
      label: t(preset._id) || preset.label,
      count: preset.count
    })) : 
    [
      { value: "all", label: t("all_time") },
      { value: "last_week", label: t("last_week") },
      { value: "last_month", label: t("last_month") },
      { value: "last_quarter", label: t("last_quarter") },
      { value: "last_year", label: t("last_year") },
      { value: "custom_period", label: t("custom_period") }
    ];
  
  // Handle date preset selection
  const handleDatePresetChange = (value) => {
    if (value === "custom_period") {
      setSelectedDatePreset(value);
      setIsInitialCustomPeriod(true);
      return;
    }
    
    // Reset the flag when selecting other presets
    setIsInitialCustomPeriod(false);
    
    const today = new Date();
    let start = "";
    let end = format(today, "yyyy-MM-dd");
    
    switch (value) {
      case "last_week":
        start = format(subDays(today, 7), "yyyy-MM-dd");
        break;
      case "last_month":
        start = format(subMonths(today, 1), "yyyy-MM-dd");
        break;
      case "last_quarter":
        start = format(subMonths(today, 3), "yyyy-MM-dd");
        break;
      case "last_year":
        start = format(subYears(today, 1), "yyyy-MM-dd");
        break;
      case "all":
        // When "all" is selected, clear both start and end dates
        start = "";
        end = "";
        break;
      default:
        start = "2020-01-01";
        break;
    }

    // console.log('Facet: Date preset change detected:', { value, start, end });
    
    setSelectedDatePreset(value);
    handleDateRangeChange(start, end);
  };
  
  useEffect(() => {
    if (!startDate && !endDate) {
      setSelectedDatePreset("all");
      return;
    }
    
    if (!startDate || !endDate) return;
    
    // console.log('Facet: Date change detected:', { startDate, endDate, currentPreset: selectedDatePreset });
    
    // Check if current dates match any presets
    const today = new Date();
    const formattedToday = format(today, "yyyy-MM-dd");
    
    if (selectedDatePreset === "custom_period") {
      // console.log('Facet: Staying in custom mode');
      return;
    }
    
    if (endDate === formattedToday) {
      const oneWeekAgo = format(subDays(today, 7), "yyyy-MM-dd");
      const oneMonthAgo = format(subMonths(today, 1), "yyyy-MM-dd");
      const threeMonthsAgo = format(subMonths(today, 3), "yyyy-MM-dd");
      const oneYearAgo = format(subYears(today, 1), "yyyy-MM-dd");
      
      if (startDate === oneWeekAgo) {
        setSelectedDatePreset("last_week");
      } else if (startDate === oneMonthAgo) {
        setSelectedDatePreset("last_month");
      } else if (startDate === threeMonthsAgo) {
        setSelectedDatePreset("last_quarter");
      } else if (startDate === oneYearAgo) {
        setSelectedDatePreset("last_year");
      } else if (!startDate && !endDate) {
        // If both dates are empty, set to "all"
        setSelectedDatePreset("all");
      } else {
        setSelectedDatePreset("custom_period");
      }
    } else {
      setSelectedDatePreset("custom_period");
    }
    
    // console.log('Facet: Selected preset updated to:', selectedDatePreset);
  }, [startDate, endDate, selectedDatePreset]);

  const handleDateRangeChange = (start, end) => {
    // console.log('Facet handleDateRangeChange called with:', start, end);
    
    // Call only the parent's onDateRangeChange handler
    // This avoids duplicate API calls since onDateRangeChange will call applyFilters itself
    if (onDateRangeChange) {
      onDateRangeChange(start, end);
    }
    
    // Removed the direct applyFilters call to prevent duplicate searching
  };

  const handleClearFilters = () => {
    setParticipantSearchTerm(""); // Clear participant search term
    setTopicSearchTerm(""); // Clear topic search term
    if (applyFilters) {
      applyFilters({
        yearFilter: "",
        tipoFilter: "",
        municipioFilter: "",
        participanteFilter: [],
        topicoFilter: [],
        partyFilter: "",
        aprovadoFilter: "",
        startDate: "",
        endDate: ""
      });
    }
    if (clearFilters) {
      clearFilters(false);
    }
  };

  // Normalize filters for display
  const normalizedParticipanteFilter = Array.isArray(participanteFilter) ? participanteFilter : 
                                      participanteFilter ? [participanteFilter] : [];
  const normalizedTopicoFilter = Array.isArray(topicoFilter) ? topicoFilter : 
                                topicoFilter ? [topicoFilter] : [];

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isShown && (
          <motion.div
            className="fixed inset-0 z-40 bg-black/50 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={safeToggleFacet}
          />
        )}
      </AnimatePresence>

      {/* Desktop Sidebar */}
      <div className={`
            hidden md:block
            transition-all duration-400 ease-in-out
            ${isShown
              ? 'inset-0 z-30 relative w-80 h-full bg-transparent shadow-md'
              : 'w-0 sm:w-0'}
            overflow-hidden
            rounded-md
          `}
        >
        <AnimatePresence>
          {isShown && (
            <motion.div
              className="flex-shrink-0"
              style={customScrollbarStyle}
              {...(!hasData
                ? {
                    initial: { opacity: 0, x: -320 },
                    animate: { opacity: 1, x: 0 },
                    exit: { opacity: 0, x: -320 },
                    transition: { duration: 0.4, },
                  }
                : {})}
            >
              <FacetContent 
                isGridLoading={isGridLoading}
                safeToggleFacet={safeToggleFacet}
                t={t}
                leftSideOutsideComponent={leftSideOutsideComponent}
                leftSideComponent={leftSideComponent}
                showDateRange={showDateRange}
                dateMode={dateMode}
                setDateMode={setDateMode}
                datePresets={datePresets}
                selectedDatePreset={selectedDatePreset}
                handleDatePresetChange={handleDatePresetChange}
                startDate={startDate}
                endDate={endDate}
                handleDateRangeChange={handleDateRangeChange}
                showTipoFilter={showTipoFilter}
                availableTipos={availableTipos}
                tipoFilter={tipoFilter}
                handleTipoChange={handleTipoChange}
                facets={facets}
                availableMunicipios={availableMunicipios}
                municipioFilter={municipioFilter}
                handleMunicipioChange={handleMunicipioChange}
                showPartyFilter={showPartyFilter}
                availableParty={availableParty}
                partyFilter={partyFilter}
                handlePartyChange={handlePartyChange}
                showParticipanteFilter={showParticipanteFilter}
                showTopicoFilter={showTopicoFilter}
                normalizedParticipanteFilter={normalizedParticipanteFilter}
                participantsLogic={participantsLogic}
                onParticipantsLogicChange={onParticipantsLogicChange}
                participantSearchTerm={participantSearchTerm}
                setParticipantSearchTerm={setParticipantSearchTerm}
                availableParticipants={availableParticipants}
                filteredParticipants={filteredParticipants}
                handleParticipanteChange={handleParticipanteChange}
                applyFilters={applyFilters}
                yearFilter={yearFilter}
                participanteFilter={participanteFilter}
                topicoFilter={topicoFilter}
                normalizedTopicoFilter={normalizedTopicoFilter}
                topicsLogic={topicsLogic}
                onTopicsLogicChange={onTopicsLogicChange}
                topicSearchTerm={topicSearchTerm}
                setTopicSearchTerm={setTopicSearchTerm}
                availableTopicos={availableTopicos}
                filteredTopics={filteredTopics}
                handleTopicoChange={handleTopicoChange}
                showAprovadoFilter={showAprovadoFilter}
                aprovadoFilter={aprovadoFilter}
                handleAprovadoChange={handleAprovadoChange}
                rightSideComponent={rightSideComponent}
                handleClearFilters={handleClearFilters}
                isMobile={false}
                availableYears={availableYears}
                handleYearChange={handleYearChange}
                setSelectedDatePreset={setSelectedDatePreset}
                isInitialCustomPeriod={isInitialCustomPeriod}
                setIsInitialCustomPeriod={setIsInitialCustomPeriod}
                currentLanguage={i18n.language}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Bottom Drawer */}
      <AnimatePresence>
        {isShown && (
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={customScrollbarStyle}
          >
            <FacetContent 
              isGridLoading={isGridLoading}
              safeToggleFacet={safeToggleFacet}
              t={t}
              leftSideOutsideComponent={leftSideOutsideComponent}
              leftSideComponent={leftSideComponent}
              showDateRange={showDateRange}
              dateMode={dateMode}
              setDateMode={setDateMode}
              datePresets={datePresets}
              selectedDatePreset={selectedDatePreset}
              handleDatePresetChange={handleDatePresetChange}
              startDate={startDate}
              endDate={endDate}
              handleDateRangeChange={handleDateRangeChange}
              showTipoFilter={showTipoFilter}
              availableTipos={availableTipos}
              tipoFilter={tipoFilter}
              handleTipoChange={handleTipoChange}
              facets={facets}
              availableMunicipios={availableMunicipios}
              municipioFilter={municipioFilter}
              handleMunicipioChange={handleMunicipioChange}
              showPartyFilter={showPartyFilter}
              availableParty={availableParty}
              partyFilter={partyFilter}
              handlePartyChange={handlePartyChange}
              showParticipanteFilter={showParticipanteFilter}
              showTopicoFilter={showTopicoFilter}
              normalizedParticipanteFilter={normalizedParticipanteFilter}
              participantsLogic={participantsLogic}
              onParticipantsLogicChange={onParticipantsLogicChange}
              participantSearchTerm={participantSearchTerm}
              setParticipantSearchTerm={setParticipantSearchTerm}
              availableParticipants={availableParticipants}
              filteredParticipants={filteredParticipants}
              handleParticipanteChange={handleParticipanteChange}
              applyFilters={applyFilters}
              yearFilter={yearFilter}
              participanteFilter={participanteFilter}
              topicoFilter={topicoFilter}
              normalizedTopicoFilter={normalizedTopicoFilter}
              topicsLogic={topicsLogic}
              onTopicsLogicChange={onTopicsLogicChange}
              topicSearchTerm={topicSearchTerm}
              setTopicSearchTerm={setTopicSearchTerm}
              availableTopicos={availableTopicos}
              filteredTopics={filteredTopics}
              handleTopicoChange={handleTopicoChange}
              showAprovadoFilter={showAprovadoFilter}
              aprovadoFilter={aprovadoFilter}
              handleAprovadoChange={handleAprovadoChange}
              rightSideComponent={rightSideComponent}
              handleClearFilters={handleClearFilters}
              isMobile={true}
              availableYears={availableYears}
              handleYearChange={handleYearChange}
              setSelectedDatePreset={setSelectedDatePreset}
              isInitialCustomPeriod={isInitialCustomPeriod}
              setIsInitialCustomPeriod={setIsInitialCustomPeriod}
              currentLanguage={i18n.language}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Facet;