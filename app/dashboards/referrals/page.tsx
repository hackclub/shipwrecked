'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getReferralDataProvider, ReferralData } from './service';

export default function ReferralsDashboard() {
  const [typeData, setTypeData] = useState<ReferralData[]>([]);
  const [referrerData, setReferrerData] = useState<ReferralData[]>([]);
  const [allTimeReferrerData, setAllTimeReferrerData] = useState<ReferralData[]>([]);
  const [rsvpData, setRsvpData] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimeout: NodeJS.Timeout | null = null;

    setLoading(true);
    setError(null);

    const fetchData = async () => {
      const provider = getReferralDataProvider();
      const [typeResult, referrerResult, allTimeResult, rsvpResult] = await Promise.all([
        provider.getReferralsByType(),
        provider.getReferralsByReferrer(),
        provider.getAllTimeTopReferrers(),
        provider.getReferralsByRSVPs()
      ]);
      return { typeResult, referrerResult, allTimeResult, rsvpResult };
    };

    const pollForData = async () => {
      if (cancelled) return;
      const { typeResult, referrerResult, allTimeResult, rsvpResult } = await fetchData();
      const hasData =
        typeResult.length > 0 ||
        referrerResult.length > 0 ||
        allTimeResult.length > 0 ||
        rsvpResult.length > 0;

      if (hasData) {
        setTypeData(typeResult);
        setReferrerData(referrerResult);
        setAllTimeReferrerData(allTimeResult);
        setRsvpData(rsvpResult);
        setLoading(false);
      } else {
        // Keep polling every 2 seconds until data is available
        pollTimeout = setTimeout(pollForData, 2000);
      }
    };

    pollForData();

    return () => {
      cancelled = true;
      if (pollTimeout) clearTimeout(pollTimeout);
    };
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-lg text-gray-600">Waiting for data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-600">Error: {error}</div>;
  }

  const renderChart = (data: ReferralData[], title: string) => {
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
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="w-full h-[300px]">
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
  };

  const renderReferrerList = (data: ReferralData[], title: string) => {
    // Filter out 'direct' entries, sort by value (descending) and take top 50
    const sortedReferrers = [...data]
      .filter(referrer => referrer.name !== 'direct')
      .sort((a, b) => b.value - a.value)
      .slice(0, 50);

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="w-full h-[300px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b">
                <th className="text-left py-2 px-4">Rank</th>
                <th className="text-left py-2 px-4">Referrer</th>
                <th className="text-right py-2 px-4">Referrals</th>
              </tr>
            </thead>
            <tbody>
              {sortedReferrers.map((referrer, index) => (
                <tr key={referrer.name} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-4 text-gray-500">{index + 1}</td>
                  <td className="py-2 px-4 font-medium">{referrer.name}</td>
                  <td className="py-2 px-4 text-right">{referrer.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8">
      <div className="grid grid-cols-2 gap-6">
        {renderChart(typeData, 'Referrals by Type')}
        {renderReferrerList(referrerData, 'Top Referrers (Past 24 Hours)')}
        {renderChart(rsvpData, 'Total RSVPs')}
        {renderReferrerList(allTimeReferrerData, 'All-Time Top Referrers')}
      </div>
    </div>
  );
} 