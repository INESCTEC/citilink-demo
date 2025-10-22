import React from "react";
import { FiMail, FiGlobe } from "react-icons/fi";
import { FaGoogle, FaLinkedin } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import RenderHTML from "../../hooks/renderHtml";

const TeamCard = ({ member }) => {
  const { i18n } = useTranslation();
  
  return (
    <div className="bg-sky-900 dark:bg-sky-900 p-3 rounded-md shadow-lg font-montserrat transition-all duration-300 hover:shadow-xl">
      <div className="flex">
        <div className="flex items-center gap-4">
          <img 
            src={`https://nabu.dcc.fc.up.pt/api/assets/${member.profile_picture}.jpg`} 
            alt={member.name} 
            className="w-14 h-14 object-cover rounded-sm flex-shrink-0" 
            onError={(e) => {
              e.target.src = "https://via.placeholder.com/150?text=No+Image";
            }}
          />
          <div>
            <h2 className="text-sm font-medium text-gray-100">{member.name}</h2>
            <p className="text-gray-300 font-light text-xs">
              {i18n.language === 'pt' 
                ? member.title?.designation_PT 
                : member.title?.designation}
            </p>
            {/* Extra member info */}
            <div className="flex gap-2 mt-2">
              {member.email && (
                <a 
                  href={`mailto:${member.email}`} 
                  className="text-xs text-sky-300 hover:text-sky-100 flex items-center gap-1 transition-colors duration-200"
                  title="Email"
                >
                  <FiMail className="inline-block" />
                </a>
              )}
              {member.google_scholar && (
                <a 
                  href={member.google_scholar} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-sky-300 hover:text-sky-100 flex items-center gap-1 transition-colors duration-200"
                  title="Google Scholar"
                >
                  <FaGoogle className="inline-block" />
                </a>
              )}
              {member.homepage && (
                <a 
                  href={member.homepage} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-sky-300 hover:text-sky-100 flex items-center gap-1 transition-colors duration-200"
                  title="Homepage"
                >
                  <FiGlobe className="inline-block" />
                </a>
              )}
              {member.linkedin && (
                <a 
                  href={member.linkedin} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-xs text-sky-300 hover:text-sky-100 flex items-center gap-1 transition-colors duration-200"
                  title="LinkedIn"
                >
                  <FaLinkedin className="inline-block" />
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="text-gray-300 text-xs font-light mt-2 italic">
        {i18n.language === 'pt' 
          ? <RenderHTML content={`${member.description_PT}`} />
          : <RenderHTML content={`${member.description}`} />}
      </div>
    </div>
  );
};

export default TeamCard;
