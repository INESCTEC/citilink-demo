import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { FiDownload, FiFileText, FiFile, FiAlignLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import RenderHTML from "../../hooks/renderHtml";
import AtaProcessedContent from "./AtaProcessedContent";

const AtaContent = ({ ata, assuntos, participantes, API_URL }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("summary");
  const prevTabRef = useRef("summary");
  
  // Tab order to determine animation direction
  const tabOrder = ["summary", "pdf", "processed"];
  
  const handleTabChange = (tab) => {
    prevTabRef.current = activeTab;
    setActiveTab(tab);
  };
  
  // Determine if the new tab is to the right or left of the previous tab
  const getAnimationDirection = (tabName) => {
    const prevIndex = tabOrder.indexOf(prevTabRef.current);
    const newIndex = tabOrder.indexOf(tabName);
    
    // If moving right to left (new index is lower), content comes from right
    // If moving left to right (new index is higher), content comes from left
    return prevIndex > newIndex ? 1 : -1;
  };

  // console.log("ata", ata);

  return (
    <>
      <div className="font-montserrat">


        {/* Tab Navigation */}
        <div className="flex border-b border-sky-700/30">
          <button
            className={`py-2 px-4 text-sm xs:text-sm md:text-md mr-2 focus:outline-none relative ${
              activeTab === "summary" 
                ? "text-sky-900 font-semibold" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("summary")}
          >
            <FiAlignLeft className="inline mr-1" /> {t("summary")}
            {activeTab === "summary" && (
              <motion.div 
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-900 rounded-full"
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
          <button
            className={`py-2 px-4 text-sm xs:text-sm md:text-md mr-2 focus:outline-none relative ${
              activeTab === "pdf" 
                ? "text-sky-900 font-semibold" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => handleTabChange("pdf")}
          >
            <FiFile className="inline mr-1" /> PDF
            {activeTab === "pdf" && (
              <motion.div 
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-900 rounded-full"
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button>
          {/* <button
            className={`py-2 px-4 text-sm xs:text-sm md:text-md focus:outline-none relative cursor-not-allowed ${
              activeTab === "processed" 
                ? "text-sky-900 font-semibold" 
                : "text-gray-500 hover:text-gray-700"
            }`}
            disabled="true"
            onClick={() => handleTabChange("processed")}
          >
            <FiFileText className="inline mr-1" /> {t("noted_content")}
            {activeTab === "processed" && (
              <motion.div 
                className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-sky-900 rounded-full"
                layoutId="tab-underline"
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </button> */}
        </div>

        {/* Tab Content */}
        <div className="relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {/* Summary Tab */}
            {activeTab === "summary" && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, x: 20 * getAnimationDirection("summary") }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 * getAnimationDirection("summary") }}
                transition={{ duration: 0.3 }}
                className=" text-gray-800 text-justify font-raleway"
              >
                {ata.summary ? (
                  <p className="whitespace-pre-line bg-gray-50 font-light text-md p-4 border-b-2 border-gray-200">{ata.summary}</p>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center bg-gray-50 space-y-2 border-b-2 border-gray-200">
                    <FiFileText className="text-gray-500" size={24} />
                    <p className="text-gray-500 italic">{t("no_summary_available")}</p>
                  </div>

                )}
              </motion.div>
            )}

            {/* PDF Tab */}
            {activeTab === "pdf" && (
              <motion.div
                key="pdf"
                initial={{ opacity: 0, x: 20 * getAnimationDirection("pdf") }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 * getAnimationDirection("pdf") }}
                transition={{ duration: 0.3 }}
              >
                {ata.pdf_url ? (
                  <div className="flex flex-col">
                    <iframe
                      src={`${API_URL}/${ata.pdf_file_path}`}
                      className="w-full h-[600px] border border-gray-200 rounded"
                      title={ata.title}
                    ></iframe>
                    <a 
                      href={ata.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="self-end mt-2 inline-flex items-center text-sky-700 hover:text-sky-800 text-sm"
                    >
                      {/* <FiDownload className="mr-1" /> {t("download_pdf")} */}
                    </a>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center bg-gray-50 space-y-2 border-b-2 border-gray-200">
                    <FiFile className="text-gray-500" size={24} />
                    <p className="text-gray-500 italic">{t("no_pdf_available")}</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Processed Content Tab */}
            {activeTab === "processed" && (
              <motion.div
                key="processed"
                initial={{ opacity: 0, x: 20 * getAnimationDirection("processed") }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 * getAnimationDirection("processed") }}
                transition={{ duration: 0.3 }}
              >
                <AtaProcessedContent processedContent={ata.processed_content} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default AtaContent;