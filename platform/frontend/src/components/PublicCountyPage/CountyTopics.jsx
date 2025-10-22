import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiFolder, FiChevronRight, FiUsers, FiFileText, FiArchive, FiCalendar} from "react-icons/fi";
import { useInView } from "react-intersection-observer";
import { el } from "date-fns/locale";
import { getTopicoIcon } from "../../utils/iconMappers.jsx";
import LangLink from "../common/LangLink";

const CountyTopics = ({ countyId, API_URL, onTopicClick, useDirectNavigation = true }) => {
  const { t, i18n } = useTranslation();

  // Helper function to get localized topic name
  const getLocalizedTopicName = (topic) => {
    if (i18n.language === 'en' && topic.name_en) {
      return topic.name_en;
    }
    return topic.name || topic.name_en || ''; // Fallback to name or name_en if name is missing
  };

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  const [topicos, setTopicos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialAnimationDone, setInitialAnimationDone] = useState(false);

  const [totalAtas, setTotalAtas] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [selectedYear, setSelectedYear] = useState("");
  const [availableYears, setAvailableYears] = useState([]);

  useEffect(() => {
    const fetchTopicos = async () => {
      try {
        setIsLoading(true);
        
        let url = `${API_URL}/v0/public/municipios/${countyId}/topicos?demo=${DEMO_MODE}`;
        if (selectedYear) {
          url += `&year=${selectedYear}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error("Failed to fetch topicos");
        }
        const data = await response.json();
        console.log("Fetched topicos:", data);
        
        // Sort topics alphabetically by localized name
        const sortedTopicos = data.topicos.sort((a, b) => {
          const nameA = getLocalizedTopicName(a).toLowerCase();
          const nameB = getLocalizedTopicName(b).toLowerCase();
          return nameA.localeCompare(nameB, i18n.language, { 
            numeric: true, 
            sensitivity: 'base' 
          });
        });
        
        setTopicos(sortedTopicos);
        setTotalAtas(data.total_atas);
        setTotalSubjects(data.total_assuntos);
      } catch (error) {
        console.error("Error fetching topicos:", error);
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTopicos();
  }, [countyId, API_URL, selectedYear]);

  // Fetch available years for the dropdown
  useEffect(() => {
    const fetchAvailableYears = async () => {
      try {
        const response = await fetch(`${API_URL}/v0/public/atas/search?municipio_id=${countyId}&per_page=1&demo=${DEMO_MODE}`);
        if (response.ok) {
          const data = await response.json();
          if (data.facets && data.facets.years) {
            const years = data.facets.years.map(yearData => yearData._id).sort((a, b) => b - a);
            setAvailableYears(years);
          }
        }
      } catch (error) {
        console.error("Error fetching available years:", error);
      }
    };

    fetchAvailableYears();
  }, [countyId, API_URL]);

  // Mark animations as done after initial load
  useEffect(() => {
    if (!isLoading && topicos.length > 0 && !initialAnimationDone) {
      const timer = setTimeout(() => {
        setInitialAnimationDone(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, topicos, initialAnimationDone]);

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  // Skeleton for loading state
  const renderSkeletons = () => (
    <div className="space-y-3 grid grid-cols-2">
      {[1, 2, 3, 4, 5, 6].map(index => (
        <div 
          key={index}
          className="border-b border-gray-200 dark:border-sky-800 py-3 animate-pulse"
        >
          <div className="flex items-center">
            {/* Skeleton icon */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-sky-800 mr-4"></div>
            
            {/* Skeleton content */}
            <div className="flex-grow">
              <div className="h-5 bg-gray-200 dark:bg-sky-800 rounded w-2/3 mb-2"></div>
                <div className="flex space-x-3">
                  <div className="h-4 bg-gray-200 dark:bg-sky-800 rounded w-16"></div>
                  <div className="h-4 bg-gray-200 dark:bg-sky-800 rounded w-16"></div>
                </div>
              </div>
            
            {/* Skeleton arrow */}
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-sky-800"></div>
          </div>
        </div>
      ))}
    </div>
  );

  // Animated topic row component
  const AnimatedTopicRow = ({ topic, index, countyId }) => {
    // Use intersection observer with threshold and delay based on index
    const { ref, inView } = useInView({
      threshold: 0.2,
      triggerOnce: true,
      delay: 100 * index,
      skip: initialAnimationDone
    });

    // If we've already shown animations, don't apply animation classes
    const animationClasses = initialAnimationDone 
      ? 'opacity-100 translate-y-0' 
      : inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8';

    const handleClick = () => {
      if (onTopicClick) {
        onTopicClick(topic.id, selectedYear);
      }
    };

    if (useDirectNavigation) {
      return (
        <LangLink 
          to={`/municipios/${countyId}/topicos/${topic.slug}${selectedYear ? `?year=${selectedYear}` : ''}`}
          ref={ref}
          className={`block border-b border-gray-200 dark:border-sky-800 transition-all duration-500 group ${animationClasses} cursor-pointer`}
        >
          <div className="flex items-center py-3">
            <div className="flex-shrink-0 mr-4 text-gray-600 dark:text-gray-100 group-hover:text-sky-700 transition-all duration-200">
              {getTopicoIcon(getLocalizedTopicName(topic))}
            </div>
            
            <div className="flex-grow min-w-0">
              <h3 className="font-medium text-sm text-gray-800 dark:text-sky-50 mb-1 truncate group-hover:text-sky-700 transition-all duration-200">{getLocalizedTopicName(topic)}</h3>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-200 group-hover:text-sky-900/80 transition-all duration-200">
                <span className="mr-3">
                  <FiArchive className="inline mr-1" /> 
                  {topic.atas_count || 0}{' '}
                  <span className="">
                    {topic.atas_count === 1 ? t("minute") : t("minutes")}
                  </span>
                </span>
                <span className="">
                  <FiFileText className="inline mr-1" /> 
                  {topic.subjects_count || 0}{' '}
                  <span className="">
                    {topic.subjects_count === 1 ? t("subject") : t("subjects")}
                  </span>
                </span>
              </div>
            </div>
          </div>
        </LangLink>
      );
    }

    return (
      <div 
        ref={ref}
        className={`block border-b border-gray-200 dark:border-sky-800 transition-all duration-500 group ${animationClasses} cursor-pointer`}
        onClick={handleClick}
      >
        <div className="flex items-center py-3">
          <div className="flex-shrink-0 mr-4 text-gray-600 dark:text-gray-100 group-hover:text-sky-700 transition-all duration-200">
            {getTopicoIcon(getLocalizedTopicName(topic))}
          </div>
          
          <div className="flex-grow min-w-0">
            <h3 className="font-medium text-sm text-gray-800 dark:text-sky-50 mb-1 truncate group-hover:text-sky-700 transition-all duration-200">{getLocalizedTopicName(topic)}</h3>
            <div className="flex items-center text-xs text-gray-500 dark:text-gray-200 group-hover:text-sky-900/80 transition-all duration-200">
              <span className="mr-3">
                <FiArchive className="inline mr-1" /> 
                {topic.atas_count || 0}{' '}
                <span className="">
                  {topic.atas_count === 1 ? t("minute") : t("minutes")}
                </span>
              </span>
              <span className="">
                <FiFileText className="inline mr-1" /> 
                {topic.subjects_count || 0}{' '}
                <span className="">
                  {topic.subjects_count === 1 ? t("subject") : t("subjects")}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-sky-950 rounded-md shadow-md p-6 font-montserrat">
        <div className="flex justify-between items-center align-bottom mb-3">
          {isLoading ? (
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4"></div>
          </h2>
          ) : (
            <div className="flex items-start justify-between w-full">
              <div className="flex items-center">  
                <FiFolder className="mr-2 text-gray-700 dark:text-gray-100" size={20} /> 
                <h2 className="text-sm md:text-lg font-bold text-gray-800 dark:text-gray-100">
                  {t("minutes_by_topic")}
                </h2>
              </div>

              {/* <div className="flex items-center space-x-2 bg-gray-100 py-1 px-2 rounded-md ">
                <span className="text-gray-500 text-xs flex items-center "> 
                  <FiArchive className="inline mr-1" /> 
                  {totalAtas || 0}{' '}
                   {totalAtas === 1 ? t("minute") : t("minutes")}
                </span>
                <span className="text-gray-500 text-xs flex items-center">
                  <FiFileText className="inline mr-1" />
                  {totalSubjects || 0}{' '}
                  {totalSubjects === 1 ? t("subject") : t("subjects")}
                </span>
              </div> */}

               {/* Year Filter */}
              {availableYears.length > 0 && (
                <div className="mb-4 flex items-center space-x-2">
                  <FiCalendar className="text-gray-600 dark:text-gray-100" size={16} />
                  <label htmlFor="year-filter" className="text-xs font-medium text-gray-700 dark:text-gray-100">
                    {t("filter_by_year")}:
                  </label>
                  <select
                    id="year-filter"
                    value={selectedYear}
                    onChange={handleYearChange}
                    className="text-xs border border-gray-300 dark:text-white dark:bg-sky-800 dark:border-sky-900 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  >
                    <option value="">{t("all_years")}</option>
                    {availableYears.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>
      
      {isLoading ? (
        renderSkeletons()
      ) : error ? (
        <div className="bg-red-50 text-red-800 p-4 rounded-md text-center">
          <p>{t("error_loading_departments")}</p>
        </div>
      ) : topicos.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-md">
          <FiFolder className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">
            {selectedYear ? t("no_departments_found_for_year") : t("no_departments_found")}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 gap-x-5">
          {topicos.map((topico, index) => (
            <AnimatedTopicRow key={topico.id} topic={topico} index={index} countyId={countyId} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CountyTopics;