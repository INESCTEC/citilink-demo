import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX } from "react-icons/fi";

const GenericToast = ({ 
  message, 
  type = "error", 
  show, 
  onClose, 
  duration = 5000,
  position = "top-right",
  className = "",
  stackIndex = 0,
  timestamp = null
}) => {
  // Auto-close after duration
  useEffect(() => {
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        onClose && onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  // Define colors based on type
  const getColors = () => {
    switch (type) {
      case "success":
        return " text-emerald-700";
      case "info":
        return " text-sky-700";
      case "warning":
        return " text-amber-700";
      case "error":
      default:
        return " text-rose-700";
    }
  };


  // Each toast is offset by its stack index for stacking effect
  const verticalOffset = stackIndex * 80; // px, adjust for toast height + gap
  // Format timestamp
  const formatTimestamp = (ts) => {
    if (!ts) return "";
    const date = new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  return (
    <AnimatePresence>
      {show && message && (
        <motion.div
          initial={{ y: verticalOffset - 40, opacity: 0, scale: 0.95 }}
          animate={{ y: verticalOffset, opacity: 1, scale: 1 }}
          exit={{ y: verticalOffset + 40, opacity: 0, scale: 0.9 }}
          transition={{
            y: { type: "spring", stiffness: 400, damping: 30 },
            opacity: { duration: 0.25 },
            scale: { duration: 0.2 }
          }}
          className={`absolute right-0 p-2 rounded-md shadow-lg min-w-[300px] font-montserrat bg-white ${getColors()} ${className}`}
          role="alert"
          aria-live="assertive"
          tabIndex={0}
          style={{ marginBottom: 8, zIndex: 50 }}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] text-gray-400">{formatTimestamp(timestamp)}</span>
            <button 
              onClick={onClose} 
              className="ml-2 text-gray-500 hover:text-gray-700 cursor-pointer"
              aria-label="Close notification"
            >
              <FiX />
            </button>
          </div>
          <div className="flex items-center">
            <span className="font-light text-xs">{message}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GenericToast;