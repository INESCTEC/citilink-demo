import React, { useState, useEffect } from "react";
import Navbar from "../components/common/Navbar";
import Footer from "../components/common/Footer";
import MediaHeader from "../components/PublicMediaPage/MediaHeader";
import MediaCard from "../components/PublicMediaPage/MediaCard";
import MediaSkeleton from "../components/PublicMediaPage/MediaSkeleton";
import EmptyState from "../components/common/states/EmptyState";
import ErrorState from "../components/PublicMediaPage/ErrorState";
import LoadingState from "../components/common/states/LoadingState";
import { AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

function Media() {
  const [mediaContent, setMediaContent] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Loading animation state variables
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  // Animation timing constants
  const EXIT_ANIMATION_DURATION = 1500; // 1.5 seconds for exit animation
  const MINIMUM_LOADING_TIME = 500; // 0.5 seconds minimum display time

  const { t } = useTranslation();

  useEffect(() => {
    // Update SEO meta tags
    const pageTitle = t("media.title") || "Media | CitiLink";
    const pageDescription = t("media.description") || "Explore the latest media content from CitiLink.";
    const currentUrl = window.location.href;
    
    // Update document title
    document.title = pageTitle;
    
    // Update meta description
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', pageDescription);
    }
    
    // Update Open Graph meta tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      ogTitle.setAttribute('content', pageTitle);
    }
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.setAttribute('content', pageDescription);
    }
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) {
      ogUrl.setAttribute('content', currentUrl);
    }
  }, [t]);
  
  useEffect(() => {
    const fetchMediaContent = async () => {
      // Record start time for calculating minimum display duration
      const startTime = Date.now();
      
      try {
        // Initialize loading states
        setIsLoading(true);
        setShowLoadingState(true);
        setLoadingExiting(false);
        setContentReady(false);
        
        const response = await fetch("https://nabu.dcc.fc.up.pt/api/items/news?filter[media][_eq]=true&filter[projects][projects_id][designation][_eq]=CitiLink");
        
        if (!response.ok) {
          throw new Error("Failed to fetch media content");
        }
        
        const data = await response.json();
        // reverse the order of media content
        data.data.reverse();
        setMediaContent(data.data || []);
        setIsLoading(false);
        
        const loadingTime = Date.now() - startTime;
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        
        setTimeout(() => {
          setContentReady(true); 
          setLoadingExiting(true);
          
          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay);
        
      } catch (err) {
        console.error("Error fetching media content:", err);
        setError(err.message);
        
        const loadingTime = Date.now() - startTime;
        const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
        
        setTimeout(() => {
          setIsLoading(false);
          setContentReady(true);
          setLoadingExiting(true);
          
          setTimeout(() => {
            setShowLoadingState(false);
          }, EXIT_ANIMATION_DURATION);
        }, additionalDelay);
      }
    };

    fetchMediaContent();
  }, []);

  const renderContent = () => {
    if (isLoading) {
      return <MediaSkeleton count={6} />;
    }
    
    if (error) {
      return <ErrorState error={error} onRetry={() => window.location.reload()} />;
    }
    
    if (mediaContent.length === 0) {
      return <EmptyState message="Não foram encontradas notícias para exibir." />;
    }
    
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 font-montserrat">
        {mediaContent.map((item) => (
          <MediaCard key={item.id} item={item} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-sky-800">
      {contentReady && (
        <>
          <Navbar />
          <MediaHeader />
          
          <div className="container mx-auto px-4 py-12">
            {renderContent()}
          </div>
          
          <Footer />
        </>
      )}
      
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Media;