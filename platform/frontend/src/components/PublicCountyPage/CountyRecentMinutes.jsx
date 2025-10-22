import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiSearch, FiCalendar, FiEye, FiArchive, FiPlus, FiFileText } from "react-icons/fi";
import { format } from "date-fns";
import LangLink from "../common/LangLink";
import { getLocalizedAtaTitle } from "../../utils/translationHelpers";

const CountyRecentMinutes = ({ countyId, API_URL }) => {
  const { t, i18n } = useTranslation();
  const [recentAtas, setRecentAtas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  const currentLanguage = i18n.language;
  
  useEffect(() => {
    const fetchRecentAtas = async () => {
      try {
        setIsLoading(true);
        // const response = await fetch(`${API_URL}/v0/public/atas/search?municipio_id=${countyId}&sort=date&order=desc&page=1&per_page=1`);
        const response = await fetch(`${API_URL}/v0/public/atas/search?municipio_id=${countyId}&sort=date&order=desc&page=1&per_page=4&demo=${DEMO_MODE}&lang=${currentLanguage}`);
        // console.log(`fecthing from ${API_URL}/v0/public/atas/search?municipio_id=${countyId}&sort=date&order=desc&page=1&per_page=3`);
        // const response = await fetch(`${API_URL}/v0/public/atas/recents?municipio_id=${countyId}&page=1&per_page=5`);

        if (!response.ok) {
          throw new Error("Failed to fetch atas", response.statusText);
        }
        const data = await response.json();
        setRecentAtas(data.data || []);
      } catch (err) {
        console.error("Error fetching atas:", err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecentAtas();
  }, [countyId, API_URL, currentLanguage]);

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return "Data desconhecida";
    }
  };

  const formatUploadDate = (dateString) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return "Data desconhecida";
    }
  };
  
  // Skeleton loading for minutes
const renderSkeletons = () => (
  <div className="flex flex-col gap-2">
    {[...Array(4)].map((_, idx) => (
      <div key={idx} className="flex justify-between items-center py-2">
        <div className="h-5 bg-gray-200 rounded w-2/3 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/5 animate-pulse"></div>
      </div>
    ))}
  </div>
);
  
  return (
    <div className="bg-white dark:bg-sky-950 rounded-md shadow-md p-6 font-montserrat mb-8">
      <div className="flex justify-between items-center">
          {isLoading ? (
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              <div className="h-8 bg-gray-200 rounded animate-pulse w-48"></div>
           </h2>
          ) : (
            <div className="flex items-center mb-4">
              <FiArchive className="mr-2 text-gray-700 dark:text-white" size={20} />
              <h2 className="text-lg md:text-lg font-bold text-gray-800 dark:text-white">
                {t("last_minutes")}
              </h2>
            </div>
          )}
      </div>
      
      {isLoading ? (
        renderSkeletons()
      ) : recentAtas.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {recentAtas.map((ata) => (
            <li key={ata.id} className="text-sm text-gray-800 dark:text-sky-100 border-b-1 border-gray-200 dark:border-sky-800 pb-2">
              <LangLink to={`/atas/${ata.slug}`} className="hover:text-sky-700 dark:hover:text-sky-200 transition duration-200 font-medium">
                {getLocalizedAtaTitle(ata, currentLanguage)}
              </LangLink><br />
              <span className="text-xs text-gray-500 dark:text-gray-300 flex items-center">
                <FiCalendar className="mr-1" size={12} />
                {formatDate(ata.date)}
                {ata.start_hour && ata.end_hour && ` (${ata.start_hour} - ${ata.end_hour})`}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-md">
          <FiArchive className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-4 text-gray-500">{t("no_minutes_yet")}</p>
        </div>
      )}
    </div>
  );
};

export default CountyRecentMinutes;