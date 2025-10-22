import React, { useState, memo } from "react";
import { useTranslation } from "react-i18next";
import { FiFileText, FiUsers, FiInfo, FiArchive, FiAlertCircle } from "react-icons/fi";
import { RiBookOpenLine } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import HTMLContent from "../common/HTMLContent";

// Memoized component for the content that shouldn't re-render on hover
const StatContent = memo(({ Icon, value, label, t }) => (
  <>
    <Icon className="text-gray-800 text-lg" />
    <HTMLContent 
      value={value}
      className="text-md md:text-lg font-bold text-gray-800"
      duration={2.5}
    />
    <span className="text-sm md:text-md text-gray-600">{t(label)}</span>
  </>
));

const StatBox = ({ id, icon, value, label, text, isHovered, onHover, onLeave, t }) => (
  <div 
    className="flex flex-row items-center text-center relative gap-x-4"
    onMouseEnter={() => onHover(id)}
    onMouseLeave={() => onLeave()}
  >
    {/* <AnimatePresence>
      {isHovered && (
        <motion.div
          initial="hidden"
          animate="visible"
          exit="hidden"
          variants={{
            hidden: { opacity: 0, y: 10 },
            visible: { opacity: 1, y: 0 }
          }}
          transition={{ duration: 0.3 }}
          className="absolute bottom-full mb-2 p-3 bg-gray-800 text-white rounded-lg shadow-lg z-10 max-w-xs mx-auto"
        >
          <div className="text-sm">{t(text)}</div>
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1/2 rotate-45 w-3 h-3 bg-gray-800"></div>
        </motion.div>
      )}
    </AnimatePresence> */}
    <StatContent Icon={icon} value={value} label={label} t={t} />
  </div>
);

const CountyStats = ({ stats }) => {
  const { t } = useTranslation();
  const [hoveredStat, setHoveredStat] = useState(null);
  
  return (
    <div className="bg-white rounded-md shadow-md font-montserrat mb-8">
       {/* stats title */}
      
      <div className="container mx-auto p-4">
         <div className="flex items-center mb-4">
       <FiAlertCircle
        className="mr-2 text-gray-700" size={24} /> 
          <h2 className="text-xl font-bold text-gray-800">
            {/* {t("county_statistics")} */}
            Estatísticas
          </h2>
          </div>
        <div className="grid grid-cols-1 grid-rows-3 gap-3">
          <div className=" border-gray-200">
            <StatBox 
              id="minutes" 
              icon={FiFileText} 
              value={stats.totalAtas} 
              label="total_minutes" 
              text={t("minutes_tooltip", { count: stats.totalAtas })}
              isHovered={hoveredStat === "minutes"}
              onHover={setHoveredStat}
              onLeave={() => setHoveredStat(null)}
              t={t}
            />
          </div>
          
          {/* <div className="md: md:border-gray-200">
            <StatBox 
              id="pages" 
              icon={RiBookOpenLine} 
              value={stats.totalPages} 
              label="total_pages" 
              text={t("pages_tooltip", { count: stats.totalPages })}
              isHovered={hoveredStat === "pages"}
              onHover={setHoveredStat}
              onLeave={() => setHoveredStat(null)}
              t={t}
            />
          </div> */}
          
          <div className=" border-gray-200">
            <StatBox 
              id="subjects" 
              icon={FiInfo} 
              value={stats.totalSubjects} 
              label="subjects_discussed" 
              text={t("subjects_tooltip", { count: stats.totalSubjects })}
              isHovered={hoveredStat === "subjects"}
              onHover={setHoveredStat}
              onLeave={() => setHoveredStat(null)}
              t={t}
            />
          </div>

          <div>
            <StatBox 
              id="subjects_with_votes" 
              icon={FiArchive} 
              value={stats.totalSubjectsWithVotes} 
              label="total_subjects_with_votes" 
              text={t("total_subjects_with_votes_tooltip", { count: stats.totalSubjectsWithVotes })}
              isHovered={hoveredStat === "subjects_with_votes"}
              onHover={setHoveredStat}
              onLeave={() => setHoveredStat(null)}
              t={t}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CountyStats;