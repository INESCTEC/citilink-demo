import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCalendar, FiMap, FiChevronLeft, FiDownload, FiChevronRight, FiMapPin, FiHome } from "react-icons/fi";
import { format } from "date-fns";
import { FaLandmark } from "react-icons/fa";

const AtaHeader = ({ ata, timelineToggleButton }) => {
  const { t } = useTranslation();
  const API_URL = import.meta.env.VITE_API_URL;

  const formatDate = (dateString) => {
    if (!dateString) return t("unknown_date");
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return t("unknown_date");
    }
  };

    const formatTime = (dateString) => {
      try {
        return format(new Date(dateString), "HH:mm");
      } catch (e) {
        return "--:--";
      }
    };

  return (
    <div className="bg-sky-700 pt-0 py-6 font-montserrat rounded-t-md">
      <div className="container mx-auto px-6">
        <div className="flex flex-col"> 
          <div className="flex items-center justify-between mb-7">

            {/* timeline */}
            <div className="timeline-button-container">
              {timelineToggleButton}
            </div>
          </div>
          
          <div className="">
              <h1 className="text-xl md:text-2xl font-semibold text-white">{ata.title}</h1>
              <div className="flex items-center gap-4 mt-1">
                <div className="text-sm md:text-md text-white/80 mt-0 flex flex-col ">
                  <span className="flex items-center mb-1">
                    {/* lcoatyion */}
                    <FiMapPin className="mr-2" /> {ata.location}
                  </span>
                  <span className="flex items-center"> 
                    <FiCalendar className="mr-2" /> {formatDate(ata.date)} ({formatTime(ata.start_datetime)} - {formatTime(ata.end_datetime)})
                  </span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtaHeader;