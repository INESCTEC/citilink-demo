import React from "react";
import { FiSearch, FiX } from "react-icons/fi";
import { RiSearchLine } from "react-icons/ri";

const SearchBar = ({ 
  searchQuery, 
  setSearchQuery, 
  handleSearch, 
  resetSearch 
}) => {
  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full mb-6">
      <div className="relative flex-grow">
        <input
          type="text"
          placeholder="Pesquisar atas..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          <RiSearchLine className="h-5 w-5 text-gray-400" />
        </div>
      </div>
      
      <div className="flex gap-2">
        <button
          onClick={handleSearch}
          className="bg-sky-700 text-white px-4 py-2 rounded-md shadow-sm hover:bg-sky-800 transition whitespace-nowrap flex items-center justify-center text-sm"
        >
          <RiSearchLine className="mr-1.5" /> Pesquisar
        </button>
        
        {searchQuery && (
          <button
            onClick={resetSearch}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md shadow-sm hover:bg-gray-300 transition whitespace-nowrap flex items-center justify-center text-sm"
          >
            <FiX className="mr-1.5" /> Limpar
          </button>
        )}
      </div>
    </div>
  );
};

export default SearchBar;
