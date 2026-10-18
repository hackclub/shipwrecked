import { startStatsService } from './service';

// This uses a global variable on the Node.js global object to persist across hot module reloads
declare global {
  // eslint-disable-next-line no-var
  var statsServiceInitialized: boolean;
}

// Only start the service if it hasn't been initialized yet
if (!global.statsServiceInitialized) {
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.log(
    `Starting stats service in ${isDevelopment ? 'development' : 'production'} mode (first initialization)`,
  );

  // Mark as initialized globally so it persists across hot reloads
  global.statsServiceInitialized = true;

  // Start the service and throw any errors that occur
  startStatsService().catch((error) => {
    console.error('Failed to start stats service:', error);
    // Rethrow the error to bubble it up
    throw error;
  });
} else {
  console.log('Stats service already initialized, skipping to prevent duplicate instances');
}
