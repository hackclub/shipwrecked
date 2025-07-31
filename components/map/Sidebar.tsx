'use client';

import {FlightData} from '@/lib/map';
import Flight from '@/components/map/Flight';

export default function Sidebar({
                                  flights: flightsProp,
                                  collapsed,
                                  setCollapsed,
                                  onFlightSelect,
                                  themeIndex,
                                  setThemeIndex,
                                  themeNames
                                }: {
  flights: FlightData[],
  collapsed: boolean,
  setCollapsed: (c: boolean) => void,
  onFlightSelect?: (flight: FlightData) => void,
  themeIndex: number,
  setThemeIndex: (idx: number) => void,
  themeNames: string[]
}) {
  return (
    <div
      className={`fixed top-0 left-0 h-screen bg-white border-r border-gray-200 transition-all duration-300 overflow-y-auto z-50 ${collapsed ? 'w-12 p-2' : 'w-128 p-4'}`}>
      <button
        className="absolute top-2 right-2 bg-gray-100 rounded-full p-1 hover:bg-gray-200 focus:outline-none"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <span title="Expand">▶️</span>
        ) : (
          <span title="Collapse">◀️</span>
        )}
      </button>
      {!collapsed && (
        <>
          <div className="mb-4">
            <label htmlFor="theme-select" className="block text-sm font-medium text-gray-700 mb-1">Map Theme</label>
            <select
              id="theme-select"
              className="w-full border border-gray-300 rounded px-2 py-1"
              value={themeIndex}
              onChange={e => setThemeIndex(Number(e.target.value))}
            >
              {themeNames.map((name, idx) => (
                <option value={idx} key={name}>{name}</option>
              ))}
            </select>
          </div>
          <h2 className="text-lg font-semibold mb-4">✈️ Flight Information</h2>
          {flightsProp.map((flight, index) => (
            <Flight
              flight={flight}
              key={index}
              omitSeconds={true}
              onClick={
                flight.status !== 'UPCOMING' && flight.status !== 'PAST_FLIGHT' && onFlightSelect
                  ? () => onFlightSelect(flight)
                  : undefined
              }
            />
          ))}
        </>
      )}
    </div>
  );
}
