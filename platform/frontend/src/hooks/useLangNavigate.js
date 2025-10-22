import { useNavigate } from "react-router-dom";
import { useLanguage } from "../contexts/LanguageContext";

export const useLangNavigate = () => {
  const { navigateWithLang } = useLanguage();
  return navigateWithLang;
};
