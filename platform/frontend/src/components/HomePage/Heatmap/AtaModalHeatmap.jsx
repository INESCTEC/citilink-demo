import React from "react";

export default function AtaModalHeatmap({ ata, onClose, renderAtaAssuntoHeatmap }) {
  if (!ata) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-6 relative">
        <button
          className="absolute top-3 right-3 text-gray-500 hover:text-sky-700 text-2xl font-bold"
          onClick={onClose}
          aria-label="Fechar"
        >
          ×
        </button>
        {renderAtaAssuntoHeatmap(ata)}
      </div>
    </div>
  );
}
