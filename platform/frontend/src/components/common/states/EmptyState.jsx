import React from "react";
import { FiFileText } from "react-icons/fi";

const EmptyState = ({ message }) => {
  return (
    <div className="text-center py-12 bg-white rounded-md shadow-md">
      <FiFileText className="mx-auto h-12 w-12 text-gray-400" />
      <p className="mt-4 text-gray-500">{message}</p>
    </div>
  );
};

export default EmptyState;