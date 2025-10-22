import { useState } from "react";
import { useTranslation } from "react-i18next";

import AssuntosResults from "../../components/SearchPage/AssuntosResults";
import { SkeletonCardGrid } from "../../components/common/skeletons/SkeletonCard";

// Removed unused imports and code related to pagination and results info

function SearchAssuntos({ isEmbedded = false, skipHeader = false, searchProps = null }) {
  const { t } = useTranslation();

  const [viewMode, setViewMode] = useState(() => 
    localStorage.getItem("searchResultsViewMode") || "list"
  );

  // If embedded with props, render simplified version
  if (isEmbedded && skipHeader && searchProps) {
    return (
      <div className="bg-stone-50 pb-12 pt-4">
        <div className="container mx-auto px-4">
          {searchProps.isLoading ? (
            <div className="py-6">
              <SkeletonCardGrid count={12} viewMode={viewMode} />
            </div>
          ) : (
            <AssuntosResults
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

  return null; // Explicitly return null if not embedded
}

export default SearchAssuntos;