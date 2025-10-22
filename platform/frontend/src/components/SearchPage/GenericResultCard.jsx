import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { 
  FiCalendar, 
  FiChevronRight, 
  FiFileText,
  FiMapPin,
  FiEye,
  FiCheck,
  FiX,
  FiCheckCircle,
  FiAlertTriangle,
  FiCpu,
  FiInfo
} from "react-icons/fi";
import { FaCheck, FaLandmark, FaRobot } from "react-icons/fa";
import { motion } from "framer-motion";
import { format } from "date-fns";
import { Popover } from "flowbite-react";
import { getTopicoIcon } from "../../utils/iconMappers";
import HighlightedText from "../common/HighlightedText";
import { useLastSeenGlobal } from "../../contexts/LastSeenContext";
import LangLink from "../common/LangLink";
import { getLocalizedTopicName, getLocalizedMunicipioName } from "../../utils/translationHelpers";

const GenericResultCard = ({ 
  result, 
  index, 
  type = "minute", 
  deliberacao = false, 
  showSummary = true,
  showMunicipio = true, 
  showDate = true,
  showLocation = true,
  position = 0,
  showType = true,
  showSeeButton = false,
  useLinks = true,
  viewMode = "grid",
  onClick,
  showVoting = false,
  viewLocation = "search",
  showParticipantVote = false
}) => {
  const { t, i18n } = useTranslation();
  const { lastSeen, markAsLastSeen } = useLastSeenGlobal();
  
  // Helper function to get localized title
  const getLocalizedTitle = (item) => {
    // If we have search results with lang_match, use that to determine which version to show
    if (item.lang_match) {
      if (item.lang_match === 'en' && item.title_en) {
        return item.title_en;
      }
      if (item.lang_match === 'pt' && item.title) {
        return item.title;
      }
    }
    
    // Fallback to UI language preference
    if (i18n.language === 'en' && item.title_en) {
      return item.title_en;
    }
    return item.title || item.title_en || ''; // Fallback to title or title_en if title is missing
  };

  // Helper function to get localized summary/content
  const getLocalizedSummary = (item) => {
    // If we have search results with lang_match, use that to determine which version to show
    if (item.lang_match) {
      if (item.lang_match === 'en') {
        return item.summary_en || item.summary || '';
      }
      if (item.lang_match === 'pt') {
        return item.summary || item.summary_en || '';
      }
    }
    
    // Fallback to UI language preference
    if (i18n.language === 'en' && item.summary_en) {
      return item.summary_en;
    }
    return item.summary || item.summary_en || '';
  };
  
  const isMinute = type === "minute";
  const isSubject = type === "subject";
  
  // Check localStorage for view mode
  const subjectsViewMode = localStorage.getItem('subjectsViewMode');
  const isSubjectListMode = subjectsViewMode === 'list';

  let isListMode;
  const isSearchView = viewLocation === "search" || viewLocation === "participante";
  if (isSearchView) {
    isListMode = viewMode === "list";
  } else if (type === "subject") {
    isListMode = isSubjectListMode;
  }

  const isLastSeenMinute = isMinute && lastSeen.minute === result.id;
  const isLastSeenSubject = isSubject && lastSeen.subject === result.id;

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return "Data desconhecida";
    }
  };

  // Helper function to format date with optional time range
  const formatDateWithTime = (date, startHour, endHour) => {
    const dateStr = typeof date === 'string' && date.includes('/') ? date : formatDate(date);
    
    // If both start and end hours exist, show them in parentheses
    if (startHour && endHour) {
      return `${dateStr} (${startHour} - ${endHour})`;
    }
    
    // If only start hour exists, show just that
    if (startHour && !endHour) {
      return `${dateStr} (${startHour})`;
    }
    
    // If only end hour exists, show just that  
    if (!startHour && endHour) {
      return `${dateStr} (${endHour})`;
    }
    
    // If neither exists, show just the date
    return dateStr;
  };

  // Voting display component
 const VotingDisplay = ({ votos_favor, votos_contra, abstencoes, compact = false }) => {
    const total = votos_favor + votos_contra + abstencoes;
    if (total === 0) return null;

    const favorPercentage = (votos_favor / total) * 100;
    const contraPercentage = (votos_contra / total) * 100;
    const abstencaoPercentage = (abstencoes / total) * 100;

    return (
      <div className={`flex flex-col ${compact ? 'gap-2' : 'h-full justify-center'}`}>
        {/* Voting bar */}
        <div className={`w-full ${compact ? 'h-4' : 'h-6'} flex overflow-hidden ${compact ? 'mb-1 rounded-sm' : 'mb-2 rounded-md'} border border-gray-200`}>
          {votos_favor > 0 && (
            <div 
              className="bg-emerald-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${favorPercentage}%` }}
            >
              {/* {votos_favor > 0 && favorPercentage > 15 && votos_favor} */}
            </div>
          )}
          {votos_contra > 0 && (
            <div 
              className="bg-rose-500 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${contraPercentage}%` }}
            >
              {/* {votos_contra > 0 && contraPercentage > 15 && votos_contra} */}
            </div>
          )}
          {abstencoes > 0 && (
            <div 
              className="bg-gray-300 flex items-center justify-center text-white text-xs font-medium"
              style={{ width: `${abstencaoPercentage}%` }}
            >
              {/* {abstencoes > 0 && abstencaoPercentage > 15 && abstencoes} */}
            </div>
          )}
        </div>
        
        {/* Voting legend */}
        <div className={`flex ${compact ? 'flex-row justify-between' : 'flex-col'} gap-1 text-xs`}>
          <div className={`flex items-center ${compact ? 'flex-col' : 'justify-start gap-x-2'}`}>
            <span className="flex items-center text-emerald-600">
              <span className="w-3 h-3 bg-emerald-500 rounded-sm mr-1"></span>
              {compact ? t("favor", "A Favor") : t("favor", "A Favor")} <span className={`${compact ? 'hidden' : ''}`}>:</span>
            </span>
            <span className="font-medium">{votos_favor} <span className="text-[10px]">({favorPercentage.toFixed(0)}%)</span></span>
          </div>
          <div className={`flex items-center ${compact ? 'flex-col' : 'justify-start gap-x-2'}`}>
            <span className="flex items-center text-rose-600">
              <span className="w-3 h-3 bg-rose-600 rounded-sm mr-1"></span>
              {compact ? t("against", "Contra") : t("against", "Contra")} <span className={`${compact ? 'hidden' : ''}`}>:</span>
            </span>
            <span className="font-medium">{votos_contra} <span className="text-[10px]">({contraPercentage.toFixed(0)}%)</span></span>
          </div>
          <div className={`flex items-center ${compact ? 'flex-col' : 'justify-start gap-x-2'}`}>
            <span className="flex items-center text-gray-600">
              <span className="w-3 h-3 bg-gray-300 rounded-sm mr-1"></span>
              {compact ? t("abstention", "Abstenção") : t("abstention", "Abstenção")} <span className={`${compact ? 'hidden' : ''}`}>:</span>
            </span>
            <span className="font-medium">{abstencoes} <span className="text-[10px]">({abstencaoPercentage.toFixed(0)}%)</span></span>
          </div>
        </div>
      </div>
    );
  };

  // Handle click to mark as last seen (for minutes and subjects)
  const handleCardClick = (e) => {
    if (isMinute && result.id) {
      markAsLastSeen("minute", result.id);
    }
    if (isSubject && result.id) {
      markAsLastSeen("subject", result.id);
    }
    if (onClick) {
      onClick(e);
    }
  };


  const CardWrapper = ({ children, to }) => {
    if (useLinks && to) {

      return (
        <LangLink
          to={to} 
          state={{ position: position, currentUrl: window.location.pathname + window.location.search }}
          onClick={handleCardClick}
        >
          {children}
        </LangLink>
      );
    }
    return (
      <div 
        onClick={onClick ? (e) => {
          handleCardClick(e);
          onClick(e);
        } : handleCardClick} 
        className={onClick ? "cursor-pointer" : ""}
      >
        {children}
      </div>
    );
  };
  
  if (isMinute) {
    const hasHighlights = result.highlights && result.highlights.length > 0;

    // console.log("Result", result);
    
    return (
      <motion.div 
        className={`bg-white dark:bg-sky-950 group border-b-3 rounded-t-md shadow-sm hover:shadow-md border-sky-700/30 hover:border-sky-700 transition-all duration-300 flex flex-col h-full font-montserrat relative ${
          isLastSeenMinute ? '' : ''
        }`}
        // variants={cardVariants}
        // initial="hidden"
        // animate="visible"
        custom={index % 10}
      >
        {/* Last Seen Badge */}
        {isLastSeenMinute && (
           <div className="absolute top-0 right-0 z-10">
             <div className="bg-sky-700/30 text-sky-900 text-[10px] transition-all duration-300 group-hover:bg-sky-700 group-hover:text-white font-medium px-2 py-0.5 rounded-bl-md rounded-tr-md flex items-center gap-1">
             <CardWrapper to={`/atas/${result.slug}`}>
             <div className="flex items-center gap-1">
                <FiEye className="w-3 h-3" />
              <span>{t("last_seen_minute")}</span>
             </div>
              </CardWrapper>
            </div>
          </div>
        )}

        <div className={`px-5 pt-5 pb-2 flex-grow overflow-hidden ${isLastSeenMinute ? '' : ''}`}>
          <div className="flex items-start justify-between">
            <CardWrapper to={`/atas/${result.slug}`}>
              <h3 className="font-semibold text-sky-900 dark:text-white text-sm mb-2 hover:text-sky-700 transition-all line-clamp-2 underline underline-offset-4 decoration-sky-900/30 hover:decoration-sky-700 decoration-1 duration-300 ease-in-out ">
                {/* {hasHighlights ? 
                  <HighlightedText text={getLocalizedTitle(result)} highlights={result.highlights} path="title" /> 
                  : getLocalizedTitle(result)} */}
                  {getLocalizedTitle(result)}
              </h3>
            </CardWrapper>
            {showSeeButton && (
              <CardWrapper to={`/atas/${result.slug}`}>
                  <span className="text-xl inline-flex items-center text-sky-700 hover:text-sky-800 group ml-2 rounded transition-colors">
                  {/* {t("view")} */}
                  <FiChevronRight className="transform transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </CardWrapper>
            )}
          </div>
          
          <div className={`text-xs text-slate-700 dark:text-gray-300 mb-2 ${viewMode === "list" ? "grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-row sm:gap-x-4" : "grid grid-cols-2 gap-x-3 gap-y-1"} items-start`}>
            {showMunicipio && result.municipio && (
              <span className="flex items-center min-w-0">
                <FaLandmark className="mr-1 flex-shrink-0"/>
                {useLinks ? (
                  <LangLink 
                    to={`/municipios/${result.municipio_id}`}
                    className="font-medium hover:text-sky-700 truncate"
                  >
                    {getLocalizedMunicipioName({ name: result.municipio, name_en: result.municipio_en }, i18n.language)}
                  </LangLink>
                ) : (
                  <span className="font-medium truncate">
                    {getLocalizedMunicipioName({ name: result.municipio, name_en: result.municipio_en }, i18n.language)}
                  </span>
                )}
              </span>
            )}
             {showLocation && result.location && (
              <span className="flex items-center font-medium min-w-0">
                <FiMapPin className="mr-1 flex-shrink-0" />
                <span className="truncate">
                  {/* {result.highlights ? 
                    <HighlightedText text={result.location} highlights={result.highlights} path="location" />
                    : result.location
                  } */}
                  {result.location}
                </span>
              </span>
            )}
            <span className="flex items-center font-medium">
              <FiCalendar className="mr-1 flex-shrink-0" />
              <span className="truncate">{formatDateWithTime(result.date, result.start_hour, result.end_hour)}</span>
            </span>
            { showType && result.type && (
              <span className="flex items-center font-medium">
                <FiFileText className="mr-1 flex-shrink-0" />
                <span className="truncate">{result.type === "ordinaria" ? t("ordinary_reunion") : t("extraordinary_reunion")}</span>
              </span>
            )}
            {/* Validation indicator - subtle and at the end */}
           {result.human_validated !== undefined && (
                <Popover
                  content={
                      <div className="p-2 max-w-sm">
                        {/* <div className="flex items-center gap-2 mb-2">
                        <FaRobot className="w-4 h-4 text-sky-700" />
                          <span className="text-xs font-normal text-sky-700">{t('content_generated_by_ai')}</span>
                        </div> */}
                        {/* <div className="text-center mb-1">
                              {result.human_validated ? (
                            <FaRobot className="inline w-4 h-4 mr-1 text-green-600" />
                          ) : (
                            <FaRobot className="inline w-4 h-4 mr-1 text-amber-600" />
                          )}
                        </div> */}
                        <h3 className={`text-xs font-light mb-0 ${
                          result.human_validated ? 'text-green-800 dark:text-emerald-600' : 'text-amber-800 dark:text-amber-600'
                        }`}>
                          {/* {result.human_validated ? t('content_validated') : t('content_not_validated')} */}
                          {result.human_validated 
                            ? t('content_validated_message')
                            : t('content_not_validated_message')
                          }
                        </h3>
                        {/* <p className={`text-xs ${
                          result.human_validated ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {result.human_validated 
                            ? t('content_validated_message')
                            : t('content_not_validated_message')
                          }
                        </p> */}
                      </div>
                    }
                  trigger="click"
                  placement="bottom">
                    <span className={`flex items-center font-medium cursor-pointer transition-opacity duration-200 hover:opacity-70 gap-1 ${viewMode === "list" ? "" : "col-span-2"}`}>
                      {/* <FiCpu className="w-3 h-3 text-sky-700" /> */}
                      {result.human_validated ? (
                        <FaCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                      ) : (
                        <FiAlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                    )}
                    </span>
                  </Popover>
                )}
            </div>
          
          {showSummary && (
            <>
              {hasHighlights ? (
                <div className="mb-2">
                  <p className="text-gray-700 dark:text-gray-300 font-light text-sm font-raleway line-clamp-3">
                    <HighlightedText 
                      text={getLocalizedSummary(result) || result.content} 
                      highlights={result.highlights} 
                      path="summary"
                      processContent={true}
                    />
                  </p>
                </div>
              ) : (
                getLocalizedSummary(result) && (
                  <p className="text-gray-500 font-light text-sm mb-2 font-raleway line-clamp-3">
                    {getLocalizedSummary(result).substring(0, 200) + (getLocalizedSummary(result).length > 200 ? "..." : "")}
                  </p>
                )
              )}
            </>
          )}
        </div>
      </motion.div>
    );
  }
  

  // Subject card
  if (isSubject) {
    const assunto = result;
    
    // Check if there are highlights to display
    const hasHighlights = assunto.highlights && assunto.highlights.length > 0;
    const hasVotingData = assunto.votos_favor !== undefined && assunto.votos_contra !== undefined && assunto.abstencoes !== undefined;
    const totalVotes = hasVotingData ? assunto.votos_favor + assunto.votos_contra + assunto.abstencoes : 0;
    
    // Determine approval status
    const isApproved = assunto.aprovado === true || assunto.aprovado === 1;
    const isRejected = assunto.aprovado === false || assunto.aprovado === 0;
    
    // Get participant's vote if available (when viewing from ParticipantePage)
    // Vote types from model: "favor", "contra", "abstencao"
    // Map them to display values
    const participantVote = showParticipantVote && assunto.participante_voto 
      ? assunto.participante_voto.toLowerCase() 
      : null;
    
    // Map vote type to display text
    const voteDisplayMap = {
      'favor': 'a favor',
      'contra': 'contra',
      'abstencao': 'abstenção',
      'abstenção': 'abstenção' // in case it comes with accent
    };
    
    const displayVote = participantVote ? (voteDisplayMap[participantVote] || participantVote) : null;
    
    return (
      <motion.div 
        className={`bg-white group border-b-3 rounded-t-md shadow-sm hover:shadow-md border-sky-700/30 hover:border-sky-700 transition-all duration-300 flex flex-col h-full font-montserrat group relative ${
          isLastSeenSubject ? '' : ''
        }`}
      >
        {/* Last Seen Badge */}
        {isLastSeenSubject && (
          <div className="absolute top-0 right-0 z-10">
             <div className="bg-sky-700/30 text-sky-900 text-[10px] transition-all duration-300 group-hover:bg-sky-700 group-hover:text-white font-medium px-2 py-0.5 rounded-bl-md rounded-tr-md flex items-center gap-1">
             <CardWrapper to={`/assuntos/${assunto.id}`}>
             <div className="flex items-center gap-1">
                <FiEye className="w-3 h-3" />
              <span>{t("last_seen_subject")}</span>
             </div>
              </CardWrapper>
            </div>
          </div>
        )}

        {/* Approval Status Badge - Top Left */}
        {(isApproved || isRejected) && (
          <div className="absolute top-0 left-0 z-10">
            <div className={`text-[10px] font-medium px-2 py-0.5 rounded-br-md rounded-tl-md flex items-center gap-1 ${
              isApproved 
                ? 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300' 
                : 'bg-rose-100 text-rose-700 group-hover:bg-rose-700 group-hover:text-white transition-all duration-300'
            }`}>
              {isApproved ? (
                <>
                  <FiCheckCircle className="w-3 h-3" />
                  <span>{t("subject_approved", "Aprovado")}</span>
                </>
              ) : (
                <>
                  <FiX className="w-3 h-3" />
                  <span>{t("subject_rejected", "Não aprovado")}</span>
                </>
              )}
            </div>
          </div>
        )}

        <div className={`px-5 pt-5 ${hasVotingData && totalVotes > 0 ? 'pb-2' : 'pb-2'} flex-grow overflow-hidden ${hasVotingData && totalVotes > 0 && isListMode ? 'md:grid md:grid-cols-4 md:gap-4' : ''}`}>
          {/* Main content area - takes 3 columns when voting data exists on desktop and in list mode */}
          <div className={hasVotingData && totalVotes > 0 && isListMode ? 'md:col-span-3' : ''}>
            <div className="flex items-start justify-between">
              <CardWrapper to={`/assuntos/${assunto.id}`}>
                <h3 className="font-semibold text-sky-900 text-sm mb-2 hover:text-sky-700 transition-all line-clamp-2 underline underline-offset-4 decoration-sky-900/20 hover:decoration-sky-700 decoration-1 duration-300 ease-in-out ">
                  {getLocalizedTitle(assunto)}
                </h3>
              </CardWrapper>
              {showSeeButton && (
                <CardWrapper to={`/assuntos/${assunto.id}`}>
                  <span className="text-xl inline-flex items-center text-sky-700 hover:text-sky-800 group ml-2 rounded transition-colors">
                    <FiChevronRight className="transform transition-transform duration-300 group-hover:translate-x-1" />
                  </span>
                </CardWrapper>
              )}
            </div>
            
            <div className={`text-xs text-sky-950 dark:text-gray-300 mb-2 ${viewMode === "list" ? "grid grid-cols-2 gap-x-3 gap-y-1 sm:flex sm:flex-row sm:gap-x-4" : "grid grid-cols-2 gap-x-3 gap-y-1"} items-start`}>
              {displayVote && (
                <span className={`flex items-center font-medium ${viewMode === "list" ? "col-span-2" : "col-span-2"} ${
                  displayVote === 'a favor' 
                    ? ' text-emerald-600 ' 
                    : displayVote === 'contra'
                    ? ' text-rose-700 border'
                    : ' text-gray-700 border'
                }`}>
                  {displayVote === 'a favor' && <FaCheck className="w-3 h-3 mr-1 flex-shrink-0" />}
                  {displayVote === 'contra' && <FiX className="w-3 h-3 mr-1 flex-shrink-0" />}
                  {displayVote === 'abstenção' && <FiInfo className="w-3 h-3 mr-1 flex-shrink-0" />}
                  <span className="whitespace-nowrap">
                    {displayVote === 'a favor' && t("voted_in_favor", "Votou a Favor")}
                    {displayVote === 'contra' && t("voted_against", "Votou Contra")}
                    {displayVote === 'abstenção' && t("voted_abstention", "Votou Abstenção")}
                  </span>
                </span>
              )}

              {showMunicipio && (
                <span className="flex items-center min-w-0">
                  <FaLandmark className="mr-1 flex-shrink-0"/> 
                  {useLinks ? (
                    <LangLink 
                      to={`/municipios/${assunto.ata.municipio_id}`}
                      className="font-medium hover:text-sky-700 truncate"
                    >
                      {getLocalizedMunicipioName({ name: assunto.ata.municipio, name_en: assunto.ata.municipio_en }, i18n.language)}
                    </LangLink>
                  ) : (
                    <span className="font-medium truncate">
                      {getLocalizedMunicipioName({ name: assunto.ata.municipio, name_en: assunto.ata.municipio_en }, i18n.language)}
                    </span>
                  )}
                </span>
              )}
              {showDate && (
                <span className="flex items-center font-medium min-w-0">
                  <FiCalendar className="mr-1 flex-shrink-0" />
                  <span className="truncate">{formatDateWithTime(assunto.ata.date, assunto.ata.start_hour, assunto.ata.end_hour)}</span>
                </span>
              )}

              {assunto.topico && (
                <span className={`flex items-center font-medium rounded text-xs gap-1 min-w-0 ${viewMode === "list" ? "col-span-2" : "col-span-2"}`}>
                  {getTopicoIcon(getLocalizedTopicName(assunto.topico, i18n.language), "w-3.5 h-3.5 flex-shrink-0")}
                  <span className="truncate">{getLocalizedTopicName(assunto.topico, i18n.language)}</span>
                </span>
              )}

              {assunto.ata.human_validated !== undefined && (
                <Popover
                  content={
                      <div className="p-2 max-w-sm">
                        <h3 className={`text-xs font-light mb-0 ${
                          assunto.ata.human_validated ? 'text-green-800 dark:text-emerald-600' : 'text-amber-800 dark:text-amber-600'
                        }`}>
                          {assunto.ata.human_validated 
                            ? t('subjects_content_validated_message')
                            : t('subjects_content_not_validated_message')
                          }
                        </h3>
                      </div>
                  } 
                  trigger="click"
                  placement="bottom">
                    <span className={`flex items-center font-medium cursor-pointer transition-opacity duration-200 hover:opacity-70 gap-1 ${viewMode === "list" ? "col-span-2" : "col-span-2"}`}>
                      {assunto.ata.human_validated ? (
                        <>
                          <FaCheck className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                          <span className="text-green-600 whitespace-nowrap">Validada</span>
                        </> 
                      ) : (
                        <>
                          <FiAlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                          <span className="text-amber-800 whitespace-nowrap">Não validada</span>
                        </> 
                    )}
                    </span>
                </Popover>
              )}
            </div>
            
            {deliberacao && assunto.deliberacao && (
              <p className="text-gray-500 font-light text-sm mb-3 line-clamp-3 font-raleway">
                {hasHighlights ? 
                  <HighlightedText 
                    text={assunto.deliberacao}
                    highlights={assunto.highlights}
                    path="deliberacao"
                    processContent={true}
                  /> 
                  : assunto.deliberacao}
              </p>
            )}
            
            {showSummary && getLocalizedSummary(assunto) && !(deliberacao && assunto.deliberacao) && (
              <p className="text-gray-500 font-light text-sm mb-2 line-clamp-3 font-raleway">
                {hasHighlights ? 
                  <HighlightedText 
                    text={getLocalizedSummary(assunto)}
                    highlights={assunto.highlights}
                    path="summary"
                    processContent={true}
                  /> 
                  : getLocalizedSummary(assunto).substring(0, 200) + (getLocalizedSummary(assunto).length > 200 ? "..." : "")}
              </p>
            )}
          </div>

          {/* Desktop voting column - only show in sidebar for list mode on desktop */}
          {hasVotingData && totalVotes > 0 && isListMode && (
            <div className="hidden md:block md:col-span-1 border-l border-gray-200 pl-4">
              <VotingDisplay 
                votos_favor={assunto.votos_favor} 
                votos_contra={assunto.votos_contra} 
                abstencoes={assunto.abstencoes} 
              />
            </div>
          )}
        </div>

        {/* Bottom voting section - displayed at bottom for mobile OR when not in list mode */}
        {hasVotingData && totalVotes > 0 && (
          <div
            className={`px-5 pb-4 border-t border-gray-100 pt-3 ${
              isListMode ? 'block md:hidden' : 'block'
            }`}
          >
            <VotingDisplay 
              votos_favor={assunto.votos_favor} 
              votos_contra={assunto.votos_contra} 
              abstencoes={assunto.abstencoes}
              compact={true}
            />
          </div>
        )}
      </motion.div>
    );
  }

  return null;
};

export default GenericResultCard;