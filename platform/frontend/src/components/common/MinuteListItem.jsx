import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiChevronRight } from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import LangLink from "./LangLink";

const MinuteListItem = ({ ata, formatDate, formatUploadDate }) => {
  const { t } = useTranslation();
  
  return (
    <div className="bg-white rounded-sm hover:bg-white/90 transition-colors duration-300 py-4 px-4 font-montserrat border-1 border-stone-50 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left content */}
        <div className="flex-grow">
          <LangLink to={`/atas/${ata.id}`}>
            <h3 className="font-semibold text-gray-800 text-md hover:text-sky-700 transition-colors mb-2">
              {ata.title}
            </h3>
          </LangLink>
          
          <div className="flex flex-col sm:flex-row sm:gap-4 text-xs text-gray-700 mb-2">
            {/* {ata.municipio && (
              <span className="flex items-center">
                <FaLandmark className="mr-1 flex-shrink-0" /> 
                <span className="font-medium">{ata.municipio}</span>
              </span>
            )} */}
            
            <span className="flex items-center">
              <FiCalendar className="mr-1 flex-shrink-0" />
              <span className="font-medium">{formatDate(ata.date)}</span>
            </span>
            
            <span className="text-gray-500">
              {t("uploaded_at_date")} {formatUploadDate(ata.uploaded_at)}
            </span>

            <span className="flex items-center">
              <FiCalendar className="mr-1 flex-shrink-0" />
              <span className="font-medium">{}</span>
            </span>
          </div>
          
          {ata.summary && (
            <p className="text-gray-500 font-light text-sm line-clamp-2 md:pr-8">
              {ata.summary}
            </p>
          )}
        </div>
        
        {/* Right content - view button */}
        {/* <div className="flex items-center justify-end md:ml-4 mt-2 md:mt-0">
          <Link
            to={`/atas/${ata.id}`}
            className="inline-flex items-center text-gray-600 hover:text-sky-700 text-sm group border border-gray-200 hover:border-sky-700 px-3 py-1.5 rounded-md transition-colors"
          >
            {t("view")}
            <FiChevronRight className="ml-1 transform transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div> */}
      </div>
    </div>
  );
};

export default MinuteListItem;
