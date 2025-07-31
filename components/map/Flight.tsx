import TimeDiff from '@/components/map/TimeDiff';
import React from 'react';
import {FlightData} from '@/lib/map';

export default function Flight({flight, borderless = false, omitSeconds, onClick, inPopup = false}: {
  flight: FlightData,
  borderless?: boolean,
  omitSeconds?: boolean,
  onClick?: () => void,
  inPopup?: boolean
}) {
  if (!flight) {
    return (
      <div className={borderless ? '' : 'mb-4 border border-gray-200 rounded-lg bg-white shadow-sm p-4'}>
        <p className="text-sm text-gray-500">⚠️ No flight data available</p>
      </div>
    );
  }
  return (
    <div className={borderless ? '' : 'mb-4 border border-gray-200 rounded-lg bg-white shadow-sm p-4 relative'}
         onClick={onClick}
         style={onClick ? {cursor: 'pointer'} : {}}>
      {flight.status && (
        <div
          className={
            `${inPopup ? 'absolute top-2 right-8' : 'absolute top-2 right-2'} px-3 py-1 rounded-full text-xs font-semibold shadow ` +
            (flight.status === 'IN_FLIGHT' ? 'bg-blue-500 text-white' :
              flight.status === 'ARRIVED' ? 'bg-green-500 text-white' :
                flight.status === 'DEPARTING_SOON' ? 'bg-blue-400 text-white' :
                  flight.status === 'UPCOMING' ? 'bg-yellow-400 text-gray-900' :
                    flight.status === 'PAST_FLIGHT' ? 'bg-gray-400 text-white' :
                      'bg-gray-200 text-gray-700')
          }
        >
          {flight.status === 'IN_FLIGHT' && 'In flight'}
          {flight.status === 'ARRIVED' && 'Arrived'}
          {flight.status === 'DEPARTING_SOON' && 'Departing soon'}
          {flight.status === 'UPCOMING' && 'Upcoming'}
          {flight.status === 'PAST_FLIGHT' && 'Past flight'}
        </div>
      )}
      <div className="flex items-center mb-2">
        <img src={flight.user?.image || null}
             className="w-8 h-8 rounded-full mr-2"
             alt={flight.user?.name || 'Unknown User'}/>
        <h3 className="text-md font-medium">{flight.user?.name || 'Unknown User'}</h3>
      </div>
      <p className="text-xs text-gray-400">{flight.serverData?.identifier || flight.flightNumber}</p>

      {flight.serverData && 'error' in flight.serverData ?
        <p className="text-sm text-red-500">❌ Error: {flight.serverData.error}</p> : (
          !flight.serverData ? <p className="text-sm text-gray-500">⚠️ Data not available</p> :
            <>
              <p>
            <span className={'text-sm font-semibold'}>
              {flight.serverData.origin.airport} → {flight.serverData.destination.airport}
            </span>
              </p>
              <p
                className="text-sm text-gray-600">{flight.serverData?.airline ? `🏢 ${flight.serverData.airline}` : ''}</p>

              {
                ['UPCOMING', 'PAST_FLIGHT'].includes(flight.status || '') ?
                  <p className="text-sm color-gray-500">
                    {flight.status == 'UPCOMING' ? '⏳ Flight is upcoming and scheduled to depart in the future.' : '🕒 Flight has already departed and arrived in the past.'}
                  </p> : <>
                    <TimeDiff
                      label={flight.status == 'DEPARTING_SOON' ? '⏰ Departing in' : '🛫 Departed'}
                      suffix={flight.status == 'DEPARTING_SOON' ? '' : 'ago'}
                      scheduled={(flight.serverData?.origin.departure_time || 0) * 1000}
                      actual={(flight.serverData?.origin.actual_departure_time || 0) * 1000}
                      omitSeconds={omitSeconds}
                    />
                    <TimeDiff
                      label={flight.status == 'ARRIVED' ? '🛬 Arrived' : '🛬 Arriving in'}
                      suffix={flight.status == 'ARRIVED' ? 'ago' : ''}
                      scheduled={(flight.serverData?.destination.arrival_time || 0) * 1000}
                      actual={(flight.serverData?.destination.actual_arrival_time || 0) * 1000}
                      omitSeconds={omitSeconds}
                    />
                  </>
              }
              {
                flight.relation == 'SINGLE' ? null : (
                  <p className="text-sm text-gray-500">
                    {flight.relation === 'CONNECTING_AFTER' ? '🔗 First connecting flight' :
                      flight.relation === 'CONNECTING_BEFORE' ? '🔗 Final connecting flight' :
                        flight.relation === 'CONNECTING_BOTH' ? '🔗 Middle connecting flight' : '🔗 Connecting flight'}
                  </p>
                )
              }
            </>)
      }
    </div>
  );
}