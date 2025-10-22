import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiExternalLink, FiChevronRight, FiHome, FiUser } from "react-icons/fi";
import LangLink from "../common/LangLink";

const ParticipantHeader = ({ participant }) => {
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;
  
  return (
    <div className="bg-sky-800 pt-15 pb-6">
      <div className="container mx-auto px-4">
        <div className="flex flex-col space-y-6 justify-center">
          {/* Breadcrumb navigation */}
          <div className="flex items-center mb-7">
            <nav className="flex items-center text-sm font-montserrat bg-sky-700 rounded-md px-4 py-1" aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center">
                <li className="flex items-center">
                  <LangLink
                    to="/"
                    className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                    after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                  >
                    <FiHome />
                  </LangLink>
                </li>
                <li className="flex items-center">
                  <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                  <LangLink
                    to="/participantes"
                    className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                    after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                  >
                    {t("participants")}
                  </LangLink>
                </li>
                <li className="flex items-center">
                  <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                  <span className="text-white font-medium">
                    {participant?.name || <span className="animate-pulse">...</span>}
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          {/* Header Section - responsive layout */}
          <div className="flex flex-col items-center sm:flex-row sm:space-x-6">
            {/* Participant Image */}
            <div className="flex items-center justify-center sm:justify-start mb-4 sm:mb-0">
              {participant?.imageUrl ? (
                <img 
                  src={API_URL + participant.imageUrl}
                  alt={participant.name} 
                  className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-md transform transition-transform duration-500"
                  loading="lazy"
                />
              ) : (
                <div className="w-32 h-32 sm:w-40 sm:h-40 bg-sky-700 flex items-center justify-center rounded-md">
                  <FiUser className="text-white text-5xl" />
                </div>
              )}
            </div>
            
            {/* Title and Actions */}
            <div className="flex flex-col items-center sm:items-start">
              {/* Participant Name */}
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-bold text-white font-montserrat mb-2 text-center sm:text-left">
                {participant?.name || <span className="animate-pulse">...</span>}
              </h1>
              
              {/* Action Buttons */}
              <div className="flex flex-row font-montserrat">
                {participant?.website && (
                  <a 
                    href={participant.website}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                    after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                  >
                    <FiExternalLink className="mr-2 group-hover:animate-pulse" /> 
                    <span>{t("official_website")}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {participant?.description && (
        <div className="bg-sky-800 pt-6"> 
          <div className="container mx-auto px-4">
            <div className="w-full">
              <p className="md:text-lg italic text-sky-50 leading-relaxed text-justify font-montserrat">
                {participant.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ParticipantHeader;
