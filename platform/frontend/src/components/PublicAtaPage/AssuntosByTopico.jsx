import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FiArrowRight, 
  FiEye, 
  FiFileText, 
  FiUsers, 
  FiChevronRight
} from "react-icons/fi";

import AssuntosInformation from "./AssuntosInformation";
import { getTopicoIcon } from "../../utils/iconMappers.jsx";
import LangLink from "../common/LangLink.jsx";

const AssuntosByTopico = ({ assuntos, ataId, municipioId }) => {
  const { t } = useTranslation();
  const [selectedAssuntoId, setSelectedAssuntoId] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setSelectedAssuntoId(null); // Clear selection on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Create a map of topicos to assuntos
  const topicosMap = {};
  assuntos.forEach(assunto => {
    if (assunto.topico) {
      if (!topicosMap[assunto.topico.id]) {
        topicosMap[assunto.topico.id] = {
          info: assunto.topico,
          assuntos: []
        };
      }
      topicosMap[assunto.topico.id].assuntos.push(assunto);
    }
  });
  
  // Convert to array for rendering
  const topicosArray = Object.values(topicosMap);
  const assuntosWithoutTopico = assuntos.filter(a => !a.topico);
  
  // Handle click on assunto - show details on desktop, navigate on mobile
  const handleAssuntoClick = (e, assuntoId) => {
    if (isMobile) {
      // On mobile, let the default link navigation happen
      return;
    }
    
    // On desktop, prevent default and show details panel
    e.preventDefault();
    
    // Add a subtle animation effect when selecting an item
    if (assuntoId === selectedAssuntoId) {
      // If clicking the same item, close the panel
      setSelectedAssuntoId(null);
    } else {
      setSelectedAssuntoId(assuntoId);
    }
  };
  
  return (
    <>
      <div className={`grid ${selectedAssuntoId ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 transition-all duration-300 ease-in-out`}>
        {/* Left side - Topics list */}
        <div className={selectedAssuntoId ? 'md:pr-4' : ''}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {topicosArray.map((topicoGroup) => (
                <LangLink 
                  key={topicoGroup.info.id}
                  to={`/atas/${ataId}/topicos/${topicoGroup.info.id}`}
                  className={`block border-b border-gray-200 transition-all duration-500 group`}
                >
                  <div className="flex items-center py-3">
                    <div className="flex-shrink-0 mr-4 text-gray-600">
                      {getTopicoIcon(topicoGroup.info.title)}
                    </div>
                      <div className="flex-grow min-w-0">
                          <h3 className="font-semibold text-gray-800 mb-1 truncate">{topicoGroup.info.title}</h3>
                            <div className="flex items-center text-xs text-gray-500">
                              <span className="">
                                <FiFileText className="inline mr-1" /> 
                                {topicoGroup.assuntos.length || 0}{' '}
                                <span className="">
                                  {topicoGroup.assuntos.length === 1 ? t("subject") : t("subjects")}
                                </span>
                              </span>
                              {/* <span>
                                <FiUsers className="inline mr-1" /> 
                                {topic.participants_count || 0}{' '}
                                <span className="">
                                  {topic.participants_count === 1 ? t("participant") : t("participants")}
                                </span>
                              </span> */}
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0 text-gray-400 group-hover:text-sky-600 group-hover:translate-x-1 transition-all duration-200">
                            <FiChevronRight className="h-5 w-5" />
                          </div>
                        </div>
                </LangLink>
            ))}
          </div>
          
          {/* If any assuntos without topico */}
          {assuntosWithoutTopico.length > 0 && (
            <div className="mt-6 border-t border-gray-200 pt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">{t("other_subjects")}</h3>
              <div className="space-y-3">
                {assuntosWithoutTopico.map(assunto => (
                  <div key={assunto.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
                    {/* Link to SubjectDetailPage with conditional behavior */}
                    <LangLink 
                      to={`/assuntos/${assunto.id}`} 
                      className={`hover:text-sky-700 ${selectedAssuntoId === assunto.id ? 'text-sky-700 font-semibold' : ''}`}
                      onClick={(e) => handleAssuntoClick(e, assunto.id)}
                    >
                      <h4 className="text-gray-800 font-medium flex items-center">
                        {assunto.title}
                        <FiEye className="ml-2 text-sky-600 h-4 w-4 opacity-70" />
                      </h4>
                    </LangLink>
                    {assunto.description && (
                      <p className="text-sm text-gray-600 mt-1">{assunto.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* Right side - Selected assunto detail */}
        <AnimatePresence>
          {selectedAssuntoId && !isMobile && (
            <motion.div 
              className="hidden md:block md:border-l md:border-gray-200 md:pl-6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ 
                type: "tween", 
                ease: "easeOut", 
                duration: 0.25
              }}
              key={selectedAssuntoId}
            >
              <AssuntosInformation 
                assuntoId={selectedAssuntoId} 
                onClose={() => setSelectedAssuntoId(null)} 
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default AssuntosByTopico;