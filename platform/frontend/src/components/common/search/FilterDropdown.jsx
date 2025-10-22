import React from "react";

const FilterDropdown = ({ label, value, onChange, options, disabled }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-100 mb-1">{label}</label>
      <select
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full px-3 py-2 border border-gray-300 rounded-md ${
          disabled 
            ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
            : 'bg-white text-gray-900'
        }`}
      >
        {options.map((option, index) => (
          <option key={`${option.value}-${index}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default FilterDropdown;