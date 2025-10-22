// components/ArgsHeatmap.jsx
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function ArgsHeatmap({ argsPerEndpoint }) {
  // Transform data for heatmap-style visualization
  const data = Object.entries(argsPerEndpoint).flatMap(([endpoint, args]) => 
    Object.entries(args).map(([arg, count]) => ({
      endpoint,
      arg,
      count
    }))
  );

  // Group by endpoint for better visualization
  const endpoints = [...new Set(data.map(item => item.endpoint))];

  return (
    <div className="h-96">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 20, right: 30, left: 150, bottom: 60 }}
        >
          <XAxis type="number" tick={{ fill: '#6b7280' }} />
          <YAxis 
            dataKey="arg" 
            type="category" 
            width={140}
            tick={{ fill: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          {endpoints.map(endpoint => (
            <Bar 
              key={endpoint}
              dataKey="count"
              stackId="a"
              data={data.filter(d => d.endpoint === endpoint)}
              name={endpoint}
              fill={`#${Math.floor(Math.random()*16777215).toString(16)}`}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}