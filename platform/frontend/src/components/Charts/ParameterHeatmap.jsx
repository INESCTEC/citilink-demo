// components/ParameterHeatmap.jsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Cell } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#d946ef', '#84cc16'];

export default function ParameterHeatmap({ argDistribution }) {
  // Transform data for the selected endpoints
  const endpoints = ['/v0/public/atas/search', '/v0/public/assuntos/search'];
  
  const data = endpoints.flatMap(endpoint => {
    if (!argDistribution[endpoint]) return [];
    
    return Object.entries(argDistribution[endpoint]).map(([param, values]) => {
      const topValues = Object.entries(values)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10); // Get top 10 values per parameter
      
      return {
        endpoint,
        param,
        ...Object.fromEntries(topValues.map(([val, count], i) => [`value${i+1}`, val])),
        ...Object.fromEntries(topValues.map(([val, count], i) => [`count${i+1}`, count])),
      };
    });
  });

  return (
    <div className="h-[800px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 60 }}
          barCategoryGap={5}
        >
          <XAxis type="number" tick={{ fill: '#6b7280' }} />
          <YAxis 
            dataKey="param" 
            type="category" 
            width={140}
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <Tooltip 
            content={({ active, payload, label }) => {
              if (!active || !payload || !payload.length) return null;
              
              const data = payload[0].payload;
              return (
                <div className="bg-white p-3 border border-gray-200 rounded shadow max-w-md">
                  <p className="font-semibold text-lg">{data.endpoint}</p>
                  <p className="font-medium text-md mb-2">{data.param}</p>
                  <div className="max-h-60 overflow-y-auto">
                    {[...Array(10).keys()].map(i => {
                      const idx = i + 1;
                      return (
                        data[`value${idx}`] && (
                          <div key={idx} className="flex justify-between py-1 border-b border-gray-100">
                            <span className="truncate max-w-[200px]">{data[`value${idx}`]}</span>
                            <span className="font-medium ml-4">{data[`count${idx}`]}</span>
                          </div>
                        )
                      );
                    })}
                  </div>
                </div>
              );
            }}
          />
          <Legend />
          
          {/* Bars for each value */}
          {[...Array(10).keys()].map(i => {
            const idx = i + 1;
            return (
              <Bar 
                key={`value${idx}`}
                dataKey={`count${idx}`}
                stackId="a"
                name={`Value ${idx}`}
                fill={COLORS[i % COLORS.length]}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry[`value${idx}`] ? COLORS[i % COLORS.length] : 'transparent'} 
                  />
                ))}
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}