import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { FiClock, FiGrid, FiLayout } from 'react-icons/fi';

const CountyViewNavigation = ({ viewType, toggleViewType }) => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 pt-3 font-montserrat">
      <div className="flex justify-center md:justify-end border-b-2 border-gray-200">
        <div className="inline-flex items-center space-x-2">
          {/* Geral */}
          <button 
            className={`capitalize flex items-center px-4 py-1.5 text-sm font-medium transition-all duration-300 relative
              ${viewType === 'geral' 
                ? 'text-sky-700 font-semibold' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => toggleViewType('geral')}
          >
            <FiLayout className="mr-1.5" /> {t("general_view")}
            {viewType === 'geral' && (
              <motion.div 
                className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-sky-600 rounded-full"
                layoutId="viewModeUnderline"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          {/* Separator label: Atas */}
          <span className="text-sm text-gray-400 px-1">Atas:</span>

          {/* Grid View */}
          <button
            className={`capitalize flex items-center px-4 py-1.5 text-sm font-medium transition-all duration-300 relative
              ${viewType === 'grid' 
                ? 'text-sky-700 font-semibold' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => toggleViewType('grid')}
          >
            <FiGrid className="mr-1.5" /> {t("list")}
            {viewType === 'grid' && (
              <motion.div 
                className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-sky-600 rounded-full"
                layoutId="viewModeUnderline"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>

          {/* Timeline View */}
          <button 
            className={`capitalize flex items-center px-4 py-1.5 text-sm font-medium transition-all duration-300 relative
              ${viewType === 'timeline' 
                ? 'text-sky-700 font-semibold' 
                : 'text-gray-500 hover:text-gray-700'
              }`}
            onClick={() => toggleViewType('timeline')}
          >
            <FiClock className="mr-1.5" /> {t("timeline")}
            {viewType === 'timeline' && (
              <motion.div 
                className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-sky-600 rounded-full"
                layoutId="viewModeUnderline"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CountyViewNavigation;
