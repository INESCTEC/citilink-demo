import React from "react";
import { BsGrid3X3GapFill, BsListUl } from "react-icons/bs";

const ViewSwitcher = ({ viewMode, setViewMode, viewType }) => {
  const handleViewChange = (mode) => {
    // Save to localStorage
    if (viewType === "search") {
      localStorage.setItem("searchResultsViewMode", mode);
    } 
    else if (viewType === "subjects") {
      localStorage.setItem("subjectsViewMode", mode);
    }
    else {
      localStorage.setItem("searchResultsViewMode", mode);
    }
    setViewMode(mode);
  };

  return (
    <div className="hidden sm:flex items-center space-x-2 mb-0">
      <button
        onClick={() => handleViewChange("grid")}
        className={`p-2 py-1.5 rounded-md cursor-pointer ${
          viewMode === "grid"
            ? "bg-sky-700 text-white border-sky-700"
            : "bg-gray-200 text-gray-600 hover:bg-gray-300 border-gray-200 hover:border-gray-300"
        }`}
        aria-label="Grid view"
        title="Grid view"
      >
        <BsGrid3X3GapFill className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleViewChange("list")}
        className={`p-2 py-1.5 rounded-md cursor-pointer ${
          viewMode === "list"
            ? "bg-sky-700 text-white border-sky-700"
            : "bg-gray-200 text-gray-600 hover:bg-gray-300 border-gray-200 hover:border-gray-300"
        }`}
        aria-label="List view"
        title="List view"
      >
        <BsListUl className="h-4 w-4" />
      </button>
    </div>
  );
};

export default ViewSwitcher;
