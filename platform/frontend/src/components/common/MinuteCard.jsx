import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiChevronRight, FiDownload, FiEye } from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import { useLastSeenMinute } from "../../hooks/useLastSeenMinute";
import LangLink from "./LangLink";

const MinuteCard = ({ ata, formatDate, formatUploadDate, showMunicipio = true }) => {
  const { t } = useTranslation();
  const { isLastSeen, markAsLastSeen } = useLastSeenMinute();
  
  // Check if this minute is the last seen one
  const isLastSeenMinute = isLastSeen(ata.id);

  // Handle click to mark as last seen
  const handleCardClick = () => {
    if (ata.id) {
      markAsLastSeen(ata.id);
    }
  };
  
  return (
    <div className={`bg-white rounded-md shadow overflow-hidden hover:shadow-md transition-shadow duration-300 flex flex-col h-full font-montserrat relative ${
      isLastSeenMinute ? 'ring-2 ring-amber-400/50' : ''
    }`}>
      {/* Last Seen Badge */}
      {isLastSeenMinute && (
        <div className="absolute top-3 right-3 z-10">
          <div className="bg-amber-500 text-white text-xs font-medium px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
            <FiEye className="w-3 h-3" />
            <span>Último visto</span>
          </div>
        </div>
      )}

      <div className={`px-5 pt-5 flex-grow ${isLastSeenMinute ? 'pr-24' : ''}`}>
        <LangLink to={`/atas/${ata.id}`} onClick={handleCardClick}>
          <h3 className="font-semibold text-gray-800 text-md md:text-md mb-2 hover:text-sky-700 transition-colors line-clamp-2">
            {ata.title}
          </h3>
        </LangLink>
        
        <div className="text-sm text-sky-950 dark:text-gray-300 mb-2 flex flex-col items-start">
            {showMunicipio && ata.municipio && (
                <span className="flex items-center"><FaLandmark className="mr-1"/> <span className="font-medium">{ata.municipio}</span></span>
              )}
            <span className="flex items-center font-medium"><FiCalendar className="mr-1" /><span className="">{formatDate(ata.date)}</span></span>
        </div>
        
        {ata.summary && (
          <p className="text-gray-500 font-light text-sm mb-2 line-clamp-3 font-raleway">
            {ata.summary}
          </p>
        )}
      </div>
      
      <div className="bg-sky-700/5 px-5 py-3 flex justify-between items-center">
        <span className="text-xs font-light text-gray-500">
          {t("uploaded_at_date")} {formatUploadDate(ata.uploaded_at)}
        </span>
        
        <div className="flex space-x-2">
          <LangLink
            to={`/atas/${ata.id}`}
            onClick={handleCardClick}
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

export default MinuteCard;