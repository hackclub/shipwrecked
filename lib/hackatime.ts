import { HacaktimeMostRecentHeartbeat, HackatimeProject, HackatimeStatsProject } from "@/types/hackatime";

if (!process.env.HACKATIME_API_TOKEN) {
  throw new Error('HACKATIME_API_TOKEN environment variable must be set');
}

const HACKATIME_API_TOKEN = process.env.HACKATIME_API_TOKEN;

async function makeHackatimeRequest(uri: string) {
  const response = await fetch(uri, {
    headers: {
      'Authorization': `Bearer ${HACKATIME_API_TOKEN}`
    }
  });
  return response;
}

export async function fetchHackatimeProjects(
  hackatimeUserId: string,
): Promise<Array<HackatimeProject>> {
  console.log(`🎮 Fetching Hackatime projects for user ID: ${hackatimeUserId}`);
  
  const uri = `https://hackatime.hackclub.com/api/v1/users/${hackatimeUserId}/stats?features=projects`;
  console.log(`📡 Hackatime API Request: ${uri}`);

  try {
    const response = await makeHackatimeRequest(uri);
    console.log(`📥 Hackatime Response Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      console.error(`❌ Hackatime API error: ${response.status} ${response.statusText}`);
      console.error(`Response headers:`, Object.fromEntries(response.headers.entries()));
      const errorText = await response.text();
      console.error(`Error response body:`, errorText);
      throw new Error(`Hackatime API error: ${response.status} ${response.statusText}`);
    }

    const data: HackatimeStatsProject = await response.json();
    console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
    console.log(`✅ Hackatime projects fetched successfully. Found ${data.data.projects.length} projects`);
    
    // if (data.data.projects.length > 0) {
    //   console.log(`📊 Project names:`, data.data.projects.map(p => p.name).join(', '));
    // }

    return data.data.projects;
  } catch (error) {
    console.error(`💥 Error fetching Hackatime projects:`, error);
    console.error(`For user ID: ${hackatimeUserId}`);
    throw error; // Re-throw to handle in calling code
  }
}

export async function checkHackatimeUserExists(
  id: string
): Promise<boolean> {
  const uri = `https://hackatime.hackclub.com/api/v1/users/${id}/stats`;
  const response = await makeHackatimeRequest(uri);

  if (response.status == 404) return false;
  
  if (response.ok) {
    const data = await response.json();
    console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
  }
  
  return true;
}

export async function fetchRecentHeartbeat(id: string): Promise<HacaktimeMostRecentHeartbeat> {
  const uri = `https://hackatime.hackclub.com/api/v1/${id}/heartbeats/most_recent`;
  const response = await makeHackatimeRequest(uri);
  const data = await response.json();
  console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
  return data;
}

export async function lookupHackatimeIdByEmail(email: string): Promise<string | null> {
  console.log(`🔍 Looking up Hackatime ID for email: ${email}`);
  const uri = `https://hackatime.hackclub.com/api/v1/users/lookup_email/${encodeURIComponent(email)}`;
  
  try {
    const response = await makeHackatimeRequest(uri);
    console.log(`📥 Lookup Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log('⚠️ No Hackatime user found for email');
      return null;
    }
    
    if (!response.ok) {
      console.error(`❌ Hackatime API error: ${response.status} ${response.statusText}`);
      throw new Error(`Hackatime API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
    console.log(`✅ Found Hackatime ID: ${data.user_id}`);
    return data.user_id as string;
  } catch (error) {
    console.error(`💥 Error looking up Hackatime ID by email:`, error);
    throw error;
  }
}

export async function lookupHackatimeIdBySlack(slackId: string): Promise<string | null> {
  console.log(`🔍 Looking up Hackatime ID for Slack ID: ${slackId}`);
  const uri = `https://hackatime.hackclub.com/api/v1/users/lookup_slack_uid/${slackId}`;
  
  try {
    const response = await makeHackatimeRequest(uri);
    console.log(`📥 Lookup Response Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 404) {
      console.log('⚠️ No Hackatime user found for Slack ID');
      return null;
    }
    
    if (!response.ok) {
      console.error(`❌ Hackatime API error: ${response.status} ${response.statusText}`);
      throw new Error(`Hackatime API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
    console.log(`✅ Found Hackatime ID: ${data.user_id}`);
    return data.user_id as string;
  } catch (error) {
    console.error(`💥 Error looking up Hackatime ID by Slack ID:`, error);
    throw error;
  }
}