import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiArrowLeft } from "react-icons/fi";
import Navbar from "../common/Navbar";
import Footer from "../common/Footer";
import LangLink from "../common/LangLink";

const CountyErrorState = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-sky-800">
      <Navbar />
      <div className="container mx-auto px-4 min-h-screen flex items-center justify-center font-montserrat">
        <div className="max-w-xl mx-auto bg-sky-950 shadow-md rounded-lg p-8 text-center">
          <h1 className="text-2xl font-bold text-sky-100">{t("county_not_found")} :(</h1>
          <p className="mt-2 text-gray-200">{t("county_not_found_desc")}</p>
          <LangLink to="/" className="inline-flex items-center mt-6 px-4 py-2 bg-sky-800 text-white rounded-md hover:bg-sky-900 transition-colors">
            <FiArrowLeft className="mr-2" /> {t("back_to_home")}
          </LangLink>
        </div>
      </div>
    </div>
  );
};

export default CountyErrorState;