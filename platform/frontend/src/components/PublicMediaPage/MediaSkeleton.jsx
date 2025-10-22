import React from "react";

const MediaSkeleton = ({ count = 6 }) => {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 font-montserrat">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-md shadow-md overflow-hidden">
          <div className="w-full h-48 bg-gray-200 animate-pulse"></div>
          <div className="p-4">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4 mb-3"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4 mt-4"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default MediaSkeleton;