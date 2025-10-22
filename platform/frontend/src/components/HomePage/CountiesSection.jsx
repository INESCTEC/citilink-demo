import React from "react";
import { useTranslation } from "react-i18next";
import { FaLandmark } from "react-icons/fa";
// import CountyGrid from "./CountyGrid";

const CountiesSection = ({ isLoading }) => {
  const { t } = useTranslation();

  return (
    <div className="container px-6 mt-10 text-start font-montserrat">
      <h1 className="text-2xl font-bold inline-flex items-center">
        <FaLandmark/> &nbsp; <span>{t("counties")}</span>
      </h1>
      <h2 className="text-xl text-gray-700 mt-1">
        {t("counties_description")}
      </h2>

      {/* Grid de Municípios with Loading State */}
      {isLoading ? (
        <CountyLoadingSkeleton />
      ) : (
        <CountyGrid />
      )}
    </div>
  );
};

const CountyLoadingSkeleton = () => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-gray-50 border border-gray-200 rounded-md py-4 animate-pulse">
        <div className="w-full h-40 bg-gray-300 rounded-md mb-3"></div>
        <div className="h-6 bg-gray-300 rounded w-3/4 mx-auto"></div>
      </div>
    ))}
  </div>
);

export default CountiesSection;