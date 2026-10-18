// Liveness only: external services must not make Coolify restart a healthy process.
export function GET() {
  return Response.json({ status: 'ok' });
}
