import React from "react";
import { useTranslation } from "react-i18next";
import { FiUsers } from "react-icons/fi";

const OpinionsSection = ({ isLoading }) => {
  const { t } = useTranslation();

  return (
    <div className="container px-6 mt-15 text-start font-montserrat">
      <h1 className="text-2xl font-bold inline-flex items-center">
        <FiUsers/> &nbsp; <span>{t("opinions")}</span>
      </h1>
      <h2 className="text-xl text-gray-700 mt-1">
        {t("opinions_description")}
      </h2>

      {isLoading ? (
        <OpinionsLoadingSkeleton />
      ) : (
        <OpinionsList />
      )}
    </div>
  );
};

const OpinionsLoadingSkeleton = () => (
  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 my-6">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-gray-50 border-b-1 border-gray-300 py-4 animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-full mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-5/6 mb-2"></div>
        <div className="h-4 bg-gray-300 rounded w-4/6 mb-8"></div>
        
        <div className="flex items-center mt-4">
          <div className="w-12 h-12 rounded-full bg-gray-300"></div>
          <div className="ml-3">
            <div className="h-4 bg-gray-300 rounded w-24 mb-2"></div>
            <div className="h-3 bg-gray-300 rounded w-32"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

const OpinionsList = () => {
  // Could fetch opinions from an API or pass as props
  const opinions = [
    {
      id: 1,
      text: "O CitiLink tem sido uma ferramenta essencial para acompanhar as decisões do município.",
      author: "João Silva",
      municipality: "Município de Guimarães",
    },
    {
      id: 2,
      text: "A transparência aumentou muito com este projeto. Agora, tudo é mais acessível!",
      author: "Maria Ferreira",
      municipality: "Município do Porto",
    },
    {
      id: 3,
      text: "Com o CitiLink, sinto-me mais informado sobre as reuniões camarárias!",
      author: "Ricardo Lopes",
      municipality: "Município da Covilhã",
    },
  ];

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10 my-6">
      {opinions.map((opinion) => (
        <OpinionCard key={opinion.id} opinion={opinion} />
      ))}
    </div>
  );
};

const OpinionCard = ({ opinion }) => (
  <div className="bg-gray-50 border-b-1 border-gray-300 py-4">
    <p className="text-gray-800 italic text-lg">
      "{opinion.text}"
    </p>
    <div className="flex items-center mt-4">
      <img
        src="https://placehold.co/60x60/052E4B/052E4B/png" 
        alt={opinion.author}
        className="w-12 h-12 rounded-full object-cover border border-gray-300"
      />
      <div className="ml-3">
        <h3 className="text-gray-800 font-semibold">{opinion.author}</h3>
        <p className="text-gray-600 text-sm">{opinion.municipality}</p>
      </div>
    </div>
  </div>
);

export default OpinionsSection;