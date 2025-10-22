import React, { useState, useEffect } from 'react';
import { 
  FiTrendingUp, 
  FiUsers, 
  FiSearch, 
  FiMapPin, 
  FiClock,
  FiRefreshCw,
  FiDownload,
  FiAlertCircle,
  FiChevronDown,
  FiChevronUp,
  FiBarChart2
} from 'react-icons/fi';

const LogsStats = ({ selectedLog, token, API_URL }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE ?? "0";

  useEffect(() => {
    if (selectedLog) {
      fetchStats();
    }
  }, [selectedLog]);

  const fetchStats = async () => {
    if (!selectedLog) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/v0/logs/stats/${selectedLog}?demo=${DEMO_MODE}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setStats(data);
      } else {
        setError(data.error || 'Erro ao carregar estatísticas');
      }
    } catch (err) {
      setError('Erro de conexão ao carregar estatísticas');
      console.error('Error fetching stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('pt-PT').format(num);
  };

  const formatPercentage = (value) => {
    return `${value}%`;
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color = "blue" }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-2xl font-bold text-${color}-600`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-3 bg-${color}-100 rounded-lg`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        )}
      </div>
    </div>
  );

  // Simple Card container for each section (no dropdown)
  const SectionCard = ({ title, children, icon: Icon }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-4">
      <div className="flex items-center space-x-2 p-4 border-b border-gray-100">
        {Icon && <Icon className="w-5 h-5 text-gray-600" />}
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
      </div>
      <div className="px-4 pb-4 pt-2">{children}</div>
    </div>
  );

