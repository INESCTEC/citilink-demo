import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import pt from "./locales/pt.json";

i18n.use(initReactI18next)
  .use(LanguageDetector) // Detects browser language
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: "pt", // Force Portuguese
    fallbackLng: "pt", // Default language  
    interpolation: { escapeValue: false },
  });

export default i18n;