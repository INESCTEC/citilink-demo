import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import DevGate from "./components/DevGate";
import CookieConsent from "./components/common/CookieConsent";
import GoUpButton from "./components/common/GoUpButton";

import PublicView from "./pages/PublicView";
import MunicipiosPage from "./pages/public/MunicipiosPage";
import MunicipioPage from "./pages/public/MunicipioPage";
import AssuntoPage from "./pages/public/AssuntoPage";
import AtaPage from "./pages/public/AtaPage";
import ParticipantePage from "./pages/public/ParticipantePage";
import TopicPage from "./pages/public/TopicPage";
import SearchPage from "./pages/search/SearchPage";
import About from "./pages/About";
import PrivacyPolicy from "./pages/PrivacyPolicy";

import Newsletter from "./pages/newsletter/Newsletter";
import NewsletterVerify from "./pages/newsletter/NewsletterVerify";
import NewsletterUnsubscribe from "./pages/newsletter/NewsletterUnsubscribe";
import NotFound from "./pages/NotFound";
import Media from "./pages/Media";

import { LastSeenProvider } from "./contexts/LastSeenContext";
import { ToastProvider } from "./contexts/ToastProvider";
import { LanguageProvider } from "./contexts/LanguageContext";

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  
  const enableGate = import.meta.env.VITE_ENABLE_ACCESS_GATE === "true"
  
  useEffect(() => {
    const robotsTag = document.createElement("meta");
    robotsTag.name = "robots";
    robotsTag.content = "noindex, nofollow";
    document.head.appendChild(robotsTag);

    // setting the title dynamically
    const titleTag = document.createElement("title");
    titleTag.textContent = "CitiLink - Plataforma de transparência e participação dos cidadãos"
    document.head.appendChild(titleTag);

    return () => {
      if (robotsTag && robotsTag.parentNode) {
        robotsTag.parentNode.removeChild(robotsTag);
      }
    };
  }, []);

  const renderRoutes = (
    <Routes>
      <Route path="/" element={<PublicView />} />
      <Route path="/municipios" element={<MunicipiosPage />} />
      <Route path="/municipios/:countyId" element={<MunicipioPage />} />
      
      <Route path="/municipios/:countyId/atas/:ataId/assuntos/:subjectId" element={<AssuntoPage />} />
      <Route path="/assuntos/:subjectId" element={<AssuntoPage />} />

      <Route path="/atas/:ataId" element={<AtaPage />} />
      <Route path="/municipios/:countyId/atas/:ataId" element={<AtaPage />} />

      <Route path="/municipios/:countyId/participante/:participanteId" element={<ParticipantePage />} />
      <Route path="/participante/:participanteId" element={<ParticipantePage />} />

      <Route path="/municipios/:countyId/topicos/:topicId" element={<TopicPage />} />
      <Route path="/topicos/:topicId" element={<TopicPage />} />

      <Route path="/pesquisa" element={<SearchPage />} />
      <Route path="/sobre" element={<About />} />
      <Route path="/media" element={<Media />} />
      <Route path="/politicadeprivacidade" element={<PrivacyPolicy />} />
      
      <Route path="/newsletter" element={<Newsletter />} />
      <Route path="/newsletter/verify/:token" element={<NewsletterVerify />} />
      <Route path="/newsletter/unsubscribe/:token" element={<NewsletterUnsubscribe />} />

      {/* en */}
      <Route path="/en/" element={<PublicView />} />
      <Route path="/en/municipalities" element={<MunicipiosPage />} />
      <Route path="/en/municipalities/:countyId" element={<MunicipioPage />} />
      
      <Route path="/en/municipalities/:countyId/minutes/:ataId/subjects/:subjectId" element={<AssuntoPage />} />
      <Route path="/en/subjects/:subjectId" element={<AssuntoPage />} />

      <Route path="/en/minutes/:ataId" element={<AtaPage />} />
      <Route path="/en/municipalities/:countyId/minutes/:ataId" element={<AtaPage />} />

      <Route path="/en/municipalities/:countyId/participants/:participanteId" element={<ParticipantePage />} />
      <Route path="/en/participants/:participanteId" element={<ParticipantePage />} />

      <Route path="/en/municipalities/:countyId/topicos/:topicId" element={<TopicPage />} />
      <Route path="/en/topics/:topicId" element={<TopicPage />} />

      <Route path="/en/search" element={<SearchPage />} />
      <Route path="/en/about" element={<About />} />
      <Route path="/en/media" element={<Media />} />
      <Route path="/en/privacypolicy" element={<PrivacyPolicy />} />
      
      <Route path="/en/newsletter" element={<Newsletter />} />
      <Route path="/en/newsletter/verify/:token" element={<NewsletterVerify />} />
      <Route path="/en/newsletter/unsubscribe/:token" element={<NewsletterUnsubscribe />} />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );

  return (
    <Router>
      <LanguageProvider>
        <LastSeenProvider>
          <ToastProvider>
        {enableGate ? (
          <DevGate>
            {renderRoutes}
            <CookieConsent />
            <GoUpButton />
          </DevGate>
        ) : (
          <>
            {renderRoutes}
            <CookieConsent />
            <GoUpButton />
          </>
        )}
        </ToastProvider>
        </LastSeenProvider>
      </LanguageProvider>
    </Router>
  );
}

export default App;