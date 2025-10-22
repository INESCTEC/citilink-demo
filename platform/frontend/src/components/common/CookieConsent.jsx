import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiX, FiCheckCircle, FiAlertCircle, FiXCircle } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';
import LangLink from './LangLink';

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const { t } = useTranslation();
  
  useEffect(() => {
    const hasLocalConsent = localStorage.getItem('cookieConsent');
    const hasCookieConsent = document.cookie.split(';').find(cookie => cookie.trim().startsWith('cookieConsent='));
    
    if (!hasLocalConsent && !hasCookieConsent) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (hasLocalConsent && !hasCookieConsent) {
      const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `cookieConsent=${hasLocalConsent}; path=/; max-age=${60*60*24*365}; SameSite=Lax${isSecure}`;
    }
  }, []);
  
  const acceptCookies = () => {
    localStorage.setItem('cookieConsent', 'full');
    // Set cookie for backend to read - secure flag for HTTPS
    const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `cookieConsent=full; path=/; max-age=${60*60*24*365}; SameSite=Lax${isSecure}`;
    setShowBanner(false);
  };
  
  const acceptMinimalCookies = () => {
    localStorage.setItem('cookieConsent', 'minimal');
    // Set cookie for backend to read - secure flag for HTTPS
    const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `cookieConsent=minimal; path=/; max-age=${60*60*24*365}; SameSite=Lax${isSecure}`;
    setShowBanner(false);
    // Here you could disable non-essential cookies while keeping essential ones
  };
  
  const declineCookies = () => {
    localStorage.setItem('cookieConsent', 'declined');
    // Set cookie for backend to read - secure flag for HTTPS
    const isSecure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `cookieConsent=declined; path=/; max-age=${60*60*24*365}; SameSite=Lax${isSecure}`;
    setShowBanner(false);
    // Here you could disable non-essential cookies
  };
  
  if (!showBanner) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] border-t border-gray-200">
      <div className="container mx-auto px-4 py-4 font-montserrat">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-sky-950 font-semibold flex items-center gap-2">
              <FiAlertCircle className="text-sky-950" />
              {t('cookie_consent_title', 'Sobre Cookies e Privacidade')}
            </h3>
            <p className="text-gray-600 text-sm mt-1">
              {t('cookie_consent_description', 'Utilizamos cookies essenciais para o funcionamento do website e cookies opcionais para melhorar a sua experiência. Pode escolher aceitar apenas os cookies essenciais ou todos os cookies. Consulte a nossa ')}
              <LangLink to="/politicadeprivacidade" className="text-sky-700 hover:underline">
                {t('privacy_policy', 'política de privacidade')}
              </LangLink>
              {t('cookie_consent_more_info', ' para mais informações.')}.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={acceptMinimalCookies}
              className="px-4 py-2 border border-gray-300 text-gray-700 hover:text-sky-800 font-medium rounded-md text-sm flex items-center justify-center gap-1 transition-colors"
            >
              <FiAlertCircle />
              {t('minimal_cookies', 'Apenas Essenciais')}
            </button>
            <button
              onClick={acceptCookies}
              className="px-4 py-2 bg-sky-800 text-white hover:bg-sky-950 font-medium rounded-md text-sm flex items-center justify-center gap-1 transition-colors"
            >
              <FiCheckCircle />
              {t('accept_all', 'Aceitar Todos')}
            </button>
          </div>
          
          <button
            onClick={acceptMinimalCookies}
            className="absolute top-2 right-2 text-gray-400 hover:text-sky-950 md:hidden"
            aria-label={t('close', 'Fechar')}
          >
            <FiX size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;