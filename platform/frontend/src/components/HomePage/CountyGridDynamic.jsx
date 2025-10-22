import React from "react";
import LangLink from "../common/LangLink";

const CountyGridDynamic = ({ counties, isLoading }) => {
  // Placeholder image for counties without an image
  const placeholderImage = "https://placehold.co/300x300/052E4B/052E4B/png";

  const API_URL = import.meta.env.VITE_API_URL;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-10 mt-6">
      {isLoading ? (
        // Loading skeletons
        Array(6).fill().map((_, index) => (
          <div key={`skeleton-${index}`} className="bg-gray-50 border-b-1 border-gray-300 py-4 text-center animate-pulse">
            <div className="w-full h-40 bg-gray-200 rounded-md"></div>
            <div className="h-6 bg-gray-200 rounded w-3/4 mx-auto mt-3"></div>
          </div>
        ))
      ) : counties.length === 0 ? (
        <div className="col-span-full text-center py-10">
          <p className="text-gray-500">No counties found matching your search criteria.</p>
        </div>
      ) : (
        counties.map((county) => (
          <LangLink 
            to={`/municipios/${county.slug}`} 
            key={county.id} 
              className="bg-white hover:rounded-md border-b-1 border-gray-300 py-4 text-center hover:shadow-md transition-all duration-300 ease-in-out"
          >
            <img
              src={API_URL + (county.imageUrl)}
              alt={county.name}
              className="w-full h-40 object-cover rounded-md"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = placeholderImage;
              }}
            />
            {/* <h3 className="text-gray-800 font-semibold mt-3">{county.name}</h3> */}
            {/* {county.district && (
              <p className="text-gray-600 text-sm mt-1">{county.district}</p>
            )} */}
          </LangLink>
        ))
      )}
    </div>
  );
};

export default CountyGridDynamic;