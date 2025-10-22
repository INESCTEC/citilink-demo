import React from "react";
import { useTranslation } from "react-i18next";
import { FiUser } from "react-icons/fi";
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import LangLink from "../common/LangLink";

const AtaParticipantes = ({ participantes }) => {
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;

  const sortedParticipantes = [...participantes].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));

  return (
    <div className="m-0 p-0">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-5 gap-y-3 font-montserrat">
        {sortedParticipantes.map((participante) => (
          <React.Fragment key={participante.id}>
            <LangLink 
              to={`/participante/${participante.slug}`}
              className="border-b border-gray-200 pb-4 flex items-start hover:bg-gray-50 transition-colors duration-200 rounded-sm p-2 -m-2 group"
            >
              {/* Participant Image */}
              <div className="flex-shrink-0 mr-3">
                {participante.profile_photo ? (
                  <img 
                    className="w-12 h-12 rounded-sm object-cover" 
                    src={`${API_URL}/${participante.profile_photo}`}
                    alt={participante.name} 
                    loading="lazy"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-sm bg-gray-200 flex items-center justify-center">
                    <FiUser className="text-gray-500" />
                  </div>
                )}
              </div>
              
              {/* Text content container */}
             <div className="flex-grow">
                <div className="flex items-start">
                  <h1 className="font-medium text-sm text-gray-800 transition-all duration-300 group-hover:text-sky-700">{participante.name}</h1>
                </div>
                <div className="flex items-center justify-start gap-x-2">
                    {participante.party && (
                      <span className={`text-xs px-2 py-0.5 rounded-md transition-all duration-300 ${getPartyColorClass(participante.party)}`}>
                        {participante.party}
                      </span>
                    )}
                    {participante.role && (
                      <p className="text-sm font-regular text-gray-600 mt-0 transition-all duration-300 group-hover:text-sky-700 font-raleway">{participante.role}</p>
                    )}
                  </div>
                </div>
            </LangLink>

            {/* Desktop Layout - Vertical (hidden on smaller than md) */}
            {/* <div className="hidden md:flex flex-col items-center border-b border-b-stone-200 p-3">
              <div className="mb-3">
                {participante.profile_photo ? (
                  <img 
                    className="h-40 w-40 rounded-sm object-cover" 
                    src={`${API_URL}/${participante.profile_photo}`}
                    alt={participante.name} 
                  />
                ) : (
                  <div className="h-40 w-40 rounded-sm bg-gray-200 flex items-center justify-center">
                    <FiUser size={40} className="text-gray-500" />
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-center">
                <h1 className="text-md font-medium text-stone-900 text-center">
                  {participante.name}
                </h1>
                
                <div className="flex space-x-2 items-center font-raleway">
                  {participante.role && (
                    <div className="text-gray-500 text-sm text-center">
                      {participante.role}
                    </div>
                  )}
                  
                  {participante.party && (
                    <div>
                      <span className={`text-xs px-2 py-0.5 rounded-md inline-block ${getPartyColorClass(participante.party)}`}>
                        {participante.party}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div> */}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default AtaParticipantes;