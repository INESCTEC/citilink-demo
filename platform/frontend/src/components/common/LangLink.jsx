import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";

const LangLink = ({ to, children, className, ...props }) => {
  const { getPathWithLang } = useLanguage();
  
  return (
    <RouterLink to={getPathWithLang(to)} className={className} {...props}>
      {children}
    </RouterLink>
  );
};

export default LangLink;
