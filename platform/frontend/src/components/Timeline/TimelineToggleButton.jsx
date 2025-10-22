import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { FiClock, FiChevronDown, FiChevronUp, FiLoader } from "react-icons/fi";

const TimelineToggleButton = ({ 
  isVisible = false,
  onToggle,
  disabled = false,
  isLoading = false,
  className = ""
}) => {
  const { t } = useTranslation();

  return (
    <div className={`flex justify-end ${className} font-montserrat`}>
      <motion.button
        onClick={onToggle}
        disabled={isLoading || disabled}
        className={`
          relative flex items-center gap-2
          px-3 py-1 rounded-b-md
          ${disabled 
            ? 'bg-gray-400 cursor-not-allowed' 
            : 'bg-sky-800 hover:bg-sky-700 cursor-pointer'}
          text-white font-semibold
          transition-all duration-300 ease-in-out
          ${disabled ? 'opacity-60' : ''}
        `}
        whileTap={disabled ? {} : { y: 0 }}
        animate={disabled ? { opacity: 0.6 } : { opacity: 1 }}
        aria-label={isVisible ? t("timeline") || "Esconder" : t("timeline") || "Linha Temporal"}
      >
        {isLoading || disabled ? (
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          >
            <FiLoader className="text-lg" />
          </motion.div>
        ) : (
          <FiClock className="text-lg" />
        )}
        <span className="text-sm font-medium capitalize">
          {disabled
            ? t("timeline") || "Carregar"
            : isLoading 
              ? t("timeline") || "Carregar"
              : isVisible 
                ? t("timeline") || "Linha Temporal"
                : t("timeline") || "Linha Temporal"
          }
        </span>
        <span className="text-xl">
          {isVisible ? <FiChevronUp /> : <FiChevronDown />}
        </span>
      </motion.button>
    </div>
  );
};

export default TimelineToggleButton;