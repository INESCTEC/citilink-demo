import React, { useState, useEffect, useRef, useCallback } from "react";
import { format, parse, isValid, getYear, getMonth, getDate } from "date-fns";
import { is, pt } from "date-fns/locale"; 
import { FiCalendar, FiChevronLeft, FiChevronRight, FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";
import CustomCalendar from "../CustomCalendar";

// New CompactCalendar component
const CompactCalendar = ({ date, onChange, isStart }) => {
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  
  const handlePrevDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    onChange(newDate);
  };
  
  const handleNextDay = () => {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    onChange(newDate);
  };
  
  return (
    <div className={`compact-calendar bg-sky-800/30 rounded-md border border-sky-700/50 shadow-sm p-2 w-20 ${isStart ? 'mr-4' : 'ml-4'}`}>
      <div className="flex justify-between items-center text-xs text-sky-200 mb-1">
        <button 
          onClick={handlePrevDay}
          className="text-sky-300 hover:text-white transition-colors"
        >
          <FiChevronLeft size={14} />
        </button>
        <div className="text-center flex-grow">
          <div className="font-medium">{getDate(date)} {months[getMonth(date)]}</div>
        </div>
        <button 
          onClick={handleNextDay}
          className="text-sky-300 hover:text-white transition-colors"
        >
          <FiChevronRight size={14} />
        </button>
      </div>
      <div className="text-center text-xs text-sky-100 mt-1 bg-sky-800/40 rounded px-1 py-0.5">
        {getYear(date)}
      </div>
    </div>
  );
};

const DateRangeSlider = ({ startDate, endDate, onDateChange, isEmbed }) => {
  // Define constants
  const today = new Date();
  const earliestYear = 2021;
  const currentYear = today.getFullYear();
  
  // Parse input dates or use defaults
  const parseDate = (dateStr, defaultDaysOffset = 0) => {
    if (!dateStr) {
      const date = new Date();
      if (defaultDaysOffset) {
        date.setDate(date.getDate() - defaultDaysOffset);
      }
      return date;
    }
    
    try {
      const parsed = parse(dateStr, "yyyy-MM-dd", new Date());
      return isValid(parsed) ? parsed : new Date();
    } catch (e) {
      return new Date();
    }
  };
  
  // State for local date management when in embed mode
  const [localStartDate, setLocalStartDate] = useState(() => parseDate(startDate, 30));
  const [localEndDate, setLocalEndDate] = useState(() => parseDate(endDate, 0));
  
  // Use local dates when in embed mode, otherwise use parsed props
  const startDateObj = isEmbed ? localStartDate : parseDate(startDate, 30);
  const endDateObj = isEmbed ? localEndDate : parseDate(endDate, 0);

  // Update local state when props change (for embed mode)
  useEffect(() => {
    if (isEmbed) {
      // Only update local state if props are actually provided
      if (startDate) {
        setLocalStartDate(parseDate(startDate, 30));
      }
      if (endDate) {
        setLocalEndDate(parseDate(endDate, 0));
      }
    }
  }, [startDate, endDate, isEmbed]);

  // Handle search button click
  const handleSearchClick = () => {
    console.log('DateRangeSlider: Search button clicked', {
      startDate: format(startDateObj, "yyyy-MM-dd"),
      endDate: format(endDateObj, "yyyy-MM-dd")
    });
    
    if (onDateChange) {
      onDateChange(format(startDateObj, "yyyy-MM-dd"), format(endDateObj, "yyyy-MM-dd"));
    }
  };
  
  // // Update dates when props change
  // useEffect(() => {
  //   if (startDate) {
  //     const newStartDate = parseDate(startDate);
  //     setStartDateObj(newStartDate);
  //     setStartYear(getYear(newStartDate));
  //   }
  //   if (endDate) {
  //     const newEndDate = parseDate(endDate);
  //     setEndDateObj(newEndDate);
  //     setEndYear(getYear(newEndDate));
  //   }
  // }, [startDate, endDate]);
  
  // Format for date inputs
  const formatDateForInput = (date) => {
    return format(date, "yyyy-MM-dd");
  };
  
  // Handle date input changes
  const handleStartDateChange = (e) => {
    const newDate = parse(e.target.value, "yyyy-MM-dd", new Date());
    if (isValid(newDate)) {
      if (isEmbed) {
        setLocalStartDate(newDate);
      } else {
        onDateChange(format(newDate, "yyyy-MM-dd"), format(endDateObj, "yyyy-MM-dd"));
      }
      setStartYear(getYear(newDate));
    }
  };
  
  const handleEndDateChange = (e) => {
    const newDate = parse(e.target.value, "yyyy-MM-dd", new Date());
    if (isValid(newDate)) {
      if (isEmbed) {
        setLocalEndDate(newDate);
      } else {
        onDateChange(format(startDateObj, "yyyy-MM-dd"), format(newDate, "yyyy-MM-dd"));
      }
      setEndYear(getYear(newDate));
    }
  };
  
  // Year state for slider
  const [startYear, setStartYear] = useState(getYear(startDateObj));
  const [endYear, setEndYear] = useState(getYear(endDateObj));
  
  // Format dates for display
  const formatDisplayDate = (date) => {
    return format(date, "dd MMM yyyy", { locale: pt });
  };
  
  // Year slider functionality
  const sliderRef = useRef(null);
  const isDragging = useRef(false);
  const activeThumb = useRef(null);
  
  // Convert year to slider value (0-100%)
  const yearToSliderValue = (year) => {
    return ((year - earliestYear) / (currentYear - earliestYear)) * 100;
  };
  
  // Convert slider value to year
  const sliderValueToYear = (value) => {
    return Math.round(earliestYear + (value / 100) * (currentYear - earliestYear));
  };
  
  const [sliderValues, setSliderValues] = useState([
    yearToSliderValue(startYear),
    yearToSliderValue(endYear)
  ]);
  
  // Update slider when years change
  useEffect(() => {
    if (!isDragging.current) {
      setSliderValues([
        yearToSliderValue(startYear),
        yearToSliderValue(endYear)
      ]);
    }
  }, [startYear, endYear]);
  
  // Update dates when slider changes years
  useEffect(() => {
    const newStartYear = sliderValueToYear(sliderValues[0]);
    const newEndYear = sliderValueToYear(sliderValues[1]);
    
    if (newStartYear !== startYear) {
      setStartYear(newStartYear);
      const newDate = new Date(startDateObj);
      newDate.setFullYear(newStartYear);
      if (isEmbed) {
        setLocalStartDate(newDate);
      } else {
        onDateChange(format(newDate, "yyyy-MM-dd"), format(endDateObj, "yyyy-MM-dd"));
      }
    }
    
    if (newEndYear !== endYear) {
      setEndYear(newEndYear);
      const newDate = new Date(endDateObj);
      newDate.setFullYear(newEndYear);
      if (isEmbed) {
        setLocalEndDate(newDate);
      } else {
        onDateChange(format(startDateObj, "yyyy-MM-dd"), format(newDate, "yyyy-MM-dd"));
      }
    }
  }, [sliderValues, startYear, endYear, startDateObj, endDateObj, isEmbed, onDateChange]);
  
  // Handle mouse and touch events for slider
  const handleMouseDown = (e, index) => {
    e.preventDefault();
    isDragging.current = true;
    activeThumb.current = index;
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("touchmove", handleTouchMove);
    document.addEventListener("touchend", handleMouseUp);
  };
  
  const handleMouseUp = () => {
    if (isDragging.current) {
      isDragging.current = false;
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleMouseUp);
    }
  };
  
  const handleMouseMove = (e) => {
    if (!isDragging.current || !sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    let newValue = Math.min(100, Math.max(0, (x / rect.width) * 100));
    
    updateSliderValue(newValue);
  };
  
  const handleTouchMove = (e) => {
    if (!isDragging.current || !sliderRef.current || !e.touches[0]) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    let newValue = Math.min(100, Math.max(0, (x / rect.width) * 100));
    
    updateSliderValue(newValue);
  };
  
  const updateSliderValue = (newValue) => {
    const index = activeThumb.current;
    const newValues = [...sliderValues];
    
    // Ensure thumbs don't cross each other
    if (index === 0) {
      // Start date thumb
      newValues[0] = Math.min(newValues[1] - 1, newValue);
    } else {
      // End date thumb
      newValues[1] = Math.max(newValues[0] + 1, newValue);
    }
    
    setSliderValues(newValues);
  };
  
  // Handle track click to move nearest thumb
  const handleTrackClick = (e) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const newValue = Math.min(100, Math.max(0, (x / rect.width) * 100));
    
    // Determine which thumb is closer
    const dist1 = Math.abs(newValue - sliderValues[0]);
    const dist2 = Math.abs(newValue - sliderValues[1]);
    const closerThumb = dist1 <= dist2 ? 0 : 1;
    
    activeThumb.current = closerThumb;
    updateSliderValue(newValue);
  };

  // Remove setStartDateObj and setEndDateObj, and update handlers to call onDateChange immediately:
