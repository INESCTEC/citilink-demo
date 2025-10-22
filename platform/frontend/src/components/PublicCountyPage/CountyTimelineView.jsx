import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import GenericLoadingSpinner from '../common/GenericLoadingSpinner';
import NavigationTimeline from '../Timeline/NavigationTimeline';
import { FiClock } from 'react-icons/fi';

const timelineCache = {};

const CountyTimelineView = ({ 
  countyId, 
  API_URL, 
  handleSelectAta 
}) => {
  const { t } = useTranslation();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";
  const [isTimelineLoading, setIsTimelineLoading] = React.useState(false);
  const [timelineError, setTimelineError] = React.useState(null);
  const [timelineAtas, setTimelineAtas] = React.useState([]);
  const [timelineYears, setTimelineYears] = React.useState([]);

  React.useEffect(() => {
    let isMounted = true;
    if (timelineCache[countyId]) {
      setTimelineAtas(timelineCache[countyId].atas);
      setTimelineYears(timelineCache[countyId].years);
      return;
    }
    setIsTimelineLoading(true);
    setTimelineError(null);
    fetch(`${API_URL}/v0/public/municipios/${countyId}/atas/timeline?demo=${DEMO_MODE}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch timeline data');
        return res.json();
      })
      .then(data => {
        const atas = (data.atas || []).map(ata => ({ ...ata, date: new Date(ata.date) }));
        const years = atas.map(ata => ata.date.getFullYear()).filter((v, i, a) => a.indexOf(v) === i);
        if (isMounted) {
          setTimelineAtas(atas);
          setTimelineYears(years);
          timelineCache[countyId] = { atas, years };
        }
      })
      .catch(err => isMounted && setTimelineError(err.message))
      .finally(() => isMounted && setIsTimelineLoading(false));
    return () => { isMounted = false; };
  }, [countyId, API_URL]);

  return (
    <div className="transition-all duration-500">
      <div className="container mx-auto px-4 py-6">
        {isTimelineLoading ? (
          <div className="font-montserrat">
            <GenericLoadingSpinner
              icon={FiClock}
              color="text-sky-700"
              text="Aguarde por favor, estamos a criar a linha temporal..."
              iconSize="text-5xl"
            />
          </div>
        ) : timelineError ? (
          <div className="text-center text-red-600">
            <h2 className="text-xl font-semibold mb-4 flex items-center justify-center text-gray-700">
              <FiClock className="mr-2" /> Timeline
            </h2>
            <p>Error loading timeline: {timelineError}</p>
          </div>
        ) : (
          <NavigationTimeline 
            timelineAtas={timelineAtas}
            timelineYears={timelineYears}
            onSelectAta={handleSelectAta}
          />
        )}
      </div>
    </div>
  );
};

export default CountyTimelineView;
