import React from "react";
import { FiCalendar, FiExternalLink, FiDownload } from "react-icons/fi";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { pt } from "date-fns/locale";
import RenderHTML from "../../hooks/renderHtml";

const ResourceCard = ({ resource }) => {
  const { t, i18n } = useTranslation();
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

  // Get the appropriate title and description based on current language
  const displayTitle = resource.title;
  const displayDescription = currentLang === 'pt' && resource.description_PT 
    ? resource.description_PT 
    : resource.description;

  return (
    <div className="bg-sky-900 rounded-md shadow-lg overflow-hidden flex flex-col h-full transition-all duration-300 hover:shadow-xl font-montserrat">
      {resource.image && (
        <div className="relative w-full pb-[56.25%]">
          <img 
            src={`https://nabu.dcc.fc.up.pt/api/assets/${resource.image}.jpg`} 
            alt={resource.title} 
            className="absolute top-0 left-0 w-full h-full object-cover"
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/500x200/052E4B/FFFFFF/png?text=CitiLink";
            }}
          />
        </div>
      )}
      
      <div className="p-4 pb-0 flex-grow flex flex-col">
        {resource.date_created && (
          <div className="flex items-center text-xs text-gray-400 mb-3">
            <FiCalendar className="mr-1" />
            <span>{formatDate(resource.date_created)}</span>
          </div>
        )}
        
        <h2 className="text-sm font-medium text-gray-100 mb-2">
          {displayTitle}
        </h2>
        
        <div className="text-gray-300 text-xs font-light mb-2 flex-grow line-clamp-3 md:line-clamp-5">
          <RenderHTML content={displayDescription} />
        </div>

        <div className="flex items-center justify-between">
         {resource.type && (
            <div className="mb-3">
              <span className="inline-block px-2 py-0.5 text-xs bg-sky-800 text-gray-300 rounded">
                {currentLang === 'pt' 
                  ? resource.type.designation
                  : resource.type.designation}
              </span>
            </div>
          )}

            {resource.url && (
              <a 
                href={resource.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-block items-center px-2 py-1 gap-1 text-xs text-sky-300 hover:text-sky-100 transition-colors duration-200"
              >
                <FiExternalLink className="w-3 h-3" />
                {/* {currentLang === 'pt' ? 'Ver recurso' : 'View resource'} */}
              </a>
            )}
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
