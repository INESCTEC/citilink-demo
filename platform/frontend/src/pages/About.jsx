import React, { useState, useEffect } from "react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import { useTranslation } from "react-i18next";
import LoadingState from "../components/common/states/LoadingState";
import { AnimatePresence, motion } from "framer-motion";
import { FiLock, FiMail, FiShield, FiUser, FiChevronDown } from "react-icons/fi";
import { FiGlobe } from "react-icons/fi";
import { FaLinkedin, FaGoogle } from "react-icons/fa";
import GenericLoadingSpinner from "../components/common/GenericLoadingSpinner";
import ResourceCard from "../components/PublicAboutPage/ResourceCard";
import TeamCard from "../components/PublicAboutPage/TeamCard";
import RenderHTML from "../hooks/renderHtml";

function About() {
  const { t, i18n } = useTranslation();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  
  // Loading animation state variables
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  // Data state variables
  const [projectData, setProjectData] = useState(null);
  const [resourcesData, setResourcesData] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [error, setError] = useState(null);
  const [openFAQItems, setOpenFAQItems] = useState({});
  
  // Multilingual content state variables
  const [description, setDescription] = useState({
    default: "A carregar a descrição do projeto...",
    pt: ""
  });
  
  // Animation timing constants
  const EXIT_ANIMATION_DURATION = 1500; // 1.5 seconds for exit animation
  const MINIMUM_LOADING_TIME = 500; // 0.5 seconds minimum display time

  // Set document title and meta tags without Helmet
  useEffect(() => {
    document.title = t("about.title") || "about";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', t("about.description") || "Explore the latest about content from CitiLink.");
    } else {
      const meta = document.createElement('meta');
      meta.name = "description";
      meta.content = t("about.description") || "Explore the latest about content from CitiLink.";
      document.head.appendChild(meta);
    }
    // Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', t("about.title") || "about");
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:title');
      meta.content = t("about.title") || "about";
      document.head.appendChild(meta);
    }
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      ogDesc.setAttribute('content', t("about.description") || "Explore the latest about content from CitiLink.");
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:description');
      meta.content = t("about.description") || "Explore the latest about content from CitiLink.";
      document.head.appendChild(meta);
    }
    const ogType = document.querySelector('meta[property="og:type"]');
    if (ogType) {
      ogType.setAttribute('content', 'article');
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:type');
      meta.content = 'article';
      document.head.appendChild(meta);
    }
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', 'https://citilink.pt/sobre');
    } else {
      const meta = document.createElement('meta');
      meta.setAttribute('property', 'og:url');
      meta.content = 'https://citilink.pt/sobre';
      document.head.appendChild(meta);
    }
  }, [t]);
  
  useEffect(() => {
    // Record start time for calculating minimum display duration
    const startTime = Date.now();
    
    // Initialize loading states
    setShowLoadingState(true);
    setLoadingExiting(false);
    setContentReady(false);
    
    const PROJECT_NAME = "CitiLink";
    
    // Fetch project and team data
    const fetchData = async () => {
      try {
        // Fetch project data
        const projectResponse = await fetch(
          "https://nabu.dcc.fc.up.pt/api/items/projects?filter[id][_eq]=1&fields=*,secondary_images.directus_files_id,logos_footer.logos_id.image,logos_footer.logos_id.url"
        );
        
        if (!projectResponse.ok) {
          throw new Error(`Project API returned ${projectResponse.status}`);
        }
        
        const projectResult = await projectResponse.json();
        const projectDetails = projectResult.data && projectResult.data.length > 0 ? projectResult.data[0] : null;
        setProjectData(projectDetails);
        console.log("Project data:", projectDetails);
        
        // Set multilingual content from API response
        if (projectDetails) {
          setDescription({
            default: projectDetails.description || t("about.project_description"),
            pt: projectDetails.description_PT || t("about.project_description")
          });
        }
        
        // Fetch team data
        const teamResponse = await fetch(
          `https://nabu.dcc.fc.up.pt/api/items/team?fields=*,title.designation,title.designation_PT,title.sort,projects.projects_id,projects.principal_investigator,projects.co_principal_investigator,projects.descricao_no_projeto,projects.descricao_no_projeto_PT,projects.title_in_project.designation,projects.title_in_project.designation_PT&filter[projects][projects_id][designation][_eq]=${PROJECT_NAME}&sort=projects.sort,title.sort,projects.title_in_project.sort`
        );
        
        if (!teamResponse.ok) {
          throw new Error(`Team API returned ${teamResponse.status}`);
        }
        
        const teamResult = await teamResponse.json();
     
        const sortedTeam = teamResult.data.sort((a, b) => {
        // Find the project with the matching PROJECT_ID for each user
        let projectA = a.projects.find(p => p.projects_id === 1);
        let projectB = b.projects.find(p => p.projects_id === 1);
  
        // PI sorting: true (1st) > false (default)
        let piSortA = projectA?.principal_investigator ? -1 : 0;
        let piSortB = projectB?.principal_investigator ? -1 : 0;
  
        // Co-PI sorting: true (2nd) > false (default)
        let copiSortA = projectA?.co_principal_investigator ? -1 : 0;
        let copiSortB = projectB?.co_principal_investigator ? -1 : 0;
  
        // Extract project-specific sorting values
        let titleSortA = projectA?.title_in_project?.sort;
        let titleSortB = projectB?.title_in_project?.sort;
  
        // Fallback to title.sort only if title_in_project.sort is missing
        if (titleSortA == null) {
          titleSortA = a.title?.sort ?? Infinity;
        }
        if (titleSortB == null) {
          titleSortB = b.title?.sort ?? Infinity;
        }
  
        // Sorting logic:
        // 1. PI first
        if (piSortA !== piSortB) return piSortA - piSortB;
        // 2. Co-PI second
        if (copiSortA !== copiSortB) return copiSortA - copiSortB;
        // 3. Sort by title_in_project.sort

        return titleSortA - titleSortB;
        
      });
      const principalInvestigator = {
        "designation": "Principal Investigator",
        "designation_PT": "Investigador Principal"
      };
      
      const coPrincipalInvestigator = {
        "designation": "Co-Principal Investigator",
        "designation_PT": "Co-Investigador Principal"
      };

      // Check for PIs and Co-PIs in the data instead of assigning automatically
      sortedTeam.forEach(member => {
        const project = member.projects.find(p => p.projects_id === 1);
        console.log("Project for member:", project);
        console.log("Description:", project?.descricao_no_projeto, "PT:", project?.descricao_no_projeto_PT);

        let descEn = project && project.descricao_no_projeto ? project.descricao_no_projeto : t.description;
        let descPt = project && project.descricao_no_projeto_PT ? project.descricao_no_projeto_PT : (t.description_PT ? t.description_PT : descEn);

        if (descEn !== null && descEn !== undefined) member.description = descEn;
        if (descPt !== null && descPt !== undefined) member.description_PT = descPt;
        
        // Assign PI or Co-PI title if applicable
        if (project) {
          if (project.principal_investigator) {
            member.title = principalInvestigator;
          } else if (project.co_principal_investigator) {
            member.title = coPrincipalInvestigator;
          }
        }
      });
        setTeamData(sortedTeam || []);


        const resourcesResponse = await fetch(
          "https://nabu.dcc.fc.up.pt/api/items/resources?fields=*,type.*&filter[projects][projects_id][id][_eq]=1"
        )
        if (!resourcesResponse.ok) {
          throw new Error(`Resources API returned ${resourcesResponse.status}`);
        }
        const resourcesResult = await resourcesResponse.json();
        const resources = resourcesResult.data || [];
        console.log("Resources data:", resources);
        setResourcesData(resources);
        
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err.message);
      } finally {
        // Calculate elapsed loading time
        const loadingTime = Date.now() - startTime;
        // Calculate additional time needed to reach minimum display time
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        
        // Wait for minimum display time before starting exit animation
        setTimeout(() => {
          // Set contentReady at the SAME TIME as we start exit animation
          setContentReady(true); // Make content visible exactly when animation starts exiting
          setLoadingExiting(true); // Start sliding the loading screen up
          
          // Remove loading component after exit animation completes
          setTimeout(() => {
            setShowLoadingState(false); // Finally remove the loading component
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay);
      }
    };
    
    fetchData();
  }, []);

  // Get the appropriate content based on current language
  const displayDescription = i18n.language === 'pt' && description.pt 
    ? description.pt 
    : description.default;
    
  // FAQ toggle functionality - only one item can be open at a time
  const toggleFAQItem = (itemKey) => {
    setOpenFAQItems(prev => ({
      // Close all items and only open the clicked one if it wasn't already open
      [itemKey]: !prev[itemKey]
    }));
  };

  // FAQ items based on current language
  const faqItems = [
    {
      key: 'what_is_citilink',
      question: t('faq.what_is_citilink.question'),
      answer: t('faq.what_is_citilink.answer')
    },
    {
      key: 'how_does_it_work',
      question: t('faq.how_does_it_work.question'),
      answer: t('faq.how_does_it_work.answer')
    },
    {
      key: 'which_municipalities',
      question: t('faq.which_municipalities.question'),
      answer: t('faq.which_municipalities.answer')
    },
    {
      key: 'data_processing',
      question: t('faq.data_processing.question'),
      answer: t('faq.data_processing.answer')
    },
    {
      key: 'report_error',
      question: t('faq.report_error.question'),
      answer: t('faq.report_error.answer')
    },
    {
      key: 'data_privacy',
      question: t('faq.data_privacy.question'),
      answer: t('faq.data_privacy.answer')
    },
    {
      key: 'who_funds_project',
      question: t('faq.who_funds_project.question'),
      answer: t('faq.who_funds_project.answer')
    },
    {
      key: 'contact_team',
      question: t('faq.contact_team.question'),
      answer: t('faq.contact_team.answer')
    }
  ];

  return (
    <div className="min-h-screen bg-sky-800 dark:bg-gray-950">
      {/* Show content only when it's ready - after loading animation starts exiting */}
      {contentReady && (
        <>
          {/* Title and meta tags are set via useEffect above */}
          <Navbar />
          <div className="bg-sky-800 dark:bg-sky-950 min-h-[65vh] flex flex-col justify-center items-center pt-20">
            <div className="container mx-auto px-6 pb-15">
                <h1 className="text-2xl font-bold text-gray-100 font-montserrat">{t("about_us")}</h1>
                <div className="text-gray-300 font-montserrat text-justify text-sm">
                    <RenderHTML content={displayDescription} />
                </div>

                {/* Team section */}
                <h1 className="text-2xl font-bold text-gray-100 font-montserrat mt-12">{t("team")}</h1>
                {/* <div className="text-gray-300 font-montserrat text-justify text-sm">
                  {t("about.team_description")}
                </div> */}
                {error && <p className="text-red-300">{t("error")}</p>}
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {teamData.length > 0 ? (    
                    teamData.map((member) => (
                      <TeamCard key={member.id} member={member} />
                    ))
                  ) : (
                    <GenericLoadingSpinner 
                    icon={FiUser}
                    />
                  )}
                </div>

                {/* Resources section */}
                <h1 className="text-2xl font-bold text-gray-100 font-montserrat mt-12">{t("about.resources")}</h1>
                <div className="text-gray-300 font-montserrat text-justify text-sm">
                  {t("about.resources_description")}
                </div>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
                  {resourcesData.length > 0 ? (
                    resourcesData.map((resource) => (
                      <ResourceCard key={resource.id} resource={resource} />
                    ))
                  ) : (
                  //  no resources found
                    <div className="text-gray-300 font-montserrat text-sm">
                      {t("about.no_resources")}
                    </div>
                  )}
                </div>
                
                {/* FAQ section */}
                <h1 className="text-2xl font-bold text-gray-100 font-montserrat mt-12">{t("faq.title")}</h1>
                <div className="mt-4 space-y-4">
                  {faqItems.map((item, index) => (
                    <motion.div 
                      key={item.key} 
                      className="bg-sky-950 rounded-md shadow-lg font-montserrat overflow-hidden"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.3 }}
                    >
                      <button
                        onClick={() => toggleFAQItem(item.key)}
                        className="w-full px-4 py-3 text-left flex justify-between items-center text-gray-100 hover:bg-sky-900 cursor-pointer transition-colors"
                      >
                        <span className="text-sm font-medium">{item.question}</span>
                        <motion.div
                          animate={{ rotate: openFAQItems[item.key] ? 180 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <FiChevronDown className="text-sky-300 flex-shrink-0 ml-2" />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {openFAQItems[item.key] && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                            className="bg-sky-900"
                          >
                            <div className="px-4 py-3">
                              <div className="text-gray-300 text-sm">
                                <RenderHTML content={item.answer} />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  ))}
                </div>
            
            </div>
            
            {/* <div className="container mx-auto p-6 pb-15 text-white">
            <nav className="flex justify-center md:justify-end gap-4 ">
              <Link to="/politicadeprivacidade" className="flex items-center gap-2 font-montserrat relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all hover:after:w-full">
                <FiShield /> {t("privacy_policy")}
              </Link>
              <Link to="/contacto" className="flex items-center gap-2 font-montserrat relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all hover:after:w-full">
                <FiMail /> {t("contact")}
              </Link>
              <Link to="/admin" className="flex items-center gap-2 font-montserrat relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all hover:after:w-full">
                <FiLock /> {t("admin_area")}
              </Link>
              </nav>
              
            </div> */}
          </div>
          <Footer variant="default" />
        </>
      )}
      
      {/* Loading animation with AnimatePresence for smooth transitions */}
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default About;