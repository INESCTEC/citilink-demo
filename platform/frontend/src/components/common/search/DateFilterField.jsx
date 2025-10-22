import React from "react";
import { FiCalendar } from "react-icons/fi";

const DateFilterField = ({ label, value, onChange, className = "" }) => {
  return (
    <div className={`flex-1 min-w-[140px] ${className}`}>
      <label className="block text-sm font-medium text-gray-100 mb-1">{label}</label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
          <FiCalendar size={16} />
        </div>
        <input
          type="date"
          value={value}
          onChange={onChange}
          className="w-full px-3 py-2 pl-10 bg-white border border-gray-300 rounded-md text-gray-900 text-sm focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
        />
      </div>
    </div>
  );
};

export default DateFilterField;