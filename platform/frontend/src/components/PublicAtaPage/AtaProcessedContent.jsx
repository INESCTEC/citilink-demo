import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FiFileText, FiInfo, FiHelpCircle } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import RenderHTML from "../../hooks/renderHtml";

const AtaProcessedContent = ({ processedContent }) => {
  const { t } = useTranslation();
  const [showLegend, setShowLegend] = useState(false);
  const [showLegendTooltip, setShowLegendTooltip] = useState(false);

  // Entity colors mapping with corresponding display names
  const ENTITY_COLORS = {
    "PER": { color: "bg-sky-600", label: "Person" },
    "ORG": { color: "bg-emerald-600", label: "Organization" },
    "LOC": { color: "bg-rose-600", label: "Location" },
    "MISC": { color: "bg-gray-500", label: "Miscellaneous" },
    "DATE": { color: "bg-indigo-600", label: "Date" },
    "TIME": { color: "bg-pink-500", label: "Time" },
    "MONEY": { color: "bg-green-600", label: "Money" },
    "QUANTITY": { color: "bg-teal-500", label: "Quantity" },
    "EVENT": { color: "bg-red-600", label: "Event" }
  };

  // Toggle legend tooltip visibility
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

  return (
    <div className="text-gray-800 text-justify font-raleway">
      {processedContent ? (
        <>
          <div className="flex justify-end mb-1">
            <div className="text-xs text-gray-500 text-center relative">
              <div className="inline-flex items-center">
                <span>{t("entity_color_legend")}</span>
                <button 
                  onClick={toggleLegendTooltip} 
                  className="ml-1 text-sky-600 hover:text-sky-800 focus:outline-none" 
                  aria-label={t("show_entity_legend")}
                >
                  <FiHelpCircle className="text-base" />
                </button>
              </div>
              
              {/* Legend tooltip/popover with Framer Motion */}
              <AnimatePresence>
                {showLegendTooltip && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full right-0 mt-2 bg-white text-left p-3 rounded-md shadow-lg border border-gray-200 z-50 w-72"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <h4 className="font-medium text-sm text-sky-800 mb-2">{t("entity_types")}</h4>
                    <p className="text-xs text-gray-600 mb-2">
                      {t("entity_legend_explanation")}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(ENTITY_COLORS).map(([key, value]) => (
                        <motion.div 
                          key={key} 
                          className="flex items-center"
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: Object.keys(ENTITY_COLORS).indexOf(key) * 0.05 }}
                        >
                          <div className={`${value.color} w-4 h-4 rounded-sm flex-shrink-0`}></div>
                          <span className="ml-2 text-gray-700 text-xs">{value.label}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          
          <div className="whitespace-pre-line bg-gray-50 font-light text-md px-4 border-b-2 border-gray-200 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 pr-2 font-raleway">
            <RenderHTML content={processedContent} entityColors={ENTITY_COLORS} />
          </div>
        </>
      ) : (
        <div className="py-12 flex flex-col items-center justify-center bg-gray-50 space-y-2 border-b-2 border-gray-200">
          <FiFileText className="text-gray-500" size={24} />
          <p className="text-gray-500 italic">
            {t("no_processed_content_available")}
          </p>
        </div>
      )}
    </div>
  );
};

export default AtaProcessedContent;