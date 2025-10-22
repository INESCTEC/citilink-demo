import React from "react";
import { useTranslation } from "react-i18next";
import { FiInfo, FiFile, FiCalendar, FiDownload } from "react-icons/fi";
import { format } from "date-fns";

const AtaSidebar = ({ ata, API_URL }) => {
  const { t } = useTranslation();

  const formatDate = (dateString) => {
    if (!dateString) return t("unknown_date");
    try {
      return format(new Date(dateString), "dd/MM/yyyy");
    } catch (e) {
      return t("unknown_date");
    }
  };

  return (
    <>
      {/* File Metadata */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6 font-montserrat">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
          <FiInfo className="mr-2 text-sky-700" /> {t("document_info")}
        </h2>
        
        <div className="space-y-3 text-sm">
          {/* {ata.file_type && (
            <div className="flex items-start">
              <FiFile className="mt-0.5 mr-3 text-sky-700" />
              <div>
                <span className="font-medium text-gray-700">{t("file_type")}: </span>
                <span className="text-gray-600">{ata.file_type}</span>
              </div>
            </div>
          )} */}
          
          <div className="flex items-start">
            <FiCalendar className="mt-0.5 mr-3 text-sky-700" />
            <div>
              <span className="font-medium text-gray-700">{t("meeting_date")}: </span>
              <span className="text-gray-600">{formatDate(ata.date)} {ata.hora}</span>
            </div>
          </div>
          
          {/* {ata.uploaded_at && (
            <div className="flex items-start">
              <FiCalendar className="mt-0.5 mr-3 text-sky-700" />
              <div>
                <span className="font-medium text-gray-700">{t("uploaded_at")}: </span>
                <span className="text-gray-600">{formatDate(ata.uploaded_at)}</span>
              </div>
            </div>
          )} */}

          {ata.file_url && (
              <div className="mt-8 pt-6 border-t border-gray-200">
                <a
                  href={`${API_URL}${ata.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-sky-800 text-white rounded-md hover:bg-sky-900 transition-colors"
                >
                  <FiDownload className="mr-2" /> 
                  {t("download_original_document")}
                  {ata.file_type && ` (${ata.file_type})`}
                </a>
              </div>
            )}
        </div>
      </div>
    </>
  );
};


export default AtaSidebar;