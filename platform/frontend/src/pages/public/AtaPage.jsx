import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Popover } from "flowbite-react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import AtaHeader from "../../components/PublicAtaPage/AtaHeader";
import AtaContent from "../../components/PublicAtaPage/AtaContent";
import LoadingState from "../../components/common/states/LoadingState";
import AtaErrorState from "../../components/PublicAtaPage/AtaErrorState";
import AtaVotingSummary from "../../components/PublicAtaPage/AtaVotingSummary"; 
import AtaParticipantes from "../../components/PublicAtaPage/AtaParticipantes";
import AtaAssuntos from "../../components/PublicAtaPage/AtaAssuntos";
import AtaOrdemDoDia from "../../components/PublicAtaPage/AtaOrdemDoDia";
import AtaTimeline from "../../components/PublicAtaPage/AtaTimeline";
import TimelineToggleButton from "../../components/Timeline/TimelineToggleButton";
import { FiBarChart, FiCalendar, FiChevronLeft, FiChevronRight, FiFileText, FiFolder, FiHome, FiList, FiMapPin, FiPieChart, FiUsers, FiCheckCircle, FiAlertTriangle } from "react-icons/fi";
import { RiFileChart2Fill } from "react-icons/ri";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import { format } from "date-fns";
import { useLastSeenMinute } from "../../hooks/useLastSeenMinute";
import LangLink from "../../components/common/LangLink";
import { useLangNavigate } from "../../hooks/useLangNavigate";
import { useToast } from "../../contexts/ToastProvider";

