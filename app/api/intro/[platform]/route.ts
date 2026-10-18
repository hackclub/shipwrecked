import { checkHackatimeUserExists } from '@/lib/hackatime';
import { checkSlackUserExists } from '@/lib/slack';
import { NextRequest } from 'next/server';

/*
 * API Call to check the existance of certain platforms
 * Current platforms/features to be checked: slack, hackatime, hackatime_heartbeat
 *
 *
 * The query search paramater defines the object to be queried
 *  + platform: slack, query: email@example.com ; Checks if slack user with the query email exists
 *  + platform: hackatime, query: slackid ; Checks if a hackatime user with that query slackid exists
 *  + platform: hackatime_heartbeat, query: slackid ; Checks if a hackatime heartbeat for the user with the query slackid exists
 *
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> },
) {
  const platform = (await params).platform;

  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) return Response.json({ ok: false, msg: 'No query value passed' }, { status: 400 });

  let exists = false;
  switch (platform) {
    case 'slack':
      exists = await checkSlackUserExists(query);
      break;
    case 'hackatime':
      exists = await checkHackatimeUserExists(query);
      break;
    case 'hackatime_heartbeat':
      // TODO: Hackatime Heartbeat currently not available, assume it exists
      // exists = (await fetchRecentHeartbeat(query)).has_heartbeat
      exists = true;
      break;
    default:
      return Response.json({ ok: false, msg: 'No matching platform found' });
  }

  return Response.json({ ok: true, exists: exists, platform: platform, query: query });
}
