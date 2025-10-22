import React from "react";
import { useTranslation } from "react-i18next";

const HeroSection = ({ bgImage }) => {
  const { t } = useTranslation();

  return (
    <div 
      className="citilink-background mx-auto min-h-[100vh] flex flex-col items-center justify-center"
      style={bgImage ? { backgroundImage: `url(${bgImage})` } : {}}
    >
      <div className="container p-6 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-50 dark:text-gray-100 font-montserrat">
          CitiLink
        </h1>
        <h2 className="text-2xl text-gray-100 dark:text-gray-300 mt-1 font-montserrat">
          Mais transparência, mais participação, melhor gestão!
        </h2>
        <p className="italic text-gray-200 dark:text-gray-400 mt-4 font-montserrat">
          Potenciar a transparência municipal e o envolvimento dos cidadãos através de IA: de dados não estruturados a estruturados.
        </p>
      </div>
    </div>
  );
};

export default HeroSection;