import React from "react";
import { motion, AnimatePresence } from "framer-motion";

const LoadingStateOverlay = ({ 
  isVisible = true, 
  bgColor = "bg-sky-800", 
  zIndex = 50, 
  duration = 0.4,
  delay = 0.4,
  children
}) => {
  // Curtain animation variants
  const leftCurtainVariants = {
    initial: { x: "0%" },
    animate: { x: "0%" },
    exit: { 
      x: "-100%", 
      transition: { 
        duration: duration, 
        ease: [0.22, 0.7, 0.36, 0.7],
        delay: delay
      } 
    }
  };

  const rightCurtainVariants = {
    initial: { x: "0%" },
    animate: { x: "0%" },
    exit: { 
      x: "100%", 
      transition: { 
        duration: duration, 
        ease: [0.22, 0.7, 0.36, 0.7], 
        delay: delay
      } 
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div 
          className={`fixed inset-0 flex flex-row overflow-hidden z-${zIndex}`}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 1 }}
        >
          {/* Left Curtain */}
          <motion.div 
            className={`w-1/2 h-full ${bgColor}`}
            variants={leftCurtainVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />
          
          {/* Right Curtain */}
          <motion.div 
            className={`w-1/2 h-full ${bgColor}`}
            variants={rightCurtainVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          />

          {/* Optional children content */}
          {children && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              {children}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoadingStateOverlay;
