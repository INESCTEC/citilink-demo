import React, { useState, useRef, useEffect, useMemo } from "react";
import { format, parse, addMonths, subMonths, getYear, getMonth, getDate, getDaysInMonth, startOfMonth, getDay, isValid } from "date-fns";
import { pt } from "date-fns/locale";
import { FiChevronLeft, FiChevronRight, FiCalendar } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

// Global calendar manager to handle multiple calendar instances
let globalCalendarManager = {
  openCalendars: new Set(),
  closeAllExcept: (calendarKey) => {
    globalCalendarManager.openCalendars.forEach(closeFunction => {
      closeFunction(calendarKey);
    });
  },
  register: (calendarKey, closeFunction) => {
    globalCalendarManager.openCalendars.add(closeFunction);
  },
  unregister: (closeFunction) => {
    globalCalendarManager.openCalendars.delete(closeFunction);
  }
};

const CustomCalendar = ({ date, onChange, isStart, calendarKey, isEmbed }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768); // Initial check
  const [currentMonth, setCurrentMonth] = useState(new Date(date));
  const calendarRef = useRef(null);
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  // Register with global calendar manager
  useEffect(() => {
    const closeFunction = (exceptKey) => {
      if (exceptKey !== calendarKey) {
        setShowCalendar(false);
      }
    };
    
    globalCalendarManager.register(calendarKey, closeFunction);
    
    return () => {
      globalCalendarManager.unregister(closeFunction);
    };
  }, [calendarKey]);

  // Function to open this calendar and close others
  const openCalendar = () => {
    globalCalendarManager.closeAllExcept(calendarKey);
    setShowCalendar(true);
  };

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      // Don't auto-show calendar on any device - user must click to open
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update currentMonth when date prop changes
  useEffect(() => {
    // Create new date with same month and year as the date prop
    const newCurrentMonth = new Date();
    newCurrentMonth.setFullYear(date.getFullYear());
    newCurrentMonth.setMonth(date.getMonth());
    newCurrentMonth.setDate(1); // Set to first day of month to avoid issues with month transitions
    
    setCurrentMonth(newCurrentMonth);
  }, [date, calendarKey]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target)) {
        setShowCalendar(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Navigation functions
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  // Select a date
  const selectDate = (day) => {
    // Create a new date with the current month view's year and month
    const newDate = new Date(currentMonth);
    // Set the day
    newDate.setDate(day);
    
    console.log(`Selecting date: ${format(newDate, "yyyy-MM-dd")} (day: ${day}, currentMonth: ${format(currentMonth, "yyyy-MM")}, calendar: ${calendarKey})`);
    
    // Call the onChange prop with the new date
    onChange(newDate);
    
    // Close calendar after selection
    setShowCalendar(false);
  };

  // Generate calendar days
  const generateCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const startDay = getDay(startOfMonth(currentMonth));
    const days = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-8 w-8"></div>);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      // Check if this day matches the currently selected date
      const isSelected = 
        date.getDate() === day && 
        date.getMonth() === getMonth(currentMonth) && 
        date.getFullYear() === getYear(currentMonth);
      
      // Check if this day is today
      const today = new Date();
      const isToday = 
        today.getDate() === day && 
        today.getMonth() === getMonth(currentMonth) && 
        today.getFullYear() === getYear(currentMonth);

      days.push(
        <button
          key={day}
          className={`h-8 w-8 cursor-pointer rounded-sm flex items-center justify-center text-sm transition-colors
            ${isSelected 
              ? "bg-sky-600 text-white font-medium" 
              : isToday
                ? "border border-sky-400 text-sky-100 hover:bg-sky-600/40"
                : "hover:bg-sky-600/40 text-sky-100"}`}
          onClick={() => selectDate(day)}
          data-calendar-key={calendarKey}
        >
          {day}
        </button>
      );
    }

    return days;
  };

  // Generate array of years from 1990 to current year + 10
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let year = 1990; year <= currentYear + 10; year++) {
      yearsList.push(year);
    }
    return yearsList;
  }, []);

  const CalendarContent = () => (
    <div 
      className={`absolute z-[9999] mt-[10px] p-3 bg-sky-900/90 backdrop-blur-sm shadow-lg rounded-lg border border-sky-900 ${isStart ? '-right-42' : '-left-44'}`}
      style={{ width: "256px" }}
      data-calendar-key={calendarKey}
    >
      {/* Triangle on top */}
      <div 
        className={`absolute w-0 h-0 
          border-l-[10px] border-l-transparent 
          border-r-[10px] border-r-transparent 
          border-b-[10px] border-b-sky-900
          -top-[10px] ${isStart ? 'right-51' : 'left-51'}`}
      />
      
      {/* Month navigation */}
      <div className="flex justify-between items-center mb-2">
        <button 
          onClick={prevMonth} 
          className="p-1 rounded-sm hover:bg-sky-800 text-sky-100"
        >
          <FiChevronLeft size={18} />
        </button>
        <select 
          value={getMonth(currentMonth)}
          onChange={(e) => {
            const newMonth = new Date(currentMonth);
            newMonth.setMonth(parseInt(e.target.value, 10));
            setCurrentMonth(newMonth);
            
            const newDate = new Date(date);
            newDate.setMonth(parseInt(e.target.value, 10));
            onChange(newDate);
          }}
          className="text-sky-100 text-sm font-medium bg-sky-800 border border-sky-700 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"].map((monthName, index) => (
            <option key={index} value={index} className="bg-sky-800 text-sky-100">
              {monthName}
            </option>
          ))}
        </select>
        <button 
          onClick={nextMonth}
          className="p-1 rounded-sm hover:bg-sky-800 text-sky-100"
        >
          <FiChevronRight size={18} />
        </button>
      </div>
      
      {/* Year dropdown */}
      <div className="mb-3 flex items-center justify-center space-x-2">
        <button
          type="button"
          aria-label="Ano anterior"
          className="p-1 rounded hover:bg-sky-800 text-sky-100 transition-colors"
          onClick={() => {
            const year = getYear(currentMonth);
            if (year > 2020) {
              const newMonth = new Date(currentMonth);
              newMonth.setFullYear(year - 1);
              setCurrentMonth(newMonth);

              const newDate = new Date(date);
              newDate.setFullYear(year - 1);
              onChange(newDate);
            }
          }}
          disabled={getYear(currentMonth) <= 2020}
        >
          <FiChevronLeft size={16} />
        </button>
        <select
          value={getYear(currentMonth)}
          onChange={(e) => {
            const year = parseInt(e.target.value, 10);
            const newMonth = new Date(currentMonth);
            newMonth.setFullYear(year);
            setCurrentMonth(newMonth);

            const newDate = new Date(date);
            newDate.setFullYear(year);
            onChange(newDate);
          }}
          className="w-20 text-center bg-sky-800 text-sky-100 rounded px-2 py-1 text-xs border border-sky-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
        >
          {years.filter(year => year >= 2020 && year <= 2025).map(year => (
            <option key={year} value={year} className="bg-sky-800 text-sky-100">
              {year}
            </option>
          ))}
        </select>
        <button
          type="button"
          aria-label="Ano seguinte"
          className="p-1 rounded hover:bg-sky-800 text-sky-100 transition-colors"
          onClick={() => {
            const year = getYear(currentMonth);
            if (year < 2025) {
              const newMonth = new Date(currentMonth);
              newMonth.setFullYear(year + 1);
              setCurrentMonth(newMonth);

              const newDate = new Date(date);
              newDate.setFullYear(year + 1);
              onChange(newDate);
            }
          }}
          disabled={getYear(currentMonth) >= 2025}
        >
          <FiChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1 bg-sky-700/70 rounded-sm">
        {weekdays.map(day => (
          <div
            key={day}
            className="h-8 w-8 flex items-center justify-center text-xs font-medium text-sky-100"
          >
            {day.substring(0, 1)}
          </div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1">
        {generateCalendarDays()}
      </div>
    </div>
  );

  // Display the current selected date
  // Re-render when either date or currentMonth changes to ensure UI stays in sync
  const displayDate = useMemo(() => {
    // Use the date prop for display since it's the source of truth from the parent
    return new Date(date);
  }, [date]); // Only depend on date, not currentMonth

  return (
    <div className="relative" ref={calendarRef} data-calendar-key={calendarKey}>
      {/* Compact calendar button for both mobile and desktop */}
      <button
        onClick={() => showCalendar ? setShowCalendar(false) : openCalendar()}
        className={`compact-calendar z-[9900] cursor-pointer bg-sky-700 rounded-md border border-sky-700 hover:border-sky-800 shadow-sm p-2 w-20 hover:bg-sky-800 transition-colors ${isStart ? 'mr-2' : ''}`}
        data-calendar-key={calendarKey}
      >
        <div className="text-center text-xs text-sky-100">
          <div className="font-medium">{getDate(displayDate)} {months[getMonth(displayDate)]}</div>
          <div className="text-sm text-sky-100 mt-1 bg-sky-950/80 rounded px-1 py-0.5">
            {getYear(displayDate)}
          </div>
        </div>
      </button>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <CalendarContent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CustomCalendar;
