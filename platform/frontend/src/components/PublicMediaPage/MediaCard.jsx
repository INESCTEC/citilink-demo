import React from "react";
import { FiCalendar, FiExternalLink } from "react-icons/fi";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { pt } from "date-fns/locale";
import RenderHTML from "../../hooks/renderHtml";

const MediaCard = ({ item }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language || "en";
  
  // Format date to a more readable format - with localization support
  const formatDate = (dateString) => {
    try {
      const locale = currentLang === 'pt' ? pt : undefined;
      return format(new Date(dateString), "dd/MM/yyyy", { locale });
    } catch (e) {
      return "Data desconhecida";
    }
  };

  // Get the appropriate title and text based on current language
  const displayTitle = currentLang === 'pt' && item.title_PT ? item.title_PT : item.title;
  const displayText = currentLang === 'pt' && item.text_PT ? item.text_PT : item.text;

  return (
    <div className="border-b-1 border-gray-200 dark:border-sky-800 overflow-hidden flex flex-col h-full transition-all duration-300 hover:border-sky-700/30 group">
      {item.image && (
        <div className="relative w-full pb-[56.25%]">
          <img 
            src={`https://nabu.dcc.fc.up.pt/api/assets/${item.image}`} 
            alt={displayTitle} 
            className="absolute top-0 left-0 w-full h-full object-cover rounded-sm dark:bg-white dark:rounded-b-none"
            loading="lazy"
            onError={(e) => {
              e.target.src = "https://placehold.co/500x200/052E4B/FFFFFF/png?text=CitiLink";
            }}
          />
        </div>
      )}
      
      <div className="pt-2 flex-grow flex flex-col dark:bg-sky-950 dark:px-2 dark:rounded-b-md">
        <a 
          href={item.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="group"
        >
          <h2 className="text-sm font-semibold text-gray-800 dark:text-white mb-1 group-hover:text-sky-700 hover:text-sky-600 transition-colors duration-200">
            {displayTitle}
          </h2>
        </a>

        <div className="flex items-center text-xs text-gray-500 dark:text-gray-200 mb-2">
          <FiCalendar className="mr-1" />
          <span>{formatDate(item.date)}</span>
        </div>
        
        <div 
          className="text-gray-600 dark:text-gray-200 text-xs mb-4 font-light line-clamp-3 leading-relaxed text-justify"
        >
            <RenderHTML content={displayText} />
        </div>
      </div>
    </div>
  );
};

export default MediaCard;