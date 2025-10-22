import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { 
  FiX, 
  FiCalendar, 
  FiFileText, 
  FiUsers, 
  FiUser,
  FiUserCheck,
  FiInfo,
  FiCheck,
  FiX as FiXIcon,
  FiHome,
  FiChevronRight,
  FiShare2
} from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import LoadingSpinner from "../common/LoadingSpinner";
import { getTopicoIcon } from "../../utils/iconMappers";
import { Link } from "react-router-dom";
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import LangLink from "../common/LangLink";

const AssuntoModal = ({ assuntoId, onClose, API_URL, position, currentUrl }) => {
  const { t, i18n } = useTranslation();
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  const [assunto, setAssunto] = useState(null);
  const [voteDetails, setVoteDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
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

  // Add ESC key handler
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscKey);
    return () => {
      window.removeEventListener('keydown', handleEscKey);
    };
  }, [onClose]);

  useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => {
    document.body.style.overflow = "";
  };
}, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);

        const params = new URLSearchParams();
        if (position !== 0) params.set("position", position);
        if (currentUrl) params.set("current_url", currentUrl);
        const url = `${API_URL}/v0/public/assuntos/${assuntoId}${params.toString() ? `?${params.toString()}&demo=${DEMO_MODE}&lang=${i18n.language}` : `?demo=${DEMO_MODE}&lang=${i18n.language}`}`;
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch subject details");
        }
        
        const data = await response.json();
        console.log(data);
        setAssunto(data);
        
        // Process votes into categories
        const voteDetails = {
          favor: [],
          contra: [],
          abstencao: []
        };
        
        if (data.votos && Array.isArray(data.votos)) {
          data.votos.forEach((voto) => {
            const sentido = voto.sentido || voto.tipo;
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
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching subject details:", error);
        setError(error.message);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [assuntoId, API_URL]);

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return "Data desconhecida";
    }
  };

  // Handle share button click
  const handleShare = () => {
    if (!assunto || !assunto.ata) return;
    
    // Get current language
    const lang = i18n.language;
    const langPrefix = lang === 'en' ? '/en' : '';
    
    // Build the shareable URL with the assunto ID as query parameter
    const shareUrl = `${window.location.origin}${langPrefix}/atas/${assunto.ata.slug}?assunto=${assuntoId}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 3000);
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };  // Calculate total votes
  const totalVotes = assunto ? (assunto.votos_favor || 0) + (assunto.votos_contra || 0) + (assunto.abstencoes || 0) : 0;
  const hasVotes = totalVotes > 0;
  const isUnanimous = hasVotes && assunto && assunto.votos_favor > 0 && assunto.votos_contra === 0 && assunto.abstencoes === 0;

  const favorPercentage = hasVotes ? Math.round((assunto.votos_favor / totalVotes) * 100) : 0;
  const contraPercentage = hasVotes ? Math.round((assunto.votos_contra / totalVotes) * 100) : 0;
  const abstencaoPercentage = hasVotes ? Math.round((assunto.abstencoes / totalVotes) * 100) : 0;

  if (isLoading) {
    return (
        <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-sky-700 rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <LoadingSpinner 
            color="text-white"
            text={t("loading_subject")}
            textClass="text-white text-sm font-montserrat mt-2"
          />
        </div>
      </div>
    );
  }

  if (error || !assunto) {
    return (
        <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-600 mb-2">{t("error_loading_subject")}</h2>
            <p className="text-gray-600">{error || t("subject_not_found")}</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-sky-700 text-white rounded-md hover:bg-sky-800 transition-colors"
            >
              {t("close")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-sky-950/90 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className=" max-w-4xl rounded-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* HEADER */}
        <div className="bg-sky-800 pt-6 pb-6 px-6 font-montserrat relative">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute cursor-pointer top-4 right-4 text-white hover:bg-sky-900/60 p-1.5 rounded-md transition-colors"
            aria-label="Fechar"
          >
            <FiX size={22} />
          </button>

          {/* Share button */}
          <button
            onClick={handleShare}
            className="absolute cursor-pointer top-4 right-14 text-white hover:bg-sky-900/60 p-1.5 rounded-md transition-colors"
            aria-label={t("share", "Partilhar")}
            title={t("share_subject", "Partilhar este assunto")}
          >
            <FiShare2 size={20} />
          </button>

          {/* Copied toast */}
          <AnimatePresence>
            {showCopiedToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-16 right-4 bg-emerald-500 text-white px-3 py-2 rounded-md text-sm shadow-lg flex items-center gap-2"
              >
                <FiCheck size={16} />
                {t("link_copied", "Link copiado!")}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Title and meta */}
          <h1 className="text-base md:text-2xl font-bold text-white mb-2 flex flex-col items-start">
            {assunto.topico && (
              <span className="inline-flex items-center mb-1 font-medium bg-sky-900/80 px-2 py-1 rounded text-sky-100 text-sm">
                {getTopicoIcon(assunto.topico.title, "w-4 h-4 mr-2")} {assunto.topico.title}
              </span>
            )}
            <span>{assunto.title}</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-white/80 text-sm">
            {assunto.municipio && assunto.municipio.image && (
              <img 
                src={`${API_URL}${assunto.municipio.image}`} 
                alt={assunto.municipio.name}
                className="w-12 h-12 rounded object-cover border border-sky-900"
              />
            )}
            <div className="flex flex-col gap-1 gap-y-0">
              <LangLink 
                to={`/municipios/${assunto.municipio.id}`}
                className="flex items-center text-white/80 hover:text-white transition-colors duration-300"
                onClick={onClose}
              >
              <span className="flex items-center">
                <FaLandmark className="mr-2" /> {assunto.municipio ? assunto.municipio.name : ""}
              </span>
              </LangLink>
              <span className="flex items-center">
                <FiCalendar className="mr-2" /> {assunto.ata && assunto.ata.date ? formatDate(assunto.ata.date) : t("unknown_date")}
              </span>
            </div>
          </div>
        </div>
        {/* The rest of the modal remains unchanged, starting from the main content grid/div */}
        <div className="bg-white grid grid-cols-1 font-montserrat">
          <div className="">
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
                        <span className="text-xs text-emerald-600">{t("in_favor")}: </span>&nbsp;<span className="text-xs text-gray-800 font-medium">{assunto.votos_favor || 0} ({favorPercentage}%)</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3.5 h-3.5 bg-rose-600 rounded-sm mr-2"></div>
                        <span className="text-xs text-rose-600">{t("against")}: </span>&nbsp;<span className="text-xs text-gray-800 font-medium">{assunto.votos_contra || 0} ({contraPercentage}%)</span>
                    </div>
                    <div className="flex items-center">
                        <div className="w-3.5 h-3.5 bg-gray-400/70 rounded-sm mr-2"></div>
                        <span className="text-xs text-gray-800">{t("abstentions")}: </span>&nbsp;<span className="text-xs text-gray-800 font-medium">{assunto.abstencoes || 0} ({abstencaoPercentage}%)</span>
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
                  <div className="mb-2 bg-emerald-50 p-2 px-4 rounded-md" ref={favorRef}>
                    <h3 className={`text-base font-medium text-gray-800 ${(voteDetails.favor && voteDetails.favor.length > 0) ? "mb-4" : ""} flex items-center lowercase`}>
                      <div className="w-3.5 h-3.5 bg-emerald-500 rounded-sm mr-2"></div>
                      {assunto.votos_favor || 0} {t("votes_in_favor")}
                    </h3>

                    {(voteDetails.favor && voteDetails.favor.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-montserrat">
                        {visibleSections.favor && voteDetails.favor.map((voto, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className=" border-b-2 border-b-emerald-500/10 hover:border-emerald-500 pb-2 transition-colors duration-300 flex items-start"
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
                                <div className="flex items-start">
                                  <h1 className="font-medium text-sm text-gray-800 transition-all duration-300 group-hover:text-sky-700">{voto.participante.name}</h1>
                                </div>
                                <div className="flex items-center justify-start gap-x-2">
                                    {voto.participante.party && (
                                      <span className={`text-xs px-2 py-0.5 rounded-md transition-all duration-300 ${getPartyColorClass(voto.participante.party)}`}>
                                        {voto.participante.party}
                                      </span>
                                    )}
                                    {voto.participante.role && (
                                      <p className="text-sm font-regular text-gray-600 mt-0 transition-all duration-300 group-hover:text-sky-700 font-raleway">{voto.participante.role}</p>
                                    )}
                                  </div>
                                </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <></>
                    )}
                  </div>

                  {/* Against Section */}
                  <div className="mb-2 bg-rose-50 p-2 px-4 rounded-md" ref={contraRef}>
                    <h3 className={`text-base font-medium text-gray-800 ${(voteDetails.contra && voteDetails.contra.length > 0) ? "mb-4" : ""} flex items-center lowercase`}>
                      <div className="w-3.5 h-3.5 bg-rose-600 rounded-sm mr-2"></div>
                      {assunto.votos_contra || 0} {t("votes_against")}
                    </h3>

                    {(voteDetails.contra && voteDetails.contra.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-montserrat">
                        {visibleSections.contra && voteDetails.contra.map((voto, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className=" border-b-2 border-b-rose-600/10 hover:border-rose-600 pb-2 transition-colors duration-300 flex items-start"
                          >
                            {/* participant image */}
                            <div className="flex-shrink-0 mr-3">
                              {voto.participante && voto.participante.profile_photo ? (
                                <img 
                                  className="w-12 h-12 rounded-sm object-cover" 
                                  src={`${API_URL}/${voto.participante.profile_photo}`}
                                  alt={voto.participante.name} 
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-sm bg-red-50 flex items-center justify-center border-2 border-red-200">
                                  <FiUser className="text-rose-600 h-6 w-6" />
                                </div>
                              )}
                            </div>
                            {/* Participant Details */}
                            <div className="flex-grow">
                              <div className="flex items-start">
                                <h1 className="font-medium text-sm text-gray-800 transition-all duration-300 group-hover:text-sky-700">{voto.participante.name}</h1>
                              </div>
                              <div className="flex items-center justify-start gap-x-2">
                                  {voto.participante.party && (
                                    <span className={`text-xs px-2 py-0.5 rounded-md transition-all duration-300 ${getPartyColorClass(voto.participante.party)}`}>
                                      {voto.participante.party}
                                    </span>
                                  )}
                                  {voto.participante.role && (
                                    <p className="text-sm font-regular text-gray-600 mt-0 transition-all duration-300 group-hover:text-sky-700 font-raleway">{voto.participante.role}</p>
                                  )}
                                </div>
                              </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      // <></>
                      <></>
                    )}
                  </div>

                  {/* Abstentions Section */}
                  <div className="mb-2 bg-gray-100 p-2 px-4 rounded-md" ref={abstencaoRef}>
                    <h3 className={`text-base font-medium text-gray-800 ${(voteDetails.abstencao && voteDetails.abstencao.length > 0) ? "mb-4" : ""} flex items-center lowercase`}>
                      <div className="w-3.5 h-3.5 bg-gray-400/70 rounded-sm mr-2"></div>
                      {assunto.abstencoes || 0} {t("votes_abstained")}
                    </h3>

                    {(voteDetails.abstencao && voteDetails.abstencao.length > 0) ? (
                      <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-montserrat">
                        {visibleSections.abstencao && voteDetails.abstencao.map((voto, idx) => (
                          <motion.div 
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: idx * 0.1 }}
                            className=" border-b-2 border-b-gray-400/10 hover:border-gray-400 pb-2 transition-colors duration-300 flex items-start"
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
                              <div className="flex items-start">
                                <h1 className="font-medium text-sm text-gray-800 transition-all duration-300 group-hover:text-sky-700">{voto.participante.name}</h1>
                              </div>
                              <div className="flex items-center justify-start gap-x-2">
                                  {voto.participante.party && (
                                    <span className={`text-xs px-2 py-0.5 rounded-md transition-all duration-300 ${getPartyColorClass(voto.participante.party)}`}>
                                      {voto.participante.party}
                                    </span>
                                  )}
                                  {voto.participante.role && (
                                    <p className="text-sm font-regular text-gray-600 mt-0 transition-all duration-300 group-hover:text-sky-700 font-raleway">{voto.participante.role}</p>
                                  )}
                                </div>
                              </div>
                          </motion.div>
                        ))}
                      </div>
                    ) : (
                      <></>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Minute Information */}
             <div className="bg-gray-100 p-6">
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
      </motion.div>
    </div>
  );
};

export default AssuntoModal;