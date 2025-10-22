import { useState, useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import LangLink from "../../components/common/LangLink";
import { FiCheckCircle, FiXCircle } from "react-icons/fi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5059";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE || "0";

export default function NewsletterVerify() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false); // Prevent duplicate requests

  useEffect(() => {
    const verifyToken = async () => {
      // Prevent duplicate requests
      if (hasVerified.current) {
        console.log("Verification already in progress, skipping duplicate request");
        return;
      }
      
      hasVerified.current = true;
      
      try {
        console.log("Verifying token:", token);
        const response = await fetch(`${API_URL}/v0/newsletter/verify/${token}`);
        console.log("Response status:", response.status);
        console.log("Response ok:", response.ok);
        
        const data = await response.json();
        console.log("Response data:", data);
        
        if (response.ok) {
          // HTTP 200 - success (either first verification or already verified)
          setStatus("success");
          setMessage(data.message || "Subscrição verificada com sucesso!");
        } else {
          // HTTP error (400, 500, etc.)
          setStatus("error");
          setMessage(data.error || `Erro ao verificar. Status: ${response.status}`);
        }
      } catch (error) {
        console.error("Erro ao verificar email:", error);
        setStatus("error");
        setMessage(
          error.message || 
          "Ocorreu um erro ao verificar a sua subscrição. O link pode ser inválido ou ter expirado."
        );
      }
    };

    if (token) {
      verifyToken();
    } else {
      setStatus("error");
      setMessage("Link de verificação inválido.");
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-sky-700 dark:bg-gray-950 flex flex-col font-montserrat">
      <Navbar />
      
      {/* Main Content - fills remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          
          {status === "loading" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-900/20 mb-6">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-sky-600 border-t-transparent"></div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">A verificar subscrição...</p>
            </div>
          )}
          
          {status === "success" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-900/20 mb-6">
                <FiCheckCircle className="w-6 h-6 text-sky-600 dark:text-sky-400" />
              </div>
              
              <h1 className="text-xl font-semibold text-white dark:text-gray-100 mb-3">
                Email verificado
              </h1>
              <p className="text-sm text-sky-100 dark:text-gray-400 leading-relaxed mb-8">
                {message}
              </p>
              
              <LangLink 
                to="/" 
                className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-800 rounded-lg transition-colors duration-200"
              >
                Voltar ao início
              </LangLink>
            </div>
          )}
          
          {status === "error" && (
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 mb-6">
                <FiXCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              
              <h1 className="text-xl font-semibold text-white dark:text-gray-100 mb-3">
                Erro na verificação
              </h1>
              <p className="text-sm text-sky-100 dark:text-gray-400 leading-relaxed mb-8">
                {message}
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <LangLink 
                  to="/" 
                  className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-800 rounded-lg transition-colors duration-200"
                >
                  Voltar ao início
                </LangLink>
                {/* <LangLink 
                  to="/newsletter" 
                  className="inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                >
                  Tentar novamente
                </LangLink> */}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
