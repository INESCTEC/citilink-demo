import React from "react";
import { Link, useParams } from "react-router-dom";
import { FiChevronRight, FiHome } from "react-icons/fi";
import PropTypes from "prop-types";
import { withLang } from "../../utils/langUtils";
import { useLanguage } from "../../contexts/LanguageContext";
import LangLink from "./LangLink";

const Breadcrumb = ({ links, showHomeIcon = true, className = "" }) => {
  if (!links || links.length === 0) return null;

  const { lang } = useParams();

  return (
    <nav className={`flex items-center text-sm ${className}`} aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center space-x-1">
        {links.map((link, index) => {
          const isLast = index === links.length - 1;
          
          return (
            <li key={index} className="flex items-center">
              {index > 0 && (
                <FiChevronRight className="flex-shrink-0 mx-1 text-gray-400" />
              )}
              
              {isLast ? (
                <span 
                  className="text-gray-700 font-medium truncate" 
                  aria-current="page"
                >
                  {link.label}
                </span>
              ) : (
                <LangLink
                  to={link.path}
                  className="text-sky-700 hover:text-sky-900 hover:underline flex items-center"
                >
                  {index === 0 && showHomeIcon && (
                    <FiHome className="mr-1" />
                  )}
                  <span className="truncate">{link.label}</span>
                </LangLink>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

Breadcrumb.propTypes = {
  links: PropTypes.arrayOf(
    PropTypes.shape({
      path: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      isActive: PropTypes.bool
    })
  ).isRequired,
  showHomeIcon: PropTypes.bool,
  className: PropTypes.string
};

export default Breadcrumb;