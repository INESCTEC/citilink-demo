import React from "react";
import { useTranslation } from "react-i18next";
import { FiMap, FiSearch, FiBookOpen } from "react-icons/fi";
import LangLink from "../common/LangLink";

const AtaRelatedActions = ({ ata }) => {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-6 mb-8 font-montserrat">
      <div className="flex flex-wrap gap-4 justify-center">
        <LangLink
          to={`/municipios/${ata.municipio_id}`}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FiMap className="mr-2" /> 
          {t("view_county", { county: ata.municipio })}
        </LangLink>
        
        <LangLink 
          to={`/pesquisa?municipio_id=${ata.municipio_id}`}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FiSearch className="mr-2" /> 
          {t("search_more_minutes_from_county", { county: ata.municipio })}
        </LangLink>
        
        <LangLink 
          to="/pesquisa"
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-md shadow-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <FiBookOpen className="mr-2" /> 
          {t("search_all_minutes")}
        </LangLink>
      </div>
    </div>
  );
};

export default AtaRelatedActions;