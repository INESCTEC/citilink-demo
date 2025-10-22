import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import { getTopicoIcon } from "../../utils/iconMappers";

const customScrollbarStyle = {
  scrollbarWidth: 'thin',
  scrollbarColor: 'rgba(155, 155, 155, 0.5) transparent',
};


const CustomDropdown = ({ 
  label, 
  value, 
  options, 
  onChange, 
  activeDropdown, 
  dropdownName, 
  openDropdown, 
  disabled = false,
  multiple = false,
  type = 'default',
  addon
}) => {
  const { t } = useTranslation();
  const isOpen = activeDropdown === dropdownName;
  
  const selectedOption = multiple 
    ? null 
    : options.find(opt => opt.value === value);
    
  const selectedValues = multiple 
    ? value || [] 
    : [];
  
  // Render party color square
  const renderPartyIndicator = (party) => {
    if (!party || type !== 'party') return null;
    const colorClass = getPartyColorClass(party);
    return (
      <div className={`min-w-[12px] w-3 h-3 mr-2 rounded-sm flex-shrink-0 ${colorClass}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}></div>
    );
  };
  
  // Render topic icon
  const renderTopicoIcon = (topico) => {
    if (!topico || type !== 'topico') return null;
    return (
      <div className="flex-shrink-0 flex-grow-0" style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center' }}>
        {getTopicoIcon(topico, "w-4 h-4 mr-2")}
      </div>
    );
  };
  
  // For multi-select, create a concatenated display of selected items with visual indicators
  const renderMultiSelectDisplay = () => {
    if (selectedValues.length === 0) return options[0]?.label;
    
    if (selectedValues.length === 1) {
      const selectedOption = options.find(opt => opt.value === selectedValues[0]);
      if (!selectedOption) return `1 ${t("item_selected")}`;
      
      return (
        <span className="flex items-center min-w-0 overflow-x-auto" style={customScrollbarStyle}>
          {type === 'party' && 
            <div className="flex-shrink-0 w-[20px] flex items-center">
              {renderPartyIndicator(selectedOption.party || selectedOption.value)}
            </div>
          }
          {type === 'topico' && 
            <div className="flex-shrink-0 w-[20px] flex items-center justify-start">
              {renderTopicoIcon(selectedOption.label)}
            </div>
          }
          <span className="whitespace-nowrap">{selectedOption.label}</span>
        </span>
      );
    }
    
    // If t() function doesn't have a translation for "items_selected",
    // it will use the default text "selected"
    return `${selectedValues.length} ${t("items_selected")}`;
  };
  
  const displayLabel = multiple 
    ? renderMultiSelectDisplay()
    : (selectedOption?.label || options[0]?.label);
  
  const handleOptionClick = (optionValue) => {
    if (multiple) {
      // Handle the "All" option (empty value)
      if (optionValue === "") {
        // If selecting "All", clear all selections
        onChange([]);
        openDropdown(null); // Close dropdown after selecting "All"
        return;
      }
      
      const newValue = [...selectedValues];
      const index = newValue.indexOf(optionValue);
      
      if (index === -1) {
        newValue.push(optionValue);
      } else {
        newValue.splice(index, 1);
      }
      
      onChange(newValue);
    } else {
      onChange(optionValue);
      openDropdown(null); // Close dropdown after selecting a single option
    }
  };
  
  return (
    <div>
      {addon && (
      <div className='flex justify-between items-center mb-1'>
        <label className="block text-sm font-medium text-gray-100">{label}</label>
        <div className="flex items-center">
          {addon}
        </div>
      </div>
      )}
      {!addon && (
        <label className="block text-sm font-medium text-gray-100 mb-1">{label}</label>
      )}
      <div className="relative dropdown-container">
        <button
          type="button"
          onClick={() => !disabled && openDropdown(isOpen ? null : dropdownName)}
          className={`w-full px-2.5 py-1.5 rounded-md border text-left text-sm flex justify-between items-center ${
            disabled
              ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200'
              : 'bg-white text-gray-900 border-gray-300 shadow-sm hover:shadow'
          } transition-all`}
        >
          <span className="flex items-center min-w-0 flex-1 mr-2 overflow-x-auto" style={customScrollbarStyle}>
            {!multiple && type === 'party' && 
              <div className="flex-shrink-0 w-[20px] flex items-center">
                {renderPartyIndicator(selectedOption?.party || selectedOption?.value)}
              </div>
            }
            {!multiple && type === 'topico' && selectedOption?.label && 
              <div className="flex-shrink-0 w-[20px] flex items-center justify-start">
                {renderTopicoIcon(selectedOption.label)}
              </div>
            }
            <span className="whitespace-nowrap">{displayLabel}</span>
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
              className="absolute z-999 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-44 overflow-y-auto"
              style={{ overflowX: 'hidden', ...customScrollbarStyle }}
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              transition={{ duration: 0.2, ease: "easeInOut" }}
            >
              <div className="py-0.5">
                {options.map((option, index) => (
                  <motion.div
                    key={`${option.value}-${index}`}
                    onClick={() => handleOptionClick(option.value)}
                    className="flex items-center px-3 py-1.5 w-full overflow-x-auto cursor-pointer hover:bg-gray-100"
                    style={{ minWidth: '100%', ...customScrollbarStyle }}
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.1, delay: index * 0.03 }}
                  >
                    <div className="mr-2 w-4 flex justify-center flex-shrink-0">
                      {(multiple 
                        ? selectedValues.includes(option.value)
                        : value === option.value) && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FiCheck className="text-sky-600" size={12} />
                        </motion.div>
                      )}
                    </div>
                    <div className="flex items-center min-w-0 flex-1 overflow-x-auto" style={customScrollbarStyle}>
                      {type === 'party' && 
                        <div className="flex-shrink-0 w-[20px] flex items-center">
                          {renderPartyIndicator(option.party || option.value)}
                        </div>
                      }
                      {type === 'topico' && option.label && 
                        <div className="flex-shrink-0 w-[20px] flex items-center justify-start">
                          {renderTopicoIcon(option.label)}
                        </div>
                      }
                      <span className="text-sm whitespace-normal">{option.label}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CustomDropdown;