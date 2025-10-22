import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiChevronUp, FiCalendar, FiUsers, FiClipboard, FiPieChart, FiLayout, FiUser, FiFolder, FiFileText, FiAlertCircle, FiRefreshCw, FiMapPin, FiList } from 'react-icons/fi';
import AtaContent from './AtaContent';
import AtaParticipantes from './AtaParticipantes';
import AtaVotingSummary from './AtaVotingSummary';
import AtaAssuntos from './AtaAssuntos';
import AtaOrdemDoDia from './AtaOrdemDoDia';
import AtaTimeline from './AtaTimeline';
import TimelineToggleButton from '../Timeline/TimelineToggleButton';
import LoadingSpinner from '../common/LoadingSpinner';
import { format } from 'date-fns';

const AtaInformation = ({ 
  ataId,
  showTimelineButton = false,
  onTimelineToggle = null,
  timelineButtonProps = null,
  direction = null
}) => {
  const { t, i18n } = useTranslation();
  const [ata, setAta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewType, setViewType] = useState('general');
  const [previousViewType, setPreviousViewType] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return "Data desconhecida";
    }
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), "HH:mm");
    } catch (e) {
      return "--:--";
    }
  };
  
  useEffect(() => {
    const fetchAtaDetails = async () => {
      if (!ataId) return;
      
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/v0/public/atas/${ataId}?demo=${DEMO_MODE}&lang=${i18n.language}`);
        if (!response.ok) {
          throw new Error(response.status === 404 ? "Ata not found" : "Failed to fetch ata");
        }
        const data = await response.json();
        setAta(data);
      } catch (err) {
        console.error("Error fetching ata details:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAtaDetails();
  }, [ataId, API_URL, i18n.language]);

  if (isLoading) {
    return (
      <div className="bg-sky-700 rounded-lg shadow-md p-8 flex justify-center items-center h-60">
        <LoadingSpinner 
          color="text-white"
          text={t("loading_minute")}
          textClass="text-sky-700 text-sm font-montserrat mt-2"
        />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <FiAlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-xl font-semibold text-gray-800">{t("error_loading_ata")}</h3>
          <p className="text-gray-600 max-w-md">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors duration-200 flex items-center space-x-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            <span>{t("try_again")}</span>
          </button>
        </div>
      </div>
    );
  }
  
  if (!ata) {
    return null;
  }
  
  const hasSubjects = ata.assuntos?.length > 0;

  return (
    <div className="min-h-screen bg-white overflow-hidden">
     
      {/* Header with title and date */}
      <div className="bg-sky-700 shadow-md text-white p-6 dark:bg-sky-950">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-xl md:text-2xl font-semibold mb-2">{ata.title}</h2>
            <div className="flex items-center gap-4 mt-1">
              {/* {ata.municipio_image && (
                <img 
                  src={`${API_URL}${ata.municipio_image}`} 
                  alt={ata.municipio}
                  className="w-16 h-16 rounded object-cover"
                />
              )} */}
              <div className="text-sm md:text-md text-white/80 mt-0 flex flex-col ">
                <span className="flex items-center mb-1">
                  <FiMapPin className="mr-2" /> {ata.location}
                </span>
                <span className="flex items-center"> 
                  <FiCalendar className="mr-2" /> {formatDate(ata.date)} ({formatTime(ata.start_datetime)} - {formatTime(ata.end_datetime)})
                </span>
              </div>
            </div>
          </div>
          
          {/* Timeline Toggle Button (if enabled) */}
          {showTimelineButton && (
            <div className="flex-shrink-0">
              <TimelineToggleButton
                isVisible={timelineButtonProps?.isVisible}
                onToggle={onTimelineToggle}
                disabled={timelineButtonProps?.disabled}
                isLoading={timelineButtonProps?.isLoading}
              />
            </div>
          )}
        </div>
      </div>
      
      {/* Content Views */}
      <div className="bg-white">
        <AnimatePresence mode="wait">
          {/* General View - Two-column layout with main content and subjects */}
          <motion.div 
            key={`content-${ata.id}`}
            initial={{ 
              opacity: 0,
              x: direction === "left" ? 50 : direction === "right" ? -50 : 0
            }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ 
              opacity: 0,
              x: direction === "left" ? -50 : direction === "right" ? 50 : 0
            }}
            transition={{ duration: 0.3 }}
            className=""
          >
            {/* Content Section */}
            <div className="">
              <div className='container mx-auto p-6 bg-white dark:bg-sky-900'>
                {/* <div className='grid grid-cols-1 md:grid-cols-2 gap-6'> */}
                <div>
                  <AtaContent ata={ata} API_URL={API_URL} />
                  
                  {/* Ordem do Dia Section */}
                  {/* <div className='md:border-l md:border-sky-800/30 dark:border-white/50 md:pl-5'>
                    <h1 className="text-xl font-semibold text-sky-900 dark:text-white mb-4 flex items-center border-b-1 pb-1 pt-1 border-sky-800/30 dark:border-white/50">
                      <FiList className="mr-2" /> {t('day_order')}
                    </h1>
                  <AtaOrdemDoDia ordemDoDia={ata.ordemDoDia} />
                  </div> */}
                </div>
              </div>
              
              {/* Ordem do Dia Section */}
              {/* <div className='container mx-auto p-6 bg-white dark:bg-sky-900'>
                <h1 className="text-xl font-semibold text-sky-900 dark:text-white mb-4 flex items-center border-b-1 pb-1 border-sky-800/30 dark:border-white/50">
                  <FiList className="mr-2" /> {t('day_order')}
                </h1>
                <AtaOrdemDoDia ordemDoDia={ata.ordemDoDia} />
              </div> */}
              
              {/* Participants Section (if available) */}
              {ata.participantes?.length > 0 && (
                <div className='container mx-auto p-6 bg-white dark:bg-sky-900'>
                  <h1 className="text-xl font-semibold text-sky-900 dark:text-white mb-4 flex items-center border-b-1 pb-1 border-sky-800/30 dark:border-white/50">
                    <FiUsers className="mr-2" /> {t("participants")}
                  </h1>
                  <AtaParticipantes participantes={ata.participantes || []} />
                </div>
              )}
              
              {/* Voting Summary Section */}
              <div className='container mx-auto p-6 bg-white dark:bg-sky-900'>
                <h1 className="text-xl font-semibold text-sky-900 dark:text-white mb-4 flex items-center border-b-1 pb-1 border-sky-800/30 dark:border-white/50">
                  <FiPieChart className="mr-2" /> {t('voting_summary')}
                </h1>
                <div className=''>
                  <AtaVotingSummary ata={ata} assuntos={ata.assuntos} API_URL={API_URL} />
                </div>
              </div>

              {/* Assuntos Section */}
              {hasSubjects && (
                <div className='container mx-auto p-6 bg-white dark:bg-sky-900'>
                  <h1 className="text-xl font-semibold text-sky-900 dark:text-white mb-4 flex items-center border-b-1 pb-1 border-sky-800/30 dark:border-white/50">
                    <FiFolder className="mr-2" /> {ata.assuntos.length} {t("subjects_discussed")}
                  </h1>
                  <AtaAssuntos
                    assuntos={ata.assuntos || []} 
                    ataId={ata.id}
                    ataTitle={ata.title}
                    municipioId={ata.municipio_id}
                  />
                </div>
              )}

              {/* <div className='container mx-auto p-6 bg-white dark:bg-sky-900'>
                <h1 className="text-xl font-semibold text-sky-900 dark:text-white mb-4 flex items-center border-b-1 pb-1 border-sky-800/30 dark:border-white/50">
                  <FiList className="mr-2" /> {t("agenda_items")}
                </h1>
                <AtaOrdemDoDia
                  ordemDoDia={ata.ordem_do_dia || []} 
                  ataId={ata.id}
                  municipioId={ata.municipio_id}
                />
              </div> */}
            </div>
            
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AtaInformation;