const AtaPage = () => {
  const { ataId } = useParams();
  const { t, i18n } = useTranslation();
  const navigate = useLangNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  const EXIT_ANIMATION_DURATION = 1500; // 1.5 seconds
  const MINIMUM_LOADING_TIME = 500; // 0.5 seconds minimum display time

  const position = location.state?.position || 0;
  const currentUrl = location.state?.currentUrl || "";

  const [ata, setAta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [error, setError] = useState(null);
  const [participantes, setParticipantes] = useState([]);
  const [assuntos, setAssuntos] = useState([]);
  const [direction, setDirection] = useState(null);
  const prevAtaIdRef = useRef(null);
  const [contentReady, setContentReady] = useState(false);
  const [isTimelineDisabled, setIsTimelineDisabled] = useState(false);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  
  // New state for timeline visibility
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  
  // State for scroll position to control badge positioning
  const [isScrolled, setIsScrolled] = useState(false);

   const formatDate = (dateString) => {
      if (!dateString) return t("unknown_date");
      try {
        return format(new Date(dateString), "dd/MM/yyyy");
      } catch (e) {
        return t("unknown_date");
      }
    };
  
      const formatTime = (dateString) => {
        try {
          return format(new Date(dateString), "HH:mm");
        } catch (e) {
          return "--:--";
        }
      };

  const fetchAtaDetails = async (id, fromTimeline = false) => {
    const startTime = Date.now();
    
    try {
      // Only show full loading state if not from timeline
      if (!fromTimeline) {
        setIsLoading(true);
        setShowLoadingState(true);
        setLoadingExiting(false);
        setContentReady(false);
      }
      
      const params = new URLSearchParams();
      if (position !== 0) params.set("position", position);
      if (currentUrl) params.set("current_url", currentUrl);
      const url = `${API_URL}/v0/public/atas/${id}${params.toString() ? `?${params.toString()}&demo=${DEMO_MODE}&lang=${i18n.language}` : `?demo=${DEMO_MODE}&lang=${i18n.language}`}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(response.status === 404 ? "Ata not found" : "Failed to fetch ata");
      }
      const data = await response.json();
      console.log(data);
      
      // Update ata data
      setAta(data);

      // Fetch participants if available
      if (data.participantes?.length > 0) {
        setParticipantes(data.participantes);
      } else {
        setParticipantes([]);
      }

      // Fetch subjects if available
      if (data.assuntos?.length > 0) {
        setAssuntos(data.assuntos);
      } else {
        setAssuntos([]);
      }

      // If from timeline, just update the data without loading states
      if (fromTimeline) {
        return Promise.resolve();
      }

      setIsLoading(false);
      
      const loadingTime = Date.now() - startTime;
      const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
      setTimeout(() => {
        setContentReady(true); 
        setLoadingExiting(true); 
        
        setTimeout(() => {
          setShowLoadingState(false); 
        }, EXIT_ANIMATION_DURATION);
      }, additionalDelay);
      
      if (data.human_validated === false){
        addToast({
           message: t('content_not_validated_message'),
           type: "warning",
           duration: 5000,
         });
      }

    } catch (error) {
      console.error("Error fetching ata details:", error);
      setError(error.message);
      
      // If from timeline, just set error without loading states
      if (fromTimeline) {
        return Promise.reject(error);
      }
      
      // Calculate elapsed time for error case too
      const loadingTime = Date.now() - startTime;
      const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
      
      setTimeout(() => {
        setIsLoading(false);
        setContentReady(true);
        setLoadingExiting(true);
        
        setTimeout(() => {
          setShowLoadingState(false);
        }, EXIT_ANIMATION_DURATION);
      }, additionalDelay);
    }
  };

  // Handle timeline toggle
  const handleTimelineToggle = () => {
    if (isTimelineDisabled) return;
    setIsTimelineVisible(!isTimelineVisible);
  };

  useEffect(() => {
    if (prevAtaIdRef.current && ataId !== prevAtaIdRef.current) {
      const state = location.state || {};
      setDirection(state.direction || null);
    }
    
    prevAtaIdRef.current = ataId;
    fetchAtaDetails(ataId);
    
  }, [ataId, API_URL, location]);

  // Handle scroll for validation badge positioning
  useEffect(() => {
    const toggleScrolled = () => {
      if (window.pageYOffset > 300) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', toggleScrolled);
    return () => window.removeEventListener('scroll', toggleScrolled);
  }, []);

  useEffect(() => {
    if (ata) {
      // document.title = `${ata.municipio} - ${ata.slug} | CitiLink`;
      document.title = `${ata.title} - ${ata.municipio} | CitiLink`;
    } else {
      document.title = `${t("minute")} | CitiLink`;
    }
  }, [ata]);

  return (
    <div className="min-h-screen bg-white">
      {/* Show content when it's ready - only when exit animation starts */}
      {contentReady && (
        <>
          <div className="">
            <Navbar />
            
            {/* Show error if needed */}
            {error && !showLoadingState && <AtaErrorState />}

            {/* Sticky Validation Badge - Desktop (Bottom right, like scroll button) */}
            {ata && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    // Move up when scroll button appears
                    bottom: isScrolled ? '96px' : '32px'
                  }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="fixed right-8 z-50"
                  style={{ bottom: isScrolled ? '96px' : '32px' }}
                >
                  <Popover
                    content={
                      <div className="p-3 max-w-sm text-xs font-montserrat">
                        <h3 className={`text-xs font-medium mb-0 ${
                          ata.human_validated ? 'text-green-800' : 'text-amber-800'
                        }`}>
                          {ata.human_validated ? t('content_validated') : t('content_not_validated')}
                        </h3>
                        <p className={`text-xs ${
                          ata.human_validated ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {ata.human_validated 
                            ? t('content_validated_message')
                            : t('content_not_validated_message')
                          }
                        </p>
                      </div>
                    }
                    trigger="click"
                    placement="left"
                  >
                    <div className={`p-3.5 rounded-md text-base font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 shadow-lg ${
                      ata.human_validated 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}>
                      {ata.human_validated ? (
                        <FiCheckCircle size={20} />
                      ) : (
                        <FiAlertTriangle size={20} />
                      )}
                    </div>
                  </Popover>
                </motion.div>
              </AnimatePresence>
            )}

            {/* Sticky Validation Badge - Mobile (Bottom center, like scroll button) */}
            {/* {ata && (
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    bottom: isScrolled ? '140px' : '16px'
                  }}
                  exit={{ opacity: 0, y: 20 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="md:hidden fixed left-1/2 transform -translate-x-1/2 z-50"
                  style={{ bottom: isScrolled ? '140px' : '16px' }}
                >
                  <Popover
                    content={
                      <div className="p-3 max-w-sm">
                        <h3 className={`text-sm font-medium mb-2 ${
                          ata.human_validated ? 'text-green-800' : 'text-amber-800'
                        }`}>
                          {ata.human_validated ? t('content_validated') : t('content_not_validated')}
                        </h3>
                        <p className={`text-sm ${
                          ata.human_validated ? 'text-green-700' : 'text-amber-700'
                        }`}>
                          {ata.human_validated 
                            ? t('content_validated_message')
                            : t('content_not_validated_message')
                          }
                        </p>
                      </div>
                    }
                    trigger="click"
                    placement="top"
                  >
                    <div className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 cursor-pointer transition-all duration-200 hover:opacity-80 shadow-lg ${
                      ata.human_validated 
                        ? 'bg-green-500 text-white hover:bg-green-600' 
                        : 'bg-amber-500 text-white hover:bg-amber-600'
                    }`}>
                      {ata.human_validated ? (
                        <FiCheckCircle className="w-4 h-4" />
                      ) : (
                        <FiAlertTriangle className="w-4 h-4" />
                      )}
                      <span className="text-xs">{ata.human_validated ? t('content_validated') : t('content_not_validated')}</span>
                    </div>
                  </Popover>
                </motion.div>
              </AnimatePresence>
            )} */}

            {/* page header */}
            <div 
              className="bg-sky-800 pt-15 pb-4"
            >
              <div className="container mx-auto px-4">
                <motion.div 
                  className="flex flex-col justify-center"
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                >
                  {/* breadcrumb */}
                  <AnimatePresence>
                    <motion.div 
                      className="hidden sm:flex items-center pb-4"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
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
                              to="/municipios"
                              className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                              after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                            >
                              {t("counties")}
                            </LangLink>
                          </li>
                          <li className="flex items-center">
                            <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                            <LangLink
                              to={`/municipios/${ata.municipio_slug}`}
                              className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                              after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                            >
                              {ata.municipio}
                            </LangLink>
                          </li>
                          {/* Current page */}
                          <li className="flex items-center">
                            <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                            <span className="text-white font-medium truncate">
                              {ata.slug}
                            </span>
                          </li>
                        </ol>
                      </nav>
                    </motion.div>
                  </AnimatePresence>

                  {/* header with county image */}
                  <div 
                    className="flex flex-col items-center sm:flex-row gap-x-4 gap-y-0"
                  >
                    {/* county image */}
                    {ata.municipio_image && (
                      <div className="flex items-center justify-center sm:justify-start mb-0 sm:mb-0 flex-shrink-0">
                        <motion.div 
                          className="rounded-md overflow-hidden flex-shrink-0"
                          animate={{
                            width: isTimelineVisible ? '4rem' : '4rem',
                            height: isTimelineVisible ? '4rem' : '4rem',
                            minWidth: isTimelineVisible ? '4rem' : '4rem',
                            minHeight: isTimelineVisible ? '4rem' : '4rem'
                          }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        >
                          <img 
                            src={API_URL + ata.municipio_image}
                            alt={ata.municipio} 
                            className="object-cover w-full h-full"
                            loading="lazy"
                          />
                        </motion.div>
                      </div>
                    )}
                    
                    {/* title & description */}
                    <div className="flex flex-col items-center sm:items-start font-montserrat text-white">
                       <div className="flex flex-col md:flex-row items-center gap-0 md:gap-3 mb-1">
                         <h1 className="text-center md:text-start text-xl md:text-xl font-semibold mt-2 md:mt-0">{ata.title}</h1>
                       </div>
                        <div className="flex items-center gap-4 mt-0">
                          <div className="text-xs text-white/80 mt-0 flex flex-col ">
                            <span className="flex items-center mb-1">
                              {/* locaton */}
                              <FiMapPin  className="mr-2" /> {ata.location}
                            </span>
                            <span className="flex items-center text-xs"> 
                              <FiCalendar className="mr-2" /> {formatDate(ata.date)} ({formatTime(ata.start_datetime)} - {formatTime(ata.end_datetime)})
                            </span>
                          </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>

            {/* ata */}
            {!isTimelineLoading && (
              <div className="container mx-auto pt-4">
                <div className="">
                  {/* <AnimatePresence mode="wait">
                    {ata && (
                      <motion.div
                        key={`header-${ata.id}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="shadow-md rounded-md"
                      >
                        <AtaHeader
                          ata={ata}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence> */}
                
                <div className="bg-white">
                  <div className="container mx-auto">
                      <div className="font-montserrat">
                      <AnimatePresence mode="wait">
                        {ata && (
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
                            className="pb-8"
                          >
                            {/* content */}
                            <div className='container mx-auto p-6 pt-2'>
                              <div className='grid grid-cols-1 md:grid-cols-1 gap-6'>
                                <AtaContent ata={ata} API_URL={API_URL} />
                              </div>
                            </div>

                            {/* participants */}
                            <div className="p-6  font-montserrat">
                            <h1 className="text-xl font-semibold text-sky-900 mb-4 flex items-center border-b-1 border-sky-700/30 pb-2">
                              <FiUsers className="mr-2"/> {t("participants")}
                            </h1>
                              <AtaParticipantes participantes={participantes} />
                            </div>
                            
                            {/* voting */}
                            <div className="p-6 ">
                              <h1 className="text-xl font-semibold text-sky-900 mb-4 flex items-center border-b-1 border-sky-700/30 pb-2">
                                <FiBarChart className="mr-2" /> {t('voting_summary')}
                              </h1>
                              <AtaVotingSummary ata={ata} assuntos={assuntos} />
                            </div>

                            {ata && assuntos.length > 0 && (
                            <div className="p-6 ">
                              <h1 className="text-xl font-semibold text-sky-900 mb-4 flex items-center border-b-1 border-sky-700/30 pb-2">
                                <FiFolder className="mr-2" /> {assuntos.length} {t("subjects_discussed")}
                              </h1>
                              <AtaAssuntos
                                assuntos={assuntos} 
                                ataId={ata.id}
                                municipioId={ata.municipio_id}
                              />
                            </div>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
                </div>
              </div>
            )}
          </div>
      
      
        <Footer />
      </>
    )}

      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaPage;