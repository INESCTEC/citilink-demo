import React, { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiClock, FiLoader } from "react-icons/fi";
import NavigationTimeline from "../Timeline/NavigationTimeline";
import LoadingSpinner from "../common/LoadingSpinner";

const AtaTimeline = ({ 
  municipioId, 
  selectedAta,
  onSelectAta,
  disabled = false,
  isVisible = false, // New prop to control visibility externally
  API_URL = import.meta.env.VITE_API_URL,
  className = ""
}) => {
  const { t } = useTranslation();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [timelineAtas, setTimelineAtas] = useState([]);
  const [timelineYears, setTimelineYears] = useState([]);
  const [error, setError] = useState(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Process fetched data to match NavigationTimeline requirements
  const processTimelineData = useCallback((fetchedAtas) => {
    if (!fetchedAtas || fetchedAtas.length === 0) {
      return { processedAtas: [], years: [] };
    }

    const processedAtas = fetchedAtas.map((ata) => ({
      ...ata,
      date: new Date(ata.data_reuniao || ata.date),
      year: new Date(ata.data_reuniao || ata.date).getFullYear(),
      formattedDate: new Date(ata.data_reuniao || ata.date).toLocaleDateString(),
      assuntos_count: ata.assuntos_count || 0,
    }));

    // Sort by date
    processedAtas.sort((a, b) => a.date - b.date);

    // Extract unique years
    const years = [...new Set(processedAtas.map(ata => ata.year))].sort();

    return { processedAtas, years };
  }, []);

  // Fetch timeline data
  const fetchTimelineData = useCallback(async () => {
    if (!municipioId) {
      setError(t("no_municipio_id"));
      return;
    }

    setIsTimelineLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/v0/public/municipios/${municipioId}/atas/timeline?demo=${DEMO_MODE}`
      );
      
      if (!response.ok) {
        throw new Error("Failed to fetch timeline data");
      }
      
      const data = await response.json();
      const fetchedAtas = data.atas || [];
      const fetchedMetadata = data.metadata || {};
      
      if (fetchedAtas.length === 0) {
        setTimelineAtas([]);
        setTimelineYears([]);
        setIsTimelineLoading(false);
        setHasInitiallyLoaded(true);
        return;
      }

      const { processedAtas, years } = processTimelineData(fetchedAtas);
      
      setTimelineAtas(processedAtas);
      setTimelineYears(years);
      setHasInitiallyLoaded(true);
      
    } catch (err) {
      console.error("Error fetching timeline data:", err);
      setError(t("error_fetching_timeline") || "Error fetching timeline data");
      setTimelineAtas([]);
      setTimelineYears([]);
    } finally {
      setIsTimelineLoading(false);
    }
  }, [municipioId, API_URL, processTimelineData, t]);

  // Load data when timeline becomes visible
  useEffect(() => {
    if (isVisible && !hasInitiallyLoaded) {
      fetchTimelineData();
    }
  }, [isVisible, hasInitiallyLoaded, fetchTimelineData]);

  // Refresh timeline data
  const refreshTimeline = useCallback(async () => {
    if (disabled) return;
    await fetchTimelineData();
  }, [fetchTimelineData, disabled]);

  // Enhanced onSelectAta handler
  const handleSelectAta = useCallback((ataObj) => {
    if (disabled) return;
    onSelectAta?.(ataObj);
  }, [onSelectAta, disabled]);

  // Expose loading state and refresh function to parent
  useEffect(() => {
    // This could be used to communicate loading state back to parent if needed
  }, [isTimelineLoading]);

  return (
    <div className={`w-full ${className}`}>
      {/* Timeline Container */}
      <AnimatePresence mode="wait">
        {isVisible && (
          <motion.div
            initial={{ 
              height: 0, 
              opacity: 0,
              y: -20
            }}
            animate={{ 
              height: "auto", 
              opacity: disabled ? 0.4 : 1,
              y: 0
            }}
            exit={{ 
              height: 0, 
              opacity: 0,
              y: -20
            }}
            transition={{ 
              duration: 0.4,
              ease: "easeInOut",
              opacity: { duration: 0.3 }
            }}
            className="overflow-hidden"
          >
            <div className="relative  rounded-md">
              {/* Disabled overlay for timeline content */}
              {disabled && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white/50 backdrop-blur-sm rounded-lg z-10 pointer-events-none"
                />
              )}

              {error ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 border border-red-200 rounded-lg p-6 text-center"
                >
                  <div className="text-red-600 mb-2">
                    <FiClock className="mx-auto text-2xl mb-2" />
                    <h3 className="font-semibold text-lg">{t("error_loading_timeline") || "Error Loading Timeline"}</h3>
                  </div>
                  <p className="text-red-700 mb-4">{error}</p>
                  <button
                    onClick={refreshTimeline}
                    disabled={isTimelineLoading || disabled}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isTimelineLoading ? t("retrying") || "Retrying..." : t("try_again") || "Try Again"}
                  </button>
                </motion.div>
              ) : isTimelineLoading ? (
                <div
                  className="bg-sky-900 rounded-md p-6 text-center font-montserrat"
                >
                  <LoadingSpinner
                    color="text-white font-montserrat"
                    textClass="text-white"
                    text={t("loading_timeline") || "Loading Timeline..."}
                  />
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className=""
                >
                  <NavigationTimeline
                    timelineAtas={timelineAtas}
                    timelineYears={timelineYears}
                    onSelectAta={handleSelectAta}
                    isEmbbed={true}
                    showYearSelect={false}
                    selectedAta={selectedAta}
                    showDetailsInTimeline={false}
                    disabled={disabled}
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaTimeline;