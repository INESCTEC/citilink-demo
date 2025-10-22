import { useState, useEffect } from "react";
import { Link, Navigate, useNavigate, } from "react-router-dom";
import { FiSearch, FiHome, FiUsers, FiGlobe, FiCalendar, FiFilter, FiChevronDown, FiClock, FiChevronUp, FiX, FiSliders} from "react-icons/fi";
import { useTranslation } from "react-i18next";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { FaLandmark } from "react-icons/fa";
import CountyGrid from "../components/Homepage/CountyGrid";
import { motion, AnimatePresence } from "framer-motion"; 
import LoadingStateOverlay from "../components/common/states/LoadingStateOverlay";
import GenericSearchHeader from "../components/SearchPage/GenericSearchHeader"; // Import GenericSearchHeader

import h1 from "../assets/h1.png";
import h2 from "../assets/h2.png";
import m1 from "../assets/m1.png";
import { useLangNavigate } from "../hooks/useLangNavigate";

function PublicView() {
  const [bgImage, setBgImage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isOpinionsLoading, setIsOpinionsLoading] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  
  const [searchType, setSearchType] = useState("atas");

  const [keyword, setKeyword] = useState("");
  const [title, setTitle] = useState("");
  const [municipioId, setMunicipioId] = useState("");
  const [participanteId, setParticipanteId] = useState([]); 
  const [participantsLogic, setParticipantsLogic] = useState("or");
  const [topicsLogic, setTopicsLogic] = useState("or");
  const [year, setYear] = useState("");
  const [tipo, setTipo] = useState("");
  const [dateMode, setDateMode] = useState(() => {
    try {
      const stored = localStorage.getItem('facetDateMode');
      return stored === null ? 'year' : stored;
    } catch {
      return 'year';
    }
  });
    // Save dateMode to localStorage whenever it changes
    useEffect(() => {
      try {
        localStorage.setItem('facetDateMode', dateMode);
      } catch {}
    }, [dateMode]);

  const [party, setParty] = useState(""); 
  const [topico, setTopico] = useState([]);  // Updated to array for multiple selection
  const [aprovado, setAprovado] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sortBy, setSortBy] = useState("score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  const [municipios, setMunicipios] = useState([]);
  const [topicos, setTopicos] = useState([]);

  const { t, i18n } = useTranslation();

  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  const navigate = useLangNavigate();

  // setting the SEO data dynamically
  useEffect(() => {
    document.title = t("public.title") || "CitiLink - Plataforma de transparência e participação dos cidadãos";
    document.querySelector('meta[name="description"]').setAttribute("content", t("public.description") || "Explore the latest public content from CitiLink.");
    document.querySelector('meta[property="og:title"]').setAttribute("content", t("public.title") || "CitiLink - Plataforma de transparência e participação dos cidadãos");
    document.querySelector('meta[property="og:description"]').setAttribute("content", t("public.description") || "Explore the latest public content from CitiLink.");
    document.querySelector('meta[property="og:url"]').setAttribute("content", `https://citilink.pt/sobre`);
    // document.querySelector('meta[property="og:image"]').setAttribute("content", bgImage || "https://nabu.dcc.fc.up.pt/api/assets/" + primaryImage);
  }, []);


  useEffect(() => {
    async function fetchImage() {
      setIsLoading(true);
      try {
        const response = await fetch("https://nabu.dcc.fc.up.pt/api/items/projects?filter[id][_eq]=1&fields=primary_image");
        const data = await response.json();
        const primaryImage = data.data[0].primary_image;
        setBgImage("https://nabu.dcc.fc.up.pt/api/assets/" + primaryImage);
      } catch (error) {
        console.error("Failed to fetch image:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchImage();
    fetchInitialData();
    
    // sim..
    const timer = setTimeout(() => {
      setIsOpinionsLoading(false);
    }, 1500);
    
    // Add overlay animation timeout
    const overlayTimer = setTimeout(() => {
      setShowOverlay(false);
    }, 700);
    
    return () => {
      clearTimeout(timer);
      clearTimeout(overlayTimer);
    };
  }, []);

  // Fetch initial data - COPIED FROM MODAL
  const fetchInitialData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch municipalities and topics in parallel
      const [municipiosResponse, topicosResponse] = await Promise.all([
        fetch(`${API_URL}/v0/public/municipios?demo=${DEMO_MODE}`),
        fetch(`${API_URL}/v0/public/topicos?demo=${DEMO_MODE}`)
      ]);
      
      if (municipiosResponse.ok) {
        const data = await municipiosResponse.json();
        const sortedCounties = [...data].sort((a, b) => 
         a.name.replace(/Município (da|do|de)\s/, "").localeCompare(
           b.name.replace(/Município (da|do|de)\s/, "")
         )
       );
        setMunicipios(sortedCounties);
      }
      
      if (topicosResponse.ok) {
        const data = await topicosResponse.json();
        setTopicos(data);
      }
    } catch (error) {
      console.error("Error fetching data for search:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle search submit
  const handleSearch = () => {

    if (!keyword) {
      set
    }
    // Build query parameters
    const params = new URLSearchParams();
    
    if (keyword) params.append("q", keyword);
    if (title) params.append("title", title);
    if (municipioId) params.append("municipio_id", municipioId);

    if (tipo) params.append("tipo", tipo);
    
    // Handle multiple participant selection
    if (Array.isArray(participanteId) && participanteId.length > 0) {
      participanteId.forEach(id => {
        params.append("participant_id", String(id));
      });
    } else if (participanteId && participanteId !== "") {
      params.append("participant_id", String(participanteId));
    }
    
    if (party) params.append("party", party);
    
    // Handle multiple topic selection for "assuntos" search type
    if (Array.isArray(topico) && topico.length > 0) {
      topico.forEach(id => {
        params.append("topico", String(id));
      });
    } else if (topico && topico !== "") {
      params.append("topico", String(topico));
    }

     if (dateMode === "year" && year) {
      params.append("year", year);
    } else if (dateMode === "period") {
      if (startDate) params.append("start_date", startDate);
      if (endDate) params.append("end_date", endDate);
    }
    
    if (searchType === "assuntos" && aprovado !== "") params.append("aprovado", aprovado);
    params.append("sort", sortBy);
    params.append("order", sortOrder);
    params.append("type", searchType);
    
    // Navigate to search page with these parameters
    navigate(`/pesquisa?${params.toString()}`);
  };

 const handleClearFilters = () => {
    setTitle("");
    setMunicipioId("");
    setParticipanteId([]);
    setParty("");
    setTipo("");
    setTopico([]);
    setAprovado("");
    setStartDate("");
    setEndDate("");
    setSortBy("date");
    setSortOrder("desc");
    setYear(""); // <-- Reset year
    setParticipantsLogic("and");
    setTopicsLogic("and");
  };

  const toggleSearchType = (type) => {
    if (type !== searchType) {
      setSearchType(type);
      handleClearFilters();
    }
  };

   const filterState = {
    keyword, setKeyword,
    title, setTitle,
    municipioId, setMunicipioId,
    participanteId, setParticipanteId,
    participantsLogic, setParticipantsLogic,
    topicsLogic, setTopicsLogic,
    dateMode, setDateMode,
    year, setYear, // <-- Add year
    party, setParty,
    topico, setTopico,
    aprovado, setAprovado,
    startDate, setStartDate,
    endDate, setEndDate,
    sortBy, setSortBy,
    sortOrder, setSortOrder,
    showAdvancedFilters, setShowAdvancedFilters,
    tipo, setTipo
  };

  return (
    <div className="min-h-screen bg-700">
      <LoadingStateOverlay isVisible={showOverlay} bgColor="bg-sky-800 dark:bg-sky-950">
        <div className="text-white text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.6 }}
            className="font-montserrat text-4xl font-bold flex items-start justify-start gap-x-2"
          >
            CitiLink
            {DEMO_MODE === "1" && (
             <span className="text-xs bg-sky-950 p-1 rounded-md">Demo</span>
            )}
          </motion.div>
        </div>
      </LoadingStateOverlay>
      <Navbar />
      <div className="min-h-screen flex justify-center items-center">
        <div className="container sm:max-w-12/12 bg-white">
          <div className="citilink-background mx-auto min-h-[100vh] flex flex-col items-center justify-center">
            <div className="container p-6 text-center">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-50 dark:text-gray-100 font-montserrat flex items-start justify-center gap-x-2">
                CitiLink
                 {DEMO_MODE === "1" && (
                   <span className="text-xs bg-sky-950 p-1 rounded-md">Demo</span>
                 )}
              </h1>
              <h2 className="text-2xl text-gray-100 dark:text-gray-300 mt-1 font-montserrat">
                {t("public.subtitle")}
              </h2>
              <p className="italic text-gray-200 dark:text-gray-400 mt-4 font-montserrat">
                {t("public.description")}
              </p>
            </div>
          </div>

          <div className="py-6 min-h-[60vh] flex flex-col items-center justify-center" id="counties-section">
            <div className="container px-6 mt-10 text-start font-montserrat">
              <h1 className="text-xl md:text-2xl font-bold inline-flex items-center">
                <FaLandmark/> &nbsp; <span>{t("counties")}</span>
              </h1>
              <h2 className="text-sm md:text-base justify text-gray-700 font-light mt-1">
                {t("counties_description")} 
              </h2>

              {isLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="bg-gray-50 border border-gray-200 rounded-md py-4 animate-pulse">
                      <div className="w-full h-48 bg-gray-300 rounded-md mb-3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <CountyGrid/>
              )}
            </div>

        {/* PESQUISA */}
        <div className="w-full bg-sky-800 dark:bg-sky-950 py-14 mt-10 flex justify-center items-center" id="search-section">
          <div className="container mx-auto px-6" >

            <motion.div 
              className="mx-auto"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <GenericSearchHeader
                searchType={searchType}
                filterState={filterState}
                handleSearch={handleSearch}
                isLoading={isLoading}
                municipios={municipios}
                topicos={topicos}
                handleClearFilters={handleClearFilters}
              />
              
              <div className="flex justify-center mt-2 mb-4 font-montserrat">
                <div className="relative inline-flex border-b-2 border-sky-300/30 px-2">
                  <button 
                    className={`px-4 py-1.5 text-sm font-medium transition-all duration-300 relative
                      ${searchType === "atas" 
                        ? "text-white" 
                        : "text-sky-300/70 hover:text-sky-200"
                      }`}
                    onClick={() => toggleSearchType("atas")}
                  >
                    {t("minutes")}
                    {searchType === "atas" && (
                      <motion.div 
                        className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-white rounded-full"
                        layoutId="modal-underline"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                  
                  <button 
                    className={`px-4 py-1.5 text-sm font-medium transition-all duration-300 relative
                      ${searchType === "assuntos" 
                        ? "text-white" 
                        : "text-sky-300/70 hover:text-sky-200"
                      }`}
                    onClick={() => toggleSearchType("assuntos")}
                  >
                    {t("subjects")}
                    {searchType === "assuntos" && (
                      <motion.div 
                        className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-white rounded-full"
                        layoutId="modal-underline"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      />
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
            
            <div className="container px-6 mt-15 text-start font-montserrat">
              <h1 className="text-xl md:text-2xl font-bold inline-flex items-center">
                <FiUsers/> &nbsp; <span>{t("opinions")}</span>
              </h1>
              <h2 className="text-sm md:text-base font-light text-gray-700 mt-1">
                {t("opinions_description")}
              </h2>

              {isOpinionsLoading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 my-6">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-gray-50 border-b-1 border-gray-300 py-4 animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
                      <div className="h-4 bg-gray-300 rounded w-4/6 mb-8"></div>
                      
                      <div className="flex items-center mt-4">
                        <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                        <div className="ml-3">
                          <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
                          <div className="h-3 bg-gray-300 rounded w-32"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 my-6 mt-2">
                  {/* Opinião 1 */}
                  <div className="bg-white border-b-1 border-gray-300 py-4">
                    <p className="text-gray-800 italic text-sm md:text-base">
                      "O CitiLink tem sido uma ferramenta essencial para acompanhar as decisões do município."
                    </p>
                    <div className="flex items-center mt-4">
                      <img
                        src={h2}
                        alt="João Silva"
                        className="w-12 h-12 rounded-full object-cover border border-gray-300"
                      />
                      <div className="ml-3">
                        <h3 className="text-gray-800 text-sm font-semibold">João Silva</h3>
                        <p className="text-gray-600 text-xs">Município de Guimarães</p>
                      </div>
                    </div>
                  </div>

                  {/* Opinião 2 */}
                  <div className="bg-white border-b-1 border-gray-300 py-4">
                    <p className="text-gray-800 italic text-sm md:text-base">
                      "A transparência aumentou muito com este projeto. Agora, tudo é mais acessível!"
                    </p>
                    <div className="flex items-center mt-4">
                      <img
                        src={m1}
                        alt="Maria Ferreira"
                        className="w-12 h-12 rounded-full object-cover border border-gray-300"
                      />
                      <div className="ml-3">
                        <h3 className="text-gray-800 text-sm font-semibold">Maria Ferreira</h3>
                        <p className="text-gray-600 text-xs">Município do Porto</p>
                      </div>
                    </div>
                  </div>

                  {/* Opinião 3 */}
                  <div className="bg-white border-b-1 border-gray-300 py-4">
                    <p className="text-gray-800 italic text-sm md:text-base">
                      "Com o CitiLink, sinto-me mais informado sobre as reuniões camarárias!"
                    </p>
                    <div className="flex items-center mt-4">
                      <img
                        src={h1}
                        alt="Ricardo Lopes"
                        className="w-12 h-12 rounded-full object-cover border border-gray-300"
                      />
                      <div className="ml-3">
                        <h3 className="text-gray-800 text-sm font-semibold">Ricardo Lopes</h3>
                        <p className="text-gray-600 text-xs">Município da Covilhã</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer 
        variant="default"
      />
    </div>
  );
}

export default PublicView;