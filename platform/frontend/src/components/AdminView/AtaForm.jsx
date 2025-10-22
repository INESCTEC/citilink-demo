import React from "react";
import { FiX } from "react-icons/fi";

const AtaForm = ({ 
  ataFormData, 
  setAtaFormData, 
  selectedFile, 
  setSelectedFile, 
  handleSubmit, 
  isUploading, 
  isEditing,
  municipalities,
  onClose
}) => {
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setAtaFormData({
      ...ataFormData,
      [name]: value,
    });
  };
  
  return (
    <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md border border-gray-200 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-700">
          {isEditing ? "Editar Ata" : "Adicionar Nova Ata"}
        </h2>
        <button 
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input 
            type="hidden" 
            name="id" 
            value={ataFormData.id}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Município</label>
            <select
              name="municipio_id"
              value={ataFormData.municipio_id}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              required
            >
              <option value="">Selecione um município</option>
              {municipalities.map((municipio) => (
                <option key={municipio.id} value={municipio.id}>
                  {municipio.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título</label>
            <input
              type="text"
              name="title"
              value={ataFormData.title}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              required
            />
          </div>
        </div>
        
        {/* Add tipo selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              name="tipo"
              value={ataFormData.tipo}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              required
            >
              <option value="ordinaria">Ordinária</option>
              <option value="extraordinaria">Extraordinária</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
            <input
              type="date"
              name="date"
              value={ataFormData.date}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora</label>
            <input
              type="time"
              name="time"
              value={ataFormData.time}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Conteúdo</label>
          <textarea
            name="content"
            value={ataFormData.content}
            onChange={handleInputChange}
            rows="3"
            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sumário</label>
          <textarea
            name="summary"
            value={ataFormData.summary}
            onChange={handleInputChange}
            rows="3"
            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
            placeholder="Adicione um sumário da ata..."
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Selecionar o Ficheiro</label>
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => setSelectedFile(e.target.files[0])}
            className="w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-sky-500 focus:border-sky-500 text-sm"
            required={!isEditing}
          />
          {selectedFile && (
            <p className="mt-1 text-sm text-gray-600">Ficheiro selecionado: {selectedFile.name}</p>
          )}
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isUploading}
            className={`bg-sky-700 text-white px-4 py-2 rounded-md shadow-sm transition-colors duration-200 ${
              isUploading ? "opacity-50 cursor-not-allowed" : "hover:bg-sky-800"
            } flex items-center`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEditing ? "A Atualizar..." : "A Enviar..."}
              </>
            ) : (
              isEditing ? "Atualizar" : "Upload"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AtaForm;
