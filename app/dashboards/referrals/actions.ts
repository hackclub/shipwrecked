'use server';

import { getRecords } from '@/lib/airtable';

interface RSVPData {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  referralType: string;
  referralCode: string;
  createdAt: string;
}

export async function fetchRSVPs() {
  try {
    console.log("Fetching RSVPs");
    const records = await getRecords("RSVPs", {
      filterByFormula: "",
      sort: [],
      maxRecords: 50000
    });
    
    // Log on server side only
    console.log('\n🚨 RSVP Records from Airtable 🚨');
    console.log('Total records:', records.length);
    
    // Transform records to only include the fields we need
    const rsvpData: RSVPData[] = records.map(record => ({
      id: record.id,
      firstName: record.fields["First Name"] || '',
      lastName: record.fields["Last Name"] || '',
      email: record.fields["Email"] || '',
      referralType: record.fields["referral_type"] || '',
      referralCode: record.fields["referral_code"] || '',
      createdAt: record.createdTime
    }));

    return { rsvps: rsvpData };
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    throw error;
  }
} 