import React from 'react';

// Skeleton component for loading states
const SkeletonItem = ({ width = "w-full", height = "h-4" }) => (
  <div className={`${width} ${height} bg-gray-200 rounded animate-pulse`}></div>
);

const SkeletonList = ({ itemCount = 5, showCounts = false }) => (
  <ul className="rounded-md border border-gray-200 bg-white divide-y divide-gray-100">
    {[...Array(itemCount)].map((_, index) => (
      <li key={index} className="px-3 py-2 flex justify-between items-center">
        <SkeletonItem width="w-24" />
        {showCounts && <SkeletonItem width="w-8" />}
      </li>
    ))}
  </ul>
);

export { SkeletonItem, SkeletonList };