import React from "react";
import { useTranslation } from "react-i18next";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

const Pagination = ({ currentPage, totalPages, handlePageChange, paginationItems }) => {
  const { t } = useTranslation();

  return (
    <div className="mt-8 flex justify-center font-montserrat">
      <nav className="flex items-center gap-1" aria-label="Pagination">
        {/* Previous Page Button */}
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`p-2 rounded-md transition-colors cursor-pointer ${
            currentPage === 1
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-sky-100 dark:hover:bg-gray-800'
          }`}
        >
          <span className="sr-only">{t("previous")}</span>
          <FiChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        
        {/* Page Numbers */}
        {paginationItems.map((item, index) => (
          item === '...' ? (
            <span
              key={`ellipsis-${index}`}
              className="px-3 py-1 text-gray-500 dark:text-gray-400"
            >
              ...
            </span>
          ) : (
            <button
              key={item}
              onClick={() => handlePageChange(item)}
              className={`min-w-[2.5rem] h-10 rounded-md text-sm transition-colors cursor-pointer ${
                currentPage === item
                  ? 'bg-sky-800 dark:bg-gray-100 text-white dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-sky-100 dark:hover:bg-gray-800'
              }`}
            >
              {item}
            </button>
          )
        ))}
        
        {/* Next Page Button */}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || totalPages === 0}
          className={`p-2 rounded-md transition-colors cursor-pointer ${
            currentPage === totalPages || totalPages === 0
              ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
              : 'text-gray-600 dark:text-gray-400 hover:bg-sky-100 dark:hover:bg-gray-800'
          }`}
        >
          <span className="sr-only">{t("next")}</span>
          <FiChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </nav>
    </div>
  );
};

export default Pagination;