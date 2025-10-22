import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { FiFileText } from "react-icons/fi";
import { useInView } from "react-intersection-observer";
import GenericResultCard from "../SearchPage/GenericResultCard";
import LoadingSpinner from "../common/LoadingSpinner";
import AssuntoModal from "./AssuntoModal";
import ViewSwitcher from "../SearchPage/ViewSwitcher";
import CustomDropdown from "../common/CustomDropdown";
import { AnimatePresence } from "framer-motion";

const AtaAssuntos = ({ assuntos, ataId, ataTitle, municipioId }) => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sortedAssuntos, setSortedAssuntos] = useState([]);
  const [displayedAssuntos, setDisplayedAssuntos] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedAssuntoId, setSelectedAssuntoId] = useState(null);
  const [sortBy, setSortBy] = useState("default"); // default or topico
  const [topicFilter, setTopicFilter] = useState("all"); // Filter by topic
  const [viewMode, setViewMode] = useState(localStorage.getItem("subjectsViewMode") || "grid"); // grid or list
  const [activeDropdown, setActiveDropdown] = useState(null);
  const hasProcessedUrlParam = React.useRef(false);
  const itemsPerPage = 3;
  const API_URL = import.meta.env.VITE_API_URL;

  // Intersection observer for infinite scroll
  const { ref, inView } = useInView({
    threshold: 0,
    triggerOnce: false,
  });

  // Check for assunto query parameter on mount - only once
  useEffect(() => {
    if (hasProcessedUrlParam.current) return;
    
    const assuntoParam = searchParams.get("assunto");
    if (assuntoParam && assuntos && assuntos.length > 0) {
      console.log("Opening modal for assunto:", assuntoParam);
      // Check if the assunto exists in the list
      const foundAssunto = assuntos.find(a => a.id === assuntoParam);
      if (foundAssunto) {
        setSelectedAssuntoId(assuntoParam);
        hasProcessedUrlParam.current = true;
        
        // Remove the query parameter from URL after opening the modal
        setTimeout(() => {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete("assunto");
          setSearchParams(newSearchParams, { replace: true });
        }, 100);
      }
    }
  }, [assuntos]);

  // Extract unique topics for the filter dropdown
  const availableTopics = React.useMemo(() => {
    if (!assuntos) return [];
    
    const uniqueTopics = new Map();
    assuntos.forEach(assunto => {
      if (assunto.topico && assunto.topico.title) {
        uniqueTopics.set(assunto.topico.id, {
          id: assunto.topico.id,
          title: assunto.topico.title
        });
      }
    });
    
    return Array.from(uniqueTopics.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [assuntos]);

  useEffect(() => {
    if (!assuntos) return;

    // First filter by topic
    let filtered = [...assuntos];
    if (topicFilter !== "all") {
      filtered = filtered.filter(assunto => 
        assunto.topico && assunto.topico.id === topicFilter
      );
    }

    if (sortBy === "default") {
      filtered.sort((a, b) => a.order - b.order);
    } else if (sortBy === "topico") {
      filtered.sort((a, b) => {
        const topicoA = a.topico?.title || "";
        const topicoB = b.topico?.title || "";
        return topicoA.localeCompare(topicoB);
      });
    }

    setSortedAssuntos(filtered);
  }, [assuntos, sortBy, topicFilter]);

  useEffect(() => {
    if (inView && displayedAssuntos.length < sortedAssuntos.length) {
      const nextPage = page + 1;
      const newItems = sortedAssuntos.slice(
        displayedAssuntos.length,
        nextPage * itemsPerPage
      );
      setDisplayedAssuntos([...displayedAssuntos, ...newItems]);
      setPage(nextPage);
    }
  }, [inView, sortedAssuntos, displayedAssuntos, page]);

  useEffect(() => {
    // Reset pagination when assuntos change
    setPage(1);
    setDisplayedAssuntos(sortedAssuntos.slice(0, itemsPerPage));
  }, [sortedAssuntos]);

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
  };

  // Handle topic filter change
  const handleTopicFilterChange = (newTopicFilter) => {
    setTopicFilter(newTopicFilter);
  };

  // Note: ViewMode handling is done directly in the ViewSwitcher component

  if (!assuntos || assuntos.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
        <FiFileText className="mx-auto h-10 w-10 text-gray-300 mb-2" />
        <p className="text-gray-500">{t("no_subjects_for_this_meeting")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sort, filter and view mode controls */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col md:flex-row items-start md:items-center space-x-4">
          {/* Sort dropdown */}
          <div className="flex items-center space-x-2">
            <span className="text-gray-600 flex-shrink-0 flex items-center whitespace-nowrap text-sm">
              {t("sort")}:
            </span>
            <div className="w-48">
              <CustomDropdown
                value={sortBy}
                options={[
                  { value: "default", label: t("default_order") },
                  { value: "topico", label: t("by_topic") }
                ]}
                onChange={handleSortChange}
                activeDropdown={activeDropdown}
                dropdownName="sortBy"
                openDropdown={setActiveDropdown}
                type="default"
              />
            </div>
          </div>

          {/* Topic filter dropdown */}
          {availableTopics.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-gray-600 flex-shrink-0 flex items-center whitespace-nowrap text-sm">
                {t("filter_by_topic", "Filtrar por tópico")}:
              </span>
              <div className="w-48">
                <CustomDropdown
                  value={topicFilter}
                  options={[
                    { value: "all", label: t("all_topics", "All Topics") },
                    ...availableTopics.map(topic => ({
                      value: topic.id,
                      label: topic.title
                    }))
                  ]}
                  onChange={handleTopicFilterChange}
                  activeDropdown={activeDropdown}
                  dropdownName="topicFilter"
                  openDropdown={setActiveDropdown}
                  type="default"
                />
              </div>
            </div>
          )}
        </div>
        <div className="">
          <ViewSwitcher
            viewMode={viewMode}
            setViewMode={setViewMode}
            viewType="subjects"
          />
        </div>
      </div>

      {/* Subjects grid or list */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayedAssuntos.map((assunto, index) => (
            <GenericResultCard
              key={assunto.id}
              result={{
                ...assunto,
                ata: {
                  id: ataId,
                  title: ataTitle,
                  municipio_id: municipioId,
                },
              }}
              index={index}
              type="subject"
              deliberacao={true}
              showMunicipio={false}
              showDate={false}
              useLinks={false}
              viewMode="grid"
              showVoting={true}

              onClick={() => setSelectedAssuntoId(assunto.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {displayedAssuntos.map((assunto) => (
            <GenericResultCard
              key={assunto.id}
              result={{
                ...assunto,
                ata: {
                  id: ataId,
                  title: ataTitle,
                  municipio_id: municipioId,
                },
              }}
              type="subject"
              deliberacao={true}
              showMunicipio={false}
              showDate={false}
              useLinks={false}
              showVoting={true}
              viewMode="list"
              location="subject"
              onClick={() => setSelectedAssuntoId(assunto.id)}
            />
          ))}
        </div>
      )}

      {/* Infinite scroll trigger */}
      {displayedAssuntos.length < sortedAssuntos.length && (
        <div ref={ref} className="h-10 flex items-center justify-center">
          <LoadingSpinner
            color="text-sky-700"
            text={t("loading_more_subjects")}
            textClass="text-sky-700"
          />
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {selectedAssuntoId && (
          <AssuntoModal
            assuntoId={selectedAssuntoId}
            onClose={() => setSelectedAssuntoId(null)}
            API_URL={API_URL}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AtaAssuntos;