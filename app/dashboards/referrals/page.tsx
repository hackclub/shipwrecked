'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getReferralDataProvider, ReferralData } from './service';

export default function ReferralsDashboard() {
  const [selectedView, setSelectedView] = useState('type');
  const [data, setData] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const provider = getReferralDataProvider();
        let result: ReferralData[];
        
        switch (selectedView) {
          case 'type':
            result = await provider.getReferralsByType();
            break;
          case 'referrer':
            result = await provider.getReferralsByReferrer();
            break;
          case 'rsvps':
            result = await provider.getReferralsByRSVPs();
            break;
          default:
            throw new Error('Invalid view selected');
        }
        
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedView]);

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  // Group data by name for multiple lines
  const groupedData = data.reduce((acc, item) => {
    if (!acc[item.name]) {
      acc[item.name] = [];
    }
    acc[item.name].push(item);
    return acc;
  }, {} as Record<string, ReferralData[]>);

  // Create a unique set of dates for the x-axis
  const dates = Array.from(new Set(data.map(item => item.date))).sort();

  // Create the final data structure for the chart
  const chartData = dates.map(date => {
    const point: any = { date };
    Object.entries(groupedData).forEach(([name, items]) => {
      const item = items.find(i => i.date === date);
      point[name] = item?.value || 0;
    });
    return point;
  });

  return (
    <div className="p-8">
      <select 
        value={selectedView}
        onChange={(e) => setSelectedView(e.target.value)}
        className="mb-4 p-2 border rounded"
      >
        <option value="type">By type</option>
        <option value="referrer">By referrer</option>
        <option value="rsvps">By RSVPs</option>
      </select>
      
      <div className="w-full h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <Legend />
            {Object.keys(groupedData).map((name, index) => (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={`hsl(${index * 120}, 70%, 50%)`}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
} 