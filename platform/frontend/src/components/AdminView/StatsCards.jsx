import React from "react";

const StatsCards = ({ atasStats }) => {
  if (!atasStats) return null;
  
  return (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <div className="bg-white rounded-sm shadow p-4 border-l-4 border-sky-700">
          <h3 className="text-gray-500 text-sm">Nº Atas</h3>
          <p className="text-2xl font-bold">{atasStats.total_count}</p>
        </div>
        <div className="bg-white rounded-sm shadow p-4 border-l-4 border-sky-700">
          <h3 className="text-gray-500 text-sm">Média Caracteres</h3>
          <p className="text-2xl font-bold">{atasStats.average_length} caracteres</p>
        </div>
        <div className="bg-white rounded-sm shadow p-4 border-l-4 border-sky-700">
          <h3 className="text-gray-500 text-sm"></h3>
          <p className="text-2xl font-bold">{atasStats.minutes_with_summaries}</p>
        </div>
        <div className="bg-white rounded-sm shadow p-4 border-l-4 border-sky-700">
          <h3 className="text-gray-500 text-sm"></h3>
          <p className="text-2xl font-bold">{atasStats.minutes_without_summaries}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsCards;
