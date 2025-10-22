import { useState, useEffect } from "react";
import { FiArrowRight, FiClock, FiBell } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import Modal from "./Modal";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5059";

export default function NewsletterModal({ isOpen, onClose }) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [selectedMunicipios, setSelectedMunicipios] = useState([]);
  const [municipios, setMunicipios] = useState([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showSelect, setShowSelect] = useState(false);

  // Fetch municipios when modal opens
  useEffect(() => {
    if (isOpen && municipios.length === 0) {
      fetchMunicipios();
    }
  }, [isOpen]);

  const fetchMunicipios = async () => {
    try {
      const response = await fetch(`${API_URL}/v0/public/municipios`);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setMunicipios(data);
    } catch (error) {
      console.error("Erro ao carregar municípios:", error);
    }
  };

  const handleMunicipioChange = (e) => {
    const municipioId = e.target.value;
    
    if (municipioId === "all") {
      if (selectedMunicipios.length === municipios.length) {
        setSelectedMunicipios([]);
      } else {
        setSelectedMunicipios(municipios.map(m => m.id));
      }
      return;
    }
    
    setSelectedMunicipios(prev => {
      if (prev.includes(municipioId)) {
        return prev.filter(id => id !== municipioId);
      } else {
        return [...prev, municipioId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!showSelect) {
      setShowSelect(true);
      return;
    }
    
    if (selectedMunicipios.length === 0) {
      setMessage(t("newsletterModal.select_at_least_one"));
      setIsError(true);
      return;
    }

    setIsLoading(true);
    setIsError(false);
    setMessage(t("newsletterModal.submitting"));

    try {
      const response = await fetch(`${API_URL}/v0/newsletter/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          municipio_ids: selectedMunicipios
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP error! Status: ${response.status}`);
      }

      setMessage(t("newsletterModal.success_message"));
      setIsError(false);
      
      if (response.status === 201 || response.status === 200) {
        setTimeout(() => {
          resetForm();
          onClose();
        }, 3000);
      }
    } catch (error) {
      console.error("Erro na subscrição:", error);
      setMessage(error.message || t("newsletterModal.error_occurred"));
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setName("");
    setEmail("");
    setSelectedMunicipios([]);
    setShowSelect(false);
    setMessage("");
    setIsError(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal open={isOpen} onClose={handleClose} classes="bg-white rounded-lg shadow-lg relative max-w-xl">
      <div className="p-6 sm:p-8 w-full max-w-lg dark:bg-gray-900 rounded-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-900/20 mb-4">
            <FiBell className="w-5 h-5 text-sky-600 dark:text-sky-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {t("newsletterModal.title")}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t("newsletterModal.description")}
          </p>
        </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {!showSelect ? (
                <>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("newsletterModal.name")} <span className="text-gray-400 dark:text-gray-500 font-normal">({t("newsletterModal.optional")})</span>
                      </label>
                      <input
                        type="text"
                        placeholder={t("newsletterModal.name_placeholder")}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {t("newsletterModal.email")} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        placeholder={t("newsletterModal.email_placeholder")}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <FiClock className="mr-2 h-4 w-4 animate-spin" />
                        {t("newsletterModal.processing")}
                      </>
                    ) : (
                      <>
                        {t("newsletterModal.continue")}
                        <FiArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
                        {t("newsletterModal.select_municipalities")}
                      </h3>
                      
                      <div className="mb-3">
                        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-gray-100 transition-colors group">
                          <div className="relative mr-2.5">
                            <input
                              type="checkbox"
                              value="all"
                              onChange={handleMunicipioChange}
                              checked={selectedMunicipios.length === municipios.length && municipios.length > 0}
                              className="sr-only"
                            />
                            <div className={`w-4 h-4 rounded border transition-all duration-200 ${
                              selectedMunicipios.length === municipios.length && municipios.length > 0
                                ? 'bg-sky-600 border-sky-600' 
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-sky-400'
                            }`}>
                              {selectedMunicipios.length === municipios.length && municipios.length > 0 && (
                                <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          {selectedMunicipios.length === municipios.length && municipios.length > 0 ? t("newsletterModal.unselect_all") : t("newsletterModal.select_all")}
                        </label>
                      </div>
                      
                      <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-gray-50 dark:bg-gray-800/50">
                        {municipios.length > 0 ? (
                          <div className="space-y-2">
                            {municipios.map((municipio) => (
                              <label key={municipio.id} className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 cursor-pointer transition-colors py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 group">
                                <div className="relative mr-2.5">
                                  <input
                                    type="checkbox"
                                    value={municipio.id}
                                    onChange={handleMunicipioChange}
                                    checked={selectedMunicipios.includes(municipio.id)}
                                    className="sr-only"
                                  />
                                  <div className={`w-4 h-4 rounded border transition-all duration-200 ${
                                    selectedMunicipios.includes(municipio.id)
                                      ? 'bg-sky-600 border-sky-600' 
                                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 group-hover:border-sky-400'
                                  }`}>
                                    {selectedMunicipios.includes(municipio.id) && (
                                      <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                                {municipio.name}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <div className="text-gray-400 dark:text-gray-500 text-sm py-6 text-center">
                            {t("newsletterModal.loading_municipalities")}
                          </div>
                        )}
                      </div>
                      
                      <p className="mt-2.5 text-xs text-gray-500 dark:text-gray-400">
                        {selectedMunicipios.length > 0 
                          ? t(selectedMunicipios.length === 1 ? "newsletterModal.municipalities_selected" : "newsletterModal.municipalities_selected_plural", { count: selectedMunicipios.length })
                          : t("newsletterModal.select_at_least_one_municipality")}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowSelect(false)}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading}
                    >
                      {t("newsletterModal.back")}
                    </button>
                    <button
                      type="submit"
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 text-sm font-medium text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={isLoading || selectedMunicipios.length === 0}
                    >
                      {isLoading ? t("newsletterModal.processing") : t("newsletterModal.subscribe")}
                    </button>
                  </div>
                </>
              )}
            </form>
            
            {message && (
              <div className={`mt-5 text-xs rounded-lg p-3 ${
                isError 
                  ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50' 
                  : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-900/50'
              }`}>
                {message}
              </div>
            )}
      </div>
    </Modal>
  );
}
