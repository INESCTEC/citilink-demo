import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FiX, FiChevronDown, FiChevronUp, FiUser, FiSearch, FiCalendar } from 'react-icons/fi';
import { FaLandmark } from 'react-icons/fa';
import { getTopicoIcon } from '../../../utils/iconMappers';
import { getPartyColorClass } from '../../../utils/PartyColorMapper';
import { getLocalizedTopicName, getLocalizedMunicipioName, getLocalizedParticipantName } from '../../../utils/translationHelpers';

const FilterBadge = ({ icon, label, onRemove, partyColor }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.99 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      className="inline-flex items-center bg-white border border-gray-200 rounded-md px-3 py-1 text-xs text-gray-700 mr-2 shadow-sm"
    >  
     {icon && <span className="mr-1">{icon}</span>}
     {partyColor && (
       <span className={`inline-block w-3 h-3 rounded-sm flex-shrink-0 mr-2 ${partyColor}`}></span>
     )}
      <span className="mr-1">{label}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 rounded-md bg-gray-100 p-0.5 hover:bg-gray-200 transition-colors cursor-pointer"
          aria-label="Remove filter"
        >
          <FiX size={12} />
        </button>
      )}
    </motion.div>
  );
};

const ActiveFilters = ({ filters, onRemoveFilter, onClearAll, insideCounty = false, facets = {} }) => {
  const { t, i18n } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const maxVisibleFilters = 3; // Number of filters to show before "see all" button
  const currentLanguage = i18n.language;

  if (!filters) return null;

  // Helper functions to find objects in facets
  const findMunicipioById = (id) => {
    if (!facets.municipios) return null;
    return facets.municipios.find(m => m._id === id || m._id === String(id));
  };

  const findTopicoById = (id) => {
    if (!facets.topicos) return null;
    return facets.topicos.find(t => t._id === id || t._id === String(id));
  };

  const findParticipantById = (id) => {
    if (!facets.participants) return null;
    return facets.participants.find(p => p._id === id || p._id === String(id));
  };
  
  const allFilterBadges = useMemo(() => {
    const badges = [];

    // Check if keyword/search term exists
    // if (filters.keyword && filters.keyword.trim() !== '') {
    //   badges.push(
    //     <FilterBadge 
    //       key="keyword"
    //       icon={<FiSearch className="w-3 h-3" />}
    //       label={`${t("search")}: ${filters.keyword}`}
    //       onRemove={() => onRemoveFilter('keyword')}
    //     />
    //   );
    // }

    // Municipality filter - handle both object style and string ID
    if (!insideCounty && filters.municipioId) {
      // Handle array of municipality IDs
      if (Array.isArray(filters.municipioId) && filters.municipioId.length > 0) {
        filters.municipioId.forEach((id, index) => {
          if (id && id !== "") {
            // Look up municipio from facets or use fallback data
            const municipio = findMunicipioById(id) || 
              (filters.municipioObjects && filters.municipioObjects[index]) || 
              { 
                name: filters.municipioNames && filters.municipioNames[index] 
                  ? filters.municipioNames[index]
                  : filters.municipioName || id,
                name_en: filters.municipioNames_en && filters.municipioNames_en[index]
                  ? filters.municipioNames_en[index]
                  : filters.municipioName_en
              };
            const localizedName = getLocalizedMunicipioName(municipio, currentLanguage);
            badges.push(
              <FilterBadge 
                key={`municipio-${id}`}
                icon={<FaLandmark className="w-3 h-3" />}
                label={`${t("county")}: ${localizedName}`}
                onRemove={() => onRemoveFilter('municipioId', id)}
              />
            );
          }
        });
      } 
      // Handle single municipality ID
      else if (typeof filters.municipioId === 'string' && filters.municipioId !== "") {
        // Look up municipio from facets or use fallback data
        const municipio = findMunicipioById(filters.municipioId) || 
          filters.municipioObject || 
          { 
            name: filters.municipioName || filters.municipioId,
            name_en: filters.municipioName_en
          };
        const localizedName = getLocalizedMunicipioName(municipio, currentLanguage);
        badges.push(
          <FilterBadge 
            key="municipio-single"
            icon={<FaLandmark className="w-3 h-3" />}
            label={`${t("county")}: ${localizedName}`}
            onRemove={() => onRemoveFilter('municipioId')}
          />
        );
      }
    }

    // Year filter
    if (filters.yearFilter && filters.yearFilter !== "") {
      badges.push(
        <FilterBadge 
          key="yearFilter"
          icon={<FiCalendar className="w-3 h-3" />}
          label={`${t("year")}: ${filters.yearFilter}`}
          onRemove={() => onRemoveFilter('yearFilter')}
        />
      );
    }

    // Type filter
    if (filters.tipoFilter && filters.tipoFilter !== "") {
      badges.push(
        <FilterBadge 
          key="tipoFilter"
          label={`${t("type")}: ${filters.tipoFilter === 'ordinaria' ? t("ordinary") : t("extraordinary")}`}
          onRemove={() => onRemoveFilter('tipoFilter')}
        />
      );
    }

    // Participant filters - handle both formats
    const participantIds = Array.isArray(filters.participanteId) 
      ? filters.participanteId.filter(id => id && id !== "" && id !== null)
      : typeof filters.participanteId === 'string' && filters.participanteId !== "" 
        ? [filters.participanteId] 
        : [];
    
    participantIds.forEach((participanteId, index) => {
      // Look up participante from facets or use fallback data
      const participante = findParticipantById(participanteId) ||
        (filters.participanteObjects && filters.participanteObjects[index]) || 
        { 
          name: filters.participanteNames && filters.participanteNames[index] 
            ? filters.participanteNames[index] 
            : filters.participanteName || participanteId,
          name_en: filters.participanteNames_en && filters.participanteNames_en[index]
            ? filters.participanteNames_en[index]
            : filters.participanteName_en
        };
      
      const localizedName = getLocalizedParticipantName(participante, currentLanguage);
      
      badges.push(
        <FilterBadge 
          key={`participant-${participanteId}`}
          icon={<FiUser className="w-3 h-3" />}
          label={`${t("participant")}: ${localizedName}`}
          onRemove={() => onRemoveFilter('participanteId', participanteId)}
        />
      );
    });

    // Party filter
    if (filters.party && filters.party !== "") {
      badges.push(
        <FilterBadge 
          key="party"
          label={`${t("party")}: ${filters.party}`}
          partyColor={getPartyColorClass(filters.party)}
          onRemove={() => onRemoveFilter('party')}
        />
      );
    } else if (filters.partyFilter && filters.partyFilter !== "") {
      badges.push(
        <FilterBadge 
          key="partyFilter"
          label={`${t("party")}: ${filters.partyFilter}`}
          partyColor={getPartyColorClass(filters.partyFilter)}
          onRemove={() => onRemoveFilter('partyFilter')}
        />
      );
    }

    // Topic filters - handle both formats
    const topicIds = Array.isArray(filters.topico) 
      ? filters.topico.filter(id => id && id !== "" && id !== null)
      : typeof filters.topico === 'string' && filters.topico !== "" 
        ? [filters.topico] 
        : [];
    
    topicIds.forEach((topicoId, index) => {
      // Look up topico from facets or use fallback data
      const topico = findTopicoById(topicoId) ||
        (filters.topicoObjects && filters.topicoObjects[index]) ||
        { 
          title: filters.topicoNames && filters.topicoNames[index] 
            ? filters.topicoNames[index] 
            : filters.topicoName || topicoId,
          title_en: filters.topicoNames_en && filters.topicoNames_en[index]
            ? filters.topicoNames_en[index]
            : filters.topicoName_en
        };
      
      const localizedName = getLocalizedTopicName(topico, currentLanguage);
      
      badges.push(
        <FilterBadge 
          key={`topic-${topicoId}`}
          icon={getTopicoIcon(localizedName, "w-3 h-3")}
          label={`${t("topic")}: ${localizedName}`}
          onRemove={() => onRemoveFilter('topico', topicoId)}
        />
      );
    });

    // Approved filter
    if (filters.aprovado && filters.aprovado !== "") {
      badges.push(
        <FilterBadge 
          key="aprovado"
          label={`${t("approved")}: ${filters.aprovado === 'true' ? t("yes") : t("no")}`}
          onRemove={() => onRemoveFilter('aprovado')}
        />
      );
    } else if (filters.aprovadoFilter && filters.aprovadoFilter !== "") {
      badges.push(
        <FilterBadge 
          key="aprovadoFilter"
          label={`${t("approved")}: ${filters.aprovadoFilter === 'true' ? t("yes") : t("no")}`}
          onRemove={() => onRemoveFilter('aprovadoFilter')}
        />
      );
    }

    // Date filters
    if (filters.startDate && filters.startDate !== "" && !filters.yearFilter) {
      badges.push(
        <FilterBadge 
          key="startDate"
          label={`${t("from_date")}: ${filters.startDate}`}
          onRemove={() => onRemoveFilter('startDate')}
        />
      );
    }

    if (filters.endDate && filters.endDate !== "" && !filters.yearFilter) {
      badges.push(
        <FilterBadge 
          key="endDate"
          label={`${t("to_date")}: ${filters.endDate}`}
          onRemove={() => onRemoveFilter('endDate')}
        />
      );
    }

    return badges;
  }, [filters, t, onRemoveFilter, insideCounty, currentLanguage]);

  // Check for any active filters - do this after the useMemo to ensure consistent hook execution
  const hasActiveFilters = allFilterBadges.length > 0;
  
  // If no active filters, return null
  if (!hasActiveFilters) return null;

  const visibleBadges = showAll ? allFilterBadges : allFilterBadges.slice(0, maxVisibleFilters);
  const hasMoreFilters = allFilterBadges.length > maxVisibleFilters;
  
  return (
    <div className="">
      <div className="flex flex-wrap items-center">
        <span className="text-xs text-gray-600 mr-2">{t("active_filters")}:</span>
        
        {visibleBadges}
        
        {hasMoreFilters && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="inline-flex items-center text-xs text-sky-600 hover:text-sky-800 hover:underline transition-colors mr-2 cursor-pointer"
          >
            {showAll ? (
              <>
                {t("show_less")} <FiChevronUp size={12} className="ml-1" />
              </>
            ) : (
              <>
                {t("see_all")} ({allFilterBadges.length - maxVisibleFilters} {t("more")}) <FiChevronDown size={12} className="ml-1" />
              </>
            )}
          </button>
        )}
        
        {hasActiveFilters && onClearAll && (
          <button
            onClick={onClearAll}
            className="text-xs text-sky-600 hover:text-sky-800 hover:underline transition-colors cursor-pointer"
          >
            {t("clear_all_filters")}
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveFilters;
