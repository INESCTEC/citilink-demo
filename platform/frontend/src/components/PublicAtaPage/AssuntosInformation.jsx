import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { 
  FiCalendar, 
  FiCheck, 
  FiX, 
  FiFileText, 
  FiUsers,
  FiThumbsUp,
  FiThumbsDown,
  FiFolder,
  FiUser,
  FiArrowRight,
  FiInfo
} from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import LangLink from "../common/LangLink";

const AssuntosInformation = ({ assuntoId, onClose }) => {
  const { t } = useTranslation();
  const [assunto, setAssunto] = useState(null);
  const [voteDetails, setVoteDetails] = useState(null);
  const [county, setCounty] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch assunto data
        const assuntosResponse = await fetch(`${API_URL}/v0/public/assuntos/${assuntoId}?demo=${DEMO_MODE}`);
        
        if (!assuntosResponse.ok) {
          throw new Error("Failed to fetch subject details");
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
        
        // Fetch county information if we have municipio data
        if (assuntoData.municipio) {
          const countyResponse = await fetch(`${API_URL}/v0/public/municipios/${assuntoData.municipio.id}?demo=${DEMO_MODE}`);
          
          if (countyResponse.ok) {
            const countyData = await countyResponse.json();
            setCounty(countyData);
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setError(error.message);
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [assuntoId, API_URL]);
  
  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch (e) {
      return t("unknown_date");
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-8 w-8 border-4 border-t-sky-600 border-r-sky-600 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-sky-800">{t("loading_subject_details")}</p>
        </div>
      </div>
    );
  }
  
  if (error || !assunto) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <h2 className="text-lg font-bold text-rose-600 mb-3">{t("subject_not_found")}</h2>
          <p className="text-gray-600">{t("subject_not_found_desc")}</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700"
          >
            {t("close")}
          </button>
        </div>
      </div>
    );
  }

  // Calculate total votes
  const totalVotes = (assunto.votos_favor || 0) + (assunto.votos_contra || 0) + (assunto.abstencoes || 0);
  const hasVotes = totalVotes > 0;
  const isUnanimous = hasVotes && assunto.votos_favor > 0 && assunto.votos_contra === 0 && assunto.abstencoes === 0;
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-y-auto max-h-[85vh]">
      {/* Header with close button */}
      <div className="bg-sky-700 p-4 flex justify-between items-center">
        <h1 className="text-lg font-semibold text-white">{assunto.title}</h1>
        <button 
          onClick={onClose}
          className="text-white hover:bg-sky-800 p-1 rounded-full"
          aria-label="Close"
        >
          <FiX />
        </button>
      </div>
      
      {/* Subject metadata */}
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
          <div className="flex items-center">
            <FiCalendar className="mr-1" /> {formatDate(assunto.ata?.date)}
          </div>
          
          {assunto.ata && (
            <LangLink to={`/atas/${assunto.ata.id}`} className="flex items-center text-sky-700 hover:underline">
              <FiFileText className="mr-1" /> {assunto.ata.title}
            </LangLink>
          )}
          
          {county && (
            <LangLink to={`/municipios/${county.id}`} className="flex items-center text-sky-700 hover:underline">
              <FaLandmark className="mr-1" /> {county.name}
            </LangLink>
          )}
          
          {assunto.topico && (
            <LangLink to={`/municipios/${assunto.municipio?.id}/topicos/${assunto.topico.id}`} className="flex items-center text-sky-700 hover:underline">
              <FiFolder className="mr-1" /> {assunto.topico.title}
            </LangLink>
          )}
        </div>
      </div>
      
      <div className="p-4">
        {/* Subject description */}
        {assunto.description && (
          <div className="mb-4">
            <p className="text-gray-600">{assunto.description}</p>
          </div>
        )}
        
        {/* Main content: Deliberation and Decision */}
        <div className="space-y-6">
          {/* Deliberation */}
          {assunto.deliberacao && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
                <FiFileText className="mr-2" /> {t("deliberation")}
              </h2>
              <div className="prose max-w-none text-gray-700">
                <p>{assunto.deliberacao}</p>
              </div>
            </div>
          )}
          
          {/* Decision */}
          {assunto.decisao && (
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">{t("decision")}:</h2>
              <div className="bg-amber-50 p-4 rounded-md border border-amber-100">
                <p className="text-gray-800">{assunto.decisao}</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Voting Summary */}
        {hasVotes && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{t("voting_summary")}</h2>
            
            {/* Vote Progress Bar */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-emerald-500 float-left"
                style={{ width: `${totalVotes > 0 ? (assunto.votos_favor / totalVotes) * 100 : 0}%` }}
              >
                {totalVotes > 0 && (assunto.votos_favor / totalVotes) * 100 > 10 && (
                  <div className="text-xs text-white text-center font-medium">{Math.round((assunto.votos_favor / totalVotes) * 100)}%</div>
                )}
              </div>
              <div 
                className="h-full bg-rose-600 float-left"
                style={{ width: `${totalVotes > 0 ? (assunto.votos_contra / totalVotes) * 100 : 0}%` }}
              >
                {totalVotes > 0 && (assunto.votos_contra / totalVotes) * 100 > 10 && (
                  <div className="text-xs text-white text-center font-medium">{Math.round((assunto.votos_contra / totalVotes) * 100)}%</div>
                )}
              </div>
              <div 
                className="h-full bg-gray-400/70 float-left"
                style={{ width: `${totalVotes > 0 ? (assunto.abstencoes / totalVotes) * 100 : 0}%` }}
              >
                {totalVotes > 0 && (assunto.abstencoes / totalVotes) * 100 > 10 && (
                  <div className="text-xs text-white text-center font-medium">{Math.round((assunto.abstencoes / totalVotes) * 100)}%</div>
                )}
              </div>
            </div>
            
            {/* Vote Breakdown */}
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div>
                <div className="text-emerald-600 font-bold text-xl">{assunto.votos_favor || 0}</div>
                <div className="text-sm text-gray-600">{t("in_favor")}</div>
              </div>
              <div>
                <div className="text-rose-600 font-bold text-xl">{assunto.votos_contra || 0}</div>
                <div className="text-sm text-gray-600">{t("against")}</div>
              </div>
              <div>
                <div className="text-amber-600 font-bold text-xl">{assunto.abstencoes || 0}</div>
                <div className="text-sm text-gray-600">{t("abstentions")}</div>
              </div>
            </div>
            
            {/* Approval status */}
            <div className="flex items-center">
              <div className={`px-3 py-1 rounded-md text-sm font-medium inline-flex items-center ${
                assunto.aprovado 
                  ? "bg-green-100 text-green-800" 
                  : "bg-red-100 text-red-800"
              }`}>
                {assunto.aprovado 
                  ? <><FiCheck className="mr-1" size={16} /> {t("approved")}</> 
                  : <><FiX className="mr-1" size={16} /> {t("rejected")}</>}
              </div>
            </div>
          </div>
        )}
        
        {/* Detailed Votes */}
        {voteDetails && (voteDetails.favor.length > 0 || voteDetails.contra.length > 0 || voteDetails.abstencao.length > 0) && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-3">{t("detailed_votes")}</h2>
            
            {/* In Favor */}
            {voteDetails.favor.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                  <FiThumbsUp className="mr-2 text-emerald-500" /> {t("votes_in_favor")} ({voteDetails.favor.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {voteDetails.favor.map((voto, idx) => (
                    <div key={idx} className="bg-green-50 px-3 py-1 rounded-md text-sm border border-green-100">
                      {voto.participante?.name || t("unnamed_participant")}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Against */}
            {voteDetails.contra.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                  <FiThumbsDown className="mr-2 text-rose-500" /> {t("votes_against")} ({voteDetails.contra.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {voteDetails.contra.map((voto, idx) => (
                    <div key={idx} className="bg-red-50 px-3 py-1 rounded-md text-sm border border-red-100">
                      {voto.participante?.name || t("unnamed_participant")}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Abstentions */}
            {voteDetails.abstencao.length > 0 && (
              <div className="mb-4">
                <h3 className="font-medium text-gray-700 mb-2 flex items-center">
                  <FiUser className="mr-2 text-gray-500" /> {t("votes_abstained")} ({voteDetails.abstencao.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {voteDetails.abstencao.map((voto, idx) => (
                    <div key={idx} className="bg-gray-50 px-3 py-1 rounded-md text-sm border border-gray-200">
                      {voto.participante?.name || t("unnamed_participant")}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Footer with LangLink to full page */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <LangLink 
            to={`/assuntos/${assunto.id}`}
            className="text-sky-600 hover:text-sky-800 flex items-center"
          >
            {t("view_full_subject_page")} <FiArrowRight className="ml-1" />
          </LangLink>
        </div>
      </div>
    </div>
  );
};

export default AssuntosInformation;
