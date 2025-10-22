import React from "react";
import { motion } from "framer-motion";

const LoadingSpinner = ({ 
  color = "", 
  text = "", 
  textClass = "text-lg font-medium mt-3",
  padding = "py-20"
}) => {
  const spinnerVariants = {
    animate: {
      rotate: 360,
      transition: { 
        rotate: { duration: 1.5, ease: "linear", repeat: Infinity }
      }
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
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.5, delay: 0.2 }
    }
  };
  
  return (
    <div className={`flex flex-col justify-center items-center ${padding} font-montserrat`}>
      <motion.div
        variants={spinnerVariants}
        animate="animate"
        className={color} // Apply color class to the spinner
      >
        <svg width="40" height="40" viewBox="0 0 50 50">
          <motion.circle
            cx="25"
            cy="25"
            r="20"
            stroke="currentColor"
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
            fill="currentColor"
            animate={{ 
              scale: [1, 1.2, 1],
              transition: { duration: 1.5, repeat: Infinity }
            }}
          />
        </svg>
      </motion.div>
      
      {text && (
        <motion.div
          className={textClass}
          variants={textVariants}
          initial="initial"
          animate="animate"
        >
          {text}
        </motion.div>
      )}
    </div>
  );
};

export default LoadingSpinner;