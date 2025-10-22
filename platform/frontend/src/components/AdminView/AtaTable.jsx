import React, { useState } from "react";
import { FiChevronDown, FiChevronUp, FiEye, FiTrash2, FiDownload, FiEdit } from "react-icons/fi";
import AtaDetails from "./AtaDetails";

const AtaTable = ({ 
  atas, 
  handleEditAta, 
  handleDeleteAta, 
  handleExportAta 
}) => {
  const [expandedId, setExpandedId] = useState(null);
  
  const handleRowClick = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200 mt-6">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              {/* Toggle column */}
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-8"></th>
              
              {/* ID column - hide on small screens */}
              <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              
              {/* Always visible columns */}
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Municipio</th>
              
              {/* Hide date on very small screens */}
              <th className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              
              {/* Status and actions - always visible */}
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {atas.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-3 sm:px-4 py-4 text-center text-gray-500">
                  Nenhuma ata encontrada.
                </td>
              </tr>
            ) : (
              atas.map((ata) => (
                <React.Fragment key={ata.id}>
                  <tr 
                    onClick={() => handleRowClick(ata.id)} 
                    className="cursor-pointer hover:bg-gray-50"
                  >
                    {/* Toggle Icon */}
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {expandedId === ata.id ? (
                        <FiChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <FiChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    
                    {/* ID - hidden on mobile */}
                    <td className="hidden sm:table-cell px-3 sm:px-4 py-3 text-left text-xs font-mono text-gray-500 tracking-wider">
                      {ata.id}
                    </td>
                    
                    {/* Title */}
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="truncate max-w-[150px] sm:max-w-xs">
                        {ata.title}
                        
                        {/* Show date on mobile only */}
                        <div className="sm:hidden text-xs text-gray-500 mt-0.5">
                          {ata.date}
                        </div>
                      </div>
                    </td>
                    
                    {/* Municipality */}
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="truncate">
                        {ata.municipio}
                      </div>
                    </td>
                    
                    {/* Date - hidden on mobile */}
                    <td className="hidden sm:table-cell px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {ata.date}
                    </td>
                    
                    {/* Status */}
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-sm ${
                          ata.status === "done"
                            ? "bg-green-100 text-green-800"
                            : ata.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {ata.status}
                      </span>
                    </td>
                    
                    {/* Actions */}
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm font-medium">
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:items-center">
                        <a
                          href={ata.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <FiEye className="w-3.5 h-3.5 mr-1" />
                          Ver
                        </a>
                        <button
                          onClick={(e) => handleExportAta(ata.id, e)}
                          className="inline-flex items-center justify-center text-green-600 hover:text-green-900 bg-green-50 hover:bg-green-100 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        >
                          <FiDownload className="w-3.5 h-3.5 mr-1" />
                          JSON
                        </button>
                        <button
                          onClick={(e) => handleEditAta(ata, e)}
                          className="inline-flex items-center justify-center text-sky-600 hover:text-sky-900 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        >
                          <FiEdit className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAta(ata.id);
                          }}
                          className="inline-flex items-center justify-center text-red-600 hover:text-red-900 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md text-xs transition-colors duration-200"
                        >
                          <FiTrash2 className="w-3.5 h-3.5 mr-1" />
                          Apagar
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  {expandedId === ata.id && (
                    <tr className="bg-gray-50">
                      <td colSpan="7" className="px-3 sm:px-6 py-4">
                        <AtaDetails ata={ata} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AtaTable;
