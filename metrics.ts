// No-op StatsD implementation that works in both browser and Node.js
class NoOpStatsD {
  increment(stat: string, value?: number, sampleRate?: number, tags?: any, callback?: Function) {
    // No-op
    if (callback) callback();
  }
  
  gauge(stat: string, value: number, sampleRate?: number, tags?: any, callback?: Function) {
    // No-op
    if (callback) callback();
  }
  
  timing(stat: string, time: number, sampleRate?: number, tags?: any, callback?: Function) {
    // No-op
    if (callback) callback();
  }
  
  decrement(stat: string, value?: number, sampleRate?: number, tags?: any, callback?: Function) {
    // No-op
    if (callback) callback();
  }
  
  histogram(stat: string, value: number, sampleRate?: number, tags?: any, callback?: Function) {
    // No-op
    if (callback) callback();
  }
  
  close() {
    // No-op
  }
}

// Always use no-op implementation for now
const metrics = new NoOpStatsD();
console.log("Metrics initialized with no-op implementation (StatsD disabled)");

// Export the no-op metrics directly
export default metrics;