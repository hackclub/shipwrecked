import { getRecords, AirtableRecord } from '@/lib/airtable';
import { fetchRSVPs } from './actions';
import { setRSVPData, getRSVPData } from './store';

interface RSVP {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralType: string;
  referralCode: string;
  createdAt: string;
}

interface CachedData {
  rsvps: RSVP[];
  referralsByType: Record<string, number>;
  timestamp: string;
}

export interface ReferralData {
  name: string;
  value: number;
  date: string; // ISO date string
}

// This interface defines how we'll fetch data
export interface ReferralDataProvider {
  getReferralsByType(): Promise<ReferralData[]>;
  getReferralsByReferrer(): Promise<ReferralData[]>;
  getReferralsByRSVPs(): Promise<ReferralData[]>;
}

// Airtable implementation
export class AirtableReferralDataProvider implements ReferralDataProvider {
  private intervalId: NodeJS.Timeout | null = null;

  constructor() {
    console.log("AirtableReferralDataProvider constructor");
    // Start polling immediately
    this.startPolling();
  }

  private async fetchAndCacheRSVPs() {
    try {
      console.log("Trying to fetch....");
      const { rsvps } = await fetchRSVPs();
      console.log('Received RSVPs from server:', rsvps.length);
      
      // Cache the raw RSVPs
      await fetch('/api/referrals/cache', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rsvps)
      });
    } catch (error) {
      console.error('Error fetching RSVPs:', error);
    }
  }

  private startPolling() {
    // Fetch immediately
    this.fetchAndCacheRSVPs();
    
    // Then fetch every minute
    this.intervalId = setInterval(() => {
      this.fetchAndCacheRSVPs();
    }, 60000); // 60000 ms = 1 minute
  }

  // Clean up interval when provider is no longer needed
  public stopPolling() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async getReferralsByType(): Promise<ReferralData[]> {
    try {
      const response = await fetch('/api/referrals/cache');
      const rsvps = await response.json() as RSVP[];
      if (!rsvps?.length) return [];

      // Group RSVPs by type and date
      const referralsByTypeAndDate = rsvps.reduce((acc: Record<string, Record<string, number>>, rsvp: RSVP) => {
        const type = rsvp.referralType || 'direct';
        const date = new Date(rsvp.createdAt).toISOString().split('T')[0];
        
        if (!acc[type]) {
          acc[type] = {};
        }
        acc[type][date] = (acc[type][date] || 0) + 1;
        return acc;
      }, {});

      // Flatten into array of ReferralData
      const result: ReferralData[] = [];
      Object.entries(referralsByTypeAndDate).forEach(([type, dateCounts]) => {
        Object.entries(dateCounts).forEach(([date, count]) => {
          result.push({
            name: type,
            value: count,
            date
          });
        });
      });

      // Sort by date
      return result.sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      console.error('Error getting referral type data:', error);
      return [];
    }
  }

  async getReferralsByReferrer(): Promise<ReferralData[]> {
    try {
      const response = await fetch('/api/referrals/cache');
      const rsvps = await response.json() as RSVP[];
      if (!rsvps?.length) return [];

      // Calculate date range for past week
      const now = new Date();
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Group RSVPs by referrer for the past week
      const referralsByReferrer = rsvps.reduce((acc: Record<string, number>, rsvp: RSVP) => {
        const rsvpDate = new Date(rsvp.createdAt);
        if (rsvpDate >= oneWeekAgo) {
          const referrer = rsvp.referralCode || 'direct';
          acc[referrer] = (acc[referrer] || 0) + 1;
        }
        return acc;
      }, {});

      // Convert to array and sort by count (descending)
      return Object.entries(referralsByReferrer)
        .map(([name, value]) => ({
          name,
          value,
          date: now.toISOString().split('T')[0] // Use current date since it's a summary
        }))
        .sort((a, b) => b.value - a.value) // Sort by count descending
        .slice(0, 10); // Take top 10 referrers
    } catch (error) {
      console.error('Error getting referrer data:', error);
      return [];
    }
  }

  async getReferralsByRSVPs(): Promise<ReferralData[]> {
    try {
      const response = await fetch('/api/referrals/cache');
      const rsvps = await response.json() as RSVP[];
      if (!rsvps?.length) return [];

      // Group RSVPs by day
      const rsvpsByDay = rsvps.reduce((acc: Record<string, number>, rsvp: RSVP) => {
        const date = new Date(rsvp.createdAt);
        const dayKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
        
        acc[dayKey] = (acc[dayKey] || 0) + 1;
        return acc;
      }, {});

      // Sort days chronologically
      return Object.entries(rsvpsByDay)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .map(([date, value]) => ({
          name: 'Total RSVPs',
          value,
          date
        }));
    } catch (error) {
      console.error('Error getting RSVP data:', error);
      return [];
    }
  }
}

// Mock implementation - this would be replaced with Airtable or other data source
export class MockReferralDataProvider implements ReferralDataProvider {
  async getReferralsByType(): Promise<ReferralData[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { name: 'Social Media', value: 20, date: '2024-03-01' },
      { name: 'Social Media', value: 35, date: '2024-03-08' },
      { name: 'Social Media', value: 75, date: '2024-03-15' },
      { name: 'Email', value: 15, date: '2024-03-01' },
      { name: 'Email', value: 30, date: '2024-03-08' },
      { name: 'Email', value: 45, date: '2024-03-15' },
      { name: 'Direct', value: 10, date: '2024-03-01' },
      { name: 'Direct', value: 20, date: '2024-03-08' },
      { name: 'Direct', value: 30, date: '2024-03-15' }
    ];
  }

  async getReferralsByReferrer(): Promise<ReferralData[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { name: 'John Doe', value: 8, date: '2024-03-01' },
      { name: 'John Doe', value: 15, date: '2024-03-08' },
      { name: 'John Doe', value: 25, date: '2024-03-15' },
      { name: 'Jane Smith', value: 5, date: '2024-03-01' },
      { name: 'Jane Smith', value: 12, date: '2024-03-08' },
      { name: 'Jane Smith', value: 20, date: '2024-03-15' },
      { name: 'Bob Johnson', value: 3, date: '2024-03-01' },
      { name: 'Bob Johnson', value: 8, date: '2024-03-08' },
      { name: 'Bob Johnson', value: 15, date: '2024-03-15' }
    ];
  }

  async getReferralsByRSVPs(): Promise<ReferralData[]> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return [
      { name: 'Total RSVPs', value: 40, date: '2024-03-01' },
      { name: 'Total RSVPs', value: 65, date: '2024-03-08' },
      { name: 'Total RSVPs', value: 45, date: '2024-03-15' }
    ];
  }
}

// Factory function to get the appropriate data provider
export function getReferralDataProvider(): ReferralDataProvider {
  // In the future, this could return different implementations based on environment
  // or configuration
  return new AirtableReferralDataProvider();
} 