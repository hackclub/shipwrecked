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

      // Group RSVPs by referral type
      const referralsByType = rsvps.reduce((acc: Record<string, number>, rsvp: RSVP) => {
        const type = rsvp.referralType || 'direct';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(referralsByType).map(([name, value]) => ({
        name,
        value,
        date: new Date().toISOString()
      }));
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

      // Group RSVPs by referrer
      const referralsByReferrer = rsvps.reduce((acc: Record<string, number>, rsvp: RSVP) => {
        const referrer = rsvp.referralCode || 'direct';
        acc[referrer] = (acc[referrer] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(referralsByReferrer).map(([name, value]) => ({
        name,
        value,
        date: new Date().toISOString()
      }));
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

      // Group RSVPs by week
      const rsvpsByWeek = rsvps.reduce((acc: Record<string, number>, rsvp: RSVP) => {
        const date = new Date(rsvp.createdAt);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0];
        
        acc[weekKey] = (acc[weekKey] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(rsvpsByWeek).map(([date, value]) => ({
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