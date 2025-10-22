import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Popover } from "flowbite-react";
import LangLink from "../common/LangLink";

const CountyGrid = () => {
  const [counties, setCounties] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const API_URL = import.meta.env.VITE_API_URL;
  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  useEffect(() => {
    const fetchCounties = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/v0/public/municipios?demo=${DEMO_MODE}`);
        if (!response.ok) {
          throw new Error("Failed to fetch counties");
        }
        const data = await response.json();
        console.log("Fetched counties:", data);
        const sortedCounties = [...data].sort((a, b) =>
          a.name.replace(/Município (da|do|de)\s/, "").localeCompare(
            b.name.replace(/Município (da|do|de)\s/, "")
          )
        );
        setCounties(sortedCounties);
        setError(null);
      } catch (err) {
        console.error("Error fetching counties:", err);
        setError("Failed to load counties. Please try again later.");
        setCounties([
          { id: "1", name: "Alandroal", imageUrl: null, minutesCount: 12, subjectsCount: 4 },
          { id: "2", name: "Campo Maior", imageUrl: null, minutesCount: 8, subjectsCount: 3 },
          { id: "3", name: "Covilhã", imageUrl: null, minutesCount: 15, subjectsCount: 6 },
          { id: "4", name: "Fundão", imageUrl: null, minutesCount: 20, subjectsCount: 7 },
          { id: "5", name: "Guimarães", imageUrl: null, minutesCount: 18, subjectsCount: 5 },
          { id: "6", name: "Porto", imageUrl: null, minutesCount: 25, subjectsCount: 9 }
        ].sort((a, b) => a.name.localeCompare(b.name)));
      } finally {
        setIsLoading(false);
      }
    };
    fetchCounties();
  }, [API_URL]);

  // Placeholder image for counties without an image
  const placeholderImage = "https://placehold.co/300x300/052E4B/052E4B/png";

  const PopoverContent = ({ county }) => (
    <div className="p-3 bg-white dark:bg-gray-200 border border-gray-200 rounded-lg shadow-lg">
      <h4 className="font-semibold text-center text-sm text-gray-800 mb-2">{county.name}</h4>
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex justify-center gap-x-1">
          <span className="font-medium">{county.stats?.total_atas || 0}</span>
          <span>Atas</span>
        </div>
        <div className="flex justify-center gap-x-1">
          <span className="font-medium">{county.stats?.total_assuntos || 0}</span>
          <span>Assuntos</span>
        </div>
      </div>
      <p className="text-[10px] text-gray-400 mt-3 italic">
        Clique no município para saber mais...
      </p>
    </div>
  );

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-y-6 gap-x-10 mt-6">
      {isLoading ? (
        // Loading skeletons
        Array(6).fill().map((_, index) => (
          <div key={`skeleton-${index}`} className="bg-gray-50 border-b-1 border-gray-300 py-4 text-center animate-pulse">
            <div className="w-full h-48 bg-gray-200 rounded-md"></div>
          </div>
        ))
      ) : error ? (
        <div className="col-span-full text-center py-10 bg-rose-50 rounded-md">
          <p className="text-rose-600">Ocorreu um erro ao carregar os municípios</p>
        </div>
      ) : (
        counties.map((county) => (
          <Popover
            key={county.id}
            content={<PopoverContent county={county} />}
            trigger="hover"
            placement="top"
            arrow={true}
            hidden
          >
            <LangLink
              to={`/municipios/${county.slug}`}
              className="bg-white hover:rounded-md border-b-1 border-gray-300 py-4 text-center hover:shadow-md transition-all duration-300 ease-in-out block"
            >
              <img
                src={county.imageUrl ? API_URL + county.imageUrl : placeholderImage}
                alt={county.name}
                className="w-full h-40 object-cover rounded-md"
                loading="lazy"
              />
              {/* <h3 className="text-gray-800 font-semibold mt-3">{county.name}</h3> */}
            </LangLink>
          </Popover>
        ))
      )}
    </div>
  );
};

export default CountyGrid;