import { HacaktimeMostRecentHeartbeat, HackatimeProject, HackatimeStatsProject } from "@/types/hackatime";
import { prisma } from "@/lib/prisma";
import metrics from "@/metrics";

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
  
  const uri = `https://hackatime.hackclub.com/api/v1/users/${hackatimeUserId}/stats?features=projects&start_date=2025-04-22`;
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
    // console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
    console.log(`✅ Hackatime projects fetched successfully. Found ${data.data.projects.length} projects`);
    
    // if (data.data.projects.length > 0) {
    //   console.log(`📊 Project names:`, data.data.projects.map(p => p.name).join(', '));
    // }

    metrics.increment("success.fetch_hackatime", 1);
    return data.data.projects;
  } catch (error) {
    console.error(`💥 Error fetching Hackatime projects:`, error);
    console.error(`For user ID: ${hackatimeUserId}`);
    metrics.increment("errors.fetch_hackatime", 1);
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
      metrics.increment("errors.hackatime_api_error", 1);
      console.error(`❌ Hackatime API error: ${response.status} ${response.statusText}`);
      throw new Error(`Hackatime API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    metrics.increment("success.hackatime_by_email", 1);
    console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
    console.log(`✅ Found Hackatime ID: ${data.user_id}`);
    return data.user_id as string;
  } catch (error) {
    metrics.increment("errors.hackatime_by_email", 1);
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
      metrics.increment("errors.hackatime_api_error", 1);
      console.error(`❌ Hackatime API error: ${response.status} ${response.statusText}`);
      throw new Error(`Hackatime API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    metrics.increment("success.hackatime_by_email", 1);
    console.log('📦 Full Hackatime response:', JSON.stringify(data, null, 2));
    console.log(`✅ Found Hackatime ID: ${data.user_id}`);
    return data.user_id as string;
  } catch (error) {
    metrics.increment("errors.hackatime_by_email", 1);
    console.error(`💥 Error looking up Hackatime ID by Slack ID:`, error);
    throw error;
  }
}

export interface HackatimeSetupStatus {
  isSetup: boolean;
  error?: string;
}

/**
 * Checks if a user has Hackatime properly set up by verifying their Hackatime ID
 * exists in our database or can be found via their email.
 */
export async function checkHackatimeSetup(userId: string, userEmail: string): Promise<HackatimeSetupStatus> {
  // return { isSetup: false };

  try {
    // First check if we already have a Hackatime ID stored
    console.log('🔍 Checking database for existing Hackatime ID...');
    const dbUser = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!dbUser) {
      console.log('❌ User not found in database');
      return { isSetup: false, error: 'User not found' };
    }

    console.log('👤 Found user:', { 
      id: dbUser.id, 
      email: dbUser.email,
      hasSlack: !!dbUser.slack,
      hasHackatime: !!dbUser.hackatimeId 
    });

    // If we have a Hackatime ID stored, they're set up
    if (dbUser.hackatimeId) {
      console.log('✅ User already has Hackatime ID:', dbUser.hackatimeId);
      return { isSetup: true };
    }

    // Try Slack ID first if available
    let hackatimeId: string | null = null;
    if (dbUser.slack) {
      console.log('🔍 Looking up Hackatime ID by Slack ID:', dbUser.slack);
      hackatimeId = await lookupHackatimeIdBySlack(dbUser.slack);
      console.log(hackatimeId ? '✅ Found Hackatime ID via Slack' : '❌ No Hackatime ID found via Slack');
    } else {
      console.log('⏭️ Skipping Slack lookup - no Slack ID available');
    }

    // If no Slack ID or lookup failed, try email
    if (!hackatimeId) {
      console.log('🔍 Attempting email lookup with:', dbUser.email);
      hackatimeId = await lookupHackatimeIdByEmail(userEmail);
      console.log(hackatimeId ? '✅ Found Hackatime ID via email' : '❌ No Hackatime ID found via email');
    }
    
    if (hackatimeId) {
      // Found ID, save it and return success
      console.log('💾 Saving Hackatime ID to database:', hackatimeId);
      await prisma.user.update({
        where: { id: userId },
        data: { hackatimeId: hackatimeId.toString() }
      });
      console.log('✅ Successfully saved Hackatime ID');
      return { isSetup: true };
    }

    metrics.increment("errors.get_hackatime_id", 1);
    console.log('❌ No Hackatime ID found through any method');
    return { isSetup: false };
  } catch (error) {
    metrics.increment("errors.hackatime_status", 1);
    console.error('💥 Error checking Hackatime status:', error);
    return { isSetup: false, error: 'Failed to check Hackatime status' };
  }
}
