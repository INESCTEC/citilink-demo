import React from "react";
import { motion } from "framer-motion";

const SkeletonCard = ({ index = 0, viewMode = "grid" }) => {
  // Animation variants for staggered appearance
  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delay: index * 0.05,
        duration: 0.4,
        ease: "easeOut"
      }
    }
  };

  return (
    <motion.div 
      className="bg-white border-b-3 rounded-t-md shadow-sm border-gray-200 overflow-hidden flex flex-col h-full font-montserrat"
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      custom={index % 10}
    >
      <div className="px-5 pt-5 pb-2 flex-grow">
        <div className="flex items-start justify-between">
          {/* Title skeleton */}
          <div className="flex-grow">
            <div className="h-5 bg-gray-200 rounded animate-pulse w-4/5 mb-2"></div>
            <div className="h-5 bg-gray-200 rounded animate-pulse w-3/5 mb-2"></div>
          </div>
          {/* See button skeleton */}
          <div className="h-6 w-6 bg-gray-200 rounded animate-pulse ml-2 flex-shrink-0"></div>
        </div>
        
        {/* Metadata skeleton (date, municipality, location, etc.) */}
        <div className={`text-xs mb-2 flex ${viewMode === "grid" ? "flex-col items-start" : "flex-col sm:flex-row gap-x-4 items-start"} space-y-1`}>
          <div className="flex items-center">
            <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-1"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-24"></div>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-1"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-32"></div>
          </div>
          <div className="flex items-center">
            <div className="h-3 w-3 bg-gray-200 rounded animate-pulse mr-1"></div>
            <div className="h-3 bg-gray-200 rounded animate-pulse w-20"></div>
          </div>
        </div>
        
        {/* Summary skeleton */}
        <div className="space-y-2 mb-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-full"></div>
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
        </div>
      </div>
    </motion.div>
  );
};

// Component to render multiple skeleton cards
const SkeletonCardGrid = ({ count = 12, viewMode = "grid" }) => {
  return (
    <motion.div
      className={`${
        viewMode === "grid"
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-2"
          : "flex flex-col space-y-4 mt-2"
      }`}
      initial="hidden"
      animate="visible"
    >
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} index={index} viewMode={viewMode} />
      ))}
    </motion.div>
  );
};

export default SkeletonCard;
export { SkeletonCardGrid };
