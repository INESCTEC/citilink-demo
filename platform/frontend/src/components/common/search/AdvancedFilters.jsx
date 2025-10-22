import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiSearch, FiCalendar, FiX, FiSliders, FiArrowUp, FiArrowDown, FiLock, FiChevronDown, FiCheck } from "react-icons/fi";
import DateRangeSlider from "./DateRangeSlider";
import { subDays, subMonths, subYears, format, parse } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import CustomDropdown from "../CustomDropdown";
import { getYear } from "date-fns";

const DateModeToggle = ({ mode, onChange }) => {
  const { t } = useTranslation();
  console.log("Rendering DateModeToggle with mode:", mode);
  return (
    <div className="flex items-center justify-between p-0 rounded-md mb-0">
      {/* <span className="text-xs font-semibold text-sky-900 uppercase tracking-wider">{t('mode', 'Modo')}</span> */}
      <div className="flex items-center">
        <span className={`text-xs font-medium mr-2 ${mode === 'period' ? 'text-sky-700' : 'text-gray-500'}`}>{t('time_period', 'Período')}</span>
        <button
          type="button"
          className={`relative inline-flex h-4 w-10 rounded-full transition-colors focus:outline-none cursor-pointer ${mode === 'year' ? 'bg-emerald-600' : 'bg-sky-700'}`}
          onClick={() => onChange(mode === 'period' ? 'year' : 'period')}
          aria-label={mode === 'period' ? t('switch_to_year', 'Mudar para Ano') : t('switch_to_period', 'Mudar para Período')}
        >
          <motion.span
            animate={{ x: mode === 'year' ? 26 : 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className="absolute top-0.5 left-0 h-3 w-3 rounded-full bg-white shadow cursor-pointer"
          />
        </button>
        <span className={`text-xs font-medium ml-2 ${mode === 'year' ? 'text-emerald-600' : 'text-gray-500'}`}>{t('year', 'Ano')}</span>
      </div>
    </div>
  );
};

const LogicSwitchToggle = ({ logic, onChange, label, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-between p-0 bg-sky-900/10 border border-sky-900/30 rounded-md mb-0 ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-xs font-semibold text-sky-900 uppercase tracking-wider">{label}</span>
      <div className="flex items-center">
        <span className={`text-xs font-medium mr-2 ${logic === 'or' ? 'text-sky-700' : 'text-gray-500'}`}>{t('or', 'OU')}</span>
        <button
          type="button"
          className={`relative inline-flex h-4 w-10 rounded-full transition-colors focus:outline-none cursor-pointer ${logic === 'and' ? 'bg-emerald-600' : 'bg-sky-700'}`}
          onClick={() => !disabled && onChange(logic === 'or' ? 'and' : 'or')}
          aria-label={logic === 'or' ? t('switch_to_and', 'Mudar para E') : t('switch_to_or', 'Mudar para OU')}
          disabled={disabled}
        >
          <motion.span
            animate={{ x: logic === 'and' ? 26 : 3 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className="absolute top-0.5 left-0 h-3 w-3 rounded-full bg-white shadow cursor-pointer"
          />
        </button>
        <span className={`text-xs font-medium ml-2 ${logic === 'and' ? 'text-emerald-600' : 'text-gray-500'}`}>{t('and', 'E')}</span>
      </div>
    </div>
  );
};

const AdvancedFilters = ({ filterState, handleSearch, municipios, topicos, handleMunicipioChange, handleClearFilters, searchType, isLoading, isEmbed, isModal }) => {
  const { t } = useTranslation();
  const [selectedDatePreset, setSelectedDatePreset] = useState("all");
  const [participantes, setParticipantes] = useState([]);
  const [isLoadingParticipantes, setIsLoadingParticipantes] = useState(false);
  
  const [activeDropdown, setActiveDropdown] = useState(null);
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

const getYearOptions = () => {
  const startYear = 2021;
  const currentYear = getYear(new Date());
  const years = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
};
  
  const openDropdown = (dropdown) => {
    setActiveDropdown(activeDropdown === dropdown ? null : dropdown);
  };
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (activeDropdown && !e.target.closest('.dropdown-container')) {
        setActiveDropdown(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);
  
  const API_URL = import.meta.env.VITE_API_URL;

  // Date presets
  const datePresets = [
    { value: "all", label: t("all_time") },
    { value: "last_week", label: t("last_week") },
    { value: "last_month", label: t("last_month") },
    { value: "last_quarter", label: t("last_quarter") },
    { value: "last_year", label: t("last_year") }
  ];

  // Fetch participantes when municipio changes
  useEffect(() => {
    const fetchParticipantes = async () => {
      if (!filterState.municipioId) {
        setParticipantes([]);
        if (filterState.participanteId) {
          filterState.setParticipanteId("");
        }
        return;
      }
      
      setIsLoadingParticipantes(true);
      try {
        const response = await fetch(`${API_URL}/v0/public/municipios/${filterState.municipioId}?demo=${DEMO_MODE}`);
        if (response.ok) {
          const data = await response.json();
          setParticipantes(data.current_participants);
        } else {
          console.error("Failed to fetch participantes");
          setParticipantes([]);
        }
      } catch (error) {
        console.error("Error fetching participantes:", error);
        setParticipantes([]);
      } finally {
        setIsLoadingParticipantes(false);
      }
    };

    fetchParticipantes();
  }, [filterState.municipioId]);

  // Handle date preset selection
  const handleDatePresetChange = (value) => {
    const today = new Date();
    let startDate = "";
    let endDate = format(today, "yyyy-MM-dd");
    
    switch (value) {
      case "last_week":
        startDate = format(subDays(today, 7), "yyyy-MM-dd");
        break;
      case "last_month":
        startDate = format(subMonths(today, 1), "yyyy-MM-dd");
        break;
      case "last_quarter":
        startDate = format(subMonths(today, 3), "yyyy-MM-dd");
        break;
      case "last_year":
        startDate = format(subYears(today, 1), "yyyy-MM-dd");
        break;
      default:
        // All time - set to January 1st, 2021
        startDate = "2021-01-01";
        break;
    }
    
    // Update the filter state
    filterState.setStartDate(startDate);
    filterState.setEndDate(endDate);
    setSelectedDatePreset(value);
  };

  // Update selected date preset when start/end dates change
  useEffect(() => {
    // This prevents infinite loops when handleDatePresetChange is called
    if (!filterState.startDate || !filterState.endDate) return;
    
    const today = new Date();
    const formattedToday = format(today, "yyyy-MM-dd");
    
    if (filterState.endDate === formattedToday) {
      const oneWeekAgo = format(subDays(today, 7), "yyyy-MM-dd");
      const oneMonthAgo = format(subMonths(today, 1), "yyyy-MM-dd");
      const threeMonthsAgo = format(subMonths(today, 3), "yyyy-MM-dd");
      const oneYearAgo = format(subYears(today, 1), "yyyy-MM-dd");
      
      if (filterState.startDate === oneWeekAgo) {
        setSelectedDatePreset("last_week");
      } else if (filterState.startDate === oneMonthAgo) {
        setSelectedDatePreset("last_month");
      } else if (filterState.startDate === threeMonthsAgo) {
        setSelectedDatePreset("last_quarter");
      } else if (filterState.startDate === oneYearAgo) {
        setSelectedDatePreset("last_year");
      } else if (filterState.startDate === "2021-01-01") {
        setSelectedDatePreset("all");
      } else {
        setSelectedDatePreset("custom");
      }
    } else {
      setSelectedDatePreset("custom");
    }
  }, [filterState.startDate, filterState.endDate]);

  return (
    <div className={`mt-4  ${!isModal ? "bg-sky-950/60" : "bg-white/10"} backdrop-blur-sm p-4 sm:p-6 rounded-md shadow-md font-montserrat overflow-visible relative`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 overflow-visible relative">
        {/* County Dropdown */}
        <CustomDropdown
          label={t("county")}
          value={filterState.municipioId}
          onChange={(value) => filterState.setMunicipioId(value)}
          options={[
            { value: "", label: t("all_counties") },
            ...municipios.map(m => ({ value: m.id, label: m.name }))
          ]}
          activeDropdown={activeDropdown}
          dropdownName="county"
          openDropdown={openDropdown}
        />
        
        {/* Participant Dropdown - always shown but disabled when no municipality is selected */}
        {/* <div className="flex flex-col">
        <CustomDropdown
          addon={
              <LogicSwitchToggle
                logic={filterState.participantsLogic}
                onChange={logic => filterState.setParticipantsLogic(logic)}
                disabled={Array.isArray(filterState.participanteId) ? filterState.participanteId.length <= 1 : true}
              />
            }
          label={t("participant")}
          value={filterState.participanteId || []}
          onChange={(value) => {
            // Check if setParticipanteId exists and is a function
            if (typeof filterState.setParticipanteId === 'function') {
              filterState.setParticipanteId(value);
              
              // When any participants are selected, clear the party filter
              if (value.length > 0) {

                  // For multiple participants, clear the party filter
                  if (typeof filterState.setParty === 'function') {
                    filterState.setParty('');
                  }
              } else if (value.length === 0) {
                // Reset party filter when all participants are deselected
                if (typeof filterState.setParty === 'function') {
                  filterState.setParty('');
                }
              }
            } else {
              // Direct assignment as fallback - for debugging purposes
              console.warn("setParticipanteId is missing in filterState. Consider adding it to your parent component.");
              
              // If we need to update the value, we need to modify the object directly
              // Note: This won't trigger React updates properly
              filterState.participanteId = value;
            }
          }}
          options={
            !filterState.municipioId
              ? [{ value: "", label: t("select_county_first") }]
              : [
                  { value: "", label: isLoadingParticipantes ? t("loading_participants") : t("all_participants") },
                  ...participantes.map(p => ({ 
                    value: p.id, 
                    label: `${p.name} (${p.party})`,
                    party: p.party // Include party for color indicator
                  }))
                ]
          }
          activeDropdown={activeDropdown}
          dropdownName="participant"
          openDropdown={openDropdown}
          disabled={!filterState.municipioId || isLoadingParticipantes}
          multiple={true} // Enable multi-select
          type="party" // Show party colors
        />
        </div> */}
        
        {/* Party Dropdown - disabled when any participants are selected */}
        {/* <CustomDropdown
          label={t("party")}
          value={filterState.party || ""}
          onChange={(value) => {
            // Check if setParty exists and is a function
            if (typeof filterState.setParty === 'function') {
              filterState.setParty(value);
            } else {
              console.warn("setParty is missing in filterState. Consider adding it to your parent component.");
              // Don't use direct assignment as it won't trigger React updates
            }
          }}
          type="party"
          options={[
            { value: "", label: Array.isArray(filterState.participanteId) && filterState.participanteId.length > 0 ? t("party_from_participant") : t("all_parties") },
            { value: "PS", label: "PS" },
            { value: "PSD", label: "PSD" },
            { value: "CDS-PP", label: "CDS-PP" },
            { value: "CDS-PP/PSD", label: "CDS-PP/PSD" },
            { value: "BE", label: "BE" },
            { value: "PCP", label: "PCP" },
            { value: "CDU", label: "CDU" },
            { value: "PEV", label: "PEV" },
            { value: "PAN", label: "PAN" },
            { value: "IL", label: "IL" },
            { value: "CHEGA", label: "CHEGA" },
            { value: "LIVRE", label: "LIVRE" },
            { value: "MPT", label: "MPT" },
            { value: "NÓS, CIDADÃOS", label: "Nós, Cidadãos" },
            // { value: "NC", label: "NC" },
            { value: "JPP", label: "JPP" },
            { value: "PCTP/MRPP", label: "PCTP/MRPP" },
            { value: "PPM", label: "PPM" },
            { value: "VP", label: "VP" },
            { value: "ADN", label: "ADN" },
            { value: "MOVIMENTOS CIDADÃOS", label: "MOVIMENTOS CIDADÃOS" }
            // { value: "Independente", label: t("independent") }
          ]}
          activeDropdown={activeDropdown}
          dropdownName="party"
          openDropdown={openDropdown}
          disabled={Array.isArray(filterState.participanteId) && filterState.participanteId.length > 0}
        /> */}
        
        {/* Conditional Topico dropdown for Assuntos */}
        <div className="flex flex-col">
        <CustomDropdown
          addon={
            <LogicSwitchToggle
              logic={filterState.topicsLogic}
              onChange={logic => filterState.setTopicsLogic(logic)}
              disabled={Array.isArray(filterState.topico) ? filterState.topico.length <= 1 : true}
            />
          }
          label={t("department")}
          value={filterState.topico || []}
          onChange={(value) => {
            if (typeof filterState.setTopico === 'function') {
              filterState.setTopico(value);
            } else {
              console.warn("setTopico is missing in filterState");
              filterState.topico = value; // Fallback direct assignment
            }
          }}
          options={[
            { value: "", label: t("all_departments") },
            ...(topicos || []).map(t => ({ value: t.id, label: t.title || t.name }))
          ]}
          activeDropdown={activeDropdown}
          dropdownName="department"
          openDropdown={openDropdown}
          type="topico"
          multiple={true} // Enable multi-select
        />
        </div>
        
        {/* Approval status filter - only shown for assuntos type */}
        {/* {searchType === "assuntos" && (
          <CustomDropdown
            label={t("approval_status")}
            value={filterState.aprovado || ""}
            onChange={(value) => filterState.setAprovado(value)}
            options={[
              { value: "", label: t("all_statuses") },
              { value: "true", label: t("approved") },
              { value: "false", label: t("rejected") }
            ]}
            activeDropdown={activeDropdown}
            dropdownName="approval"
            openDropdown={openDropdown}
          />
        )} */}

        {/* TIpo dropdowne */}
        {/* {searchType === "atas" && (
        <CustomDropdown
          label={t("meeting_type") || "Tipo de Reunião"}
          value={filterState.tipo || ""}
          onChange={(value) => {
            if (typeof filterState.setTipo === 'function') {
              filterState.setTipo(value);
            } else {
              filterState.tipo = value;
            }
          }}
          options={[
            { value: "", label: t("all_types") || "Todos os tipos" },
            { value: "ordinaria", label: t("ordinaria") || "Ordinária" },
            { value: "extraordinaria", label: t("extraordinaria") || "Extraordinária" }
          ]}
          activeDropdown={activeDropdown}
          dropdownName="tipo"
          openDropdown={openDropdown}
        />
      )} */}

            {/* Date Range Section */}
         <div className="col-span-1 sm:col-span-1 lg:col-span-1  overflow-visible">
           {filterState.dateMode === "period" ? (
                <>
                  {/* Date Preset Dropdown */}
                  <CustomDropdown
                    addon={
                      <DateModeToggle
                        mode={filterState.dateMode}
                        onChange={mode => filterState.setDateMode(mode)}
                      />
                    }
                    label={t("date_range")}
                    value={selectedDatePreset}
                    onChange={(value) => handleDatePresetChange(value)}
                    options={[
                      ...datePresets,
                      { value: "custom", label: t("custom_period") }
                    ]}
                    activeDropdown={activeDropdown}
                    dropdownName="dateRange"
                    openDropdown={openDropdown}
                  />
                  <div className="mt-3 overflow-visible">
                    <DateRangeSlider 
                      isEmbed={isEmbed}
                      startDate={filterState.startDate}
                      endDate={filterState.endDate}
                      onDateChange={(start, end) => {
                        if (typeof filterState.setStartDate === 'function') {
                          filterState.setStartDate(start);
                        }
                        if (typeof filterState.setEndDate === 'function') {
                          filterState.setEndDate(end);
                        }
                      }}
                    />
                  </div>
                </>
              ) : (
                <>
                  {/* Year Dropdown */}
                  <CustomDropdown
                    addon={
                      <DateModeToggle
                        mode={filterState.dateMode}
                        onChange={mode => filterState.setDateMode(mode)}
                      />
                    }
                    label={t("year")}
                    value={filterState.year}
                    onChange={(value) => {
                      filterState.setYear(value);
                      if (value === "") {
                        // "All years" selected, clear date range
                        if (typeof filterState.setStartDate === 'function') filterState.setStartDate("");
                        if (typeof filterState.setEndDate === 'function') filterState.setEndDate("");
                      } else {
                        // Set startDate and endDate to cover the whole year
                        if (typeof filterState.setStartDate === 'function') filterState.setStartDate(`${value}-01-01`);
                        if (typeof filterState.setEndDate === 'function') filterState.setEndDate(`${value}-12-31`);
                      }
                    }}
                    options={[
                      { value: "", label: t("all_years") },
                      ...getYearOptions()
                    ]}
                    activeDropdown={activeDropdown}
                    dropdownName="year"
                    openDropdown={openDropdown}
                  />
                </>
              )}
          </div>

        
        {/* Search and clear the filters */}
        <div className="col-span-1 sm:col-span-2 lg:col-span-3 mt-4">
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <button
              onClick={handleClearFilters}
              className="text-sm cursor-pointer lg:text-sm bg-white text-gray-800 font-montserrat px-4 py-2 rounded-md hover:bg-gray-200 transition flex items-center justify-center"
            >
              {t("clear_filters")}
            </button>
            <button 
              onClick={() => {
                // Close the filter panel
                if (typeof filterState.setShowAdvancedFilters === 'function') {
                  filterState.setShowAdvancedFilters(false);
                }
                
                // Perform search
                handleSearch();
              }}
              className="text-sm cursor-pointer lg:text-sm bg-sky-700 text-white px-4 py-2 rounded-md hover:bg-sky-800 transition font-montserrat flex items-center justify-center"
            >
              <FiSearch className="mr-2" /> {t("apply_filters")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedFilters;