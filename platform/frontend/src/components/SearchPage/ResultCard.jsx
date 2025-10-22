import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiEye, FiCalendar, FiDownload, FiChevronRight } from "react-icons/fi";
import { format } from "date-fns";
import { FaLandmark } from "react-icons/fa";
import LangLink from "../common/LangLink";

const ResultCard = ({ result }) => {
  const { t } = useTranslation();

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return "Data desconhecida";
    }
  };

  return (
    <div className="bg-white rounded-md shadow overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full font-montserrat">
      <div className="px-5 pt-5 flex-grow">
        <LangLink to={`/atas/${result.id}`}>
          <h3 className="font-semibold text-gray-800 text-lg md:text-xl mb-2 hover:text-sky-700 transition-colors line-clamp-2">
            {result.title}
          </h3>
        </LangLink>
        
        <div className="text-sm text-sky-950 dark:text-gray-300 mb-3 flex justify-between items-center">
          <span className="flex items-center"><FaLandmark className="mr-1"/> <span className="font-medium">{result.municipio}</span></span>
          <span className="flex items-center font-medium"><FiCalendar className="mr-1" /><span className="">{formatDate(result.date)}</span></span>
        </div>
        
        {result.content && (
          <p className="text-gray-500 text-sm mb-2 line-clamp-3">
            {result.content}
          </p>
        )}
      </div>
      
      <div className="bg-gray-50 px-5 py-3 flex justify-between items-center">
        <span className="text-xs font-light text-gray-500">
          {t("uploaded_at_date")} {formatDate(result.uploaded_at)}
        </span>
        
        <div className="flex space-x-2">
          {/* {result.file_url && (
            <a 
              href={result.file_url}
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center text-gray-600 hover:text-sky-700 text-sm"
              title={t("download")}
            >
              <FiDownload size={16} />
            </a>
          )} */}
          
          <LangLink
            to={`/atas/${result.id}`}
               className="inline-flex items-center text-gray-600 hover:text-sky-700 text-sm group"
          >
            {t("view")}
           <FiChevronRight className="ml-1 transform transition-transform duration-300 group-hover:translate-x-1" />
          </LangLink>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;