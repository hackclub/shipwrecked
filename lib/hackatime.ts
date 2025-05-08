import { HacaktimeMostRecentHeartbeat, HackatimeProject, HackatimeStatsProject } from "@/types/hackatime";

export async function fetchHackatimeProjects(
  slackId: string,
): Promise<Array<HackatimeProject>> {
  console.log(`🎮 Fetching Hackatime projects for Slack ID: ${slackId}`);
  
  const uri = `https://hackatime.hackclub.com/api/v1/users/${slackId}/stats?features=projects`;
  console.log(`📡 Hackatime API Request: ${uri}`);

  try {
    const response = await fetch(uri);
    console.log(`📥 Hackatime Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ Hackatime API error: ${response.status} ${response.statusText}`);
      console.error(`Response headers:`, Object.fromEntries(response.headers.entries()));
      const errorText = await response.text();
      console.error(`Error response body:`, errorText);
      throw new Error(`Hackatime API error: ${response.status} ${response.statusText}`);
    }

    const data: HackatimeStatsProject = await response.json();
    console.log(`✅ Hackatime projects fetched successfully. Found ${data.data.projects.length} projects`);
    
    // if (data.data.projects.length > 0) {
    //   console.log(`📊 Project names:`, data.data.projects.map(p => p.name).join(', '));
    // }

    return data.data.projects;
  } catch (error) {
    console.error(`💥 Error fetching Hackatime projects:`, error);
    console.error(`For Slack ID: ${slackId}`);
    throw error; // Re-throw to handle in calling code
  }
}

export async function checkHackatimeUserExists(
  id: string
): Promise<boolean> {
  const uri = `https://hackatime.hackclub.com/api/v1/users/${id}/stats`
  const req = await fetch(uri)

  if (req.status == 404) return false;
  return true;
}

export async function fetchRecentHeartbeat(id: string): Promise<HacaktimeMostRecentHeartbeat> {
  const uri = `https://hackatime.hackclub.com/api/v1/${id}/heartbeats/most_recent`
  const data = await fetch(uri).then(d => d.json())

  return data
}