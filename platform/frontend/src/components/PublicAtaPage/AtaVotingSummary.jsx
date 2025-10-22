import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { 
  FiCheckCircle, FiXCircle, FiAlertCircle, FiPieChart, 
  FiUsers, FiChevronDown, FiChevronUp, FiAward, FiThumbsUp, 
  FiThumbsDown, FiUser, FiUserCheck, FiBarChart2,
  FiArchive, FiSliders
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import AtaVotingAdvanced from "./AtaVotingAdvanced";
import AssuntoModal from "./AssuntoModal";
import { getTopicoIcon } from "../../utils/iconMappers";

const AtaVotingSummary = ({ ata, assuntos }) => {
  const { t, i18n } = useTranslation();
  const [votingData, setVotingData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAssuntoId, setSelectedAssuntoId] = useState(null);
  const [error, setError] = useState(null);
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [topicDistribution, setTopicDistribution] = useState([]);
  const [isHovering, setIsHovering] = useState(false);
  const [isScrollable, setIsScrollable] = useState(false);
  const topicChartRef = React.useRef(null);
  
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  // Calculate topic distribution from assuntos with voting breakdown
  useEffect(() => {
    if (!votingData || !votingData.assuntos || votingData.assuntos.length === 0) {
      setTopicDistribution([]);
      return;
    }

    const topicMap = new Map();
    
    votingData.assuntos.forEach(assunto => {
      // Check for topico
      const topicId = assunto.topico || 'no-topic';
      const topicTitle = assunto.topico || t("no_topic", "Sem Tópico");
      
      if (!topicMap.has(topicId)) {
        topicMap.set(topicId, {
          id: topicId,
          title: topicTitle,
          count: 0,
          votos_favor: 0,
          votos_contra: 0,
          abstencoes: 0
        });
      }
      
      const topic = topicMap.get(topicId);
      topic.count++;
      topic.votos_favor += assunto.votos_favor || 0;
      topic.votos_contra += assunto.votos_contra || 0;
      topic.abstencoes += assunto.abstencoes || 0;
    });

    // Convert to array and sort by count (descending)
    const distribution = Array.from(topicMap.values())
      .sort((a, b) => b.count - a.count);
    
    setTopicDistribution(distribution);
  }, [votingData, t]);

  // Check if topic chart is scrollable
  useEffect(() => {
    const checkScrollable = () => {
      if (topicChartRef.current) {
        const isOverflowing = topicChartRef.current.scrollHeight > topicChartRef.current.clientHeight;
        setIsScrollable(isOverflowing);
      }
    };

    const timer = setTimeout(checkScrollable, 100);
    window.addEventListener('resize', checkScrollable);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkScrollable);
    };
  }, [topicDistribution]);

  useEffect(() => {
    const fetchVotingData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/v0/public/atas/${ata.id}/voting-summary?demo=${DEMO_MODE}&lang=${i18n.language}`);
        if (!response.ok) {
          throw new Error("Failed to fetch voting data");
        }
        const data = await response.json();
        setVotingData(data);
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

  // Toggle advanced view
  const toggleAdvancedView = () => {
    setShowAdvancedView(!showAdvancedView);
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
        <h2 className="text-xl font-bold text-sky-950 mb-4 flex items-center">
          <FiPieChart className="mr-2" /> {t("voting_summary")}
        </h2>
        <div className="bg-red-50 p-4 rounded-md text-red-700">
          <p>{t("error_loading_voting_data")}</p>
        </div>
      </div>
    );
  }

  // If there are no subjects with voting information
  if (votingData.total_assuntos === 0 || votingData.assuntos.length === 0) {
    return (
      <div className="mb-6 font-montserrat">
        <div className="bg-gray-50 p-4 py-20 rounded-md text-gray-500 text-center">
          <FiArchive className="mx-auto h-12 w-12 text-gray-400" />
          <p>{t("no_voting_data_available")}</p>
        </div>
      </div>
    );
  }

  const totalSubjects = assuntos?.length || 0;
  
  // Generate colors for topics (you can customize this)
  const getColorForIndex = (index) => {
    const colors = [
      'bg-sky-500',
      'bg-emerald-500', 
      'bg-purple-500',
      'bg-amber-500',
      'bg-rose-500',
      'bg-indigo-500',
      'bg-teal-500',
      'bg-orange-500',
      'bg-pink-500',
      'bg-cyan-500'
    ];
    return colors[index % colors.length];
  };

  const renderTopicBarChart = () => {
    if (!topicDistribution || topicDistribution.length === 0) {
      return (
        <div className="w-full">
          <div className="h-32 bg-gray-100 rounded-md flex items-center justify-center">
            <span className="text-xs text-gray-500">{t("no_topics_available")}</span>
          </div>
        </div>
      );
    }

    // Find max count for scaling
    const maxCount = Math.max(...topicDistribution.map(t => t.count));
    
    // Calculate nice round number for max axis value
    const getAxisMax = (max) => {
      if (max <= 5) return 5;
      if (max <= 10) return 10;
      if (max <= 20) return 20;
      if (max <= 50) return 50;
      return Math.ceil(max / 10) * 10;
    };
    
    const axisMax = getAxisMax(maxCount);

    return (
      <div className="w-full">
        {/* Chart */}
        <div className="space-y-3">
          {topicDistribution.map((topic, index) => {
            const widthPercentage = (topic.count / axisMax) * 100;
            const barColor = getColorForIndex(index);
            
            // Calculate voting percentages within this topic
            const totalVotes = topic.votos_favor + topic.votos_contra + topic.abstencoes;
            const favorPercentage = totalVotes > 0 ? (topic.votos_favor / totalVotes) * 100 : 0;
            const contraPercentage = totalVotes > 0 ? (topic.votos_contra / totalVotes) * 100 : 0;
            const abstencaoPercentage = totalVotes > 0 ? (topic.abstencoes / totalVotes) * 100 : 0;
            
            return (
              <div key={topic.id} className="flex items-center gap-2">
                {/* Topic icon and label - fixed width */}
                <div className="flex items-center gap-2 w-[140px] md:w-[180px]">
                  <div className={`bg-sky-950 p-1.5 rounded flex-shrink-0`}>
                    {getTopicoIcon(topic.title, "w-4 h-4 text-white")}
                  </div>
                  <span 
                    className="text-xs text-gray-700 line-clamp-1 flex-1 cursor-default"
                    title={topic.title}
                  >
                    {topic.title}
                  </span>
                </div>
                
                {/* Bar with voting breakdown */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-md h-8 relative overflow-hidden">
                    <div
                      className="h-full flex rounded-md overflow-hidden transition-all duration-500 ease-out"
                      style={{ width: `${widthPercentage}%` }}
                    >
                      {/* Favor segment */}
                      {topic.votos_favor > 0 && (
                        <div
                          className="bg-emerald-500 h-full flex items-center justify-center"
                          style={{ width: `${favorPercentage}%` }}
                          title={`${t("favor", "A Favor")}: ${topic.votos_favor}`}
                        >
                          {favorPercentage > 15 && (
                            <span className="text-[10px] font-semibold text-white">
                              {topic.votos_favor}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Contra segment */}
                      {topic.votos_contra > 0 && (
                        <div
                          className="bg-rose-500 h-full flex items-center justify-center"
                          style={{ width: `${contraPercentage}%` }}
                          title={`${t("against", "Contra")}: ${topic.votos_contra}`}
                        >
                          {contraPercentage > 15 && (
                            <span className="text-[10px] font-semibold text-white">
                              {topic.votos_contra}
                            </span>
                          )}
                        </div>
                      )}
                      {/* Abstention segment */}
                      {topic.abstencoes > 0 && (
                        <div
                          className="bg-gray-400 h-full flex items-center justify-center"
                          style={{ width: `${abstencaoPercentage}%` }}
                          title={`${t("abstention", "Abstenção")}: ${topic.abstencoes}`}
                        >
                          {abstencaoPercentage > 15 && (
                            <span className="text-[10px] font-semibold text-white">
                              {topic.abstencoes}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 min-w-[25px] text-right">
                    {topic.count}
                  </span>
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

      {/* Reorganized layout - two columns */}
      <div className="flex flex-wrap md:flex-nowrap gap-6 mb-2">
        {/* Right column - Overall approval - 1/3 width - Shows first on mobile */}
        <div className="w-full md:w-1/3 md:order-2 md:border-l-1 md:border-sky-700/30 md:pl-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">{t("overall_approval")}</h3>
          <div className="grid grid-cols-2 md:grid-cols-1 gap-3">
            <div className="bg-emerald-50 p-3 rounded-md flex flex-col items-center">
              <div className="text-2xl font-bold text-emerald-600">{votingData.aprovados}</div>
              <div className="text-xs text-gray-600 text-center">{t("approved_items")}</div>
            </div>
            <div className="bg-rose-50 p-3 rounded-md flex flex-col items-center">
              <div className="text-2xl font-bold text-rose-600">{votingData.reprovados}</div>
              <div className="text-xs text-gray-600 text-center">{t("rejected_items")}</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-md flex flex-col items-center">
              <div className="text-2xl font-bold text-blue-600">{votingData.unanimes || 0}</div>
              <div className="text-xs text-gray-600 text-center">{t("unanimous")}</div>
            </div>
            <div className="bg-amber-50 p-3 rounded-md flex flex-col items-center">
              <div className="text-2xl font-bold text-amber-600">{votingData.maioria || 0}</div>
              <div className="text-xs text-gray-600 text-center">{t("by_majority")}</div>
            </div>
          </div>
        </div>

        {/* Left column - Topic distribution chart - 2/3 width - Shows second on mobile */}
        <div className="w-full md:w-2/3 md:order-1">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">{t("topic_distribution")}</h3>
          </div>
          
          <div 
            ref={topicChartRef}
            className="md:max-h-[330px] md:overflow-y-auto md:pr-5"
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
          >
            {renderTopicBarChart()}
          </div>
          
          {/* Scroll hint - shown on hover only when scrollable */}
          <div className="hidden md:flex items-center justify-center mt-2 min-h-[28px]">
            <AnimatePresence>
              {isHovering && isScrollable && (
                <motion.div 
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-md"
                >
                  <FiChevronDown className="w-3 h-3 animate-bounce" />
                  <span>{t("scroll_to_see_more", "Scroll to see more topics")}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Toggle button for advanced view */}
      <div className="flex justify-center md:justify-end mt-0">
        <button
          onClick={toggleAdvancedView}
          className="flex items-center text-sm px-4 py-1 bg-sky-700 hover:bg-sky-800 text-white rounded-md transition-colors duration-200"
        >
          {showAdvancedView ? t("see_less_details") : t("see_more_details")}
          <motion.div
            animate={{ rotate: showAdvancedView ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="ml-2"
          >
            <FiChevronDown />
          </motion.div>
        </button>
      </div>

      {/* Advanced View Section with animation */}
      <AnimatePresence>
        {showAdvancedView && (
          <motion.div 
            initial={{ opacity: 0, height: 0, scale: 0.98, transformOrigin: "top" }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.98 }}
            transition={{ 
              duration: 0.4, 
              ease: [0.04, 0.62, 0.23, 0.98],
              height: { duration: 0.4 },
              opacity: { duration: 0.25 }
            }}
            className="overflow-hidden"
          >
            <div className="pt-0 rounded-md">
              <AtaVotingAdvanced 
                ata={ata} 
                API_URL={API_URL} 
                hideDistributionChart={true}
                setSelectedAssuntoId={setSelectedAssuntoId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedAssuntoId && (
          <AssuntoModal
            assuntoId={selectedAssuntoId}
            onClose={() => setSelectedAssuntoId(null)}
            API_URL={API_URL}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaVotingSummary;