import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight, FiClock, FiCalendar, FiHelpCircle, FiChevronUp } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import AtaInformation from "../PublicAtaPage/AtaInformation";
import { useNavigate } from "react-router-dom";
import { useLangNavigate } from "../../hooks/useLangNavigate";

const NavigationTimeline = ({ 
  timelineAtas = [], 
  timelineYears = [], 
  onSelectAta,
  showYearSelect = true,
  threshold = 5,
  isEmbbed = false,
  selectedAta,
  showDetailsInTimeline = true,
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useLangNavigate();
  
  const [animateDirection, setAnimateDirection] = useState(null);
  const [hoveredAta, setHoveredAta] = useState(null);
  // Only use internal selectedAta state if not embbed
  const [selectedAtaInternal, setSelectedAtaInternal] = useState(null);
  const [showLegendTooltip, setShowLegendTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({
    left: '50%',
    transform: 'translateX(-50%)',
    right: 'auto',
  });

  // Drag state
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);

  const timelineRef = useRef(null);
  const itemRefs = useRef({});

  // URL management functions (only if not embbed)
  const updateURL = (ata) => {
    if (isEmbbed) return;
    if (!ata || !ata.slug) return;
    const url = new URL(window.location);
    url.searchParams.set('ata', ata.slug);
    window.history.pushState({ ataSlug: ata.slug }, '', url.toString());
  };

  const getAtaFromURL = () => {
    if (isEmbbed) return null;
    const urlParams = new URLSearchParams(window.location.search);
    const ataSlug = urlParams.get('ata');
    if (ataSlug && timelineAtas.length > 0) {
      return timelineAtas.find(ata => ata.slug === ataSlug);
    }
    return null;
  };

  const clearAtaFromURL = () => {
    if (isEmbbed) return;
    const url = new URL(window.location);
    url.searchParams.delete('ata');
    window.history.pushState({}, '', url.toString());
  };

  // Handle browser back/forward buttons (only if not embbed)
  useEffect(() => {
    if (isEmbbed) return;
    const handlePopState = (event) => {
      const ataFromURL = getAtaFromURL();
      if (ataFromURL) {
        setSelectedAtaInternal(ataFromURL);
        setTimeout(() => scrollToAta(ataFromURL.id, 'auto'), 100);
      } else if (timelineAtas.length > 0) {
        const mostRecentAta = timelineAtas[timelineAtas.length - 1];
        setSelectedAtaInternal(mostRecentAta);
        setTimeout(() => scrollToAta(mostRecentAta.id, 'auto'), 100);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [timelineAtas, isEmbbed]);

  // Format date with i18n support
  const formatDate = (date, formatKey) => {
    try {
      if (!date) return '';
      
      const currentLang = i18n.language || 'pt';
      const locale = currentLang === 'pt' ? pt : undefined;
      
      const dateFormats = {
        pt: {
          "date_format": "dd/MM/yyyy HH:mm",
          "month_format": "MMM",
          "full_date_format": "dd 'de' MMMM 'de' yyyy"
        },
        en: {
          "date_format": "MM/dd/yyyy HH:mm", 
          "month_format": "MMM",
          "full_date_format": "MMMM dd, yyyy"
        },
      };
      
      const languageFormats = dateFormats[currentLang] || dateFormats.en;
      const formatStr = languageFormats[formatKey] || formatKey;
      
      return format(date, formatStr, { locale });
    } catch (e) {
      console.error("Date formatting error:", e);
      return date instanceof Date ? date.toLocaleDateString() : '';
    }
  };

  // Initialize selectedAta - only if not embbed
  useEffect(() => {
    if (isEmbbed) return;
    if (timelineAtas.length > 0) {
      const ataFromURL = getAtaFromURL();
      if (ataFromURL) {
        setSelectedAtaInternal(ataFromURL);
        setTimeout(() => scrollToAta(ataFromURL.id, 'auto'), 100);
      } else if (!selectedAtaInternal) {
        const mostRecentAta = timelineAtas[timelineAtas.length - 1];
        setSelectedAtaInternal(mostRecentAta);
        updateURL(mostRecentAta);
        setTimeout(() => scrollToAta(mostRecentAta.id, 'auto'), 100);
      }
    } else if (timelineAtas.length === 0) {
      setSelectedAtaInternal(null);
      clearAtaFromURL();
    }
  }, [timelineAtas, isEmbbed]);

  // Store refs for timeline items
  const setItemRef = (ataId, element) => {
    if (element) {
      itemRefs.current[ataId] = element;
    } else {
      delete itemRefs.current[ataId];
    }
  };

  const scrollToAta = (ataId, behavior = 'smooth') => {
    const element = itemRefs.current[ataId];
    if (element && timelineRef.current) {
      const elementOffset = element.offsetLeft + element.offsetWidth / 2;
      const containerWidth = timelineRef.current.offsetWidth;
      timelineRef.current.scrollTo({
        left: elementOffset - containerWidth / 2,
        behavior: behavior,
      });
    }
  };

  const handleYearSelect = (year) => {
    const firstAtaOfYear = timelineAtas.find(ata => ata.year === year);
    if (firstAtaOfYear) {
      const direction = effectiveSelectedAta && year < effectiveSelectedAta.year ? "right" : "left";
      handleAtaClick(firstAtaOfYear, direction, 'smooth');
    }
  };

  const handleAtaClick = (ata, direction = null, scrollBehavior = 'smooth') => {
    if (!effectiveSelectedAta || ata.id !== effectiveSelectedAta.id) {
      if (direction) {
        setAnimateDirection(direction);
      } else if (effectiveSelectedAta) {
        const clickDirection = ata.date > effectiveSelectedAta.date ? "left" : "right";
        setAnimateDirection(clickDirection);
      } else {
        setAnimateDirection(null);
      }
      if (isEmbbed) {
        // If showDetailsInTimeline is false, only call onSelectAta (let parent handle fetch)
        if (!showDetailsInTimeline) {
          if (onSelectAta) onSelectAta(ata);
        } else {
          if (onSelectAta) onSelectAta(ata);
        }
      } else {
        setSelectedAtaInternal(ata);
        updateURL(ata);
      }
      scrollToAta(ata.id, scrollBehavior);
    }
  };

  const scrollTimeline = (direction) => {
    if (timelineRef.current) {
      const scrollAmount = direction === 'left' ? -timelineRef.current.offsetWidth * 0.7 : timelineRef.current.offsetWidth * 0.7;
      timelineRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Tooltip positioning
  const calculateTooltipPosition = (ata) => {
    const itemElement = itemRefs.current[ata.id];
    const containerElement = timelineRef.current;

    if (!itemElement || !containerElement) {
      return { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
    }

    const itemRect = itemElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    const itemCenter = itemRect.left + itemRect.width / 2;
    const containerLeft = containerRect.left;
    const containerWidth = containerRect.width;

    const estimatedTooltipWidth = 300;
    const buffer = 16;

    const tooltipLeftEdgeInContainer = itemCenter - estimatedTooltipWidth/2 - containerLeft;
    const tooltipRightEdgeInContainer = itemCenter + estimatedTooltipWidth/2 - containerLeft;
    
    let style = { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
    
    if (tooltipLeftEdgeInContainer < buffer) {
      style = { left: `${buffer}px`, transform: 'none', right: 'auto' };
    } else if (tooltipRightEdgeInContainer > containerWidth - buffer) {
      style = { right: `${buffer}px`, transform: 'none', left: 'auto' };
    }

    return style;
  };

  const handleItemMouseEnter = (ata) => {
    setHoveredAta(ata);
    requestAnimationFrame(() => {
      setTooltipStyle(calculateTooltipPosition(ata));
    });
  };

  const handleItemMouseLeave = () => {
    setHoveredAta(null);
    setTooltipStyle({ left: '50%', transform: 'translateX(-50%)', right: 'auto' });
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (!timelineRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeftStart(timelineRef.current.scrollLeft);
    timelineRef.current.style.cursor = 'grabbing';
    timelineRef.current.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (timelineRef.current) {
      timelineRef.current.style.cursor = 'grab';
      timelineRef.current.style.userSelect = '';
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (timelineRef.current) {
      timelineRef.current.style.cursor = 'grab';
      timelineRef.current.style.userSelect = '';
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !timelineRef.current) return;
    e.preventDefault();
    const x = e.pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    timelineRef.current.scrollLeft = scrollLeftStart - walk;
  };

  // Touch handlers
  const handleTouchStart = (e) => {
    if (!timelineRef.current) return;
    setIsDragging(true);
    setStartX(e.touches[0].pageX - timelineRef.current.offsetLeft);
    setScrollLeftStart(timelineRef.current.scrollLeft);
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
  };

  const handleTouchMove = (e) => {
    if (!isDragging || !timelineRef.current) return;
    const x = e.touches[0].pageX - timelineRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    timelineRef.current.scrollLeft = scrollLeftStart - walk;
  };

  const calculateMarkerColor = (assuntosCount, isActive = false, isHover = false) => {
    if (isActive) return "bg-sky-600";
    if (isHover) return "bg-sky-700";
    if (!assuntosCount || assuntosCount === 0) return "bg-gray-400 group-hover:bg-sky-500";
    
    let intensityLevel;
    if (assuntosCount <= 10) intensityLevel = 0;
    else if (assuntosCount <= 25) intensityLevel = 1;
    else if (assuntosCount <= 39) intensityLevel = 2;
    else if (assuntosCount <= 49) intensityLevel = 3;
    else intensityLevel = 4;
    
    const colorClasses = [
      "bg-sky-300 group-hover:bg-sky-500",
      "bg-sky-400 group-hover:bg-sky-500",
      "bg-sky-500 group-hover:bg-sky-600",
      "bg-sky-600 group-hover:bg-sky-700",
      "bg-sky-700 group-hover:bg-sky-800"
    ];
    
    return colorClasses[intensityLevel];
  };

  const toggleLegendTooltip = (event) => {
    event.preventDefault();
    event.stopPropagation();
    setShowLegendTooltip(!showLegendTooltip);
  };

  // Close legend tooltip when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (showLegendTooltip) {
        setShowLegendTooltip(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showLegendTooltip]);

  if (timelineAtas.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 text-center text-gray-500">
        <h2 className="text-xl font-semibold mb-4 flex items-center justify-center text-gray-700">
          <FiClock className="mr-2" /> {t("timeline")}
        </h2>
        <p>{t("no_timeline_data")}</p>
      </div>
    );
  }

  let lastRenderedYear = null;
  let lastRenderedMonthYear = null;

  // Use selectedAta from props if isEmbbed, otherwise use internal state
  const effectiveSelectedAta = isEmbbed ? selectedAta : selectedAtaInternal;

  // Scroll to selectedAta when it changes in embbed mode
  useEffect(() => {
    if (isEmbbed && effectiveSelectedAta && effectiveSelectedAta.id) {
      scrollToAta(effectiveSelectedAta.id, 'auto');
    }
    // Only run when selectedAta changes in embbed mode
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmbbed, effectiveSelectedAta?.id]);

  return (
    <div className="font-montserrat">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-0 gap-4">
        <div className="flex justify-start items-center w-full">
          <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-0 w-full sm:w-auto md:justify-center justify-start">
            { showYearSelect && (
              <>
            <span className="text-gray-600 flex-shrink-0 flex items-center whitespace-nowrap text-sm">
              <FiCalendar className="mr-1" /> {t("go_to_year")}:
            </span>
            <select
              value={effectiveSelectedAta?.year || ''}
              onChange={(e) => handleYearSelect(parseInt(e.target.value, 10))}
              className="px-3 py-1 rounded-md border border-gray-300 bg-white dark:bg-sky-800 text-sm text-gray-700 dark:text-white"
              aria-label={t("go_to_year")}
            >
              <option value="" disabled>{t("select_year")}</option>
              {timelineYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            </>
            )}
          </div>

          {/* Wrap button and tooltip in a relative container */}
          <div className="relative pt-1.5 ml-1">
            <button 
              onClick={toggleLegendTooltip} 
              className="text-sky-600 hover:text-sky-800 focus:outline-none" 
              aria-label={t("show_marker_info")}
            >
              <FiHelpCircle className="text-base" />
            </button>
            <AnimatePresence>
              {showLegendTooltip && (
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="absolute top-full -right-20 mt-2 text-left p-3 rounded-md z-50 w-80 bg-white shadow-lg border border-gray-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h4 className="font-medium text-sm text-sky-800 mb-2">{t("color_legend")}</h4>
                  <p className="text-xs text-gray-600 mb-2">{t("timeline_marker_explanation")}</p>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <div className="bg-gray-400 w-4 h-4 rounded-sm flex-shrink-0"></div>
                      <span className="ml-2 text-gray-700 text-xs">0 - sem assuntos</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-sky-300 w-4 h-4 rounded-sm flex-shrink-0"></div>
                      <span className="ml-2 text-gray-700 text-xs">1-10 assuntos</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-sky-400 w-4 h-4 rounded-sm flex-shrink-0"></div>
                      <span className="ml-2 text-gray-700 text-xs">11-25 assuntos</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-sky-500 w-4 h-4 rounded-sm flex-shrink-0"></div>
                      <span className="ml-2 text-gray-700 text-xs">26-39 assuntos</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-sky-600 w-4 h-4 rounded-sm flex-shrink-0"></div>
                      <span className="ml-2 text-gray-700 text-xs">40-49 assuntos</span>
                    </div>
                    <div className="flex items-center">
                      <div className="bg-sky-700 w-4 h-4 rounded-sm flex-shrink-0"></div>
                      <span className="ml-2 text-gray-700 text-xs">50+ assuntos</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="relative mt-1 font-montserrat">
        <div className="flex items-center dark:bg-sky-800 rounded-md ">
          {/* left button */}
          <button 
            onClick={() => scrollTimeline('left')}
            className="p-2 mb-8 text-gray-600 hover:text-sky-600 z-20 mr-2 transition-colors"
            aria-label={t("scroll_timeline_left")}
          >
            <FiChevronLeft />
          </button>
          
          {/* container */}
          <div
            ref={timelineRef}
            className={`overflow-x-auto scrollbar-thin scrollbar-hover:scrollbar-thumb-gray-300 hover:scrollbar-thumb-gray-300 transition-all duration-300 scrollbar-thumb-rounded-md scrollbar-track-rounded-md scrollbar-thumb-gray-300 scrollbar-track-white relative flex-1 pt-12 pb-20 cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}
            style={{ scrollBehavior: 'smooth' }}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            <div className="flex min-w-max relative space-x-8 px-4">
              {timelineAtas.map((ata, index) => {
                const isActive = effectiveSelectedAta && effectiveSelectedAta.id === ata.id;
                const isHover = hoveredAta && hoveredAta.id === ata.id;
                
                const prevAta = timelineAtas[index - 1];
                const hasSameDateAsPrev = index > 0 && ata.date.toDateString() === prevAta.date.toDateString();
                const isInSameMonthAsPrev = index > 0 && format(ata.date, "yyyy-MM") === format(prevAta.date, "yyyy-MM");

                const showYearMarker = ata.year !== lastRenderedYear;
                let isFirstOfYear = false;
                if (showYearMarker) {
                  lastRenderedYear = ata.year;
                  isFirstOfYear = true;
                  lastRenderedMonthYear = null;
                }

                const currentMonthYear = format(ata.date, "yyyy-MM");
                let isFirstOfMonth = false;
                if (currentMonthYear !== lastRenderedMonthYear) {
                  lastRenderedMonthYear = currentMonthYear;
                  isFirstOfMonth = true;
                }

                const markerColor = calculateMarkerColor(ata.assuntos_count, isActive, isHover);
                
                return (
                  <React.Fragment key={ata.id}>
                    <div 
                      ref={(el) => setItemRef(ata.id, el)}
                      className={`relative flex flex-col justify-center items-center group cursor-pointer ${
                        isInSameMonthAsPrev ? 'ml-[-2.8rem]' : '' 
                      }`}
                      style={{ minWidth: '40px' }}
                      onMouseEnter={() => handleItemMouseEnter(ata)}
                      onMouseLeave={handleItemMouseLeave}
                      onClick={() => handleAtaClick(ata)}
                      aria-label={`Ata de ${ata.formattedDate}: ${ata.title}${ata.assuntos_count ? ` (${ata.assuntos_count} assuntos)` : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleAtaClick(ata)}
                    >
                      {/* Year Marker */}
                      {isFirstOfYear && (
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-0 flex flex-col items-center pointer-events-none">
                          <div className="w-0.5 h-5 bg-gray-300 mt-1"></div>
                          <span className="text-xs font-semibold text-gray-600 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">
                            {ata.year}
                          </span>
                        </div>
                      )}
                      
                      {/* Connecting line */}
                      {index > 0 && !hasSameDateAsPrev && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-full h-0.5 bg-gray-300 w-[100px] z-0"></div>
                      )}
                      
                      {/* Marker */}
                       <div 
                        className={`
                          absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 z-10 shadow-sm rounded-sm
                          ${isActive 
                            ? "bg-sky-600 w-6 h-6 ring-2 ring-sky-600"
                            : isHover 
                              ? "bg-sky-700 w-5.5 h-7"
                              : markerColor + " w-5 h-5"
                          }
                        `}
                      >
                        {/* Show day of month instead of subject count */}
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white">
                          {ata.date.getDate()}
                        </div>
                      </div>
                      
                      {/* Active indicator */}
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-1/2 mt-2 left-1/2 transform -translate-x-1/2 z-10"
                        >
                          <FiChevronUp className="text-orange-500 " size={32} />
                        </motion.div>
                      )}
                                            
                      {/* Month Label */}
                      {isFirstOfMonth && !hasSameDateAsPrev && (
                        <div className={`
                          absolute bottom-1/2 mb-7
                          text-sm md:text-xs font-medium whitespace-nowrap transition-colors duration-200
                          ${isActive ? 'text-sky-700 dark:text-white font-semibold' : 'text-gray-500 dark:text-white dark:group-hover:text-sky-600 group-hover:text-sky-600'}
                        `}>
                          {formatDate(ata.date, "month_format")} 
                        </div>
                      )}
                      
                      {/* Tooltip */}
                      {isHover && (
                        <motion.div
                          style={tooltipStyle}
                          initial={{ opacity: 0, y: 10}}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="hidden absolute sm:block top-1/2 mt-5 z-30 text-xs bg-sky-700 text-white px-2 py-1.5 rounded-md shadow-lg max-w-xs w-max text-center pointer-events-none"
                        >
                          <div>{formatDate(ata.date, "full_date_format")}</div>
                          {typeof ata.assuntos_count === 'number' && ata.assuntos_count > 0 && (
                            <div className="mt-1">
                              <span className="text-sky-300">
                                {ata.assuntos_count} {ata.assuntos_count !== 1 ? t("subjects") : t("subject")}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>
          
          {/* right button */}
          <button 
            onClick={() => scrollTimeline('right')}
            className="p-2 mb-8 text-gray-600 hover:text-sky-600 z-20 ml-2 transition-colors"
            aria-label={t("scroll_timeline_right")}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
      
      {/* Selected Ata Information */}
          {effectiveSelectedAta && showDetailsInTimeline && (
      <div className="relative font-montserrat"> 
        <AnimatePresence mode="wait">
            <motion.div
              key={`selected-${effectiveSelectedAta.id}`}
              initial={{ 
                opacity: 0, 
                x: animateDirection === "left" ? 50 : animateDirection === "right" ? -50 : 0,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ 
                opacity: 0, 
                x: animateDirection === "left" ? -50 : animateDirection === "right" ? 50 : 0,
              }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="rounded-md shadow-md relative mx-auto overflow-hidden"
            >
              {/* Most recent ata badge */}
              {timelineAtas.length > 0 && effectiveSelectedAta.id === timelineAtas[timelineAtas.length - 1].id && (
                <div className="absolute top-0 right-0">
                  <div className="bg-sky-950 dark:bg-white text-white dark:text-sky-950 text-xs px-2 py-1 rounded-bl-md font-medium shadow-sm">
                    {t("most_recent_minute")}
                  </div>
                </div>
              )}
              
              <AtaInformation
                ataId={effectiveSelectedAta.id} 
                onSelectAta={onSelectAta}
                showFullContent={true}
              />
            </motion.div>
        </AnimatePresence>
      </div>
          )}
    </div>
  );
};

export default NavigationTimeline;