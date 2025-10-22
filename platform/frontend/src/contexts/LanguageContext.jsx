import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { translatePath, getLocalizedRoute } from "../utils/routeTranslations";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [currentLang, setCurrentLang] = useState("pt");

  // Detect language from URL
  useEffect(() => {
    const pathname = location.pathname;
    if (pathname.startsWith("/en")) {
      setCurrentLang("en");
      if (i18n.language !== "en") {
        i18n.changeLanguage("en");
      }
    } else {
      setCurrentLang("pt");
      if (i18n.language !== "pt") {
        i18n.changeLanguage("pt");
      }
    }
  }, [location.pathname, i18n]);

  // Language-aware navigation function
  const navigateWithLang = (path, options = {}) => {
    // Always treat input paths as Portuguese canonical paths
    const localizedPath = getLocalizedRoute(path, currentLang);
    navigate(localizedPath, options);
  };

  // Get language-aware path
  const getPathWithLang = (path) => {
    return getLocalizedRoute(path, currentLang);
  };

  // Toggle language while maintaining current route
  const toggleLanguage = () => {
    const currentPath = location.pathname;
    let newPath;
    
    if (currentLang === "en") {
      // Switch to Portuguese - remove /en prefix and translate route
      const pathWithoutEn = currentPath.replace(/^\/en/, "") || "/";
      newPath = translatePath(pathWithoutEn, "en", "pt");
      setCurrentLang("pt");
      i18n.changeLanguage("pt");
    } else {
      // Switch to English - translate route and add /en prefix
      const translatedPath = translatePath(currentPath, "pt", "en");
      newPath = `/en${translatedPath}`;
      setCurrentLang("en");
      i18n.changeLanguage("en");
    }
    
    navigate(newPath);
  };

  const value = {
    currentLang,
    navigateWithLang,
    getPathWithLang,
    toggleLanguage,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
};
