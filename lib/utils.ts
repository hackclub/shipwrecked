export function ensureHttps(url: string): string {
  if (!url) return url;
  if (url.startsWith("http")) return url;
  return `https://${url}`;
}