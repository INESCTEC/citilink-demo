import React from "react";
import { useTranslation } from "react-i18next";
import { FiPlay } from "react-icons/fi";
import Modal from "./Modal";

const VideoModal = ({ isOpen, onClose }) => {
  const { t } = useTranslation();

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="p-6 w-full max-w-4xl">
        {/* <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white font-montserrat">
            {t("video_demo_title", "Platform Demonstration")}
          </h2>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            {t("video_demo_description", "Watch this video to learn how to use the CitiLink platform effectively.")}
          </p>
        </div> */}
        
        <div className="relative w-full rounded-lg overflow-hidden bg-black">
          <video
            className="w-full h-auto"
            controls
            preload="metadata"
            poster="/demo-poster.jpg" // Optional: Add a poster image
          >
            <source src="/videos/demo.mp4" type="video/mp4" />
            <source src="/videos/demo.webm" type="video/webm" />
            <p className="text-white p-4">
              {t("video_not_supported", "Your browser does not support the video tag. Please update your browser to view this content.")}
            </p>
          </video>
        </div>
        
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          <p>{t("video_demo_note", "This video provides a comprehensive overview of the platform's features and functionality.")}</p>
        </div>
      </div>
    </Modal>
  );
};

export default VideoModal;
