import React from 'react';
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

// Animated switch toggle for AND/OR logic (participants/topics)
const LogicSwitchToggle = ({ logic, onChange, label, disabled = false }) => {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center justify-between py-2 px-3 bg-gray-50 border-b border-gray-200 ${disabled ? 'opacity-50' : ''}`}>
      <span className="text-xs font-light text-gray-600 uppercase tracking-wider">{label}</span>
      <div className="flex items-center">
        <span className={`text-xs font-medium mr-2 ${logic === 'or' ? 'text-sky-700' : 'text-gray-500'}`}>{t('or', 'OU')}</span>
        <button
          type="button"
          className={`relative inline-flex h-4 w-10 rounded-full transition-colors focus:outline-none cursor-pointer ${logic === 'and' ? 'bg-emerald-600' : 'bg-sky-700'}`}
          onClick={() => !disabled && onChange(logic === 'or' ? 'and' : 'or')}
          aria-label={logic === 'or' ? t('switch_to_and', 'Mudar para E') : t('switch_to_or', 'Mudar para OU')}
          disabled={disabled}
        >
          <motion.span
            animate={{ x: logic === 'and' ? 26 : 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-0.5 left-0 h-3 w-3 rounded-full bg-white shadow cursor-pointer"
          />
        </button>
        <span className={`text-xs font-medium ml-2 ${logic === 'and' ? 'text-emerald-600' : 'text-gray-500'}`}>{t('and', 'E')}</span>
      </div>
    </div>
  );
};

export default LogicSwitchToggle;
