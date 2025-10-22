import React from "react";

const FilterField = ({ label, value, onChange, placeholder, type = "text" }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-100 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900"
      />
    </div>
  );
};

export default FilterField;