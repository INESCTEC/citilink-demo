import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

const LoadingState = ({ isLoading = true, minDisplayTime = 0, text }) => {
  const { t } = useTranslation();
  const [dotCount, setDotCount] = useState(0);
  const [internalIsLoading, setInternalIsLoading] = useState(true);
  
  // Handle dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDotCount((prevCount) => (prevCount + 1) % 4);
    }, 500);
    
    return () => clearInterval(interval);
  }, []);
  
  // Handle minimum display time if specified
  useEffect(() => {
    // If no minimum time specified or not loading, use the passed isLoading prop directly
    if (minDisplayTime <= 0 || !isLoading) {
      setInternalIsLoading(isLoading);
      return;
    }
    
    // When loading starts, record start time
    if (isLoading) {
      setInternalIsLoading(true);
      const startTime = Date.now();
      
      // Store the start time for reference when isLoading becomes false
      return () => {
        // If component unmounts while loading, do nothing
      };
    } else {
      // When loading stops, ensure minimum time has passed
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);
      
      if (remainingTime > 0) {
        // Wait for remaining time before hiding
        const timer = setTimeout(() => {
          setInternalIsLoading(false);
        }, remainingTime);
        
        return () => clearTimeout(timer);
      } else {
        // Minimum time already passed, hide immediately
        setInternalIsLoading(false);
      }
    }
  }, [isLoading, minDisplayTime]);
  
  const dots = ".".repeat(dotCount);
  
  const containerVariants = {
    initial: { opacity: 0, y: "-100vh" }, // Start from top
    animate: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    },
    exit: { 
      y: "-100vh", // Exit to top (slides up)
      transition: { 
        duration: 1.2, // Longer duration for more visible effect
        ease: [0.165, 0.84, 0.44, 1], // Enhanced easing curve
        delay: 0.3 // Small delay to ensure visibility
      }
    }
  };
  
  const backgroundVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { duration: 0.5 } },
    exit: {
      opacity: [1, 1, 0.8, 0], 
      transition: { 
        duration: 1.2,
        times: [0, 0.5, 0.8, 1],
        delay: 0.3
      }
    }
  };
  
  // Custom loading circle animation
  const loadingCircleVariants = {
    animate: {
      rotate: 360,
      transition: { 
        rotate: { duration: 1.5, ease: "linear", repeat: Infinity },
      }
    },
    exit: {
      scale: 0,
      y: -100, // Move up instead of down
      transition: { duration: 0.7, delay: 0.3 }
    }
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
  
  const textVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.5, delay: 0.3 } },
    exit: {
      y: -80, // Move up instead of down
      opacity: 0,
      transition: { duration: 0.5, ease: "easeInOut", delay: 0.3 }
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
            className="absolute inset-0 bg-sky-800 dark:bg-sky-950 backdrop-blur-md"
            variants={backgroundVariants}
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
                exit="exit"
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
                variants={textVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                {/* <h1 className="text-2xl font-semibold font-montserrat">
                  {text || t("loading_loading")}{dots}
                </h1> */}
              </motion.div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingState;