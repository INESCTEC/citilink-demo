import React from "react";
import { useTranslation } from "react-i18next";
import { FiSearch, FiFilter, FiChevronDown, FiChevronUp } from "react-icons/fi";

const SearchBar = ({ 
  keyword, 
  setKeyword, 
  handleSearch, 
  isLoading, 
  showAdvancedFilters,
  setShowAdvancedFilters
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-6">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-grow relative">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("search_minutes_keyword_placeholder")}
            className="w-full font-montserrat px-3 py-2  rounded-md border-gray-300 bg-white text-gray-900 ring-sky-900 focus:ring-2 focus:ring-sky-900 focus:border-sky-900"
            // pl-10
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          {/* <div className="absolute left-3 top-2.5 text-gray-500">
            <FiSearch size={18} />
          </div> */}
        </div>
        
        {/* Button container - full width on small screens with equal button widths */}
        <div className="flex w-full sm:w-auto gap-2">
          <button 
            className="flex-1 sm:flex-initial bg-sky-950 text-white font-montserrat text-xs sm:text-sm md:text-base font-medium px-3 sm:px-6 py-2 rounded-md shadow-md hover:bg-sky-950/60 transition flex items-center justify-center"
            onClick={() => handleSearch()}
            disabled={isLoading}
          >
            <FiSearch className="mr-1 sm:mr-2" />
            <span className="truncate">
              {isLoading ? t("searching") : t("search_button")}
            </span>
          </button>
          
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="flex-1 sm:flex-initial bg-white text-sky-950 border border-gray-300 font-medium font-montserrat text-xs sm:text-sm md:text-base px-2 sm:px-4 py-2 rounded-md shadow-md hover:bg-gray-100 transition flex items-center justify-center"
          >
            <span className="truncate">
              {t("advanced_options")}
            </span>
            {showAdvancedFilters ? 
              <FiChevronUp className="ml-1 sm:ml-2 flex-shrink-0" /> : 
              <FiChevronDown className="ml-1 sm:ml-2 flex-shrink-0" />
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;