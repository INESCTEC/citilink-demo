import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiChevronRight, FiHome, FiTv } from "react-icons/fi";
import { FaJournalWhills, FaNewspaper, FaRegNewspaper } from "react-icons/fa";
import LangLink from "../common/LangLink";

const MediaHeader = () => {
  const { t } = useTranslation();

  return (
    <div className="bg-sky-800 dark:bg-sky-950 pt-15 pb-4 font-montserrat">
      <div className="container mx-auto px-4">
        <div className="flex flex-col space-y-6 justify-center">
          {/* Breadcrumb navigation */}
          <div className="hidden sm:flex items-center mb-7">
            <nav className="flex items-center text-sm font-montserrat bg-sky-700 dark:bg-sky-900 rounded-md px-4 py-1" aria-label="Breadcrumb">
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
                    {t("media_title")}
                  </span>
                </li>
              </ol>
            </nav>
          </div>

          {/* Header Content */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
            <div>
              <div className="flex items-center">
                <div className="text-white mr-3">
                  <FiTv size={24} />
                </div>
                <h1 className="text-xl md:text-2xl font-bold text-white font-montserrat text-center sm:text-left">
                  <span>{t("media_title")}</span>
                </h1>
              </div>
              <p className="text-gray-200 mt-1 text-sm">
                {t("media_description", "Notícias, reportagens e entrevistas sobre o projeto CitiLink.")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MediaHeader;