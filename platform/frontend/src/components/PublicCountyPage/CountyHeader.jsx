import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FiExternalLink, FiMapPin, FiChevronRight, FiHome, FiLink } from "react-icons/fi";
import LangLink from "../common/LangLink";

const CountyHeader = ({ county, viewType = "geral", toggleViewType }) => {
  const { t, i18n } = useTranslation();

  // Helper function to get localized county name
  const getLocalizedCountyName = (county) => {
    if (i18n.language === 'en' && county.name_en) {
      return county.name_en;
    }
    return county.name || county.name_en || '';
  };

  // Helper function to get localized county description
  const getLocalizedCountyDescription = (county) => {
    if (i18n.language === 'en' && county.description_en) {
      return county.description_en;
    }
    return county.description || county.description_en || '';
  };

  const API_URL = import.meta.env.VITE_API_URL;
  const isFullView = !viewType || viewType === "geral";
  
  return (
    <motion.div 
      className="bg-sky-800 dark:bg-sky-950"
      animate={{
        paddingTop: isFullView ? '3.75rem' : '3.75rem',
        paddingBottom: isFullView ? '1rem' : '1rem'
      }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
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
                <nav className="flex items-center text-sm font-montserrat bg-sky-700 dark:bg-sky-900 rounded-md px-4 py-1" aria-label="Breadcrumb">
                  <ol className="flex flex-wrap items-center">
                    <li className="flex items-center">
                      <LangLink
                        to="/"
                          className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                        after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white"
                      >
                        {/* {t("home")} */}
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
                       <button
                        className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                        after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-white cursor-pointer"
                        onClick={() => toggleViewType('geral')}
                      >
                        {getLocalizedCountyName(county)}
                      </button>
                    </li>
                    <li className="flex items-center">
                      <FiChevronRight className="mx-2 text-sky-100 opacity-70" />
                      <span className="text-white font-medium capitalize">
                        {viewType === "geral" ? t("general_view"): viewType === "grid" ? t("list_view") : t("timeline")}
                      </span>
                    </li>
                  </ol>
                </nav>
              </motion.div>
          </AnimatePresence>

          {/* header */}
          <motion.div 
            className="flex flex-col items-center sm:flex-row"
            animate={{
              gap: isFullView ? '1rem' : '1rem'
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {/* county image */}
            <div className="flex items-center justify-center sm:justify-start mb-0 sm:mb-0 flex-shrink-0">
              <motion.div 
                className="rounded-md overflow-hidden flex-shrink-0"
                animate={{
                  width: isFullView ? '10rem' : '4rem',
                  height: isFullView ? '10rem' : '4rem',
                  minWidth: isFullView ? '10rem' : '4rem',
                  minHeight: isFullView ? '10rem' : '4rem'
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <motion.img 
                  src={API_URL + county.squaredImageUrl}
                  alt={getLocalizedCountyName(county)} 
                  className="object-cover w-full h-full"
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  whileHover={{ scale: 1.05 }}
                />
              </motion.div>
            </div>
            
            {/* title & website */}
            <div className="flex flex-col items-center sm:items-start">
              <motion.h1 
                className="font-bold text-white font-montserrat mb-0 text-center sm:text-left pb-0 leading-tight"
                animate={{
                  fontSize: isFullView ? '2rem' : '1.5rem'
                }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
              >
                {getLocalizedCountyName(county)}
              </motion.h1>
              
              <AnimatePresence>
                  <motion.div 
                    className="flex flex-row font-montserrat text-sm mt-0 pt-0 mb-2"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    {county.website && (
                      <div className="flex items-center space-x-2 text-sky-200 hover:text-white transition-colors duration-300 group">
                      <a 
                        href={county.website}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-montserrat flex items-center space-x-2 relative transition-all duration-300 ease-in-out 
                        after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-300 hover:after:w-full text-sky-200 hover:text-white"
                      >
                        {/* <span>{t("official_website")}</span> */}
                        <span>{new URL(county.website).hostname}</span>
                        
                      </a>
                      {/* <FiExternalLink className="ml-1" />  */}
                      <FiLink className="" />
                      </div>
                    )}
                  </motion.div>
              </AnimatePresence>

              {/* description */}
              {isFullView && getLocalizedCountyDescription(county) && (
                <AnimatePresence>
                  <motion.div 
                    className="pt-1"
                    initial={{ opacity: 0, height: 0, y: 20 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: 20 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                  >
                    <motion.p 
                      className="text-sm italic text-sky-50 leading-relaxed text-justify font-montserrat"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {getLocalizedCountyDescription(county)}
                    </motion.p>
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CountyHeader;