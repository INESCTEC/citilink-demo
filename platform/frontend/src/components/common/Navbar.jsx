import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiMenu, FiX, FiFileText, FiMail, FiInfo, FiSearch, FiLock, FiGlobe, FiPlay, FiVideo, FiBell } from "react-icons/fi";
import { FaLandmark } from "react-icons/fa";
import { RiSearchLine } from "react-icons/ri";
import { motion, AnimatePresence } from "framer-motion";
import SearchModal from "./SearchModal";
import VideoModal from "./VideoModal";
import NewsletterModal from "./NewsletterModal";
import { useLanguage } from "../../contexts/LanguageContext";
import LangLink from "./LangLink";
import { ThemeSwitcher } from "./ThemeSwitcher";

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [scrollUpStart, setScrollUpStart] = useState(null); // new
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [newsletterModalOpen, setNewsletterModalOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/" || location.pathname === "/home" || location.pathname === "/en" || location.pathname === "/en/home" || location.pathname === "/pt" || location.pathname === "/en/";
  const navbarHeight = 80;

  useEffect(() => {
  const handleScroll = () => {
    const currentScrollY = window.scrollY;
    setScrolled(currentScrollY > 50);

    if (currentScrollY > lastScrollY && currentScrollY > 200) {
      setHidden(true);
      setMenuOpen(false);
      setScrollUpStart(null); // reset when scrolling down
    } else if (currentScrollY < lastScrollY) {
      if (scrollUpStart === null) {
        setScrollUpStart(lastScrollY); 
      }
      if (scrollUpStart - currentScrollY > 50 || currentScrollY <= 50) {
        setHidden(false);
        setScrollUpStart(null); // reset threshold
      }
    }

    setLastScrollY(currentScrollY);
  };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const { t, i18n } = useTranslation();
  const { toggleLanguage, getPathWithLang } = useLanguage();

  // Handle smooth scrolling with offset
  const scrollToSection = (sectionId) => {
    const element = document.querySelector(sectionId);
    if (element) {
      // Get the element's position relative to the viewport
      const rect = element.getBoundingClientRect();
      
      // Calculate the absolute position and apply an offset
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const targetPosition = rect.top + scrollTop - navbarHeight - 20; // 20px extra padding
      
      // Scroll to the calculated position
      window.scrollTo({
        top: targetPosition,
        behavior: "smooth"
      });
    }
  };

  // Create navigation links based on current page
  const getNavLinks = () => {
    const baseLinks = [
      { 
        to: isHomePage ? "#counties-section" : "/municipios", 
        label: t("counties"), 
        icon: <FaLandmark />,
        isHash: isHomePage
      },
      { 
        to: isHomePage ? "#search-section" : "/pesquisa", 
        label: t("search"), 
        icon: <RiSearchLine />,
        isHash: isHomePage,
        isSearch: true
      },
      { to: "/media", label: t("media_title"), icon: <FiFileText />, isHash: false },
      { to: "/sobre", label: t("about.text"), icon: <FiInfo />, isHash: false },
      { 
        to: "#video-demo", 
        label: t("video_demo", "Video"), 
        icon: <FiVideo />, 
        isHash: false,
        isVideoDemo: true
      },
      // { to: "/admin", label: t("admin_area"), icon: <FiLock />, isHash: false },
    ];
    
    return baseLinks;
  };

  const navLinks = getNavLinks();

  // Custom link component to handle both hash and route links
  const NavLink = ({ to, label, icon, isHash, isSearch, isVideoDemo, onClick }) => {
    if (isSearch && !isHash) {
      return (
        <a
          href="#"
          className={`font-montserrat flex items-center space-x-2 relative transition-all duration-200 ease-in-out text-sm
          after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-400 hover:after:w-full
          ${scrolled ? "text-sky-950 dark:text-gray-200" : "text-white dark:text-gray-200"}`}
          onClick={(e) => {
            e.preventDefault();
            setSearchModalOpen(true);
          }}
        >
          {icon} <span>{label}</span>
        </a>
      );
    }

    if (isVideoDemo) {
      return (
        <a
          href="#"
          className={`font-montserrat flex items-center space-x-2 relative transition-all duration-200 ease-in-out text-sm
          after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-400 hover:after:w-full
          ${scrolled ? "text-sky-950 dark:text-gray-200" : "text-white dark:text-gray-200"}`}
          onClick={(e) => {
            e.preventDefault();
            setVideoModalOpen(true);
          }}
        >
          {icon} <span>{label}</span>
        </a>
      );
    }

    if (isHash) {
      return (
        <a
          href={to}
          className={`font-montserrat flex items-center text-sm space-x-2 relative transition-all duration-200 ease-in-out 
          after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-400 hover:after:w-full
          ${scrolled ? "text-sky-950 dark:text-gray-200" : "text-white dark:text-gray-200"}`}
          onClick={(e) => {
            if (onClick) onClick();
            // Custom smooth scroll with offset
            e.preventDefault();
            scrollToSection(to);
          }}
        >
          {icon} <span>{label}</span>
        </a>
      );
    }
    
    return (
      <LangLink
        to={to}
        className={`font-montserrat flex items-center space-x-2 relative text-sm transition-all duration-200 ease-in-out 
        after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-400 hover:after:w-full
        ${scrolled ? "text-sky-950 dark:text-gray-100" : "text-white dark:text-gray-100"}`}
        onClick={onClick}
      >
        {icon} <span>{label}</span>
      </LangLink>
    );
  };

  return (
    <>
      <motion.nav 
        className={`fixed top-0 left-0 w-full py-4 z-40 overflow-hidden ${
          menuOpen && !scrolled ? "bg-sky-900 dark:bg-sky-800/95" : "bg-transparent"
        }`}
        initial={false}
        animate={{ 
          y: hidden ? -100 : 0,
          opacity: hidden ? 0 : 1
        }}
        transition={{ 
          duration: 0.3, 
          ease: "easeInOut"
        }}
      >
        {/* Color fill overlay - top to bottom animation */}
        <motion.div
          className="absolute inset-0 z-[-1] bg-white dark:bg-sky-950"
          initial={false}
          animate={{ 
            scaleY: scrolled ? 1 : 0,
            opacity: scrolled ? 1 : 0
          }}
          style={{ 
            originY: 0,
            boxShadow: scrolled ? "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)" : "none"
          }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        />
        
        <div className="container px-6 flex justify-between items-center mx-auto">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 300 }}
          >
            <LangLink
              to="/"
              className={`font-bold text-lg font-montserrat transition-all duration-200 ${
                scrolled ? "text-sky-950 dark:text-white" : "text-white"
              }`}
            >
              CitiLink
            </LangLink>
          </motion.div>
          <motion.button
            className={`lg:hidden text-2xl transition-all duration-200 ${
              scrolled ? "text-sky-950 dark:text-gray-200" : "text-white"
            }`}
            onClick={() => setMenuOpen(!menuOpen)}
            whileTap={{ scale: 0.9 }}
          >
            {menuOpen ? <FiX /> : <FiMenu />}
          </motion.button>

          {/* Desktop Menu */}
          <div className="hidden lg:flex space-x-4">
            {navLinks.map(({ to, label, icon, isHash, isSearch, isVideoDemo }) => (
              !isVideoDemo && (
                <NavLink
                  key={to}
                  to={to}
                  label={label}
                  icon={icon}
                  isHash={isHash}
                  isSearch={isSearch}
                  isVideoDemo={isVideoDemo}
                  onClick={() => {
                    if (!isHash && !isSearch && !isVideoDemo) {
                      window.scrollTo({ top: 1, behavior: "smooth" });
                    }
                  }}
                />
              )
            ))}
            <button 
              className={`font-montserrat flex items-center space-x-2 relative transition-all duration-200 ease-in-out text-sm
                after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all after:duration-400 hover:after:w-full cursor-pointer
                ${scrolled ? "text-sky-950 dark:text-gray-200" : "text-white dark:text-gray-200"}`}
              onClick={() => setNewsletterModalOpen(true)}
              title={t("notifications", "Notifications")}
            >
              <FiBell /><span>{t("notifications", "Notifications")}</span>
            </button>
            <div className="flex items-center space-x-2">
              <button 
                className={`px-4 text-sm font-montserrat flex items-center space-x-2 relative transition-all duration-400 ease-in-out py-1 rounded-sm cursor-pointer
                  ${scrolled ? "bg-sky-800/20 text-sky-950 hover:bg-sky-950 hover:text-white" : "bg-sky-700/40 hover:bg-sky-950 text-white"}`}
                  onClick={() => {
                    toggleLanguage();
                    // setTimeout(() => {
                    //   window.location.reload();
                    // }, 100);
                    // window.location.reload();
                  }}
              >
                <FiGlobe />
                <span>{i18n.language === "en" ? "Português" : "English"}</span> 
              </button>
              
               <button 
                className={`py-1 px-2 text-sm font-montserrat flex items-center justify-center relative transition-all duration-400 ease-in-out rounded-sm gap-x-2 cursor-pointer
                  ${scrolled ? "bg-sky-800/20 text-sky-950 hover:bg-sky-950 hover:text-white" : "bg-sky-700/40 hover:bg-sky-950 text-white"}`}
                onClick={() => setVideoModalOpen(true)}
                title={t("video_demo", "Video")}
              >
                <FiVideo /><span>{t("video_demo", "Video")}</span>
              </button>
              
              {/* <ThemeSwitcher /> */}
            </div>
          </div>
        </div>

        {/* Mobile Menu - Now with animated opening/closing */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className={`lg:hidden pt-4 mt-4 pb-4 px-6 overflow-hidden
                ${scrolled 
                  ? "bg-white/95 dark:bg-gray-900/95" 
                  : "bg-sky-900/95 dark:bg-gray-800/95"
                } backdrop-blur-sm transition-colors duration-300`}
            >
              <div className="flex flex-col space-y-4">
                {navLinks.map(({ to, label, icon, isHash, isSearch, isVideoDemo }) => (
                  <div key={to}>
                    {isSearch && !isHash ? (
                      <button
                        className={`w-full text-left font-montserrat flex items-center space-x-3 py-2 px-4 rounded-md transition-all duration-200
                          ${scrolled 
                            ? "text-sky-950 dark:text-white hover:bg-sky-50 dark:hover:bg-gray-800" 
                            : "text-white hover:bg-sky-800/50 dark:hover:bg-gray-700/50"
                          }`}
                        onClick={() => {
                          setMenuOpen(false);
                          setSearchModalOpen(true);
                        }}
                      >
                        <span className={`${scrolled ? "text-sky-700" : "text-white dark:text-sky-400"}`}>
                          {icon}
                        </span>
                        <span>{label}</span>
                      </button>
                    ) : isVideoDemo ? (
                      <button
                        className={`w-full text-left font-montserrat flex items-center space-x-3 py-2 px-4 rounded-md transition-all duration-200
                          ${scrolled 
                            ? "bg-sky-800/10 text-sky-950 dark:text-white hover:bg-sky-800/20" 
                            : "bg-sky-800/30 text-white hover:bg-sky-800/50"
                          }`}
                        onClick={() => {
                          setMenuOpen(false);
                          setVideoModalOpen(true);
                        }}
                      >
                        <span className={`${scrolled ? "text-sky-700 dark:text-sky-500" : "text-white dark:text-sky-400"}`}>
                          {icon}
                        </span>
                        <span>{label}</span>
                      </button>
                    ) : isHash ? (
                      <a 
                        href={to} 
                        className={`font-montserrat flex items-center space-x-3 py-2 px-4 rounded-md transition-all duration-200
                          ${scrolled 
                            ? "text-sky-950 dark:text-white hover:bg-sky-50 dark:hover:bg-gray-800" 
                            : "text-white hover:bg-sky-800/50 dark:hover:bg-gray-700/50"
                          }`}
                        onClick={(e) => {
                          e.preventDefault();
                          setMenuOpen(false);
                          // Custom smooth scroll with offset
                          scrollToSection(to);
                        }}
                      >
                        <span className={`${scrolled ? "text-sky-700 dark:text-sky-500" : "text-white dark:text-sky-400"}`}>
                          {icon}
                        </span> 
                        <span>{label}</span>
                      </a>
                    ) : (
                      <LangLink 
                        to={to}
                        className={`font-montserrat flex items-center space-x-3 py-2 px-4 rounded-md transition-all duration-200
                          ${scrolled 
                            ? "text-sky-950 dark:text-white hover:bg-sky-50 dark:hover:bg-gray-800" 
                            : "text-white hover:bg-sky-800/50 dark:hover:bg-gray-700/50"
                          }`}
                        onClick={() => {
                          setMenuOpen(false);
                          window.scrollTo(0, 0);
                        }}
                      >
                        <span className={`${scrolled ? "text-sky-700 dark:text-sky-500" : "text-white dark:text-sky-400"}`}>
                          {icon}
                        </span> 
                        <span>{label}</span>
                      </LangLink>
                    )}
                  </div>
                ))}
                
                <hr className={`my-1 ${scrolled ? "border-gray-200 dark:border-gray-700" : "border-sky-800 dark:border-gray-600"}`} />
                
                <button 
                  className={`font-montserrat flex items-center space-x-3 py-2 px-4 rounded-md transition-all duration-200 w-full
                    ${scrolled 
                      ? "bg-sky-800/10 text-sky-950 dark:text-white hover:bg-sky-800/20" 
                      : "bg-sky-800/30 text-white hover:bg-sky-800/50"
                    }`}
                  onClick={() => {
                    toggleLanguage();
                    // setTimeout(() => {
                    //   window.location.reload();
                    // }, 100);
                  }}
                >
                  <span className={`${scrolled ? "text-sky-700 dark:text-sky-500" : "text-white dark:text-sky-400"}`}>
                    <FiGlobe />
                  </span>
                  <span>{i18n.language === "en" ? "Português" : "English"}</span> 
                </button>

                <button 
                  className={`font-montserrat flex items-center space-x-3 py-2 px-4 rounded-md transition-all duration-200 w-full
                    ${scrolled 
                      ? "bg-sky-800/10 text-sky-950 dark:text-white hover:bg-sky-800/20" 
                      : "bg-sky-800/30 text-white hover:bg-sky-800/50"
                    }`}
                  onClick={() => {
                    setMenuOpen(false);
                    setNewsletterModalOpen(true);
                  }}
                >
                  
                  <span 
                  className={`${scrolled ? "text-sky-700 dark:text-sky-500" : "text-white dark:text-sky-400"}`}>
                    <FiBell />
                  </span>
                  <span>{t("notifications", "Notificações")}</span>
                </button>

                {/* <div className="px-4 py-2">
                  <ThemeSwitcher />
                </div> */}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Search Modal */}
      <SearchModal 
        isOpen={searchModalOpen} 
        onClose={() => setSearchModalOpen(false)}
      />

      {/* Video Modal */}
      <VideoModal 
        isOpen={videoModalOpen} 
        onClose={() => setVideoModalOpen(false)}
      />

      {/* Newsletter Modal */}
      <NewsletterModal 
        isOpen={newsletterModalOpen} 
        onClose={() => setNewsletterModalOpen(false)}
      />
    </>
  );
} 

export default Navbar;