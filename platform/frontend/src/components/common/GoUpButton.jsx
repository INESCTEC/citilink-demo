import { useState, useEffect } from 'react';
import { FiChevronUp } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const GoUpButton = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', toggleVisibility);

    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 1,
      behavior: 'smooth'
    });
    window.scrollTo({
      top: 0, behavior: 'smooth'
    })
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 p-3 cursor-pointer bg-sky-700 dark:bg-sky-950 text-white rounded-md shadow-lg hover:bg-sky-800 dark:hover:bg-gray-900 transition-colors duration-300 z-40"
          aria-label="Go to top"
        >
          <FiChevronUp size={24} />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

export default GoUpButton; 