import React from "react";
import { useTranslation } from "react-i18next";

const ResultsInfo = ({ currentPage, perPage, totalResults }) => {
  const { t } = useTranslation();

  if (totalResults === 1) {
    return (
      <div className="py-6 text-sm text-center font-montserrat">
        {t("showing_one_result")}
      </div>
    );
  }

  return (
    <div className="py-6 text-sm text-center font-montserrat">
      {t("showing_results", {
        start: ((currentPage - 1) * perPage) + 1,
        end: Math.min(currentPage * perPage, totalResults),
        total: totalResults
      })}
    </div>
  );
};

export default ResultsInfo;