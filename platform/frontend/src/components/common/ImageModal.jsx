import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

/**
 * A reusable image modal component that shows an image in a larger size
 * @param {Object} props - Component props
 * @param {string} props.src - Source URL of the image
 * @param {string} props.alt - Alt text for the image
 * @param {boolean} props.isOpen - Whether the modal is open
 * @param {Function} props.onClose - Function to call when modal is closed
 */
const ImageModal = ({ src, alt = "Image", isOpen, onClose }) => {
  if (!isOpen) return null;

  // Handle click outside the image to close the modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div 
            className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-lg"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute cursor-pointer top-2 right-2 bg-gray-900/60 hover:bg-gray-900/80 text-white p-2 rounded-md transition-colors z-20"
              aria-label="Close"
            >
              <FiX size={24} />
            </button>
            
            {/* Image */}
            <img 
              src={src} 
              alt={alt}
              className="max-h-[85vh] max-w-full object-contain rounded-lg"
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImageModal;
