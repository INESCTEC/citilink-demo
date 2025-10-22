import React from 'react';
import { useTranslation } from 'react-i18next';
import { FiFileText } from 'react-icons/fi';

const AtaOrdemDoDia = ({ ordemDoDia }) => {
  const { t } = useTranslation();
  
  // Hardcoded data for now - will come from the API in the future
  const defaultOrdemDoDia = [
    {
      id: 1,
      title: "Aprovação da Ata da reunião anterior",
      description: "Leitura e aprovação da ata da reunião anterior."
    },
    {
      id: 2,
      title: "Informações do Presidente",
      description: "O Presidente da Câmara Municipal presta informações sobre os assuntos relevantes do município."
    },
    {
      id: 3,
      title: "Discussão e votação de propostas",
      description: "Discussão e votação das propostas apresentadas pelos vereadores."
    },
    {
      id: 4,
      title: "Período de intervenção do público",
      description: "Tempo reservado para a intervenção do público presente."
    },
    {
      id: 5,
      title: "Encerramento da reunião",
      description: "Encerramento formal da reunião pela presidência."
    }
  ];

  // Use provided data or fallback to default
  const items = ordemDoDia || defaultOrdemDoDia;
  
  return (
    <div className="w-full">
      {items.length > 0 ? (
        <ul className="list-disc pl-5 space-y-2">
          {items.map((item) => (
            <li key={item.id} className="dark:text-white">
              <span className="font-medium text-gray-900 dark:text-white text-md">{item.title}</span>
              {item.description && (
                <p className="text-gray-600 dark:text-gray-300 mt-1 text-xs">
                  {item.description}
                </p>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-6 text-gray-500 dark:text-gray-400">
          <FiFileText className="mx-auto h-8 w-8 mb-2" />
          <p>{t('no_ordem_do_dia_available')}</p>
        </div>
      )}
    </div>
  );
};

export default AtaOrdemDoDia;
