import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiChevronDown, FiArrowDown, FiArrowUp, FiSearch, FiCheck } from "react-icons/fi";

const customScrollbarStyle = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
};

const SortDropdown = ({ 
  sortBy, 
  sortOrder, 
  onSortChange, 
  hasSearchQuery = false,
  disabled = false,
  label = null
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const currentSortValue = `${sortBy}_${sortOrder}`;
  
  const sortOptions = [
    {
      value: "date_desc",
      
      label: t("date_newest"),
      icon: FiArrowDown
    },
    {
      value: "date_asc",
      label: t("date_oldest"),
      icon: FiArrowUp
    }
  ];
  
  // Add "Most Relevant" option when search query exists
  if (hasSearchQuery) {
    sortOptions.unshift({
      value: "score_desc",
      label: t("most_relevant"),
      icon: FiSearch
    });
  } 
  
  const selectedOption = sortOptions.find(option => option.value === currentSortValue);
  const SelectedIcon = selectedOption?.icon || FiArrowDown;

  const handleSortChange = (value) => {
    const [field, order] = value.split('_');
    onSortChange(field, order);
    setIsOpen(false);
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-gray-100 mb-1">{label}</label>
      )}
      <div className="relative dropdown-container">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`min-w-xs px-2.5 py-1 rounded-md border text-left text-sm flex justify-between items-center ${
            disabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
              : 'bg-white text-gray-900 border-gray-300'
          } transition-all`}
        >
          <span className="flex items-center min-w-0 flex-1 mr-2">
            <div className="flex-shrink-0 w-[20px] flex items-center">
              <SelectedIcon className="w-4 h-4" />
            </div>
            <span className="whitespace-nowrap">{selectedOption?.label}</span>
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="flex-shrink-0"
          >
            <FiChevronDown />
          </motion.div>
        </button>
        
        <AnimatePresence>
          {isOpen && !disabled && (
            <motion.div 
              className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md max-h-44 overflow-y-auto"
              style={{ overflowX: 'hidden', ...customScrollbarStyle }}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="py-0.5">
                {sortOptions.map((option, index) => {
                  const OptionIcon = option.icon;
                  const isSelected = option.value === currentSortValue;
                  
                  return (
                    <motion.div
                      key={option.value}
                      onClick={() => handleSortChange(option.value)}
                      className="flex items-center px-3 py-1.5 w-full cursor-pointer hover:bg-gray-100"
                      style={{ minWidth: '100%', ...customScrollbarStyle }}
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.1, delay: index * 0.03 }}
                    >
                      <div className="mr-2 w-4 flex justify-center flex-shrink-0">
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <FiCheck className="text-sky-600" size={12} />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex items-center min-w-0 flex-1">
                        <div className="flex-shrink-0 w-[20px] flex items-center">
                          <OptionIcon className={`w-4 h-4 ${isSelected ? 'text-sky-600' : 'text-gray-500'}`} />
                        </div>
                        <span className="text-sm whitespace-normal">{option.label}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SortDropdown;
