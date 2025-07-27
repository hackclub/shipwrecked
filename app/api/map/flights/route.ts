import {getRecords} from '@/lib/airtable/airtable';
import {FlightData, FlightDirection, FlightRelation, FlightStatus} from '@/lib/map';
import {prisma} from '@/lib/prisma';
import {NextResponse} from 'next/server';
import {opts} from '@/app/api/auth/[...nextauth]/route';
import {getServerSession} from 'next-auth';

// Used to determine if a flight is departing soon or has recently arrived
const recentFlightThresholdMS = 1000 * 60 * 60 * 6; // 6 hours
const estimatedFlightDurationMS = 1000 * 60 * 60 * 3; // 3 hours

const rateLimit = 1000 * 30; // 30 seconds (this is not enforced by API)
let cache: { flights: FlightData[] } | null = null; // In case rate limit is met
let lastRequest = 0; // Last request time

export async function GET(request: Request) {
  const session = await getServerSession(opts);
  if (!session?.user?.email) {
    return NextResponse.json({error: 'Unauthorized'}, {status: 401});
  }
  // TODO: Make sure the user has been invited
  const hasInvite = true;
  if (!hasInvite) {
    return NextResponse.json({error: 'Access Denied'}, {status: 403});
  }
  try {
    // If necessary, send cached reponse
    if (Date.now() - lastRequest < rateLimit && cache) {
      return NextResponse.json(cache, {status: 200});
    }
    // Get flight data from Airtable
    console.log('FLIGHT DADTA');
    const tableName = 'Flights';
    const records = await getRecords(tableName, {
      filterByFormula: `AND(NOT({Inbound Flight Number} = ''), NOT({Outbound Flight Number} = ''))`,
      sort: [{field: 'Inbound Flight Number', direction: 'asc'}],
      maxRecords: 1000,
      view: 'Flights Info Public'
    });
    let flights: FlightData[] = [];
    for (const record of records) {
      const fields = record.fields;

      const slackId = fields['Slack ID'] as string;
      const inboundFlightNumber = fields['Inbound Flight Number'] as string;
      const inboundFlightTime = fields['Inbound Flight Time'] as string;
      const outboundFlightNumber = fields['Outbound Flight Number'] as string;
      const outboundFlightTime = fields['Outbound Flight Time'] as string;

      const inboundFlightDate = new Date(inboundFlightTime);
      const outboundFlightDate = new Date(outboundFlightTime);

      const now = new Date();
      const inboundFlightDiff = inboundFlightDate.getTime() - now.getTime();
      const outboundFlightDiff = outboundFlightDate.getTime() - now.getTime();

      // Determine flight direction and status
      let direction: FlightDirection;
      if (inboundFlightDiff > -(recentFlightThresholdMS + estimatedFlightDurationMS) && outboundFlightDiff > 0) {
        // Flight has not departed yet, or inbound flight is in air or within the threshold, and outbound flight
        // is in the future
        direction = 'INBOUND';
      } else if (inboundFlightDiff < 0
        && outboundFlightDiff < (recentFlightThresholdMS + estimatedFlightDurationMS)) {
        // Inbound flight has already arrived, and outbound flight is either in the air or within the threshold
        direction = 'OUTBOUND';
      } else {
        // Default to INBOUND if we can't determine the direction
        direction = 'INBOUND';
      }

      // Get the departure time for the flight
      const departureTime = direction === 'INBOUND' ? inboundFlightDate.getTime() : outboundFlightDate.getTime();

      // If there are multiple flight numbers (semicolon-separated), relate them in order (that is, the first
      // flight will be related to the next flight as CONNECTING_BEFORE, and the next flight will be related as
      // CONNECTING_AFTER or CONNECTING_BOTH)
      const flightNumbers = (
        direction === 'INBOUND' ? inboundFlightNumber : outboundFlightNumber
      ).split(';').map(f => f.trim());
      if (flightNumbers.length === 0) {
        console.warn(`No flight numbers found for record ${record.id}`);
        continue;  // Skip this record if no flight numbers are found
      } else if (flightNumbers.length === 1) {
        // Single flight number, no relations
        flights.push({
          flightNumber: flightNumbers[0],
          relation: 'SINGLE',
          direction,
          departureTime,
          slackId,
          flightTime: inboundFlightDate.getTime()
        });
      } else {
        // Multiple flight numbers, relate them
        for (let i = 0; i < flightNumbers.length; i++) {
          const flightNumber = flightNumbers[i];
          let relation: FlightRelation;
          if (i === 0) {
            // First flight number
            relation = 'CONNECTING_AFTER';
          } else if (i === flightNumbers.length - 1) {
            // Last flight number
            relation = 'CONNECTING_BEFORE';
          } else {
            // Middle flight numbers, relates to both previous and next ones as CONNECTING_BOTH
            relation = 'CONNECTING_BOTH';
          }
          flights.push({
            flightNumber,
            relation,
            direction,
            departureTime,
            slackId,
            flightTime: (direction === 'INBOUND' ? inboundFlightDate : outboundFlightDate).getTime()
          });
        }
      }
    }
    // Get list of flight numbers to fetch from the flight tracking API
    const flightNumbers = flights.map(f => f.flightNumber).filter(f => f);
    if (flightNumbers.length === 0) {
      console.warn('No flight numbers found in the records');
      return Response.json({error: 'No flight numbers found'}, {status: 404});
    }
    console.log('Flight numbers to fetch:', flightNumbers);
    const flightNumbersQuery = flightNumbers.join(',');
    // Fetch flight tracking data from the API
    const apiUrl = process.env.FLIGHT_API_URL;
    const token = process.env.FLIGHT_API_TOKEN;
    if (!apiUrl || !token) {
      console.error('Flight API URL or token is not set');
      return Response.json({error: 'Flight API not configured'}, {status: 500});
    }
    console.log('Fetching flight tracking data from API...');
    const response = await fetch(`${apiUrl}/api/scrape/${flightNumbersQuery}?token=${token}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) {
      console.error('Failed to fetch flight tracking data:', response.statusText);
      return Response.json({error: 'Failed to fetch flight tracking data'}, {status: response.status});
    }
    // Read each line of the response stream
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('Response body is not readable');
      return Response.json({error: 'Response body is not readable'}, {status: 500});
    }
    const decoder = new TextDecoder();
    let done = false;
    while (!done) {
      const {value, done: isDone} = await reader.read();
      done = isDone;
      if (value) {
        const chunk = decoder.decode(value, {stream: true});
        // Split the chunk into lines
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        console.log(lines);
        for (const line of lines) {
          try {
            const flightInfo = JSON.parse(line);
            if (flightInfo.type == 'flight_data') {
              const flightData = flightInfo.result;
              // Find the corresponding flight in the flights array and update its status
              const flightIndex = flights.findIndex(f => f.flightNumber === flightInfo.flight_number);
              if (flightIndex === -1) {
                console.warn(`Flight ${flightData.flight_number} not found in the flights array`);
                continue;  // Skip this flight if not found
              }
              const flight = flights[flightIndex];
              if (!flight) {
                console.warn(`Flight ${flightData.flight_number} is undefined in the flights array`);
                continue;  // Skip this flight if it's undefined
              }
              // Determine the status of the flight based on the departure and arrival times
              const arrivalTime = flightData.destination?.arrival_time * 1000; // Convert to MS
              const departureTime = flightData.origin?.departure_time * 1000; // Convert to MS
              const now = Date.now();
              let status: FlightStatus;
              // There is no guarantee that the flight tracked is the same as the one in the Airtable
              // record. Thus, we need to ensure that this flight's departure time is within the range of
              // the Airtable record's flight time.
              if (flight.departureTime - departureTime > recentFlightThresholdMS) {
                // Flight is scheduled to depart in the future
                status = 'UPCOMING';
              } else if (now >= departureTime && now < arrivalTime) {
                // Flight is currently in the air
                status = 'IN_FLIGHT';
              } else if (departureTime - now < recentFlightThresholdMS && arrivalTime - now > 0) {
                // Flight is scheduled to depart soon
                status = 'DEPARTING_SOON';
              } else if (now >= arrivalTime && now - arrivalTime < recentFlightThresholdMS) {
                // Flight has recently arrived
                status = 'ARRIVED';
              } else {
                // Flight has already departed and arrived in the past
                status = 'PAST_FLIGHT';
              }
              // Try to get user name & image from Slack ID
              // Prisma: Look up user with slack = to flight.slackId
              const userData = await prisma.user.findFirst({
                where: {slack: flight.slackId},
                select: {
                  name: true,
                  image: true
                }
              });

              const user = {
                name: userData?.name || 'Unknown User',
                image: userData?.image || ''
              };
              flight.status = status;
              flight.serverData = flightData;
              flight.user = user; // Add user data to the flight
              // Update in the flights array
              flights[flightIndex] = flight;
            }
          } catch (parseError) {
            console.error('Failed to parse flight info:', parseError);
          }
        }
      }
    }
    // Cache the response for future requests
    cache = {flights};
    lastRequest = Date.now();
    return NextResponse.json({flights}, {status: 200});
  } catch (error) {
    console.error('❌ Error in /api/map/track:', error);
    if (error instanceof Error) {
      console.error('  Error message:', error.message);
      console.error('  Stack trace:', error.stack);
    }
    return NextResponse.json({error: 'Failed to get tracking data'}, {status: 500});
  }
}