const handleStartCalendarChange = (date) => {
  if (isEmbed) {
    // In embed mode, just update local state
    setLocalStartDate(date);
  } else {
    // In non-embed mode, trigger immediate change
    onDateChange(format(date, "yyyy-MM-dd"), format(endDateObj, "yyyy-MM-dd"));
  }
};
const handleEndCalendarChange = (date) => {
  if (isEmbed) {
    // In embed mode, just update local state
    setLocalEndDate(date);
  } else {
    // In non-embed mode, trigger immediate change
    onDateChange(format(startDateObj, "yyyy-MM-dd"), format(date, "yyyy-MM-dd"));
  }
};
  
  return (
    <div className="py-2">
      {/* Hidden native date inputs for accessibility */}
      <div className="sr-only">
        <input
          type="date"
          value={formatDateForInput(startDateObj)}
          onChange={handleStartDateChange}
          aria-label="Start date"
        />
        <input
          type="date"
          value={formatDateForInput(endDateObj)}
          onChange={handleEndDateChange}
          aria-label="End date"
        />
      </div>
      
      <div className="flex items-center justify-center mb-2 gap-x-4">
        {/* Start date calendar */}
        <div className=" ">
          <CustomCalendar 
            date={startDateObj}
            onChange={handleStartCalendarChange}
            isStart={true}
            calendarKey="start-date"
            isEmbed={isEmbed}
          />
        </div>

          <div className="text-xs text-sky-950 mx-1"> - </div>
        
        <div className=" ">
          <CustomCalendar 
            date={endDateObj}
            onChange={handleEndCalendarChange}
            isStart={false}
            calendarKey="end-date"
            isEmbed={isEmbed}
          />
        </div>
      </div>
      {isEmbed && (
          <div className="flex justify-end mt-3 px-4">
            <button
              onClick={handleSearchClick}
              className="px-4 py-2 bg-sky-700 hover:bg-sky-800 cursor-pointer text-white text-sm font-medium rounded-md transition-colors duration-200 flex items-center gap-2"
            >
              <FiSearch className="w-4 h-4" />
            </button>
          </div>
      )}
    </div>
  );
};

export default DateRangeSlider;