import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { FiUser } from "react-icons/fi";
import { useInView } from "react-intersection-observer";
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import { useNavigate } from "react-router-dom";
import { useLangNavigate } from "../../hooks/useLangNavigate";

const CountyParticipants = ({ county, currentParticipants, isLoading = false, API_URL, onParticipantClick }) => {
  const { t, i18n } = useTranslation();
  const navigate = useLangNavigate();
  const currentLanguage = i18n.language || 'pt';

  const getLocalizedParticipanteRole = (participante, language) => {
    if (language === 'en' && participante.role_en) {
      return participante.role_en;
    }
    return participante.role || participante.role_en || ''; 
  };
  
  const [visibleSections, setVisibleSections] = useState({
    câmara: true,
    assembleia: false,
    public: false,
    outro: false
  });
  
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);
  
  const assembleiaRef = useRef(null);
  const publicRef = useRef(null);
  const outroRef = useRef(null);

  useEffect(() => {
    if (isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const sectionType = entry.target.dataset.section;
            
            if (sectionType) {
              setVisibleSections(prev => ({
                ...prev,
                [sectionType]: true
              }));
            }
          }
        });
      },
      { threshold: 0.1 } 
    );

    if (assembleiaRef.current) observer.observe(assembleiaRef.current);
    if (publicRef.current) observer.observe(publicRef.current);
    if (outroRef.current) observer.observe(outroRef.current);

    return () => observer.disconnect();
  }, [isLoading, assembleiaRef, publicRef, outroRef]);


  useEffect(() => {
    if (!isLoading && currentParticipants && currentParticipants.length > 0 && !initialAnimationDone) {
      const timer = setTimeout(() => {
        setInitialAnimationDone(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, currentParticipants, initialAnimationDone]);

  const groupParticipantsByType = (participants) => {
  if (!participants) return {};

  const grouped = {
    câmara: [],
    assembleia: [],
    public: [],
    outro: []
  };

  participants.forEach(participant => {
    let type = participant.participante_type?.toLowerCase().trim();

    if (!grouped.hasOwnProperty(type)) {
      type = 'outro';
    }

    grouped[type].push(participant);
  });


  // sorting by role and then by party
  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => {
      const sortA = a.sort !== undefined && a.sort !== null ? Number(a.sort) : 1000;
      const sortB = b.sort !== undefined && b.sort !== null ? Number(b.sort) : 1000;
      
      if (sortA !== sortB) {
        return sortA - sortB;
      }
      const partyA = a.party || '';
      const partyB = b.party || '';
      return partyA.localeCompare(partyB);
    });
  });

  return grouped;
};
  
  const AnimatedParticipantCard = ({ participant, index }) => {
    const { ref, inView } = useInView({
      threshold: 0.2,
      triggerOnce: true,
      delay: 50 * index,
      skip: initialAnimationDone
    });

    const animationClasses = initialAnimationDone 
      ? 'opacity-100 translate-y-0' 
      : inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8';

    return (
      <div 
        ref={ref}
        className={`border-b border-gray-200 dark:border-sky-800 pb-4 flex items-start transition-all duration-500 ${animationClasses} bg-white dark:bg-sky-950 cursor-pointer group`}
        style={{ willChange: 'transform, box-shadow' }}
      >
        {/* Participant Image */}
        <div className="flex-shrink-0 mr-3 transition-all duration-500 group-hover:scale-101 group-hover:shadow-md group-hover:ring-2 group-hover:ring-sky-200 rounded-sm">
          {participant.profile_photo ? (
            <img 
              src={API_URL + participant.profile_photo} 
              alt={participant.name}
              className="w-12 h-12 rounded-sm object-cover transition-all duration-300 group-hover:scale-110 group-hover:shadow-md"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 rounded-sm bg-gray-200 dark:bg-sky-800 flex items-center justify-center transition-all duration-300 group-hover:scale-110 group-hover:shadow-md">
              <FiUser className="text-gray-500 dark:text-white" />
            </div>
          )}
        </div>
        
        {/* Participant Details */}
        <div className="flex-grow">
          <div className="flex items-start">
            <h1 className="font-medium text-sm text-gray-800 dark:text-sky-50 transition-all duration-300 group-hover:text-sky-700">{participant.name}</h1>
          </div>
          <div className="flex items-center justify-start gap-x-2">
            {participant.party && (
              <span className={`text-xs px-2 py-0.5 rounded-md transition-all duration-300 ${getPartyColorClass(participant.party)}`}>
                {participant.party}
              </span>
            )}
            {participant.role && (
              <p className="text-sm font-regular text-gray-600 dark:text-gray-200 mt-0 transition-all duration-300 group-hover:text-sky-700 font-raleway">
                {getLocalizedParticipanteRole(participant, currentLanguage)}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  const renderParticipantsList = (participants) => {
    if (!participants || participants.length === 0) return null;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
        {participants.map((participant, index) => (
          <div 
            key={participant.id}
            onClick={(e) => {
                if (onParticipantClick) {
                  e.preventDefault();
                  onParticipantClick(participant.id);
                } else {
                  navigate(`/participante/${participant.slug}`); // Navigate to participant's page
                }
              }}
            style={{ cursor: onParticipantClick ? 'pointer' : 'default' }}
          >
            <AnimatedParticipantCard 
              participant={participant} 
              index={index}
            />
          </div>
        ))}
      </div>
    );
  };
  
  // mapping
  const typeTitles = {
    câmara: "Executivo",
    assembleia: "Assembleia",
    public: "Público",
    outro: "Outro"
  };
  
  const groupedParticipants = groupParticipantsByType(currentParticipants);
  
  // Order of sections to display
  // const sectionOrder = ['câmara', 'assembleia', 'public', 'outro'];
  const sectionOrder= ['câmara']
  
  
  // Ref mapping
  const sectionRefs = {
    assembleia: assembleiaRef,
    public: publicRef,
    outro: outroRef
  };
  
  return (
    <div className="bg-white dark:bg-sky-950 rounded-md shadow-md p-6 font-montserrat">
        {isLoading ? (
          <div className="h-8 bg-gray-200 dark:bg-sky-950 rounded animate-pulse w-3/4"></div>
        ) : (
          <div className="flex items-center mb-4">
          <FiUser className="mr-2 text-gray-700 dark:text-white" size={20} /> 
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">
            {/* {t("county_information")} */}
            {t("participants_in_county")}
          </h2>
        </div>
        )}
      
      {isLoading ? (
        // Skeleton loading state
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="border-b border-b-gray-300 pb-4 flex items-start">
              {/* Skeleton Avatar */}
              <div className="flex-shrink-0 mr-3">
                <div className="w-12 h-12 rounded-sm bg-gray-200 dark:bg-sky-950 animate-pulse"></div>
              </div>
              
              {/* Skeleton Content */}
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div className="h-5 bg-gray-200 dark:bg-sky-950 rounded animate-pulse w-1/3 mb-2"></div>
                  <div className="h-5 w-12 bg-gray-200 dark:bg-sky-950 rounded animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-sky-950 rounded animate-pulse w-1/2 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : currentParticipants && currentParticipants.length > 0 ? (
        // Actual content - grouped by participant type
        <div className="space-y-8">
          {/* Display sections in order, only if they have participants */}
          {sectionOrder.map(type => {
            const participants = groupedParticipants[type] || [];
            if (participants.length === 0) return null;
            
            return (
              <div key={type} className="space-y-4">
                {/* Section header is always visible */}
                {/* <h3 className="text-base font-semibold text-gray-700 border-b border-gray-200 pb-1">
                  {typeTitles[type]}
                </h3> */}
                
                {/* {type === 'câmara' || visibleSections[type] ? ( */}
                {type === 'câmara' || visibleSections[type] ? (
                  renderParticipantsList(participants)
                ) : (
                  <div 
                    ref={sectionRefs[type]} 
                    data-section={type}
                    className="h-32 bg-gray-50 rounded flex items-center justify-center"
                  >
                    <div className="animate-pulse h-8 w-8 rounded-full bg-gray-200"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // Empty state
        <div className="text-center py-6 bg-gray-50 rounded">
          <FiUser className="mx-auto h-10 w-10 text-gray-400 mb-2" />
          <p className="text-gray-500">{t("no_participants_found")}</p>
        </div>
      )}
    </div>
  );
};

export default CountyParticipants;