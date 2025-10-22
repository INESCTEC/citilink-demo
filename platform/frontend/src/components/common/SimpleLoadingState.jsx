import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const SimpleLoadingState = ({ isLoading = true, minDisplayTime = 0, text }) => {
  const { t } = useTranslation();
  const [dotCount, setDotCount] = useState(0);
  const [internalIsLoading, setInternalIsLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  
  // Handle dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prevCount) => (prevCount + 1) % 4);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle minimum display time if specified
  useEffect(() => {
    if (minDisplayTime <= 0) {
      setInternalIsLoading(isLoading);
      return;
    }
    
    if (isLoading) {
      setInternalIsLoading(true);
      setStartTime(Date.now());
    } else if (startTime) {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      
      if (remainingTime > 0) {
        const timer = setTimeout(() => {
          setInternalIsLoading(false);
        }, remainingTime);
        
        return () => clearTimeout(timer);
      } else {
        setInternalIsLoading(false);
      }
    }
  }, [isLoading, minDisplayTime, startTime]);
  
  const dots = ".".repeat(dotCount);
  
  // Simple fade in/out animation variants
  const containerVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.5 } }
  };
  
  const circlePathVariants = {
    initial: { pathLength: 0 },
    animate: { 
      pathLength: 1,
      transition: { 
        duration: 1.5, 
        ease: "easeInOut", 
        repeat: Infinity, 
        repeatType: "reverse" 
      }
    }
  };
  
  const loadingCircleVariants = {
    animate: {
      rotate: 360,
      transition: { 
        rotate: { duration: 1.5, ease: "linear", repeat: Infinity }
      }
    }
  };

  return (
    <AnimatePresence mode="wait">
      {internalIsLoading && (
        <motion.div 
          className="fixed inset-0 flex flex-col justify-center items-center z-50"
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          style={{ overflow: "hidden" }}
        >
          <motion.div 
            className="absolute inset-0 bg-sky-800 backdrop-blur-md"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          
          <div className="container mx-auto px-4 py-24 relative z-10">
            <div className="flex flex-col justify-center items-center min-h-screen text-white">
              {/* Custom Motion Loading Circle */}
              <motion.div
                variants={loadingCircleVariants}
                animate="animate"
                className="mb-6"
              >
                <svg width="50" height="50" viewBox="0 0 50 50">
                  <motion.circle
                    cx="25"
                    cy="25"
                    r="20"
                    stroke="white"
                    strokeWidth="4"
                    fill="transparent"
                    variants={circlePathVariants}
                    initial="initial"
                    animate="animate"
                  />
                  <motion.circle
                    cx="25"
                    cy="25"
                    r="10"
                    fill="white"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      transition: { duration: 1.5, repeat: Infinity }
                    }}
                  />
                </svg>
              </motion.div>
              
              <motion.div 
                className="text-center"
                variants={containerVariants}
              >
                <h1 className="text-2xl font-semibold font-montserrat">
                  {text || t("loading_loading")}{dots}
                </h1>
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SimpleLoadingState;
