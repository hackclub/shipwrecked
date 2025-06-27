export async function exponentialFetchRetry(
  url: string, 
  options: RequestInit, 
  maxRetries: number = 5, 
  delay: number = 1000
): Promise<Response> {
  const maxDelay = 32000;

  async function fetchWithRetry(url: string, options: RequestInit, retries: number, delay: number): Promise<Response> {
    try {
      const response = await fetch(url, options);
      if (!response.status.toString().startsWith('5') && !response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (retries < maxRetries) {
        const nextRetries = retries + 1;
        const backoff = Math.min(delay * 2, maxDelay);
        console.log(`Retrying... (${nextRetries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, nextRetries, backoff);
      }
      console.error('Max retries reached:', error);
      throw error;
    }
  }

  return fetchWithRetry(url, options, 0, delay);
}