import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSearch, FiAlertTriangle } from "react-icons/fi";
import LangLink from "../common/LangLink";

const AtaErrorState = () => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center min-h-full w-full py-56 font-montserrat px-4 md:px-0">
      <div className="md:max-w-xl md:w-full bg-sky-950 shadow-lg rounded-lg overflow-hidden">
        <div className="p-8 text-center">
          <div className="flex text-xl md:text-2xl items-center justify-center space-x-4 mb-4">
          <FiAlertTriangle className="text-white" />
          <h1 className="font-bold text-white">{t("ata_not_found")}</h1>
          </div>
          <p className="text-gray-300 text-sm md:text-md mb-6">{t("ata_not_found_desc")}</p>
          
          <LangLink 
            to="/pesquisa" 
            className="inline-flex items-center px-5 py-3 bg-sky-800 text-white rounded-md hover:bg-sky-900 transition-all duration-300 transform hover:scale-105 shadow-md"
          >
            <FiSearch className="mr-2" /> {t("search_other_minutes")}
          </LangLink>
        </div>
      </div>
    </div>
  );
};

export default AtaErrorState;