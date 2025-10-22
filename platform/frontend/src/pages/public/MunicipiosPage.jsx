import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FiSearch, FiMapPin, FiChevronLeft, FiChevronRight, FiHome } from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion"; // Add framer-motion
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import CountyGridDynamic from "../../components/HomePage/CountyGridDynamic";
import CountyLoadingState from "../../components/common/states/LoadingState";
import LangLink from "../../components/common/LangLink";

const CountiesPage = () => {
  const [counties, setCounties] = useState([]);
  const [filteredCounties, setFilteredCounties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState("alphabetical");
  
  // Animation state variables
  const EXIT_ANIMATION_DURATION = 1500; // 1.5 seconds
  const MINIMUM_LOADING_TIME = 500; // 0.5 seconds minimum display time
  
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  useEffect(() => {
    document.title = `${t("counties")} | CitiLink`;
  }, [t]);


  useEffect(() => {
    const fetchCounties = async () => {
      const startTime = Date.now();

      try {
        //  Loading States
        setIsLoading(true);
        setShowLoadingState(true);
        setLoadingExiting(false);
        setContentReady(false);
        
        const response = await fetch(`${API_URL}/v0/public/municipios?demo=${DEMO_MODE}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch counties");
        }
        
        const data = await response.json();
        setCounties(data);
        setFilteredCounties(data);
        setError(null);
        
        // Set content as ready immediately after data is loaded
        setIsLoading(false);

        // Calculate elapsed loading time
        const loadingTime = Date.now() - startTime;
        // Calculate additional time needed to reach minimum display time
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        
        console.log(`Data loaded in ${loadingTime}ms, adding ${additionalDelay}ms delay to meet minimum display time.`);
        
        // Start exit animation and remove loading component after animation completes
        setTimeout(() => {
          setContentReady(true);
          setLoadingExiting(true);
          
          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay); // Small delay before starting exit animation
      } catch (err) {
        console.error("Error fetching counties:", err);
        setError("counties_error"); // Store error key instead of translated string
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

    fetchCounties();
  }, [API_URL]); // Remove t from dependencies to prevent refetching on language change

  // Filter and sort counties when search query or sort order changes
  useEffect(() => {
    let results = [...counties];
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      results = results.filter(county => 
        county.name.toLowerCase().includes(query)
      );
    } 
    
    // Sort counties
    results = results.sort((a, b) => {
      if (sortOrder === "alphabetical") { 
        return a.name.replace(/Município (da|do|de)\s/, "").localeCompare(
          b.name.replace(/Município (da|do|de)\s/, "")
        );
      } else if (sortOrder === "reverse") {
        return b.name.replace(/Município (da|do|de)\s/, "").localeCompare(
          a.name.replace(/Município (da|do|de)\s/, "")
        );
      }
      return 0;
    });
    
    setFilteredCounties(results);
  }, [counties, searchQuery, sortOrder]);

  const handleSortChange = (e) => {
    setSortOrder(e.target.value);
  };

  return (
    <>
      {/* Show content first so it's behind the loading screen */}
      {contentReady && (
        <div className="font-montserrat">
          <Navbar />
          
          <div className="bg-sky-800 pt-15 pb-3 font-montserrat">
            <div className="container mx-auto px-4">
              {/* Breadcrumb navigation */}
              <div className="flex items-center mb-7">
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
                      <span className="text-white font-medium">
                        {t("counties")}
                      </span>
                    </li>
                  </ol>
                </nav>
              </div>

              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
                <div>
                  <div className="flex items-center">
                    <div className="text-white mr-3">
                      <FaLandmark size={20} /> 
                    </div>
                    <h1 className="text-2xl font-bold text-white font-montserrat">
                      <span>{t("counties")}</span>
                    </h1>
                  </div>
                  <p className="text-gray-200 mt-3">
                    {t("counties_page_description")}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* search bar and sort */}
          <div className="bg-sky-800">
            <div className="container mx-auto px-4 pb-7">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">

                <div className="relative w-full ">
                  <input
                    type="text"
                    placeholder={t("search_counties_placeholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full font-montserrat px-3 py-2 pl-10 rounded-md border-gray-300 bg-white text-gray-900 ring-sky-900 focus:ring-2 focus:ring-sky-900 focus:border-sky-900"
                  />
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <FiSearch className="h-5 w-5 text-gray-400" />
                  </div>
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                <div className="flex items-center w-full sm:w-1/3 md:w-1/4  lg:w-1/5 gap-4">
                  {/* Standard Select for Sorting */}
                  <div className="relative w-full ">
                    <select
                      value={sortOrder}
                      onChange={handleSortChange}
                      className="w-full appearance-none font-montserrat px-3 py-2 rounded-md border-gray-300 bg-white text-gray-900 ring-sky-900 focus:ring-2 focus:ring-sky-900 focus:border-sky-900 pr-10"
                      aria-label={t("sort_by")}
                    >
                      <option value="alphabetical">{t("name_az")}</option>
                      <option value="reverse">{t("name_za")}</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-gray-400">
                        <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="container bg-white mx-auto px-4 py-8">
            {/* Mobile Results Info */}
            <div className="mb-4 text-gray-600 text-sm">
              {isLoading ? (
                t("loading_counties")
              ) : (
                <>
                  {t("showing_counties", { 
                    showing: filteredCounties.length, 
                    total: counties.length 
                  })}
                  {searchQuery && (
                    <> {t("for_search")} "<span className="font-medium">{searchQuery}</span>"</>
                  )}
                </>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-6 rounded-lg text-center mb-8">
                <p className="text-lg font-medium">{t(error)}</p>
                <p className="mt-2">{t("try_again_later")}</p>
              </div>
            )}

            {/* Using CountyGridDynamic component */}
            {filteredCounties.length === 0 && !isLoading ? (
              <div className="text-center py-16 bg-white">
                <FaLandmark className="h-12 w-12 mx-auto text-sky-900 mb-4" />
                <h3 className="text-xl font-medium text-gray-800 mb-2">{t("no_counties_found")}</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {t("no_counties_found_description")}
                </p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="mt-4 px-4 py-2 bg-sky-800 text-white rounded-md hover:bg-sky-700 transition-colors duration-300 ease-in-out"
                  >
                    {t("clear_search")}
                  </button>
                )}
              </div>
            ) : (
              <CountyGridDynamic counties={filteredCounties} isLoading={isLoading} />
            )}
          </div>
          
          <Footer />
        </div>
      )}

      {/* Add AnimatePresence for LoadingState - this will be on top */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <CountyLoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </>
  );
};

export default CountiesPage;