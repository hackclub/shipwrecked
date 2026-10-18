import { getRecordCount } from '@/lib/airtable/index';
import { setCount, getCount } from './store';
import metrics from '@/metrics';

// Global variable to track if service is running
let isServiceRunning = false;

export class StatsService {
  private static instance: StatsService | null = null;
  private intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): StatsService {
    if (!StatsService.instance) {
      console.log('created new stats service!');
      StatsService.instance = new StatsService();
    }
    return StatsService.instance;
  }

  public async getLastCount(): Promise<number> {
    return await getCount();
  }

  private async updateStats() {
    try {
      console.log('Fetching RSVP count...');
      const currentCount = await getRecordCount('RSVPs');
      const lastCount = await getCount();

      if (currentCount !== lastCount) {
        console.log(`RSVP count changed: ${lastCount} -> ${currentCount}`);
        await setCount(currentCount);
      } else {
        console.log(`RSVP count remains at: ${currentCount}`);
      }

      metrics.increment('stats_service.update', 1);
    } catch (error) {
      console.error('Error in stats service:', error);

      metrics.increment('stats_service.update_fail', 1);
    }
  }

  public async start() {
    if (isServiceRunning) {
      console.log('Stats service is already running');
      return;
    }

    console.log('Starting stats service...');
    isServiceRunning = true;

    // Run immediately and wait for it to complete
    await this.updateStats();
    console.log('Initial count fetched:', await getCount());

    // Then run every 10 seconds
    this.intervalId = setInterval(() => this.updateStats(), 10000);

    metrics.increment('stats_service.start', 1);
  }

  public stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    isServiceRunning = false;

    metrics.increment('stats_service.stop', 1);

    console.log('Stats service stopped');
  }
}

// Export a function to start the service
export async function startStatsService() {
  const service = StatsService.getInstance();
  await service.start();
}

// Export a function to stop the service
export function stopStatsService() {
  const service = StatsService.getInstance();
  service.stop();
}
