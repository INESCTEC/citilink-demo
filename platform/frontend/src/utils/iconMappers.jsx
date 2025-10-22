import React from 'react';
import { 
  FiFolder, 
  FiBarChart2, 
  FiCloud, 
  FiFileText, 
  FiUsers, 
  FiCpu,
  FiArchive,
  FiHome,
  FiTool,
  FiShield,
  FiGlobe,
  FiMessageCircle,
  FiZap,
  FiAlertTriangle,
  FiHeart,
  FiCompass,
  FiInfo,
  FiBriefcase,
  FiLayers,
  FiMap
} from "react-icons/fi";
import { FaArchive, FaBold, FaBolt, FaBriefcase, FaCar, FaCloud, FaComment, FaExclamationTriangle, FaFlask, FaGlobeEurope, FaGraduationCap, FaHeart, FaHeartbeat, FaHome, FaInfo, FaMap, FaMonero, FaMoneyBill, FaMoneyBillAlt, FaPaw, FaRunning, FaShieldAlt, FaTheaterMasks, FaToolbox, FaTools, FaUsers } from "react-icons/fa";

/**
 * Returns an appropriate icon component based on topic name
 * @param {string} name - The name of the topic
 * @returns {React.ReactElement} - Icon component
 */
export const getTopicoIcon = (name, size = "w-5 h-5") => {
  // Handle cases where name is undefined or null
  if (!name || typeof name !== 'string') {
    return <FiFolder className={size} />; // Default icon
  }
  
  const nameLC = name.toLowerCase();
  
  // Administration
  if (nameLC.includes("administra")) {
    return <FaBriefcase className={size} />;
  }
  if (nameLC.includes("desporto") || nameLC.includes("sports")) {
     return <FaRunning className={size} />;
  }
  // Finance/Economy
  else if (nameLC.includes("financ") || nameLC.includes("econom") || nameLC.includes("orçament")) {
    return <FaMoneyBill className={size} />;
  }
  // Environment
  else if (nameLC.includes("ambie") || nameLC.includes("environment") || nameLC.includes("clima") || nameLC.includes("climate")) {
    return <FaCloud className={size} />;
  }
  // Urban planning/Housing
  else if (nameLC.includes("urban") || nameLC.includes("habita" || nameLC.includes("hous"))) {
    return <FaHome className={size} />;
  }
  // cultura
  else if (nameLC.includes("cultur")) {
    return <FaTheaterMasks className={size} />;
  }
  else if (nameLC.includes("escola") || nameLC.includes("educa") || nameLC.includes("school") || nameLC.includes("education")) {
    return <FaGraduationCap className={size} />;
  }
  // Social
  else if (nameLC.includes("human") || nameLC.includes("social") || nameLC.includes("recursos human")) {
    return <FaUsers className={size} />;
  }
  // health
  else if (nameLC.includes("saúde") || nameLC.includes("saude") || nameLC.includes("health")) {
    return <FaHeartbeat className={size} />;
  }
  // Transport/Mobility/Infrastructure/Traffic
  else if (nameLC.includes("transp") || nameLC.includes("mobilid") || nameLC.includes("infraestrut") || nameLC.includes("trânsito") || nameLC.includes("traffic") || nameLC.includes("transport")) {
    return <FaCar className={size} />;  
  }
  // Digital/Technology
  else if (nameLC.includes("digital") || nameLC.includes("tecnologia") || nameLC.includes("moderniza")) {
    return <FiCpu className={size} />;
  }
  // Construction and works
  else if (nameLC.includes("obra") || nameLC.includes("work")) {
    return <FaToolbox className={size} />;
  }
  // Territory planning
  else if (nameLC.includes("território") || nameLC.includes("planeamento") || nameLC.includes("territory") || nameLC.includes("planning")) {
    return <FaMap className={size} />;
  }
  // Heritage and archive
  else if (nameLC.includes("patrimó")) {
    return <FaArchive className={size} />;
  }
  // Science
  else if (nameLC.includes("ciência") || nameLC.includes("science")) {
    return <FaFlask className={size} />;
  }
  // Energy
  else if (nameLC.includes("energia") || nameLC.includes("energ")) {
    return <FaBolt className={size} />;
  }
  // Communications and PR
  else if (nameLC.includes("comunica") || nameLC.includes("communicat")) {
    return <FaComment className={size} />;
  }
  // International relations
  else if (nameLC.includes("internacional") || nameLC.includes("externa")) {
    return <FaGlobeEurope className={size} />;
  }
  // Police and security
  else if (nameLC.includes("polícia") || nameLC.includes("police") || nameLC.includes("seguran") || nameLC.includes("security")) {
    return <FaShieldAlt className={size} />;
  }
  // Animal protection
  else if (nameLC.includes("animal")) {
    return <FaPaw className={size} />;
  }
  // Civil protection
  else if (nameLC.includes("proteção civil") || nameLC.includes("civil protection")) {
    return <FaExclamationTriangle className={size} />;
  }
  // Health specific
  else if (nameLC.includes("saúde")) {
    return <FaHeartbeat className={size} />;
  }
  // Tourism
  else if (nameLC.includes("turismo")) {
    return <FiCompass className={size} />;
  }
  // Other information
  else if (nameLC.includes("outr") || nameLC.includes("informaç") || nameLC.includes("other")) {
    return <FaInfo className={size} />;
  }
  // Activities (generic)
  else if (nameLC.includes("ativi")) {
    return <FaMoneyBillAlt  className={size} />;
  }
  
  // Default
  return <FiFolder className={size} />;
};