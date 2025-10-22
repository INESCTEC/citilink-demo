import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiShield, FiMail, FiLock } from "react-icons/fi"; 
import { useTheme } from "../../hooks/useTheme";
import { useTranslation } from "react-i18next";
import RenderHTML from "../../hooks/renderHtml";

export default function Footer({ variant = "minimal" }) {
  const { t, i18n } = useTranslation();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [footerLogos, setFooterLogos] = useState([]);
  const [footerLogosLoading, setFooterLogosLoading] = useState(true);
  const [acknowledgments, setAcknowledgments] = useState({
    default: "Este trabalho é financiado por fundos nacionais através da FCT - Fundação para a Ciência e a Tecnologia, I.P. no âmbito do projeto CitiLink, com referência 2024.07509.IACDC (DOI 2024.07509.IACDC) no contexto do financiamento PRR, do investimento \"RE-C05- i08 - Ciência Mais Digital\", que visa apoiar projetos de IC&DT para a implementação de sistemas avançados de cibersegurança, inteligência artificial e ciência de dados na administração pública.",
    pt: ""
  });

  useEffect(() => {
    const fetchFooterLogos = async () => {
      try {
        const response = await fetch("https://nabu.dcc.fc.up.pt/api/items/projects?filter[id][_eq]=1&fields=*,logos_footer.logos_id.image,logos_footer.logos_id.url,logos_footer.logos_id.title");
        const data = await response.json();
        setFooterLogos(data.data[0].logos_footer);
        if (data.data && data.data[0]) {
          setAcknowledgments({
            default: data.data[0].acknowledgments || acknowledgments.default,
            pt: data.data[0].acknowledgments_PT || acknowledgments.default
          });
        }
      } catch (error) {
        console.error("Error fetching footer logos:", error);
      } finally {
        setFooterLogosLoading(false);
      }
    };
    fetchFooterLogos();
  }, []);

  const displayAcknowledgment = i18n.language === 'pt' && acknowledgments.pt 
    ? acknowledgments.pt 
    : acknowledgments.default;

  if (variant === "minimal") {
    return (
      <footer className="bg-sky-800 dark:bg-sky-950 text-slate-200 py-6 md:py-10">
        <div className="container mx-auto px-4 sm:px-6 text-start font-montserrat">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
            <p className="text-xs sm:text-sm text-center sm:text-left">
              &copy; {new Date().getFullYear()} {t("copyright")}.
            </p>
            <img 
              src="https://nabu.dcc.fc.up.pt/api/assets/063b2d64-c75b-4e43-9762-e6c6539dc797"
              alt="CitiLink Logo"
              className="h-6 sm:h-7 w-auto flex-shrink-0"
            />
          </div>
        </div>
      </footer>
    );
  }

  // Default variant
  return (
    <footer className="bg-sky-900 dark:bg-sky-950 text-gray-100 dark:text-gray-100 pt-10">
      <div className="container mx-auto mb-10 px-6 text-start font-montserrat">
        <h1 className="font-semibold text-2xl">{t("acknowledgments")}</h1>
        <div className="font-light text-justify">
          <div className="font-montserrat text-sm">
            <RenderHTML content={displayAcknowledgment} />
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-gray-300">
        <div className="container mx-auto py-3 px-6 text-start font-montserrat">
          <div className="flex flex-wrap justify-center gap-4 gap-y-1">
            {footerLogosLoading ? (
              <div className="flex items-center justify-center h-15 w-30 bg-gray-200 animate-pulse rounded-md">
                <div className="h-10 w-10 bg-gray-300 rounded-full animate-pulse"></div>
              </div>
            ) : (
              footerLogos.map((logo) => (
                <a 
                  key={logo.logos_id.image}
                  href={logo.logos_id.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-center h-15 w-30 hover:bg-white/90 transition-all duration-500 rounded-md p-1"
                >
                  <img
                    src={`https://nabu.dcc.fc.up.pt/api/assets/${logo.logos_id.image}`}
                    alt={logo.logos_id.title}
                    className="h-auto w-auto mx-auto"
                  />
                </a>
              ))
            )}
          </div>
        </div>
      </div>
      {/* 
      <div className="container mx-auto px-6 flex flex-col md:flex-row items-start justify-between">
        <nav className="flex flex-col items-start gap-2 ">
          <Link to="/politicadeprivacidade" className="flex items-center gap-2 font-montserrat relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all hover:after:w-full">
            <FiShield /> {t("privacy_policy")}
          </Link>
          <Link to="/contacto" className="flex items-center gap-2 font-montserrat relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all hover:after:w-full">
            <FiMail /> {t("contact")}
          </Link>
          <Link to="/admin" className="flex items-center gap-2 font-montserrat relative transition-all duration-300 ease-in-out after:content-[''] after:absolute after:left-0 after:bottom-[-2px] after:w-0 after:h-[2px] after:bg-current after:transition-all hover:after:w-full">
            <FiLock /> {t("admin_area")}
          </Link>
        </nav>
        <div className="mt-auto">
          <p className="text-sm text-center md:text-left font-montserrat mt-7 md:mt-0">
            &copy; {new Date().getFullYear()} {t("copyright")}.
          </p>
        </div>
      </div>
      */}
    </footer>
  );
}