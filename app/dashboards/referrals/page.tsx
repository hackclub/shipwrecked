'use client';

import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { getReferralDataProvider, ReferralData } from './service';

// Color mapping for different referral types
const getSeriesColor = (name: string): string => {
  const colorMap: Record<string, string> = {
    'direct': '#8884d8',          // Purple
    'referred': '#ff8042',        // Coral/orange - new distinct color for generic referrals
    'social_media': '#82ca9d',    // Green
    'email': '#ffc658',          // Gold
    'friend': '#ff7300',         // Orange
    'search': '#0088fe',         // Blue
    'other': '#00C49F',          // Teal
  };
  
  // Return mapped color or generate one for unknown types
  return colorMap[name] || `hsl(${Math.random() * 360}, 70%, 50%)`;
};

// Time range options
const timeRanges = [
  { label: 'Last 3 Days', days: 3 },
  { label: 'Last 7 Days', days: 7 },
  { label: 'Last 14 Days', days: 14 },
  { label: 'All Time', days: 0 }
];

export default function ReferralsDashboard() {
  const [typeData, setTypeData] = useState<ReferralData[]>([]);
  const [referrerData, setReferrerData] = useState<ReferralData[]>([]);
  const [allTimeReferrerData, setAllTimeReferrerData] = useState<ReferralData[]>([]);
  const [rsvpData, setRsvpData] = useState<ReferralData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDirect, setShowDirect] = useState(true);
  const [selectedRange, setSelectedRange] = useState(timeRanges[3]);

  // Filter data based on selected time range
  const filterDataByTimeRange = (data: ReferralData[]): ReferralData[] => {
    if (selectedRange.days === 0) return data; // "All Time"
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - selectedRange.days);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];
    
    return data.filter(item => item.date >= cutoffDateStr);
  };

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

  const renderChart = (data: ReferralData[], title: string, isTypeChart = false) => {
    // Apply time range filter for type and RSVP charts
    const filteredData = (isTypeChart || title === 'Total RSVPs') 
      ? filterDataByTimeRange(data)
      : data;

    // Group data by name for multiple lines
    const groupedData = filteredData.reduce((acc, item) => {
      if (!acc[item.name]) {
        acc[item.name] = [];
      }
      acc[item.name].push(item);
      return acc;
    }, {} as Record<string, ReferralData[]>);

    // Create a unique set of dates for the x-axis
    const dates = Array.from(new Set(filteredData.map(item => item.date))).sort();

    // Create the final data structure for the chart
    const chartData = dates.map(date => {
      const point: any = { date };
      Object.entries(groupedData).forEach(([name, items]) => {
        // Skip 'direct' series if showDirect is false and this is the type chart
        if (isTypeChart && name === 'direct' && !showDirect) {
          return;
        }
        const item = items.find(i => i.date === date);
        point[name] = item?.value || 0;
      });
      return point;
    });

    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          {isTypeChart && (
            <button
              onClick={() => setShowDirect(!showDirect)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                showDirect 
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {showDirect ? 'Hide Direct' : 'Show Direct'}
            </button>
          )}
        </div>
        <div className="w-full h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(dateStr) => {
                  const [year, month, day] = dateStr.split('-');
                  return `${month}/${day}`;
                }}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(dateStr) => {
                  const [year, month, day] = dateStr.split('-');
                  return `${month}/${day}/${year}`;
                }}
              />
              <Legend />
              {Object.keys(groupedData).map((name) => {
                // Skip rendering the 'direct' line if showDirect is false and this is the type chart
                if (isTypeChart && name === 'direct' && !showDirect) {
                  return null;
                }
                return (
                  <Line
                    key={name}
                    type="monotone"
                    dataKey={name}
                    stroke={getSeriesColor(name)}
                    strokeWidth={2}
                    dot={{ r: 4, fill: getSeriesColor(name) }}
                    activeDot={{ r: 6, fill: getSeriesColor(name) }}
                  />
                );
              })}
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
      <div className="mb-6 flex justify-end">
        <div className="inline-flex rounded-md shadow-sm" role="group">
          {timeRanges.map((range) => (
            <button
              key={range.label}
              onClick={() => setSelectedRange(range)}
              className={`
                px-4 py-2 text-sm font-medium
                ${range === selectedRange
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
                }
                border border-gray-200
                first:rounded-l-lg first:border-l
                last:rounded-r-lg
                -ml-px first:ml-0
              `}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {renderChart(typeData, 'Referrals by Type', true)}
        {renderReferrerList(referrerData, 'Top Referrers (Past 24 Hours)')}
        {renderChart(rsvpData, 'Total RSVPs')}
        {renderReferrerList(allTimeReferrerData, 'All-Time Top Referrers')}
      </div>
    </div>
  );
} 