const TopItemsList = ({ items, title, emptyMessage, renderItem }) => {
  // Sort items by value descending
  const sortedEntries = Object.entries(items).sort((a, b) => b[1] - a[1]);
  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
      {sortedEntries.length > 0 ? (
        <div className="space-y-2">
          {sortedEntries.map(([key, value], index) => renderItem(key, value, index))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 italic">{emptyMessage}</p>
      )}
    </div>
  );
};
  const ProgressBar = ({ value, max, color = "blue" }) => {
    const percentage = max > 0 ? (value / max) * 100 : 0;
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`bg-${color}-600 h-2 rounded-full transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-3">
          <FiRefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          <span className="text-gray-600">A carregar estatísticas...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center space-x-3 text-red-600">
          <FiAlertCircle className="w-6 h-6" />
          <span>{error}</span>
        </div>
        <div className="flex justify-center mt-4">
          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const { overview, search_types, top_queries, top_municipios, top_parties, top_topicos, top_users, results_distribution, temporal_patterns } = stats.stats || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-4 mb-2">
        {/* <div className="flex items-center space-x-2">
          <FiBarChart2 className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">Estatísticas do Log</h2>
        </div> */}
        <div></div>
        <button
          onClick={fetchStats}
          className="flex items-center space-x-2 px-3 py-2 bg-gray-300 text-gray-600 text-sm rounded-md hover:bg-gray-400 transition-colors"
        >
          <FiRefreshCw className="w-4 h-4" />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Activity Map Row */}
      {temporal_patterns?.daily_activity && (
        <SectionCard title="Mapa de Atividade" icon={FiBarChart2}>
          <div className="mt-2 flex flex-row items-center">
            {/* Activity Map Grid */}
            <div className="flex-1">
              {(() => {
                // Always show the full current year
                const now = new Date();
                const year = now.getFullYear();
                const startDate = new Date(year, 0, 1); // Jan 1
                const endDate = new Date(year, 11, 31); // Dec 31
                // Build a map for fast lookup
                const activityMap = temporal_patterns.daily_activity || {};
                // Find max count for color scaling
                const maxCount = Math.max(1, ...Object.values(activityMap));
                function getColor(count) {
                  if (count === 0) return 'bg-gray-100';
                  if (count < maxCount * 0.25) return 'bg-blue-100';
                  if (count < maxCount * 0.6) return 'bg-blue-400';
                  return 'bg-blue-600';
                }

                // Generate all days for the year
                const allDays = [];
                for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
                  const iso = d.toISOString().slice(0, 10);
                  allDays.push([iso, activityMap[iso] || 0]);
                }

                // Group by week (each week is a column, max 7 days)
                const weeks = [];
                let week = [];
                let dayOfWeek = new Date(allDays[0][0]).getDay();
                // Pad first week with empty days if not starting on Sunday
                for (let i = 0; i < dayOfWeek; i++) {
                  week.push([null, 0]);
                }
                allDays.forEach(([date, count], idx) => {
                  week.push([date, count]);
                  if (week.length === 7 || idx === allDays.length - 1) {
                    weeks.push(week);
                    week = [];
                  }
                });

                // Render as a single horizontal row (weeks as columns, days as cells)
                return (
                  <>
                    <div className="flex flex-row items-center overflow-x-auto pb-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                      <div className="flex flex-row">
                        {weeks.map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col">
                            {week.map(([date, count], dIdx) => (
                              <div
                                key={date || `empty-${wIdx}-${dIdx}`}
                                className={`w-4 h-4 m-0.5 rounded ${getColor(count)} flex items-center justify-center cursor-pointer transition-all duration-200`}
                                title={date ? `${date}: ${count} pesquisas` : ''}
                              >
                                {date && count > 0 && (
                                  <span className="text-[9px] text-white font-bold select-none" style={{ opacity: getColor(count) === 'bg-blue-100' ? 0.7 : 1 }}>
                                    {/* {count} */}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{allDays.length > 0 ? allDays[0][0] : ''}</span>
                      <span>{allDays.length > 0 ? allDays[allDays.length - 1][0] : ''}</span>
                    </div>
                  </>
                );
              })()}
            </div>
            {/* Top Day Card */}
            {temporal_patterns.peak_day && (
              <div className="ml-6 flex flex-col items-center justify-center bg-green-50 rounded-lg p-4 min-w-[160px]">
                <p className="text-xs text-gray-600">Pico</p>
                <p className="text-lg font-bold text-green-600">
                  {new Date(temporal_patterns.peak_day.date).toLocaleDateString('pt-PT')}
                </p>
                <p className="text-sm text-gray-700">{temporal_patterns.peak_day.searches} pesquisas</p>
              </div>
            )}
          </div>
        </SectionCard>
      )}

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Overview & Search Types */}
        <SectionCard title="Visão Geral" icon={FiTrendingUp}>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <StatCard
              title="Total de Pesquisas"
              value={formatNumber(stats.total_searches)}
              subtitle={overview?.time_span_days ? `Em ${overview.time_span_days} dias` : ''}
              icon={FiSearch}
              color="blue"
            />
            <StatCard
              title="Utilizadores Únicos"
              value={formatNumber(overview?.unique_users || 0)}
              subtitle={`${overview?.unique_queries || 0} queries únicas`}
              icon={FiUsers}
              color="green"
            />
            <StatCard
              title="Pesquisas Vazias"
              value={formatNumber(overview?.empty_searches || 0)}
              subtitle={stats?.total_searches > 0 ? `${((overview?.empty_searches || 0) / stats.total_searches * 100).toFixed(1)}%` : '0%'}
              icon={FiAlertCircle}
              color="red"
            />
            <StatCard
              title="Taxa de Filtros"
              value={formatPercentage(overview?.filter_usage_rate || 0)}
              subtitle={`${formatNumber(overview?.filtered_searches || 0)} com filtros`}
              icon={FiBarChart2}
              color="purple"
            />
          </div>

          {/* Search Types */}
          {search_types && Object.keys(search_types).length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Tipos de Pesquisa</h4>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(search_types).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="capitalize font-medium">{type === 'atas' ? 'Atas' : 'Assuntos'}</span>
                    <span className="text-lg font-bold text-blue-600">{formatNumber(count)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* Temporal Patterns */}
        {temporal_patterns && (
          <SectionCard title="Padrões Temporais" icon={FiClock}>
            <div className="space-y-6 mt-2">
              {/* Peak Activity */}
              {temporal_patterns.peak_hour && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Atividade de Pico</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-gray-600">Hora de Pico</p>
                      <p className="text-lg font-bold text-blue-600">
                        {temporal_patterns.peak_hour.hour}:00h ({formatNumber(temporal_patterns.peak_hour.searches)} pesquisas)
                      </p>
                    </div>
                    {temporal_patterns.peak_day && (
                      <div className="p-3 bg-green-50 rounded-lg">
                        <p className="text-sm text-gray-600">Dia de Pico</p>
                        <p className="text-lg font-bold text-green-600">
                          {new Date(temporal_patterns.peak_day.date).toLocaleDateString('pt-PT')} ({formatNumber(temporal_patterns.peak_day.searches)} pesquisas)
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Hourly Activity */}
              {temporal_patterns.hourly_activity && Object.keys(temporal_patterns.hourly_activity).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Atividade por Hora</h4>
                  <div className="flex items-end justify-center space-x-1 h-48 bg-gray-50 rounded-lg p-2">
                    {Array.from({ length: 24 }, (_, hour) => {
                      const count = temporal_patterns.hourly_activity[hour] || 0;
                      const maxCount = Math.max(...Object.values(temporal_patterns.hourly_activity));
                      const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      return (
                        <div key={hour} className="flex flex-col items-center space-y-1 flex-1">
                          <div className="relative flex flex-col items-center justify-end h-32 w-full">
                            <div
                              className="bg-blue-600 rounded-t transition-all duration-300 w-full min-h-[2px] flex items-end justify-center"
                              style={{ height: `${height}%` }}
                              title={`${hour}:00h - ${count} pesquisas`}
                            >
                              {count > 0 && (
                                <span className="text-xs text-white font-semibold mb-1 transform -rotate-90 whitespace-nowrap">
                                  {count}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-mono text-gray-600 transform -rotate-45 origin-center whitespace-nowrap mt-2">
                            {hour.toString().padStart(2, '0')}h
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>
        )}
      </div>

      {/* Top Queries & Users Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <SectionCard title="Principais Pesquisas" icon={FiSearch}>
          <TopItemsList
            items={top_queries || {}}
            title="Queries Mais Pesquisadas"
            emptyMessage="Nenhuma query registada"
            renderItem={(query, count, index) => (
              <div key={query} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">
                    #{index + 1}
                  </span>
                  <span className="font-mono text-sm truncate max-w-xs" title={query}>
                    {query || '<vazio>'}
                  </span>
                </div>
                <span className="text-sm font-semibold text-blue-600">{formatNumber(count)}</span>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard title="Utilizadores Mais Ativos" icon={FiUsers}>
          <TopItemsList
            items={top_users || {}}
            title="Utilizadores Mais Ativos"
            emptyMessage="Nenhum utilizador registado"
            renderItem={(user, count, index) => (
              <div key={user} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded font-mono">
                    #{index + 1}
                  </span>
                  <span className="font-mono text-sm">{user}</span>
                </div>
                <span className="text-sm font-semibold text-green-600">{formatNumber(count)}</span>
              </div>
            )}
          />
        </SectionCard>
      </div>

      {/* Geographic, Topics & Political Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <SectionCard title="Municípios Mais Pesquisados" icon={FiMapPin}>
          <TopItemsList
            items={top_municipios || {}}
            title="Municípios Mais Pesquisados"
            emptyMessage="Nenhum município registado"
            renderItem={(municipio, count, index) => (
              <div key={municipio} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded font-mono">
                    #{index + 1}
                  </span>
                  <span className="text-sm">{municipio}</span>
                </div>
                <span className="text-sm font-semibold text-purple-600">{formatNumber(count)}</span>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard title="Tópicos Mais Pesquisados" icon={FiBarChart2}>
          <TopItemsList
            items={top_topicos || {}}
            title="Tópicos Mais Pesquisados"
            emptyMessage="Nenhum tópico registado"
            renderItem={(topico, count, index) => (
              <div key={topico} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded font-mono">
                    #{index + 1}
                  </span>
                  <span className="text-sm">{topico}</span>
                </div>
                <span className="text-sm font-semibold text-indigo-600">{formatNumber(count)}</span>
              </div>
            )}
          />
        </SectionCard>

        <SectionCard title="Análise Política" icon={FiUsers}>
          <TopItemsList
            items={top_parties || {}}
            title="Partidos Mais Pesquisados"
            emptyMessage="Nenhum partido registado"
            renderItem={(party, count, index) => (
              <div key={party} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-mono">
                    #{index + 1}
                  </span>
                  <span className="text-sm">{party}</span>
                </div>
                <span className="text-sm font-semibold text-orange-600">{formatNumber(count)}</span>
              </div>
            )}
          />
        </SectionCard>
      </div>

      {/* Results Distribution */}
      <SectionCard title="Distribuição de Resultados" icon={FiBarChart2}>
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Resultados por Pesquisa</h4>
          {results_distribution && Object.keys(results_distribution).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(results_distribution).map(([range, count]) => {
                const maxCount = Math.max(...Object.values(results_distribution));
                const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={range} className="flex items-center space-x-3">
                    <span className="text-sm w-24 text-gray-600">
                      {range.replace('_', ' ').replace('results', 'resultados')}
                    </span>
                    <div className="flex-1">
                      <ProgressBar value={count} max={maxCount} color="green" />
                    </div>
                    <span className="text-sm font-semibold text-green-600 w-16 text-right">
                      {formatNumber(count)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">Nenhum dado de resultados disponível</p>
          )}
        </div>
      </SectionCard>
    </div>
  );
};

export default LogsStats;
