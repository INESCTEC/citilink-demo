import React from 'react';
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

// Animated switch toggle for Time Period vs Year using framer-motion
const DateModeToggle = ({ mode, onChange }) => {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-gray-50 bg-opacity-50 border-t border-x border-gray-200 rounded-t-md">
      <span className="text-xs font-light text-gray-600 uppercase tracking-wider">{t('mode', 'Modo')}</span>
      <div className="flex items-center">
        <span className={`text-xs font-medium mr-2 ${mode === 'period' ? 'text-sky-700' : 'text-gray-500'}`}>{t('time_period', 'Período')}</span>
        <button
          type="button"
          className={`relative inline-flex h-4 w-10 rounded-full transition-colors focus:outline-none cursor-pointer ${mode === 'year' ? 'bg-emerald-600' : 'bg-sky-700'}`}
          onClick={() => onChange(mode === 'period' ? 'year' : 'period')}
          aria-label={mode === 'period' ? t('switch_to_year', 'Mudar para Ano') : t('switch_to_period', 'Mudar para Período')}
        >
          <motion.span
            animate={{ x: mode === 'year' ? 26 : 2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute top-0.5 left-0 h-3 w-3 rounded-full bg-white shadow cursor-pointer"
          />
        </button>
        <span className={`text-xs font-medium ml-2 ${mode === 'year' ? 'text-emerald-600' : 'text-gray-500'}`}>{t('year', 'Ano')}</span>
      </div>
    </div>
  );
};

export default DateModeToggle;
