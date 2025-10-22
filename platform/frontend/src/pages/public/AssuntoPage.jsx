import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { getTopicoIcon } from "../../utils/iconMappers";
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiCheck, 
  FiX, 
  FiFileText, 
  FiUsers,
  FiFolder,
  FiUser,
  FiUserCheck,
  FiInfo,
  FiChevronRight,
  FiHome,
  FiBarChart2
} from "react-icons/fi";

import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import LoadingState from "../../components/common/states/LoadingState";
import { FaLandmark } from "react-icons/fa";
import { useInView } from "react-intersection-observer";
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import LangLink from "../../components/common/LangLink";
import { useLangNavigate } from "../../hooks/useLangNavigate";

const AssuntoPage = () => {
  const { subjectId } = useParams();
  const { t } = useTranslation();
  const navigate = useLangNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE || "0";
  
  const EXIT_ANIMATION_DURATION = 1500; // 1.5 seconds
  const MINIMUM_LOADING_TIME = 500; // 0.5 seconds minimum display time
  
  const [assunto, setAssunto] = useState(null);
  const [votos, setVotos] = useState(null);
  const [voteDetails, setVoteDetails] = useState(null);
  const [county, setCounty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [visibleSections, setVisibleSections] = useState({
    favor: false,
    contra: false,
    abstencao: false
  });

  // Set up intersection observer for sections
  const { ref: favorRef, inView: favorInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const { ref: contraRef, inView: contraInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  const { ref: abstencaoRef, inView: abstencaoInView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

    // Update visible sections when they come into view
    useEffect(() => {
      if (favorInView) {
        setVisibleSections(prev => ({ ...prev, favor: true }));
      }
    }, [favorInView]);
  
    useEffect(() => {
      if (contraInView) {
        setVisibleSections(prev => ({ ...prev, contra: true }));
      }
    }, [contraInView]);
  
    useEffect(() => {
      if (abstencaoInView) {
        setVisibleSections(prev => ({ ...prev, abstencao: true }));
      }
    }, [abstencaoInView]);
  
  // Animation state
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      // Record start time for calculating minimum display duration
      const startTime = Date.now();
      
      try {
        setIsLoading(true);
        setShowLoadingState(true);
        setLoadingExiting(false);
        setContentReady(false);
        
        // Fetch related data in parallel
        const assuntosResponse = await fetch(`${API_URL}/v0/public/assuntos/${subjectId}?demo=${DEMO_MODE}`);
        
        if (!assuntosResponse.ok) {
          throw new Error("Failed to fetch related data");
        }
        
        const assuntoData = await assuntosResponse.json();
        
        setAssunto(assuntoData);
        
        // Process votes into categories
        const voteDetails = {
          favor: [],
          contra: [],
          abstencao: []
        };
        
        if (assuntoData.votos && Array.isArray(assuntoData.votos)) {
          assuntoData.votos.forEach((voto) => {
            const sentido = voto.sentido || voto.tipo; // Support both field names
            if (sentido === "favor") {
              voteDetails.favor.push(voto);
            } else if (sentido === "contra") {
              voteDetails.contra.push(voto);
            } else if (sentido === "abstencao") {
              voteDetails.abstencao.push(voto);
            }
          });
        }
        
        setVoteDetails(voteDetails);
        
        const countyResponse = await fetch(`${API_URL}/v0/public/municipios/${assuntoData.municipio.id}?demo=${DEMO_MODE}`);
        if (!countyResponse.ok) {
          throw new Error("County not found");
        }
        const countyData = await countyResponse.json();
        setCounty(countyData);
        console.log("County data fetched:", countyData);
        
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
        
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
        
        // Calculate elapsed time for error case too
        const loadingTime = Date.now() - startTime;
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        
        setTimeout(() => {
          setIsLoading(false);
          // Show content and start exit animation at the same time
          setContentReady(true);
          setLoadingExiting(true);
          
          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay);
      }
    };
    
    fetchData();
  }, [subjectId, API_URL]);
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return t("unknown_date");
    }
  };

  
  const getVotingBadge = () => {
    if (assunto.aprovado === undefined) return null;
    
    return (
      <span className={`inline-flex items-start px-3 py-1 rounded-md text-xl font-medium ${
        assunto.aprovado 
          ? " text-emerald-300" 
          : " text-rose-800"
      }`}>
        {assunto.aprovado 
          ? <><FiCheck className=""  /></> 
          : <><FiX className=""  /></>}
      </span>
    );
  };
  
  if (error || (!isLoading && (!assunto || !county))) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 py-24">
          <div className="max-w-xl mx-auto bg-white shadow-md rounded-lg p-8 text-center">
            <h1 className="text-2xl font-bold text-rose-600">{t("subject_not_found")}</h1>
            <p className="mt-4 text-gray-600">{t("subject_not_found_desc")}</p>
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center mt-6 px-4 py-2 bg-sky-800 text-white rounded-md hover:bg-sky-900 transition-colors"
            >
              <FiChevronLeft className="mr-2" /> {t("go_back")}
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Calculate total votes
  const totalVotes = assunto ? (assunto.votos_favor || 0) + (assunto.votos_contra || 0) + (assunto.abstencoes || 0) : 0;
  const hasVotes = totalVotes > 0;
  const isUnanimous = hasVotes && assunto && assunto.votos_favor > 0 && assunto.votos_contra === 0 && assunto.abstencoes === 0;
  
  return (
    <div className="min-h-screen bg-gray-50 font-montserrat">
      {/* Show content when it's ready - only when exit animation starts */}
      {contentReady && (
        <>
          <Navbar />

          {/* Header Section - styled like AtaPage */}
          <div className="bg-sky-800 pt-15 pb-4 font-montserrat">
            <div className="container mx-auto px-4">
              <div className="flex flex-col justify-center">
                {/* Breadcrumb */}
                <div className="hidden sm:flex items-center pb-4">
                  <nav className="flex items-center text-sm font-montserrat bg-sky-700 rounded-md px-4 py-1" aria-label="Breadcrumb">
                    <ol className="flex flex-wrap items-center">
                      <li className="flex items-center">
                        <LangLink
                          to="/"
                          className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                        >
                          <FiHome />
                        </LangLink>
                      </li>
                      <li className="flex items-center">
                        <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                        <LangLink
                          to={`/municipios/${county.id}`}
                          className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                        >
                          {county.name}
                        </LangLink>
                      </li>
                      <li className="flex items-center text-white">
                        <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                         {assunto.topico.title}
                      </li>
                      <li className="flex items-center text-white">
                        <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                        {t("subject")}
                      </li>
                      <li className="collapse sm:visible sm:flex sm:items-center ">
                        <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                        <span className="text-white font-medium truncate max-w-[250px]">
                          {assunto.title}
                        </span>
                      </li>
                    </ol>
                  </nav>
                </div>

                {/* Header with county image and subject info */}
                <div className="flex flex-col items-center sm:flex-row gap-x-4 gap-y-0">
                  {/* County image if available */}
                  {county.squaredImageUrl && (
                    <div className="flex items-center justify-center sm:justify-start mb-0 sm:mb-0 flex-shrink-0">
                      <div className="rounded-md overflow-hidden flex-shrink-0 w-16 h-16 min-w-16 min-h-16">
                        <img 
                          src={`${API_URL}${county.squaredImageUrl}`}
                          alt={county.name}
                          className="object-cover w-full h-full" />
                      </div>
                    </div>
                  )}
                  {/* Title & description */}
                  <div className="flex flex-col items-center sm:items-start">
                    <h1 
                      className="font-bold text-white font-montserrat mb-0 text-2xl text-center sm:text-left"
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      {county.name}
                    </h1>
                    
                    <AnimatePresence>
                      <motion.p 
                        className="text-sm md:text-base text-sky-50 italic leading-relaxed text-center sm:text-left font-montserrat"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.4, ease: "easeInOut" }}
                      >
                        Lista de Assuntos
                      </motion.p>
                    </AnimatePresence>
                  </div>
                </div>
              </div>
              
            </div>
          </div>

          <div className="container mx-auto px-4 py-8 pt-4">
            <div className="shadow-md rounded-md">

            <div className="bg-sky-700 pt-8 pb-6 px-6 font-montserrat relative rounded-t-md">
                     {/* Title and meta */}
                     <h1 className="text-xl md:text-2xl font-semibold text-white mb-2 flex flex-col items-start">
                       <span>{assunto.title}</span>
                     </h1>
                     <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80 text-sm">
                       <div className="flex flex-col gap-1 gap-y-0">
                         <LangLink 
                           to={`/municipios/${assunto.municipio.id}`}
                           className="flex items-center text-white/80 hover:text-white transition-colors duration-300"
                         >
                         <span className="flex items-center">
                           <FaLandmark className="mr-2" /> {assunto.municipio ? assunto.municipio.name : ""}
                         </span>
                         </LangLink>
                         <span className="flex items-center">
                           <FiCalendar className="mr-2" /> {assunto.ata && assunto.ata.date ? formatDate(assunto.ata.date) : t("unknown_date")}
                         </span>
                         <span className="flex items-center">
                           {getTopicoIcon(assunto.topico.title, "mr-2")} {assunto.topico.title}
                          </span>
                       </div>
                     </div>
                   </div>
                   {/* The rest of the modal remains unchanged, starting from the main content grid/div */}
                   <div className="bg-white grid grid-cols-1 font-montserrat rounded-b-md">
                     {/* Main Content */}
                     <div className="">
                       {/* Subject Description */}
                       <div className="p-6">
                         <h1 className="text-lg font-semibold text-sky-800 flex items-center border-b border-sky-700/30 pb-2">
                           <FiFileText className="mr-2" /> {t("description")}
                         </h1>
                         {assunto.deliberacao ? (
                           <div className="text-justify max-w-none text-gray-700 font-raleway bg-gray-50 p-3 border-b-2 border-gray-200">
                             <p>{assunto.deliberacao}</p>
                           </div>
                         ) : (
                           <p className="text-gray-500 italic">{t("no_summary_available")}</p>
                         )}
                       </div>
           
                       {/* Voting Details */}
                       {hasVotes && voteDetails && (
                         <div className="p-6 font-montserrat">
                          <h1 className="text-lg font-semibold text-sky-800 mb-4 flex items-center border-b border-sky-700/30 pb-2">
                             <FiUserCheck className="mr-2" /> {t("voting_distribution")}
                           </h1>
           
                           {/* Vote Progress Bar */}
                           <div className="h-8 bg-gray-100 rounded-md overflow-hidden mb-2">
                             <div 
                               className="h-full bg-emerald-500 float-left"
                               style={{ width: `${(assunto.votos_favor / totalVotes) * 100}%` }}
                             />
                             <div 
                               className="h-full bg-rose-600 float-left"
                               style={{ width: `${(assunto.votos_contra / totalVotes) * 100}%` }}
                             />
                             <div 
                               className="h-full bg-gray-400/70 float-left"
                               style={{ width: `${(assunto.abstencoes / totalVotes) * 100}%` }}
                             />
                           </div>
           
                           {/* Vote Legend */}
                           <div className="flex justify-between align-top">
                               <div className="flex flex-col mb-6">
                               <div className="flex items-center">
                                   <div className="w-3.5 h-3.5 bg-emerald-500 rounded-sm mr-2"></div>
                                   <span className="text-sm text-gray-600">{t("in_favor")}: {assunto.votos_favor || 0}</span>
                               </div>
                               <div className="flex items-center">
                                   <div className="w-3.5 h-3.5 bg-rose-600 rounded-sm mr-2"></div>
                                   <span className="text-sm text-gray-600">{t("against")}: {assunto.votos_contra || 0}</span>
                               </div>
                               <div className="flex items-center">
                                   <div className="w-3.5 h-3.5 bg-gray-400/70 rounded-sm mr-2"></div>
                                   <span className="text-sm text-gray-600">{t("abstentions")}: {assunto.abstencoes || 0}</span>
                               </div>
                               </div>
                               
                               {/* Voting Result */}
                               <div className="flex flex-col items-end gap-1">
                                   <div className={`px-4 py-1 rounded-md text-sm font-medium inline-flex items-center ${
                                       assunto.aprovado 
                                       ? "bg-green-100 text-green-800" 
                                       : "bg-red-100 text-red-800"
                                   }`}>
                                       {assunto.aprovado 
                                       ? <><FiCheck className="mr-2" /> {t("approved")}</> 
                                       : <><FiXIcon className="mr-2" /> {t("rejected")}</>}
                                   </div>
                                   {/* unanimous vote */}
                                   {isUnanimous && (
                                       <div className="px-4 py-1 rounded-md text-sm font-medium inline-flex items-center bg-sky-700/20 text-gray-700">
                                           {t("unanimous_vote")}
                                       </div>
                                   )}
                               </div>
                           </div>
           
           
                           {/* Detailed Vote Information */}
                           <div className="mt-6 font-montserrat">
                             <h2 className="text-lg font-semibold text-gray-800 mb-6 flex items-center">
                               <FiUsers className="mr-2" /> {t("individual_votes")}
                             </h2>
                             {/* In Favor Section */}
                             {(voteDetails.favor && voteDetails.favor.length > 0) && (
                               <div className="mb-8" ref={favorRef}>
                                 <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center lowercase">
                                   <div className="w-3.5 h-3.5 bg-emerald-500 rounded-sm mr-2"></div>
                                   {assunto.votos_favor || 0} {t("votes_in_favor")}
                                 </h3>
                                 
                                 {/* Desktop View */}
                                 <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-montserrat">
                                   {visibleSections.favor && voteDetails.favor.map((voto, idx) => (
                                     <motion.div 
                                       key={idx}
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                                       className="flex flex-col items-center border-b-4 border-b-emerald-500/10 hover:border-emerald-500 rounded-t-md hover:shadow-sm p-4 transition-colors duration-300"
                                     >
                                       {/* Participant Image */}
                                       <div className="mb-3">
                                         {voto.participante && voto.participante.profile_photo ? (
                                           <img 
                                             className="h-28 w-28 rounded-md object-cover" 
                                             src={`${API_URL}/${voto.participante.profile_photo}`}
                                             alt={voto.participante.name} 
                                           />
                                         ) : (
                                           <div className="h-28 w-28 rounded-md bg-green-50 flex items-center justify-center border-2 border-green-200">
                                             <FiUser className="text-emerald-500 h-8 w-8" />
                                           </div>
                                         )}
                                       </div>
                                       
                                       <h3 className="font-medium text-sm text-gray-800 px-2 rounded-md text-center">
                                         {voto.participante && voto.participante.name}
                                       </h3>
                                       
                                       <div className="flex flex-wrap justify-center gap-2 items-center">
                                         {voto.participante && voto.participante.role && (
                                           <div className="text-xs font-raleway text-gray-600 font-raleway text-center">
                                             {voto.participante.role}
                                           </div>
                                         )}
                                         
                                         {voto.participante && voto.participante.party && (
                                           <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(voto.participante.party)}`}>
                                             {voto.participante.party}
                                           </span>
                                         )}
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
           
                                 {/* Mobile View */}
                                 <div className="sm:hidden grid grid-cols-1 gap-4 font-montserrat">
                                   {visibleSections.favor && voteDetails.favor.map((voto, idx) => (
                                     <motion.div 
                                       key={idx}
                                       initial={{ opacity: 0, x: -20 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                                       className="border-b-2 border-emerald-500/20 pb-2 flex items-start"
                                     >
                                       {/* Participant Image */}
                                       <div className="flex-shrink-0 mr-3">
                                         {voto.participante && voto.participante.profile_photo ? (
                                           <img 
                                             className="w-12 h-12 rounded-sm object-cover" 
                                             src={`${API_URL}/${voto.participante.profile_photo}`}
                                             alt={voto.participante.name} 
                                           />
                                         ) : (
                                           <div className="w-12 h-12 rounded-sm bg-green-50 flex items-center justify-center border-2 border-green-200">
                                             <FiUser className="text-emerald-500 h-6 w-6" />
                                           </div>
                                         )}
                                       </div>
                                       
                                       {/* Participant Details */}
                                       <div className="flex-grow">
                                         <div className="flex justify-between items-start">
                                           <h4 className="font-medium text-md text-gray-800">{voto.participante && voto.participante.name}</h4>
                                           {voto.participante && voto.participante.party && (
                                             <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(voto.participante.party)}`}>
                                               {voto.participante.party}
                                             </span>
                                           )}
                                         </div>
                                         {voto.participante && voto.participante.role && (
                                           <p className="text-sm text-gray-600 font-raleway mt-0">{voto.participante.role}</p>
                                         )}
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
                               </div>
                             )}
           
                             {/* Against Section */}
                             {(voteDetails.contra && voteDetails.contra.length > 0) && (
                               <div className="mb-8" ref={contraRef}>
                                 <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center lowercase">
                                   <div className="w-3.5 h-3.5 bg-rose-600 rounded-sm mr-2"></div>
                                   {assunto.votos_contra || 0} {t("votes_against")}
                                 </h3>
                                 
                                 {/* Desktop View */}
                                 <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-montserrat">
                                   {visibleSections.contra && voteDetails.contra.map((voto, idx) => (
                                     <motion.div 
                                       key={idx}
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                                       className="flex flex-col items-center border-b-4 border-b-rose-600/10 hover:border-rose-600 rounded-t-md hover:shadow-sm p-4 transition-colors duration-300"
                                     >
                                       {/* Participant Image */}
                                       <div className="mb-3">
                                         {voto.participante && voto.participante.profile_photo ? (
                                           <img 
                                             className="h-28 w-28 rounded-md object-cover" 
                                             src={`${API_URL}/${voto.participante.profile_photo}`}
                                             alt={voto.participante.name} 
                                           />
                                         ) : (
                                           <div className="h-28 w-28 rounded-md bg-red-50 flex items-center justify-center border-2 border-red-200">
                                             <FiUser className="text-red-500 h-8 w-8" />
                                           </div>
                                         )}
                                       </div>
                                       
                                       <h3 className="font-medium text-sm text-gray-800 px-2 rounded-md text-center">
                                         {voto.participante && voto.participante.name}
                                       </h3>
                                       
                                       <div className="flex flex-wrap justify-center gap-2 items-center">
                                         {voto.participante && voto.participante.role && (
                                           <div className="text-xs font-raleway text-gray-600 font-raleway text-center">
                                             {voto.participante.role}
                                           </div>
                                         )}
                                         
                                         {voto.participante && voto.participante.party && (
                                           <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(voto.participante.party)}`}>
                                             {voto.participante.party}
                                           </span>
                                         )}
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
           
                                 {/* Mobile View */}
                                 <div className="sm:hidden grid grid-cols-1 gap-4 font-montserrat">
                                   {visibleSections.contra && voteDetails.contra.map((voto, idx) => (
                                     <motion.div 
                                       key={idx}
                                       initial={{ opacity: 0, x: -20 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                                       className="border-b-2 border-red-500/20 pb-2 flex items-start"
                                     >
                                       {/* Participant Image */}
                                       <div className="flex-shrink-0 mr-3">
                                         {voto.participante && voto.participante.profile_photo ? (
                                           <img 
                                             className="w-12 h-12 rounded-sm object-cover" 
                                             src={`${API_URL}/${voto.participante.profile_photo}`}
                                             alt={voto.participante.name} 
                                           />
                                         ) : (
                                           <div className="w-12 h-12 rounded-sm bg-red-50 flex items-center justify-center border-2 border-red-200">
                                             <FiUser className="text-red-500 h-6 w-6" />
                                           </div>
                                         )}
                                       </div>
                                       
                                       {/* Participant Details */}
                                       <div className="flex-grow">
                                         <div className="flex justify-between items-start">
                                           <h4 className="font-medium text-md text-gray-800">{voto.participante && voto.participante.name}</h4>
                                           {voto.participante && voto.participante.party && (
                                             <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(voto.participante.party)}`}>
                                               {voto.participante.party}
                                             </span>
                                           )}
                                         </div>
                                         {voto.participante && voto.participante.role && (
                                           <p className="text-sm text-gray-600 font-raleway mt-0">{voto.participante.role}</p>
                                         )}
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
                               </div>
                             )}
           
                             {/* Abstentions Section */}
                             {(voteDetails.abstencao && voteDetails.abstencao.length > 0) && (
                               <div className="mb-8" ref={abstencaoRef}>
                                 <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center lowercase">
                                   <div className="w-3.5 h-3.5 bg-gray-400/70 rounded-sm mr-2"></div>
                                   {assunto.abstencoes || 0} {t("votes_abstained")}
                                 </h3>
                                 
                                 {/* Desktop View */}
                                 <div className="hidden sm:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-montserrat">
                                   {visibleSections.abstencao && voteDetails.abstencao.map((voto, idx) => (
                                     <motion.div 
                                       key={idx}
                                       initial={{ opacity: 0, y: 20 }}
                                       animate={{ opacity: 1, y: 0 }}
                                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                                       className="flex flex-col items-center border-b-4 border-b-gray-400/10 hover:border-gray-400/70 rounded-t-md hover:shadow-sm p-4 transition-colors duration-300"
                                     >
                                       {/* Participant Image */}
                                       <div className="mb-3">
                                         {voto.participante && voto.participante.profile_photo ? (
                                           <img 
                                             className="h-28 w-28 rounded-md object-cover" 
                                             src={`${API_URL}/${voto.participante.profile_photo}`}
                                             alt={voto.participante.name} 
                                           />
                                         ) : (
                                           <div className="h-28 w-28 rounded-md bg-gray-50 flex items-center justify-center border-2 border-gray-200">
                                             <FiUser className="text-gray-400 h-8 w-8" />
                                           </div>
                                         )}
                                       </div>
                                       
                                       <h3 className="font-medium text-sm text-gray-800 px-2 rounded-md text-center">
                                         {voto.participante && voto.participante.name}
                                       </h3>
                                       
                                       <div className="flex flex-wrap justify-center gap-2 items-center">
                                         {voto.participante && voto.participante.role && (
                                           <div className="text-xs font-raleway text-gray-600 font-raleway text-center">
                                             {voto.participante.role}
                                           </div>
                                         )}
                                         
                                         {voto.participante && voto.participante.party && (
                                           <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(voto.participante.party)}`}>
                                             {voto.participante.party}
                                           </span>
                                         )}
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
           
                                 {/* Mobile View */}
                                 <div className="sm:hidden grid grid-cols-1 gap-4 font-montserrat">
                                   {visibleSections.abstencao && voteDetails.abstencao.map((voto, idx) => (
                                     <motion.div 
                                       key={idx}
                                       initial={{ opacity: 0, x: -20 }}
                                       animate={{ opacity: 1, x: 0 }}
                                       transition={{ duration: 0.3, delay: idx * 0.1 }}
                                       className="border-b-2 border-gray-200 pb-2 flex items-start"
                                     >
                                       {/* Participant Image */}
                                       <div className="flex-shrink-0 mr-3">
                                         {voto.participante && voto.participante.profile_photo ? (
                                           <img 
                                             className="w-12 h-12 rounded-sm object-cover" 
                                             src={`${API_URL}/${voto.participante.profile_photo}`}
                                             alt={voto.participante.name} 
                                           />
                                         ) : (
                                           <div className="w-12 h-12 rounded-sm bg-gray-50 flex items-center justify-center border-2 border-gray-200">
                                             <FiUser className="text-gray-400 h-6 w-6" />
                                           </div>
                                         )}
                                       </div>
                                       
                                       {/* Participant Details */}
                                       <div className="flex-grow">
                                         <div className="flex justify-between items-start">
                                           <h4 className="font-medium text-md text-gray-800">{voto.participante && voto.participante.name}</h4>
                                           {voto.participante && voto.participante.party && (
                                             <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(voto.participante.party)}`}>
                                               {voto.participante.party}
                                             </span>
                                           )}
                                         </div>
                                         {voto.participante && voto.participante.role && (
                                           <p className="text-sm text-gray-600 font-raleway mt-0">{voto.participante.role}</p>
                                         )}
                                       </div>
                                     </motion.div>
                                   ))}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       )}
           
                       {/* Minute Information */}
                        <div className="bg-gray-100 p-6 rounded-b-md">
                         <h1 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                           <FiInfo className="mr-2" /> {t("meeting_information")}
                         </h1>
                         
                         <div className="space-y-4">
                           <div>
                             <h1 className="text-sm font-medium text-gray-500 flex items-center">
                               <FiFileText className="mr-2" /> {t("minute")}
                             </h1>
                             <p className="text-gray-800 mt-1">
                               {assunto.ata.title}
                             </p>
                           </div>
                           
                           <div>
                             <h1 className="text-sm font-medium text-gray-500 flex items-center">
                               <FiCalendar className="mr-2" /> {t("date")}
                             </h1>
                             <p className="text-gray-800 mt-1">{formatDate(assunto.ata.date)}</p>
                           </div>
                           
                           <div>
                             <h1 className="text-sm font-medium text-gray-500 flex items-center">
                               <FaLandmark className="mr-2" /> {t("county")}
                             </h1>
                             <p className="text-gray-800 mt-1">
                               {assunto.municipio.name}
                             </p>
                           </div>
                         </div>
                       </div>
                     </div>
                   </div>
            </div>
          </div>
          <Footer />
        </>
      )}
      
      {/* Loading state */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssuntoPage;