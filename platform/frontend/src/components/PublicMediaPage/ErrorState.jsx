import React from "react";
import { FiAlertCircle, FiRepeat } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import { FaExclamation, FaQuestion } from "react-icons/fa";

const ErrorState = ({ error, onRetry }) => {
  const { t } = useTranslation();

  return (
    <div className="text-center py-30 font-montserrat">
      <div className="flex justify-center items-center">
        <FaExclamation className=" h-12 w-12 text-red-500 mb-4" />
        <FaQuestion className=" h-12 w-12 text-red-500 mb-4" />
      </div>
      <p className="text-sky-900 text-lg mb-2">{t("media_error", "Ocorreu um erro ao carregar o conteúdo media")}</p>
      {/* <p className="text-gray-700">{error}</p> */}
      {onRetry && (
        <button 
          onClick={onRetry} 
          className="mt-4 px-4 py-2 bg-sky-800 text-white rounded-md hover:bg-sky-900 transition-colors text-sm"
        >
          Tentar novamente
          <FiRepeat className="inline-block ml-2" />
        </button>
      )}
    </div>
  );
};

export default ErrorState;