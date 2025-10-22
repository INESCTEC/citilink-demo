import React, { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight, FiClock, FiHelpCircle, FiCalendar } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const AtaNavigationTimeline = ({ currentAtaId, municipioId, API_URL, onNavigate }) => {
  const { t } = useTranslation();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  const [timelineData, setTimelineData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [showLegendTooltip, setShowLegendTooltip] = useState(false);
  const [tooltipStyle, setTooltipStyle] = useState({
    left: '50%',
    transform: 'translateX(-50%)',
    right: 'auto'
  });
  const timelineRef = useRef(null);
  const itemRefs = useRef({});

  // State for drag-to-scroll functionality
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftStart, setScrollLeftStart] = useState(0);
  
  // Store refs for timeline items
  const setItemRef = (ataId, element) => {
    if (element) {
      itemRefs.current[ataId] = element;
    } else {
      delete itemRefs.current[ataId];
    }
  };

  // Fetch timeline data whenever currentAtaId or municipioId changes
  useEffect(() => {
    fetchAtaTimeline();
  }, [currentAtaId, municipioId, API_URL]);
  
  // Scroll to currently selected Ata when timeline updates
  useEffect(() => {
    const scrollToCurrentItem = () => {
      if (itemRefs.current[currentAtaId] && timelineRef.current) {
        const itemElement = itemRefs.current[currentAtaId];
        const containerElement = timelineRef.current;
  
        // Calculate scroll position to center the item
        const itemRect = itemElement.getBoundingClientRect();
        const containerRect = containerElement.getBoundingClientRect();
        
        const itemCenter = itemElement.offsetLeft + (itemRect.width / 2);
        const containerCenter = containerElement.clientWidth / 2;
        
        // Smoothly scroll to center the item
        containerElement.scrollTo({
          left: itemCenter - containerCenter,
          behavior: 'smooth'
        });
      }
    };

    // Small delay to ensure the DOM is ready
    const timer = setTimeout(scrollToCurrentItem, 100);
    return () => clearTimeout(timer);
  }, [currentAtaId, timelineData]);

  const fetchAtaTimeline = async () => {
    if (!municipioId || !currentAtaId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(
        `${API_URL}/v0/public/municipios/${municipioId}/atas/timeline?current_id=${currentAtaId}&limit=20&demo=${DEMO_MODE}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch timeline data");
      }
      
      const data = await response.json();
      console.log("Timeline data:", data);
      
      // Process the data to add formatted dates and extract assuntos_count
      const processedData = (data.atas || []).map(ata => ({
        ...ata,
        date: new Date(ata.date),
        year: new Date(ata.date).getFullYear(),
        formattedDate: format(new Date(ata.date), "dd MMM yyyy", { locale: pt }),
        // Assume assuntos_count is 0 if not provided
        assuntos_count: ata.assuntos_count || 0,
      }));
      
      setTimelineData(processedData);
    } catch (error) {
      console.error("Error fetching ata navigation timeline:", error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const navigateToAta = (ataId, direction) => {
    // Don't navigate if clicking on the current item
    if (ataId === currentAtaId) return;
    
    // Use the provided onNavigate prop for navigation
    if (onNavigate) {
      // Set hovered item to null to avoid tooltip persisting
      setHoveredItem(null);
      onNavigate(ataId, direction);
    }
  };

  // --- Drag-to-scroll Handlers ---
  const handleMouseDown = (e) => {
    if (!timelineRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - timelineRef.current.offsetLeft);
    setScrollLeftStart(timelineRef.current.scrollLeft);
    // timelineRef.current.style.cursor = 'grabbing';
    timelineRef.current.style.userSelect = 'none';
  };

  const handleMouseLeave = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (timelineRef.current) {
      // timelineRef.current.style.cursor = 'grab';
      timelineRef.current.style.userSelect = '';
    }
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (timelineRef.current) {
      // timelineRef.current.style.cursor = 'grab';
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

  // Touch event handlers
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

  // Calculate tooltip position - Fix to accept ID or ata object
  const calculateTooltipPosition = (ataId) => {
    // Convert to string ID if an object was passed
    const id = typeof ataId === 'object' ? ataId.id : ataId;
    
    const itemElement = itemRefs.current[id];
    const containerElement = timelineRef.current;
  
    if (!itemElement || !containerElement) {
      return { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
    }
  
    const itemRect = itemElement.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    // Get positions relative to the viewport
    const itemLeft = itemRect.left;
    const itemCenter = itemLeft + itemRect.width / 2; 
    const itemRight = itemRect.right;   
    
    const containerLeft = containerRect.left;
    const containerRight = containerRect.right;
    const containerWidth = containerRect.width;
    
    // Use a larger estimated width to account for the title in the tooltip
    const estimatedTooltipWidth = 260;
    const buffer = 16;
  
    // Calculate tooltip edges relative to container
    const tooltipLeftEdgeInContainer = itemCenter - estimatedTooltipWidth/2 - containerLeft;
    const tooltipRightEdgeInContainer = itemCenter + estimatedTooltipWidth/2 - containerLeft;
    
    // Default style - centered on the marker
    let style = { left: '50%', transform: 'translateX(-50%)', right: 'auto' };
    
    // Check if tooltip would overflow left edge
    if (tooltipLeftEdgeInContainer < buffer) {
      style = { 
        left: `${buffer}px`, 
        transform: 'none',
        right: 'auto' 
      };
    }
    // Check if tooltip would overflow right edge
    else if (tooltipRightEdgeInContainer > containerWidth - buffer) {
      style = { 
        right: `${buffer}px`, 
        transform: 'none',
        left: 'auto'
      };
    }
  
    return style;
  };

  // New handler for mouse enter that updates tooltip position
  const handleItemMouseEnter = (ataId) => {
    setHoveredItem(ataId);
    
    // Calculate and set position immediately on hover
    requestAnimationFrame(() => { // Use requestAnimationFrame to ensure measurements are up-to-date
      setTooltipStyle(calculateTooltipPosition(ataId));
    });
  };
  
  const handleItemMouseLeave = () => {
    setHoveredItem(null);
    // Reset to default centered position
    setTooltipStyle({ left: '50%', transform: 'translateX(-50%)', right: 'auto' });
  };

  // Toggle legend tooltip
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
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showLegendTooltip]);

  // Scroll timeline with buttons
  const scrollTimeline = (direction) => {
    if (timelineRef.current) {
      const scrollAmount = direction === 'left' ? -timelineRef.current.offsetWidth * 0.7 : timelineRef.current.offsetWidth * 0.7;
      timelineRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Calculate color intensity based on assuntos_count
  const calculateMarkerColor = (assuntosCount, isActive = false, isHover = false) => {
    if (isActive) return "bg-sky-600"; // Active always uses the standard active color
    if (isHover) return "bg-sky-700"; // Hover always uses the standard hover color
    
    // No assuntos case - use lightest color
    if (!assuntosCount || assuntosCount === 0) return "bg-gray-400 group-hover:bg-sky-500";
    
    // Scale from 1 to 4 based on count (logarithmic scale for better distribution)
    const intensityLevel = Math.min(Math.floor(Math.log2(assuntosCount + 1)), 4); 
    
    // Map intensity level to color class
    // Higher numbers = more saturated/darker colors
    const colorClasses = [
      "bg-sky-300 group-hover:bg-sky-500", // Very few assuntos
      "bg-sky-400 group-hover:bg-sky-600", // Few assuntos
      "bg-sky-500 group-hover:bg-sky-600", // Moderate assuntos
      "bg-sky-600 group-hover:bg-sky-700", // Many assuntos
      "bg-sky-700 group-hover:bg-sky-800"  // Lots of assuntos
    ];
    
    return colorClasses[intensityLevel];
  };

  if (isLoading && timelineData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FiClock className="mr-2" /> {t("timeline")}
        </h2>
        <div className="animate-pulse h-20 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error || timelineData.length === 0) {
    return null;
  }

  // Find the index of the current ata
  const currentIndex = timelineData.findIndex(ata => ata.id === currentAtaId);
  
  // Get available years for the dropdown
  // const timelineYears = [...new Set(timelineData.map(ata => ata.year))].sort((a, b) => b - a);

  // Track month/year changes for labels
  let lastRenderedYear = null;
  let lastRenderedMonthYear = null;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mt-8 font-montserrat">
      {/* Header with Title and Year Jumps */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-4 gap-4">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center flex-shrink-0 capitalize bg-amber-200">
          <FiClock className="mr-2" /> {t("timeline")}
        </h2>
        
        {/* <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide pb-2 w-full sm:w-auto justify-center sm:justify-end">
          <span className="text-gray-600 flex-shrink-0 flex items-center whitespace-nowrap text-sm">
            <FiCalendar className="mr-1" /> Ir para o ano:
          </span>
          <select
            value={timelineData[currentIndex]?.year || ''}
            onChange={(e) => {
              const selectedYear = parseInt(e.target.value, 10);
              const firstAtaOfYear = timelineData.find(ata => ata.year === selectedYear);
              if (firstAtaOfYear) {
                const direction = currentIndex > timelineData.indexOf(firstAtaOfYear) ? "left" : "right";
                navigateToAta(firstAtaOfYear.id, direction);
              }
            }}
            className="px-3 py-1 rounded-md border border-gray-300 bg-white text-sm text-gray-700"
            aria-label="Jump to year"
          >
            <option value="" disabled>Selecione o ano</option>
            {timelineYears.map(year => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div> */}
      </div>
      
      {/* Timeline Visualization */}
      <div className="relative mt-6 font-montserrat">
        <div className="flex items-center justify-center">
          {/* Left Scroll Button */}
          <div className="p-2 mr-2"></div>
          {/* <button 
            onClick={() => scrollTimeline('left')}
            className="p-2 bg-white text-gray-600 hover:text-sky-600 z-20 mr-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Scroll timeline left"
            disabled={timelineRef.current?.scrollLeft === 0} // Basic check
          >
            <FiChevronLeft size={20} />
          </button> */}
          
          {/* Scrollable Timeline Container */}
          <div 
            ref={timelineRef}
            className={`overflow-x-auto scrollbar-hide relative flex-1 py-30 cursor-default`}
            style={{ scrollBehavior: 'smooth' }}
            onMouseDown={handleMouseDown}
            onMouseLeave={handleMouseLeave}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchMove}
          >
            {/* Timeline Items - Using NavigationTimeline style */}
            <div className="flex min-w-max relative space-x-8 px-4">
              {timelineData.map((ata, index) => {
                // FIXED: Changed the comparison to check ID values, not object references
                const isActive = ata.id === currentAtaId;
                const isHover = hoveredItem === ata.id; // This is the key fix
                const isPast = index < currentIndex;
                
                const prevAta = timelineData[index - 1]; 
                // Check if the date is the same as the previous item
                const hasSameDateAsPrev = index > 0 && ata.date.toDateString() === prevAta.date.toDateString();
                // Check if the month and year are the same as the previous item
                const isInSameMonthAsPrev = index > 0 && format(ata.date, "yyyy-MM") === format(prevAta.date, "yyyy-MM");
                
                // Year and month tracking for labels
                const currentYear = ata.year;
                const currentMonthYear = format(ata.date, "yyyy-MM");
                
                // Check if year changes
                const showYearMarker = currentYear !== lastRenderedYear;
                let isFirstOfYear = false;
                if (showYearMarker) {
                  lastRenderedYear = currentYear;
                  isFirstOfYear = true;
                  lastRenderedMonthYear = null; // Reset month tracking on year change
                }
                
                // Check if month changes
                let isFirstOfMonth = false;
                if (currentMonthYear !== lastRenderedMonthYear) {
                  lastRenderedMonthYear = currentMonthYear;
                  isFirstOfMonth = true;
                }
                
                // Calculate marker color based on assuntos_count
                const markerColor = calculateMarkerColor(ata.assuntos_count, isActive, isHover);
                
                return (
                  <React.Fragment key={ata.id}>
                    {/* Ata Item Container */}
                    <div 
                      ref={(el) => setItemRef(ata.id, el)}
                      // Apply negative margin if the item is in the same month as the previous one
                      className={`relative flex flex-col justify-center items-center group cursor-pointer ${
                        isInSameMonthAsPrev ? 'ml-[-2.8rem]' : '' 
                      }`}
                      style={{ minWidth: '40px' }} // Ensure minimum clickable area
                      onMouseEnter={() => handleItemMouseEnter(ata.id)}
                      onMouseLeave={handleItemMouseLeave}
                      onClick={() => navigateToAta(ata.id, index < currentIndex ? "left" : "right")}
                      aria-label={`Ata de ${ata.formattedDate}: ${ata.title}`}
                    >
                      {/* Year Marker - Positioned above the item container */}
                      {isFirstOfYear && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-11 flex flex-col items-center pointer-events-none">
                          <span className="text-sm font-regular text-gray-600 bg-white px-2 py-0.5 rounded shadow-sm border border-gray-200">
                            {ata.year}
                          </span>
                          <div className="w-0.5 h-5 bg-gray-300 mt-1"></div>
                        </div>
                      )}
                      
                      {/* Connecting line  */}
                      {index > 0 && !hasSameDateAsPrev && (
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-full h-0.5 bg-gray-300 w-[100px] z-0"></div>
                      )}
                      
                      {/* Vertical Rectangle Marker - COLOR BASED */}
                      <div 
                        className={`
                          absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 z-10 shadow-sm rounded-sm
                          ${isActive 
                            ? "bg-sky-600 w-6 h-12 ring-2 ring-sky-600" // Active rectangle
                            : isHover 
                              ? "bg-sky-700 w-5.5 h-7" // Hover rectangle
                              : markerColor + " w-5 h-5" // Color based on assuntos_count
                          }
                        `}
                      ></div>
                      
                      {/* Month Label */}
                      {isFirstOfMonth && !hasSameDateAsPrev && (
                        <div className={`
                          absolute bottom-1/2 mb-7
                          text-xs font-medium whitespace-nowrap transition-colors duration-200
                          ${isActive ? 'text-sky-700 font-semibold' : 'text-gray-500 group-hover:text-sky-600'}
                        `}>
                          {format(ata.date, "MMM", { locale: pt })}
                        </div>
                      )}
                      
                      {/* Date label under marker */}
                      <div className={`text-sm font-medium mt-1 
                        ${isActive ? 'text-sky-600 font-bold' : 'text-gray-600'}`}>
                        {format(ata.date, 'dd', { locale: pt })}
                      </div>
                      
                      {/* Tooltip - Show on Hover */}
                      {isHover && (
                        <motion.div
                          style={tooltipStyle} // Apply the calculated style from state
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute top-1/2 mt-5 z-30 bg-sky-700 text-white px-2 py-1.5 rounded-md shadow-lg text-xs pointer-events-none max-w-xs w-max text-center"
                        >
                          <div>{format(ata.date, "dd 'de' MMMM 'de' yyyy", { locale: pt })}</div>
                          {/* Show assuntos count if available */}
                          {typeof ata.assuntos_count === 'number' && ata.assuntos_count > 0 && (
                            <div className="mt-1">
                              <span className="text-sky-300">
                                {ata.assuntos_count} assunto{ata.assuntos_count !== 1 ? 's' : ''}
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
          
          {/* Right Scroll Button */}
          <div className="p-2"></div>
          {/* <button 
            onClick={() => scrollTimeline('right')}
            className="p-2 bg-white text-gray-600 hover:text-sky-600 z-20 ml-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Scroll timeline right"
            disabled={timelineRef.current && timelineRef.current.scrollLeft + timelineRef.current.offsetWidth >= timelineRef.current.scrollWidth}
          >
            <FiChevronRight size={20} />
          </button> */}
        </div>
      </div>

      <div className="text-xs text-gray-500 text-center mt-3 relative">
        <div className="inline-flex items-center">
          <span>A intensidade da cor de cada marcador representa o número de assuntos na ata</span>
          <button 
            onClick={toggleLegendTooltip} 
            className="ml-1 text-sky-600 hover:text-sky-800 focus:outline-none" 
            aria-label="Mostrar mais informações sobre os marcadores"
          >
            <FiHelpCircle className="text-base" />
          </button>
        </div>
        
        {/* Legend tooltip/popover */}
        <AnimatePresence>
          {showLegendTooltip && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white text-left p-3 rounded-md shadow-lg border border-gray-200 z-50 w-80"
              onClick={(e) => e.stopPropagation()}
            >
              <h4 className="font-medium text-sm text-sky-800 mb-2">Legenda de cores</h4>
              <p className="text-xs text-gray-600 mb-2">
                A cor de cada marcador na linha do tempo indica a quantidade de assuntos discutidos nessa ata:
              </p>
              <div className="space-y-2">
                {[
                  { color: "bg-gray-400", label: "Sem assuntos" },
                  { color: "bg-sky-300", label: "Poucos assuntos" },
                  { color: "bg-sky-400", label: "Alguns assuntos" },
                  { color: "bg-sky-500", label: "Vários assuntos" },
                  { color: "bg-sky-600", label: "Muitos assuntos" },
                  { color: "bg-sky-700", label: "Numerosos assuntos" },
                ].map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div className={`${item.color} w-4 h-4 rounded-sm flex-shrink-0`}></div>
                    <span className="ml-2 text-gray-700 text-xs">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {/* Selected Ata Information Box */}
      {/* {timelineData.length > 0 && currentIndex >= 0 && (
        <div className="mt-6 relative font-montserrat">
          <div className="bg-white rounded-md border border-gray-50 shadow-sm relative overflow-hidden">
            <div className="bg-white rounded-md shadow overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full">
              <div className="px-5 pt-5 flex-grow">
                <h3 className="font-semibold text-gray-800 text-lg md:text-xl mb-2 transition-colors line-clamp-2 text-start">
                  {timelineData[currentIndex].title}
                </h3>
                
                <div className="text-sm text-sky-950 dark:text-gray-300 mb-3 flex justify-between items-center">
                  <span className="flex items-center font-medium">
                    <FiCalendar className="mr-1" />
                    <span>{format(timelineData[currentIndex].date, "d MMMM yyyy", { locale: pt })}</span>
                  </span>
                </div>
              </div>
              
              <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
                {typeof timelineData[currentIndex].assuntos_count === 'number' && (
                  <span className="text-xs font-light text-gray-500 lowercase">
                    {timelineData[currentIndex].assuntos_count} assunto{timelineData[currentIndex].assuntos_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  );
};

export default AtaNavigationTimeline;