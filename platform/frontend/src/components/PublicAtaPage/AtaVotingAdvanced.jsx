import React, { useState, useEffect, useRef } from "react";
import { Popover, Button } from "flowbite-react";
import { useTranslation } from "react-i18next";
import { 
  FiCheckCircle, FiXCircle, FiAlertCircle, FiPieChart, 
  FiUsers, FiChevronDown, FiChevronUp, FiAward, FiThumbsUp, 
  FiThumbsDown, FiUser, FiUserCheck, FiBarChart2,
  FiArchive, FiList, FiFilter, FiSliders, FiArrowLeft,
  FiCheckSquare, FiSquare, FiRefreshCw
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getPartyColorClass } from "../../utils/PartyColorMapper";
import LoadingSpinner from "../common/LoadingSpinner";

// Cache object to store voting data by ata ID
const votingDataCache = {};

const AtaVotingAdvanced = ({ ata, API_URL, onBack, hideDistributionChart = false, setSelectedAssuntoId }) => {
  const { t, i18n } = useTranslation();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  const [votingData, setVotingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('participants'); // 'participants' or 'parties'
  const [partyStats, setPartyStats] = useState({});
  const prevTabRef = useRef('participants');

  // New state for participant selection
  const [selectedParticipants, setSelectedParticipants] = useState(new Set());
  const [selectedParticipantStats, setSelectedParticipantStats] = useState({
    favor: 0,
    contra: 0,
    abstencao: 0,
    total: 0
  });

  const [hoveredParticipant, setHoveredParticipant] = useState(null);
  const [hoveredParticipantDetails, setHoveredParticipantDetails] = useState(null);
  const [hoveredParticipantLoading, setHoveredParticipantLoading] = useState(false);

  const handleParticipantHover = async (participant) => {
    setHoveredParticipant(participant.id);
    setHoveredParticipantLoading(true);
    try {
      const response = await fetch(`${API_URL}/v0/public/atas/${ata.id}/participants/${participant.id}/details?demo=${DEMO_MODE}&lang=${i18n.language}`);
      const data = await response.json();
      setHoveredParticipantDetails(data);
    } catch (err) {
      setHoveredParticipantDetails({ error: "Failed to fetch details" });
    } finally {
      setHoveredParticipantLoading(false);
    }
  };

  const [hoveredParty, setHoveredParty] = useState(null);
  const [hoveredPartyDetails, setHoveredPartyDetails] = useState(null);
  const [hoveredPartyLoading, setHoveredPartyLoading] = useState(false);

  const handlePartyHover = async (partyName) => {
    setHoveredParty(partyName);
    setHoveredPartyLoading(true);
    try {
      const response = await fetch(`${API_URL}/v0/public/atas/${ata.id}/parties/${encodeURIComponent(partyName)}/details?demo=${DEMO_MODE}&lang=${i18n.language}`);
      const data = await response.json();
      setHoveredPartyDetails(data);
    } catch (err) {
      setHoveredPartyDetails({ error: "Failed to fetch details" });
    } finally {
      setHoveredPartyLoading(false);
    }
  };


  // New functions for participant selection
  const handleParticipantSelect = (participantId, participants) => {
    const newSelected = new Set(selectedParticipants);
    
    if (newSelected.has(participantId)) {
      newSelected.delete(participantId);
    } else {
      newSelected.add(participantId);
    }
    
    setSelectedParticipants(newSelected);
    calculateSelectedParticipantStats(newSelected, participants);
  };

  const calculateSelectedParticipantStats = (selectedIds, participants) => {
    if (selectedIds.size === 0) {
      setSelectedParticipantStats({ favor: 0, contra: 0, abstencao: 0, total: 0 });
      return;
    }

    let totalFavor = 0;
    let totalContra = 0;
    let totalAbstencao = 0;

    participants.forEach(participant => {
      if (selectedIds.has(participant.id)) {
        totalFavor += participant.votes.favor;
        totalContra += participant.votes.contra;
        totalAbstencao += participant.votes.abstencao;
      }
    });

    setSelectedParticipantStats({
      favor: totalFavor,
      contra: totalContra,
      abstencao: totalAbstencao,
      total: totalFavor + totalContra + totalAbstencao
    });
  };

  useEffect(() => {
    const fetchVotingData = async () => {
      try {
        setIsLoading(true);
        // Check if data is already cached
        if (votingDataCache[ata.id]) {
          console.log('Using cached voting data for ata ID:', ata.id);
          setVotingData(votingDataCache[ata.id]);
          calculatePartyStatistics(votingDataCache[ata.id]);
          setIsLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/v0/public/atas/${ata.id}/voting-summary?demo=${DEMO_MODE}&lang=${i18n.language}`);
        if (!response.ok) {
          throw new Error("Failed to fetch voting data");
        }
        const data = await response.json();
        
        // Cache the fetched data
        votingDataCache[ata.id] = data;

        setVotingData(data);
        calculatePartyStatistics(data);
      } catch (error) {
        console.error("Error fetching voting data:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (ata && ata.id) {
      fetchVotingData();
    }
  }, [ata, API_URL]);

  // Calculate statistics per party
  const calculatePartyStatistics = (data) => {
    if (!data || !data.assuntos || !Array.isArray(data.assuntos) || data.assuntos.length === 0) return;

    const parties = {};

    // Go through each assunto and collect votes by party
    data.assuntos.forEach(assunto => {
      // Process each type of vote
      ['favor', 'contra', 'abstencao'].forEach(voteType => {
        const votes = assunto.detalhes_votos[voteType];
        
        // Check if votes is an array before using forEach
        if (Array.isArray(votes)) {
          votes.forEach(voto => {
            const partido = voto.partido || t('no_party');
            
            if (!parties[partido]) {
              parties[partido] = { favor: 0, contra: 0, abstencao: 0, total: 0 };
            }
            
            parties[partido][voteType]++;
            parties[partido].total++;
          });
        }
      });
    });

    setPartyStats(parties);
  };

  if (isLoading) {
    return (
      <div className="mb-6 font-montserrat">
        <div className="flex justify-center">
          <div className="animate-pulse h-60 w-full bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !votingData) {
    return (
      <div className="mb-6 font-montserrat">
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{t("error_loading_voting_data")}</p>
        </div>
      </div>
    );
  }

  // If there are no subjects with voting information
  if (!votingData.assuntos || !Array.isArray(votingData.assuntos) || votingData.assuntos.length === 0 || votingData.total_assuntos === 0) {
    return (
      <div className="mb-6 font-montserrat">
        <div className="bg-gray-50 p-4 py-20 rounded-md text-gray-500 text-center">
          <FiArchive className="mx-auto h-12 w-12 text-gray-400" />
          <p>{t("no_voting_data_available")}</p>
        </div>
      </div>
    );
  }

  // Calculate total votes
  const totalVotes = votingData.votos_favor_total + votingData.votos_contra_total + votingData.abstencoes_total;

  
  const handleTabChange = (tab) => {
    prevTabRef.current = activeTab;
    setActiveTab(tab);
  };

  // Tab order to determine animation direction
  const tabOrder = ['participants', 'parties'];
  
  // Determine if the new tab is to the right or left of the previous tab
  const getAnimationDirection = (tabName) => {
    const prevIndex = tabOrder.indexOf(prevTabRef.current);
    const newIndex = tabOrder.indexOf(tabName);
    
    // If moving right to left (new index is lower), content comes from right
    // If moving left to right (new index is higher), content comes from left
    return prevIndex > newIndex ? 1 : -1;
  };

  const renderTabs = () => {
    return (
      <div className="flex border-b border-sky-700/30 mb-4">
        <button
          className={`py-2 px-4 text-sm xs:text-sm md:text-md mr-2 focus:outline-none relative ${
            activeTab === 'participants' 
              ? 'text-sky-900 font-semibold' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('participants')}
        >
          <FiUsers className="inline mr-1" /> {t("participants")}
          {activeTab === 'participants' && (
            <motion.div 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-900 rounded-md"
              layoutId="voting-tab-underline"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </button>
        <button
          className={`py-2 px-4 text-sm xs:text-sm md:text-md focus:outline-none relative ${
            activeTab === 'parties' 
              ? 'text-sky-900 font-semibold' 
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => handleTabChange('parties')}
        >
          <FiFilter className="inline mr-1" /> {t("parties")}
          {activeTab === 'parties' && (
            <motion.div 
              className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-900 rounded-md"
              layoutId="voting-tab-underline"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          )}
        </button>
      </div>
    );
  };

  const renderParticipantsTab = () => {
    // Create a dictionary of participants with their voting history
    const participants = {};
    
    if (Array.isArray(votingData.assuntos)) {
      votingData.assuntos.forEach(assunto => {
        // Process each type of vote
        ['favor', 'contra', 'abstencao'].forEach(voteType => {
          const votes = assunto.detalhes_votos[voteType];
          
          // Check if votes is an array before using forEach
          if (Array.isArray(votes)) {
            votes.forEach(voto => {
              if (!participants[voto.id]) {
                participants[voto.id] = {
                  id: voto.id,
                  nome: voto.nome,
                  cargo: voto.cargo,
                  sort: voto.sort,
                  partido: voto.partido,
                  votes: {
                    favor: 0,
                    contra: 0,
                    abstencao: 0
                  }
                };
              }
              
              participants[voto.id].votes[voteType]++;
            });
          }
        });
      });
    }

    // Sort participants by their sort attribute if available, otherwise by name
    const sortedParticipants = Object.values(participants).sort((a, b) => {
      // If both have sort attribute, sort by it
      if (a.sort !== undefined && b.sort !== undefined) {
        return a.sort - b.sort;
      }
      // If only one has sort attribute, the one with sort comes first
      if (a.sort !== undefined) return -1;
      if (b.sort !== undefined) return 1;
      // Otherwise sort by name
      return a.nome.localeCompare(b.nome);
    });

    // Generate selected participants data for the distribution chart
    // const selectedParticipantsData = sortedParticipants
    //   .filter(p => selectedParticipants.has(p.id))
    //   .map(participant => {
    //     const totalVotes = participant.votes.favor + participant.votes.contra + participant.votes.abstencao;
    //     return {
    //       id: participant.id,
    //       name: participant.nome,
    //       partido: participant.partido,
    //       favor: participant.votes.favor,
    //       contra: participant.votes.contra,
    //       abstencao: participant.votes.abstencao,
    //       total: totalVotes,
    //       percentage: selectedParticipantStats.total > 0 ? (totalVotes / selectedParticipantStats.total) * 100 : 0
    //     };
    //   })
    //   .sort((a, b) => b.total - a.total); // Sort by total votes

    return (
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold text-gray-800">
            {t("voting_by_participant")}
          </h3>

        </div>


        {/* Desktop View */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-montserrat">
          {sortedParticipants.map((participant, idx) => {
  
            const totalParticipantVotes = 
              participant.votes.favor + 
              participant.votes.contra + 
              participant.votes.abstencao;
            
            // Calculate percentages for the meter visualizations
            const favorPercent = totalParticipantVotes > 0 
              ? (participant.votes.favor / totalParticipantVotes) * 100 
              : 0;
            const contraPercent = totalParticipantVotes > 0 
              ? (participant.votes.contra / totalParticipantVotes) * 100 
              : 0;
            const abstencaoPercent = totalParticipantVotes > 0 
              ? (participant.votes.abstencao / totalParticipantVotes) * 100 
              : 0;
            
            // Determine the dominant voting color for card border
            let borderColorClass = "border-gray-200";
            if (participant.votes.favor > participant.votes.contra && 
                participant.votes.favor > participant.votes.abstencao) {
              borderColorClass = "border-emerald-500/70";
            } else if (participant.votes.contra > participant.votes.favor && 
                      participant.votes.contra > participant.votes.abstencao) {
              borderColorClass = "border-rose-500/70";
            } else if (participant.votes.abstencao > participant.votes.favor && 
                      participant.votes.abstencao > participant.votes.contra) {
              borderColorClass = "border-gray-400/70";
            }

            const isSelected = selectedParticipants.has(participant.id);
            
            return (
              <div key={participant.id}>
                <div
                  className={`flex flex-col border-2 ${borderColorClass} rounded-md shadow-sm hover:shadow-md transition-all duration-300 bg-white ${
                    isSelected ? '' : ''
                  }`}
                >
                  {/* Participant Header with Checkbox */}
                  <div className="p-3 bg-gray-50 border-b border-gray-200 rounded-t-md">
                    <div className="flex items-start justify-between mb-1">
                      <h1 className="font-medium text-sm text-gray-800 flex-1">{participant.nome}</h1>
                      {/* <button
                        onClick={() => handleParticipantSelect(participant.id, sortedParticipants)}
                        className="ml-2 text-sky-600 hover:text-sky-800 transition-colors"
                      >
                        {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                      </button> */}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-gray-600">{participant.cargo}</span>
                      {participant.partido && (
                        <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(participant.partido)}`}>
                          {participant.partido}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Vote Visualization with counts below */}
                  <div className="p-3 mt-auto rounded-md">
                    {/* Vote bars */}
                    <div className="h-4 bg-gray-100 rounded-md flex mb-3 overflow-hidden">
                      {favorPercent > 0 && (
                        <div
                          className={`h-full bg-emerald-500 ${contraPercent === 0 && abstencaoPercent === 0 ? 'rounded-md' : 'rounded-l-md'}`}
                          style={{ width: `${favorPercent}%` }}
                        ></div>
                      )}
                      {contraPercent > 0 && (
                        <div
                          className={`h-full bg-rose-500 ${favorPercent === 0 ? 'rounded-l-md' : ''} ${abstencaoPercent === 0 ? 'rounded-r-md' : ''}`}
                          style={{ width: `${contraPercent}%` }}
                        ></div>
                      )}
                      {abstencaoPercent > 0 && (
                        <div
                          className={`h-full bg-gray-400 ${favorPercent === 0 && contraPercent === 0 ? 'rounded-md' : 'rounded-r-md'}`}
                          style={{ width: `${abstencaoPercent}%` }}
                        ></div>
                      )}
                    </div>
                    {/* Vote counts below the bar as buttons with popovers */}
                    <div className="grid grid-cols-3 gap-1 text-center">
                      {/* Favor Button */}
                      <Popover
                        aria-labelledby="participant-favor-popover"
                        trigger="click"
                        placement="right"
                        content={
                          hoveredParticipantLoading && hoveredParticipant === participant.id ? (
                            <div className="p-3 text-center w-100 text-gray-500">
                              <LoadingSpinner
                                color="text-gray-500"
                                text={t("loading_subject")}
                                textClass="text-gray-500 font-light text-xs"
                                padding="p-0"
                              />
                            </div>
                          ) : hoveredParticipantDetails?.error && hoveredParticipant === participant.id ? (
                            <div className="p-3 text-red-500">{hoveredParticipantDetails.error}</div>
                          ) : hoveredParticipantDetails && hoveredParticipant === participant.id ? (
                            <div className="w-100 text-xs text-gray-800 overflow-y-auto max-h-64 ">
                              <div className="border-b border-gray-200 bg-emerald-100 px-3 py-2">
                                <h3 id="participant-favor-popover" className="font-semibold text-gray-900">
                                  {hoveredParticipantDetails.name}
                                </h3>
                              </div>
                              <div className="px-3 py-2">
                                {hoveredParticipantDetails.votes && hoveredParticipantDetails.votes.filter(v => v.vote_type === "favor").length > 0 ? (
                                  <ul className="list-disc pl-5 text-sm text-start">
                                    {hoveredParticipantDetails.votes
                                      .filter(v => v.vote_type === "favor")
                                      .map((vote, idx) => (
                                        <li key={idx} className="font-light cursor-pointer hover:underline underline-offset-1 hover:decoration-sky-700" onClick={() => setSelectedAssuntoId(vote.assunto_id)}>
                                          {vote.assunto_title}
                                        </li>
                                      ))}
                                  </ul>
                                ) : (
                                  <div className="text-gray-500">{t("no_favor_votes")}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 text-gray-500">{t("hover_for_details")}</div>
                          )
                        }
                      >
                        <span>
                          <button
                            className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1 w-full  cursor-pointer "
                            onClick={() => handleParticipantHover(participant)}
                          >
                            {participant.votes.favor}
                          </button>
                          <span className="text-xs text-gray-500">{t("in_favor")}</span>
                        </span>
                      </Popover>
                      {/* Contra Button */}
                      <Popover
                        aria-labelledby="participant-contra-popover"
                        trigger="click"
                        placement="right"
                        content={
                          hoveredParticipantLoading && hoveredParticipant === participant.id ? (
                            <div className="p-3 text-center w-100 text-gray-500 ">
                              <LoadingSpinner
                                 color="text-gray-500"
                                text={t("loading_subject")}
                                textClass="text-gray-500 font-light text-xs"
                                padding="p-0"
                              />
                            </div>
                          ) : hoveredParticipantDetails?.error && hoveredParticipant === participant.id ? (
                            <div className="p-3 text-red-500">{hoveredParticipantDetails.error}</div>
                          ) : hoveredParticipantDetails && hoveredParticipant === participant.id ? (
                            <div className="w-100 text-xs text-gray-800 overflow-y-auto max-h-64 ">
                              <div className="border-b border-gray-200 bg-rose-100 px-3 py-2">
                                <h3 id="participant-contra-popover" className="font-semibold text-gray-900">
                                  {hoveredParticipantDetails.name}
                                </h3>
                              </div>
                              <div className="px-3 py-2">
                                {hoveredParticipantDetails.votes && hoveredParticipantDetails.votes.filter(v => v.vote_type === "contra").length > 0 ? (
                                  <ul className="list-disc pl-5 text-sm text-start">
                                    {hoveredParticipantDetails.votes
                                      .filter(v => v.vote_type === "contra")
                                      .map((vote, idx) => (
                                        <li key={idx} className="font-light cursor-pointer hover:underline underline-offset-1 hover:decoration-sky-700" onClick={() => setSelectedAssuntoId(vote.assunto_id)}>{vote.assunto_title}</li>
                                      ))}
                                  </ul>
                                ) : (
                                  <div className="text-gray-500">{t("no_contra_votes")}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 text-gray-500">{t("hover_for_details")}</div>
                          )
                        }
                      >
                        <span>
                          <button
                            className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 text-xs font-semibold mb-1 w-full cursor-pointer"
                            onClick={() => handleParticipantHover(participant)}
                          >
                            {participant.votes.contra}
                          </button>
                          <span className="text-xs text-gray-500">{t("against")}</span>
                        </span>
                      </Popover>
                      {/* Abstencao Button */}
                      <Popover
                        aria-labelledby="participant-abstencao-popover"
                        trigger="click"
                        placement="right"
                        content={
                          hoveredParticipantLoading && hoveredParticipant === participant.id ? (
                            <div className="p-3 text-center w-100 text-gray-500">
                              <LoadingSpinner
                                color="text-gray-500"
                                text={t("loading_subject")}
                                textClass="text-gray-500 font-light text-xs"
                                padding="p-0"
                              />
                            </div>
                          ) : hoveredParticipantDetails?.error && hoveredParticipant === participant.id ? (
                            <div className="p-3 text-red-500">{hoveredParticipantDetails.error}</div>
                          ) : hoveredParticipantDetails && hoveredParticipant === participant.id ? (
                            <div className="w-100 text-xs text-gray-800 overflow-y-auto max-h-64">
                              <div className="border-b border-gray-200 bg-gray-100 px-3 py-2">
                                <h3 id="participant-abstencao-popover" className="font-semibold text-gray-900">
                                  {hoveredParticipantDetails.name}
                                </h3>
                              </div>
                              <div className="px-3 py-2">
                                {hoveredParticipantDetails.votes && hoveredParticipantDetails.votes.filter(v => v.vote_type === "abstencao").length > 0 ? (
                                  <ul className="list-disc pl-5 text-sm text-start">
                                    {hoveredParticipantDetails.votes
                                      .filter(v => v.vote_type === "abstencao")
                                      .map((vote, idx) => (
                                        <li key={idx} className="font-light cursor-pointer hover:underline underline-offset-1 hover:decoration-sky-700" onClick={() => setSelectedAssuntoId(vote.assunto_id)}>{vote.assunto_title}</li>
                                      ))}
                                  </ul>
                                ) : (
                                  <div className="text-gray-500">{t("no_abstencoes")}</div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 text-gray-500">{t("hover_for_details")}</div>
                          )
                        }
                      >
                        <span>
                          <button
                            className="px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold mb-1 w-full  cursor-pointer"
                            onClick={() => handleParticipantHover(participant)}
                          >
                            {participant.votes.abstencao}
                          </button>
                          <span className="text-xs text-gray-500">{t("abstentions")}</span>
                        </span>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile View */}
        <div className="sm:hidden space-y-4">
          {sortedParticipants.map((participant, idx) => {
            // Calculate total votes by this participant
            const totalParticipantVotes = 
              participant.votes.favor + 
              participant.votes.contra + 
              participant.votes.abstencao;
            
            // Calculate percentages for the meter visualizations
            const favorPercent = totalParticipantVotes > 0 
              ? (participant.votes.favor / totalParticipantVotes) * 100 
              : 0;
            const contraPercent = totalParticipantVotes > 0 
              ? (participant.votes.contra / totalParticipantVotes) * 100 
              : 0;
            const abstencaoPercent = totalParticipantVotes > 0 
              ? (participant.votes.abstencao / totalParticipantVotes) * 100 
              : 0;
            
            // Determine the dominant voting color for card border
            let borderColorClass = "border-gray-200";
            if (participant.votes.favor > participant.votes.contra && 
                participant.votes.favor > participant.votes.abstencao) {
              borderColorClass = "border-l-emerald-500";
            } else if (participant.votes.contra > participant.votes.favor && 
                      participant.votes.contra > participant.votes.abstencao) {
              borderColorClass = "border-l-rose-500";
            } else if (participant.votes.abstencao > participant.votes.favor && 
                      participant.votes.abstencao > participant.votes.contra) {
              borderColorClass = "border-l-gray-400";
            }

            const isSelected = selectedParticipants.has(participant.id);
            
            return (
              <div 
                key={participant.id}
                className={`border rounded-md shadow-sm bg-white border-l-4 ${borderColorClass} ${
                  isSelected ? 'ring-2 ring-sky-500 ring-opacity-50 bg-sky-50' : ''
                }`}
              >
                <div className="p-3 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h1 className="font-medium text-gray-800">{participant.nome}</h1>
                      <p className="text-xs text-gray-600">{participant.cargo}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {participant.partido && (
                        <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(participant.partido)}`}>
                          {participant.partido}
                        </span>
                      )}
                      <button
                        onClick={() => handleParticipantSelect(participant.id, sortedParticipants)}
                        className="text-sky-600 hover:text-sky-800 transition-colors"
                      >
                        {isSelected ? <FiCheckSquare size={18} /> : <FiSquare size={18} />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Empty space to fill the card */}
                  <div className="flex-grow"></div>
                  
                  {/* Vote bars at the bottom */}
                  <div className="h-3 bg-gray-100 rounded-md  mt-auto flex mb-2">
                    {favorPercent > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${favorPercent}%` }}
                      ></div>
                    )}
                    {contraPercent > 0 && (
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${contraPercent}%` }}
                      ></div>
                    )}
                    {abstencaoPercent > 0 && (
                      <div
                        className="h-full bg-gray-400"
                        style={{ width: `${abstencaoPercent}%` }}
                      ></div>
                    )}
                  </div>
                  
                  {/* Vote counts below the bar */}
                  <div className="flex justify-between text-xs mt-1">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-sm mr-1"></div>
                      <span>{t("in_favor")}: {participant.votes.favor}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-rose-500 rounded-sm mr-1"></div>
                      <span>{t("against")}: {participant.votes.contra}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-sm mr-1"></div>
                      <span>{t("abstentions")}: {participant.votes.abstencao}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPartiesTab = () => {
    // Sum all votes for each party
    const partyTotals = Object.keys(partyStats).map(party => {
      const stats = partyStats[party];
      return {
        party,
        favor: stats.favor,
        contra: stats.contra,
        abstencao: stats.abstencao,
        total: stats.total,
        percentage: (stats.total / totalVotes) * 100
      };
    }).sort((a, b) => b.total - a.total); // Sort by total votes
    
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-3">
          {t("voting_by_party")}
        </h3>
        
        {/* Party distribution chart */}
        <div className="mb-6 mt-2">
          <div className="h-10 bg-gray-200 rounded-md mb-2 overflow-hidden">
            {partyTotals.map((partyData, index) => {
              const width = partyData.percentage;
              const isFirst = index === 0;
              const isLast = index === partyTotals.length - 1;
              
              return (
                <div
                  key={partyData.party}
                  className={`h-full ${getPartyColorClass(partyData.party)} float-left flex items-center justify-center text-xs font-medium ${
                    isFirst && isLast ? 'rounded-md' : 
                    isFirst ? 'rounded-l-md' : 
                    isLast ? 'rounded-r-md' : ''
                  }`}
                  style={{ width: `${width}%` }}
                >
                  {width > 8 && (
                    <span>{Math.round(width)}%</span>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Vote counts and percentages below the bar */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-sm">
            {partyTotals.map((partyData) => (
              <div key={partyData.party} className="flex items-center">
                <div className={`w-3 h-3 rounded-sm mr-2 ${getPartyColorClass(partyData.party)}`}></div>
                <span className="text-gray-600">{partyData.party}: {partyData.total} ({Math.round(partyData.percentage)}%)</span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Party votes breakdown - Grid Layout */}
        <div className="hidden sm:grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 font-montserrat">
          {partyTotals.map((partyData) => {
            // Calculate percentages for each vote type within this party
            const favorPercent = (partyData.favor / partyData.total) * 100;
            const contraPercent = (partyData.contra / partyData.total) * 100;
            const abstencaoPercent = (partyData.abstencao / partyData.total) * 100;
            
            // Determine the dominant voting color for card border
            let borderColorClass = "border-gray-200";
            if (partyData.favor > partyData.contra && partyData.favor > partyData.abstencao) {
              borderColorClass = "border-emerald-500/70";
            } else if (partyData.contra > partyData.favor && partyData.contra > partyData.abstencao) {
              borderColorClass = "border-rose-500/70";
            } else if (partyData.abstencao > partyData.favor && partyData.abstencao > partyData.contra) {
              borderColorClass = "border-gray-400/70";
            }
            
            return (
              <div
                key={partyData.party}
                className={`flex flex-col border-2 ${borderColorClass} rounded-md shadow-sm hover:shadow-md transition-shadow duration-300 bg-white `}
              >
                {/* Party Header */}
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <h1 className="font-medium text-gray-800 mb-1">{partyData.party}</h1>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(partyData.party)}`}>
                      {partyData.total} {t("votes")} ({Math.round(partyData.percentage)}%)
                    </span>
                  </div>
                </div>

                {/* Vote Visualization with counts below */}
                <div className="p-3 mt-auto">
                  {/* Vote bars */}
                  <div className="h-4 bg-gray-100 rounded-md  flex mb-3">
                    {favorPercent > 0 && (
                      <div
                        className={`h-full bg-emerald-500 ${contraPercent === 0 && abstencaoPercent === 0 ? 'rounded-lg' : 'rounded-l-lg'}`}
                        style={{ width: `${favorPercent}%` }}
                      ></div>
                    )}
                    {contraPercent > 0 && (
                      <div
                        className={`h-full bg-rose-500 ${favorPercent === 0 ? 'rounded-l-lg' : ''} ${abstencaoPercent === 0 ? 'rounded-r-lg' : ''}`}
                        style={{ width: `${contraPercent}%` }}
                      ></div>
                    )}
                    {abstencaoPercent > 0 && (
                      <div
                        className={`h-full bg-gray-400 ${favorPercent === 0 && contraPercent === 0 ? 'rounded-lg' : 'rounded-r-lg'}`}
                        style={{ width: `${abstencaoPercent}%` }}
                      ></div>
                    )}
                  </div>
                  {/* Vote counts below the bar as buttons with popovers */}
                  <div className="grid grid-cols-3 gap-1 text-center">
                    {/* Favor Button */}
                    <Popover
                      aria-labelledby="party-favor-popover"
                      trigger="click"
                      placement="right"
                      content={
                        hoveredPartyLoading && hoveredParty === partyData.party ? (
                          <div className="p-3 text-center w-100 text-gray-500">
                            <LoadingSpinner
                              color="text-gray-500"
                              text={t("loading_subject")}
                              textClass="text-gray-500 font-light text-xs"
                              padding="p-0"
                            />
                          </div>
                        ) : hoveredPartyDetails?.error && hoveredParty === partyData.party ? (
                          <div className="p-3 text-red-500">{hoveredPartyDetails.error}</div>
                        ) : hoveredPartyDetails && hoveredParty === partyData.party ? (
                          <div className="w-100 text-xs text-gray-800 overflow-y-auto max-h-64">
                            <div className="border-b border-gray-200 bg-emerald-100 px-3 py-2 flex items-center gap-x-1">
                              <div className={`text-xs h-4 w-4 rounded-sm ${getPartyColorClass(partyData.party)}`}></div>
                              <h3 id="party-favor-popover" className="font-semibold text-gray-900">
                                {hoveredPartyDetails.name}
                              </h3>
                            </div>
                            <div className="px-3 py-2">
                              {hoveredPartyDetails.votes && hoveredPartyDetails.votes.filter(v => v.vote_type === "favor").length > 0 ? (
                                <ul className="list-disc pl-5 text-sm text-start">
                                  {hoveredPartyDetails.votes
                                    .filter(v => v.vote_type === "favor")
                                    .map((vote, idx) => (
                                      <li key={idx} className="font-light cursor-pointer hover:underline underline-offset-1 hover:decoration-sky-700" onClick={() => setSelectedAssuntoId(vote.assunto_id)}>{vote.assunto_title}</li>
                                    ))}
                                </ul>
                              ) : (
                                <div className="text-gray-500">{t("no_favor_votes")}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-gray-500">{t("hover_for_details")}</div>
                        )
                      }
                    >
                      <span>
                        <button
                          className="px-2 py-1 rounded-md bg-emerald-100 text-emerald-800 text-xs font-semibold mb-1 w-full  cursor-pointer"
                          onClick={() => handlePartyHover(partyData.party)}
                        >
                          {partyData.favor}
                        </button>
                        <span className="text-xs text-gray-500">{t("in_favor")}</span>
                      </span>
                    </Popover>
                    {/* Contra Button */}
                    <Popover
                      aria-labelledby="party-contra-popover"
                      trigger="click"
                      placement="right"
                      content={
                        hoveredPartyLoading && hoveredParty === partyData.party ? (
                          <div className="p-3 text-center w-100 text-gray-500">
                            <LoadingSpinner
                              color="text-gray-500"
                              text={t("loading_subject")}
                              textClass="text-gray-500 font-light text-xs"
                              padding="p-0"
                            />
                          </div>
                        ) : hoveredPartyDetails?.error && hoveredParty === partyData.party ? (
                          <div className="p-3 text-red-500">{hoveredPartyDetails.error}</div>
                        ) : hoveredPartyDetails && hoveredParty === partyData.party ? (
                          <div className="w-100 text-xs text-gray-800 overflow-y-auto max-h-64">
                            <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 flex items-center gap-x-1">
                              <div className={`text-xs h-4 w-4 rounded-sm ${getPartyColorClass(partyData.party)}`}></div>
                              <h3 id="party-contra-popover" className="font-semibold text-gray-900">
                                {hoveredPartyDetails.name}
                              </h3>
                            </div>
                            <div className="px-3 py-2">
                              {hoveredPartyDetails.votes && hoveredPartyDetails.votes.filter(v => v.vote_type === "contra").length > 0 ? (
                                <ul className="list-disc pl-5 text-sm text-start">
                                  {hoveredPartyDetails.votes
                                    .filter(v => v.vote_type === "contra")
                                    .map((vote, idx) => (
                                      <li key={idx} className="font-light cursor-pointer hover:underline underline-offset-1 hover:decoration-sky-700" onClick={() => setSelectedAssuntoId(vote.assunto_id)}>{vote.assunto_title}</li>
                                    ))}
                                </ul>
                              ) : (
                                <div className="text-gray-500">{t("no_contra_votes")}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-gray-500">{t("hover_for_details")}</div>
                        )
                      }
                    >
                      <span>
                        <button
                          className="px-2 py-1 rounded-md bg-rose-100 text-rose-800 text-xs font-semibold mb-1 w-full  cursor-pointer"
                          onClick={() => handlePartyHover(partyData.party)}
                        >
                          {partyData.contra}
                        </button>
                        <span className="text-xs text-gray-500">{t("against")}</span>
                      </span>
                    </Popover>
                    {/* Abstencao Button */}
                    <Popover
                      aria-labelledby="party-abstencao-popover"
                      trigger="click"
                      placement="right"
                      content={
                        hoveredPartyLoading && hoveredParty === partyData.party ? (
                          <div className="p-3 text-center w-100 text-gray-500">
                            <LoadingSpinner
                              color="text-gray-500"
                              text={t("loading_subject")}
                              textClass="text-gray-500 font-light text-xs"
                              padding="p-0"
                            />
                          </div>
                        ) : hoveredPartyDetails?.error && hoveredParty === partyData.party ? (
                          <div className="p-3 text-red-500">{hoveredPartyDetails.error}</div>
                        ) : hoveredPartyDetails && hoveredParty === partyData.party ? (
                          <div className="w-100 text-xs text-gray-800 overflow-y-auto max-h-64">
                            <div className="border-b border-gray-200 bg-gray-100 px-3 py-2 flex items-center gap-x-1">
                              <div className={`text-xs h-4 w-4 rounded-sm ${getPartyColorClass(partyData.party)}`}></div>
                              <h3 id="party-abstencao-popover" className="font-semibold text-gray-900">
                                {hoveredPartyDetails.name}
                              </h3>
                            </div>
                            <div className="px-3 py-2">
                              {hoveredPartyDetails.votes && hoveredPartyDetails.votes.filter(v => v.vote_type === "abstencao").length > 0 ? (
                                <ul className="list-disc pl-5 text-sm text-start">
                                  {hoveredPartyDetails.votes
                                    .filter(v => v.vote_type === "abstencao")
                                    .map((vote, idx) => (
                                      <li key={idx} className="font-light cursor-pointer hover:underline underline-offset-1 hover:decoration-sky-700" onClick={() => setSelectedAssuntoId(vote.assunto_id)}>{vote.assunto_title}</li>
                                    ))}
                                </ul>
                              ) : (
                                <div className="text-gray-500">{t("no_abstencoes")}</div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-gray-500">{t("hover_for_details")}</div>
                        )
                      }
                    >
                      <span>
                        <button
                          className="px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-xs font-semibold mb-1 w-full  cursor-pointer"
                          onClick={() => handlePartyHover(partyData.party)}
                        >
                          {partyData.abstencao}
                        </button>
                        <span className="text-xs text-gray-500">{t("abstentions")}</span>
                      </span>
                    </Popover>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Mobile View for Party votes */}
        <div className="sm:hidden space-y-4">
          {partyTotals.map((partyData) => {
            // Calculate percentages for each vote type within this party
            const favorPercent = (partyData.favor / partyData.total) * 100;
            const contraPercent = (partyData.contra / partyData.total) * 100;
            const abstencaoPercent = (partyData.abstencao / partyData.total) * 100;
            
            // Determine the dominant voting color for card border
            let borderColorClass = "border-gray-200";
            if (partyData.favor > partyData.contra && partyData.favor > partyData.abstencao) {
              borderColorClass = "border-l-emerald-500";
            } else if (partyData.contra > partyData.favor && partyData.contra > partyData.abstencao) {
              borderColorClass = "border-l-rose-500";
            } else if (partyData.abstencao > partyData.favor && partyData.abstencao > partyData.contra) {
              borderColorClass = "border-l-gray-400";
            }
            
            return (
              <div 
                key={partyData.party}
                className={`border rounded-md shadow-sm bg-white  border-l-4 ${borderColorClass} cursor-pointer`}
              >
                <div className="p-3 flex flex-col">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h1 className="font-medium text-gray-800">{partyData.party}</h1>
                      <p className="text-xs text-gray-600">
                        {partyData.total} {t("votes")} ({Math.round(partyData.percentage)}%)
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-md ${getPartyColorClass(partyData.party)}`}>
                      {partyData.party}
                    </span>
                  </div>
                  
                  {/* Empty space to fill the card */}
                  <div className="flex-grow"></div>
                  
                  {/* Vote bars at the bottom */}
                  <div className="h-3 bg-gray-100 rounded-md  mt-auto flex mb-2">
                    {favorPercent > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${favorPercent}%` }}
                      ></div>
                    )}
                    {contraPercent > 0 && (
                      <div
                        className="h-full bg-rose-500"
                        style={{ width: `${contraPercent}%` }}
                      ></div>
                    )}
                    {abstencaoPercent > 0 && (
                      <div
                        className="h-full bg-gray-400"
                        style={{ width: `${abstencaoPercent}%` }}
                      ></div>
                    )}
                  </div>
                  
                  {/* Vote counts below the bar */}
                  <div className="flex justify-between text-xs mt-1">
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-emerald-500 rounded-sm mr-1"></div>
                      <span>{t("in_favor")}: {partyData.favor}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-rose-500 rounded-sm mr-1"></div>
                      <span>{t("against")}: {partyData.contra}</span>
                    </div>
                    <div className="flex items-center">
                      <div className="w-2 h-2 bg-gray-400 rounded-sm mr-1"></div>
                      <span>{t("abstentions")}: {partyData.abstencao}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="font-montserrat">
      {/* Navigation tabs */}
      {renderTabs()}

      {/* Voting Bar Chart - responds to selected tab */}
      {/* {!hideDistributionChart && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <FiBarChart2 className="mr-2" /> 
              {activeTab === 'participants' ? t("vote_distribution_by_participant") : t("vote_distribution_by_party")}
            </h3>
          </div>
          
          <div className="mb-2">
            {renderBarChart()}
          </div>
          
          {renderVotingLegend()}
        </div>
      )} */}

      {/* Tab Content */}
      <div className="relative ">
        <AnimatePresence mode="wait" initial={false}>
          {/* Participants Tab */}
          {activeTab === 'participants' && (
            <motion.div
              key="participants"
              initial={{ opacity: 0, x: 20 * getAnimationDirection('participants') }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 * getAnimationDirection('participants') }}
              transition={{ duration: 0.3 }}
            >
              {renderParticipantsTab()}
            </motion.div>
          )}

          {/* Parties Tab */}
          {activeTab === 'parties' && (
            <motion.div
              key="parties"
              initial={{ opacity: 0, x: 20 * getAnimationDirection('parties') }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 * getAnimationDirection('parties') }}
              transition={{ duration: 0.3 }}
            >
              {renderPartiesTab()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default AtaVotingAdvanced;