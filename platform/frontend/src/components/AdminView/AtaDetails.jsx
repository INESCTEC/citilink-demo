import React from "react";
import AssuntosManager from "../../components/AssuntosManager";
import ParticipantsManager from "../../components/ParticipantsManager";

const AtaDetails = ({ ata }) => {
  return (
    <div className="space-y-6">
      {/* Details section - responsive grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-900">Detalhes do documento</h4>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500 line-clamp-6"><span className="font-medium">Conteúdo:</span> {ata.content}</p>
            <p className="text-sm text-gray-500"><span className="font-medium">Nome do ficheiro:</span> {ata.file_name}</p>
            <p className="text-sm text-gray-500"><span className="font-medium">Tamanho:</span> {(ata.file_size / 1024).toFixed(2)} KB</p>
            <p className="text-sm text-gray-500"><span className="font-medium">Tipo:</span> {ata.file_type}</p>
          </div>
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-900">Informações adicionais</h4>
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-500">
              <span className="font-medium">Carregado em:</span> {new Date(ata.uploaded_at).toLocaleDateString()} às {new Date(ata.uploaded_at).toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-500">
              <span className="font-medium">Atualizado em:</span> {new Date(ata.updated_at).toLocaleDateString()} às {new Date(ata.updated_at).toLocaleTimeString()}
            </p>
            <p className="text-sm text-gray-500"><span className="font-medium">Carregado por:</span> {ata.uploaded_by}</p>
          </div>
        </div>
      </div>

      {/* Participants Manager Component */}
      <ParticipantsManager ataId={ata.id} municipioId={ata.municipio_id} />
      
      {/* Assuntos Manager Component */}
      <AssuntosManager ataId={ata.id} municipioId={ata.municipio_id} />
    </div>
  );
};

export default AtaDetails;
