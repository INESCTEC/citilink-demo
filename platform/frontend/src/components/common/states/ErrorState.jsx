import React from "react";
import { Link, useParams } from "react-router-dom";
import { FiAlertCircle, FiHome, FiArrowLeft } from "react-icons/fi";
import Navbar from "../Navbar";
import Footer from "../Footer";
import LangLink from "../LangLink";

const ErrorState = ({ title = "Erro", message = "Ocorreu um erro ao carregar os dados." }) => {

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      
      <div className="flex-grow flex justify-center min-h-screen items-center">
        <div className="text-center max-w-md mx-auto p-6">
          <FiAlertCircle className="text-red-500 text-5xl mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-3 font-montserrat">{title}</h2>
          <p className="text-gray-200 font-raleway text-sm mb-6">{message}</p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button 
              onClick={() => window.history.back()}
              className="inline-flex items-center cursor-pointer justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-md font-montserrat hover:bg-gray-300 transition-colors"
            >
              <FiArrowLeft className="mr-2" />
              Voltar
            </button>
            
            <LangLink 
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 bg-sky-800 text-white rounded-md font-montserrat hover:bg-sky-900 transition-colors"
            >
              <FiHome className="mr-2" />
              Página Inicial
            </LangLink>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default ErrorState;