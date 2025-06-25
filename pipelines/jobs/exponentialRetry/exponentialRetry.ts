export function exponentialFetchRetry(url: string, options: RequestInit, maxRetries: number = 5, delay: number = 1000) {
  const retries = 0;
  const maxDelay = 32000;

  async function fetchWithRetry(url: string, options: RequestInit, retries: number, delay: number) {
    try {
      const response = await fetch(url, options);
      if (response.status.toString().startsWith('5')) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (retries < maxRetries) {
        retries++;
        const backoff = Math.min(delay * 2, maxDelay);
        console.log(`Retrying... (${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries, backoff);
      }
      console.error(error);
    }
    throw new Error('Max retries reached');
  }

  return fetchWithRetry(url, options, retries, delay);
}