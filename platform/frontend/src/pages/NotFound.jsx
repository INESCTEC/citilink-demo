import { FiChevronLeft } from "react-icons/fi";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import LangLink from "../components/common/LangLink";

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-sky-900 text-center font-montserrat overflow-hidden relative">
      
      
      {/* Main content with animations */}
      <motion.h1 
        className="text-6xl font-bold text-white"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100 }}
      >
        {t("not_found_title")}
      </motion.h1>
      
      <motion.p 
        className="text-xl text-gray-300 mt-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.8 }}
      >
        {t("not_found_message")}
      </motion.p>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.8 }}
      >
        <LangLink to="/" className="mt-6 px-6 py-3 bg-sky-800 text-white rounded-lg hover:bg-sky-950 transition flex items-center">
          <motion.div
            animate={{ x: [-2, 0, -2] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <FiChevronLeft />
          </motion.div>
          &nbsp; {t("go_back_home")}
        </LangLink>
      </motion.div>
    </div>
  );
}

export default NotFound;