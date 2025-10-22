// components/EndpointBarChart.jsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

export default function EndpointBarChart({ endpoints }) {
  // Convert and sort by count descending
  const data = Object.entries(endpoints)
    .map(([endpoint, count]) => ({ endpoint, count }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          layout="vertical" // Horizontal bars
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
          <XAxis 
            type="number" 
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#6b7280' }}
          />
          <YAxis 
            dataKey="endpoint" 
            type="category" 
            width={150}
            tick={{ fill: '#6b7280' }}
            axisLine={{ stroke: '#6b7280' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#ffffff',
              borderColor: '#e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
          />
          <Bar 
            dataKey="count" 
            fill="#3b82f6" 
            radius={[0, 4, 4, 0]}
            name="Requests"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}