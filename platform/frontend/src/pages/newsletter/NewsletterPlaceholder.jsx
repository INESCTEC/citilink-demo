import React, { useState, useEffect } from "react";
import Navbar from "../../components/common/Navbar";
import Footer from "../../components/common/Footer";
import LoadingState from "../../components/common/states/LoadingState";
import { AnimatePresence } from "framer-motion";
import { FaNewspaper } from "react-icons/fa";

export default function NewsletterPlaceholder() {
  const [showLoadingState, setShowLoadingState] = useState(true);
  const [loadingExiting, setLoadingExiting] = useState(false);
  const [contentReady, setContentReady] = useState(false);
  
  const EXIT_ANIMATION_DURATION = 1500
  const MINIMUM_LOADING_TIME = 500

  useEffect(() => {
    const initializePage = async () => {
  
      const startTime = Date.now();
      
  
      setShowLoadingState(true);
      setLoadingExiting(false);
      setContentReady(false);
      
  
      const loadingTime = Date.now() - startTime;
      const additionalDelay = Math.max(0, MINIMUM_LOADING_TIME - loadingTime);
      
  
      setTimeout(() => {
        setContentReady(true)
        setLoadingExiting(true)
        
    
        setTimeout(() => {
          setShowLoadingState(false)
        }, EXIT_ANIMATION_DURATION);
      }, additionalDelay);
    };

    initializePage();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {contentReady && (
        <div className="min-h-screen flex flex-col">
          <Navbar />
          <div className="py-8 bg-sky-800"></div>
          <div className="flex-grow min-h-96 my-20 flex items-center justify-center px-4 font-montserrat">
            <div className="text-center p-10 max-w-md w-full">
              <div className="flex items-center justify-center mb-0 gap-x-2">
              <FaNewspaper className="text-5xl text-gray-800 " />
              <h1 className="text-4xl font-bold text-gray-800 dark:text-white">Em Breve...</h1>
              </div>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                A nossa newsletter está em desenvolvimento e estará disponível em breve!
              </p>
            </div>
          </div>
          <Footer />
        </div>
      )}
      
      <AnimatePresence mode="wait">
        {showLoadingState && (
          <LoadingState isLoading={!loadingExiting} />
        )}
      </AnimatePresence>
    </div>
  );
}