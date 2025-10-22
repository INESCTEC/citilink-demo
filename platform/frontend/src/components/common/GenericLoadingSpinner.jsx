import React from "react";
import { motion } from "framer-motion";

const GenericLoadingSpinner = ({ 
  icon: Icon,
  color = "", 
  text = "", 
  textClass = "text-lg font-medium mt-3",
  iconSize = "text-2xl"
}) => {
  const iconVariants = {
    animate: {
      scale: [1, 1.1, 1],
      rotate: [0, 10, 0, -10, 0],
      transition: { 
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
      }
    }
  };
  
  const textVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: [0.5, 1, 0.5],
      transition: { 
        duration: 1.5, 
        ease: "easeInOut",
        repeat: Infinity
      }
    }
  };
  
  return (
    <div className="flex flex-col justify-center items-center py-10">
      {Icon && (
        <motion.div
          variants={iconVariants}
          animate="animate"
          className={`${color} ${iconSize}`}
        >
          <Icon />
        </motion.div>
      )}
      
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

export default GenericLoadingSpinner;
