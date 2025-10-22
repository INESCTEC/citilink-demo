import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiArrowDown, FiArrowUp, FiSearch } from 'react-icons/fi';

const SortDropdown = ({ sortBy, sortOrder, searchQuery, handleSortChange }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentSortValue = `${sortBy}:${sortOrder}`;
  
  const sortOptions = [
    {
      value: "date:desc",
      label: t("date_newest"),
      icon: FiArrowDown
    },
    {
      value: "date:asc", 
      label: t("date_oldest"),
      icon: FiArrowUp
    }
  ];
  
  if (searchQuery.trim()) {
    sortOptions.push({
      value: "score:desc",
      label: t("most_relevant"),
      icon: FiSearch
    });
  }
  
  const selectedOption = sortOptions.find(option => option.value === currentSortValue);
  const SelectedIcon = selectedOption?.icon || FiArrowDown;

  return (
    <div className="w-full relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-1 rounded-md border border-gray-300 bg-white text-sm text-gray-700 hover:shadow-sm focus:ring-1 focus:ring-sky-700 focus:border-sky-700 transition-all flex items-center gap-2"
      >
        <SelectedIcon className="w-4 h-4 flex-shrink-0" />
        <span className="truncate flex-1 text-left">{selectedOption?.label}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <FiChevronDown className="w-4 h-4" />
        </motion.div>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown */}
            <motion.div
              className="absolute right-0 z-20 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden"
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
              <div className="py-1">
                {sortOptions.map((option, index) => {
                  const OptionIcon = option.icon;
                  const isSelected = option.value === currentSortValue;
                  
                  return (
                    <motion.button
                      key={option.value}
                      onClick={() => {
                        handleSortChange({ target: { value: option.value } });
                        setIsOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-3 transition-colors ${
                        isSelected 
                          ? 'bg-sky-50 text-sky-700' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.1, delay: index * 0.05 }}
                    >
                      <OptionIcon className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-sky-600' : 'text-gray-500'}`} />
                      <span className="flex-1">{option.label}</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FiChevronDown className="w-3 h-3 text-sky-600 rotate-180" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SortDropdown;