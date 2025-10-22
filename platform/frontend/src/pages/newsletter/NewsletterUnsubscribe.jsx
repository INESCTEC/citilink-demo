import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import LangLink from "../../components/common/LangLink";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5059";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE || "0";

export default function NewsletterUnsubscribe() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = async () => {
      try {
        const response = await fetch(`${API_URL}/v0/newsletter/unsubscribe/${token}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || `HTTP error! Status: ${response.status}`);
        }
        
        setStatus("success");
        setMessage(data.message || "Removido com sucesso da lista de newsletter.");
      } catch (error) {
        console.error("Erro ao cancelar subscrição:", error);
        setStatus("error");
        setMessage(
          error.message || 
          "Ocorreu um erro ao cancelar a sua subscrição. O link pode ser inválido."
        );
      }
    };

    if (token) {
      unsubscribe();
    } else {
      setStatus("error");
      setMessage("Link de cancelamento inválido.");
    }
  }, [token]);

  return (
    <div className="min-h-screen bg-sky-900 dark:bg-gray-900 pt-20">
      <Navbar />
      <div className="bg-sky-900 min-h-screen flex justify-center items-center">
        <div className="container flex justify-center items-center mx-auto p-6 sm:max-w-10/12 w-full min-h-[70vh] h-full bg-gray-50 dark:bg-gray-800 rounded-sm">
          <div className="lg:max-w-6/12 w-full font-montserrat text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Cancelar Subscrição
            </h1>
            
            {status === "loading" && (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-20 w-20 border-b-2 border-sky-700"></div>
                <p className="mt-4 text-xl text-gray-100">A processar o seu pedido...</p>
              </div>
            )}
            
            {status === "success" && (
              <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-lg">
                <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-300 mb-4">Subscrição Cancelada</h2>
                <p className="text-blue-700 dark:text-blue-300 mb-6">{message}</p>
                <p className="text-blue-700 dark:text-blue-300 mb-6">
                  Sentimos a sua falta! Pode subscrever novamente a qualquer momento.
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-3">
                  <LangLink to="/" className="text-white bg-sky-700 hover:bg-sky-600 transition px-6 py-3 rounded-md font-semibold">
                    Voltar ao Início
                  </LangLink>
                  <LangLink to="/newsletter" className="text-white bg-gray-600 hover:bg-gray-500 transition px-6 py-3 rounded-md font-semibold">
                    Subscrever Novamente
                  </LangLink>
                </div>
              </div>
            )}
            
            {status === "error" && (
              <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-lg">
                <div className="text-red-600 dark:text-red-300 text-6xl mb-4">
                  <i className="fas fa-exclamation-circle"></i>
                </div>
                <h2 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">Erro</h2>
                <p className="text-red-700 dark:text-red-300 mb-6">{message}</p>
                <LangLink to="/" className="text-white bg-sky-700 hover:bg-sky-600 transition px-6 py-3 rounded-md font-semibold">
                  Voltar ao Início
                </LangLink>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
