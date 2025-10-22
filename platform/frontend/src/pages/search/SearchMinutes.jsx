import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
 
import SearchResults from "../../components/SearchPage/SearchResults";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { SkeletonCardGrid } from "../../components/common/skeletons/SkeletonCard";

function SearchMinutes({ isEmbedded = false, skipHeader = false, searchProps = null }) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState(() => {
    // Get saved preference from localStorage or default to "grid"
    return localStorage.getItem("searchResultsViewMode") || "list";
  });
  
  // If searchProps is provided, use those instead of managing state internally
  if (isEmbedded && skipHeader && searchProps) {
    return (
      <div className="bg-stone-50 dark:bg-sky-900 pb-12 pt-4">
        <div className="container mx-auto px-4">
          {searchProps.isLoading ? (
            <div className="py-6">
              <SkeletonCardGrid count={12} viewMode={viewMode} />
            </div>
          ) : (
            <SearchResults
              searchProps={searchProps}
              isLoading={false}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          )}
        </div>
      </div>
    );
  }
}

export default SearchMinutes;