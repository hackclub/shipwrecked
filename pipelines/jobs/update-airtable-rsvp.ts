#!/usr/bin/env tsx

import { PrismaClient, User, UserStatus, UserRole, Prisma } from '../../app/generated/prisma/client';
import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Debug environment variables (with masking for security)
console.log('Environment variables loaded:');
const maskString = (str: string | undefined): string => {
  if (!str) return 'undefined';
  if (str.length <= 8) return '***masked***';
  return `${str.substring(0, 4)}...${str.substring(str.length - 4)}`;
};

console.log(`AIRTABLE_API_KEY: ${maskString(process.env.AIRTABLE_API_KEY)}`);
console.log(`AIRTABLE_BASE_ID: ${maskString(process.env.AIRTABLE_BASE_ID)}`);
console.log(`AIRTABLE_RSVP_TABLE: ${process.env.AIRTABLE_RSVP_TABLE || 'RSVPs'}`);

// Fix duplicated table name
let tableName = process.env.AIRTABLE_RSVP_TABLE || 'RSVPs';

// Initialize Prisma client for PostgreSQL access
const prisma = new PrismaClient();

// Initialize Airtable
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_RSVP_TABLE = tableName;

if (!AIRTABLE_API_KEY || !AIRTABLE_BASE_ID) {
  console.error('ERROR: AIRTABLE_API_KEY and AIRTABLE_BASE_ID must be set');
  process.exit(1);
}

console.log(`Connecting to Airtable base: ${maskString(AIRTABLE_BASE_ID)}`);
console.log(`Using Airtable table: ${AIRTABLE_RSVP_TABLE}`);

Airtable.configure({ apiKey: AIRTABLE_API_KEY });
const base = Airtable.base(AIRTABLE_BASE_ID);
const rsvpTable = base(AIRTABLE_RSVP_TABLE);

// Define field types for each column we want to create/validate
interface FieldDefinition {
  name: string;
  type: string;
  options?: any;
}

// Map of fields to fetch and update with their types for creation
const FIELD_DEFINITIONS: FieldDefinition[] = [
  { name: 'Email', type: 'singleLineText' }, // Used for matching records
  { name: 'createdAt', type: 'dateTime' },
  { name: 'ageEligibleAt', type: 'checkbox' },
  { name: 'hasHackatimeAt', type: 'dateTime' },
  { name: 'loggedFirstHour', type: 'checkbox' },
  { name: 'loggedTenHours', type: 'checkbox' },
  { name: 'submittedFirstProject', type: 'checkbox' }, 
  { name: 'firstProjectApproved', type: 'checkbox' },
  { name: 'loggedFirstHourOnSecondProject', type: 'checkbox' },
  { name: 'submittedSecondProject', type: 'checkbox' },
  { name: 'secondProjectApproved', type: 'checkbox' },
  { name: 'loggedFirstHourOnThirdProject', type: 'checkbox' },
  { name: 'submittedThirdProject', type: 'checkbox' },
  { name: 'thirdProjectApproved', type: 'checkbox' },
  { name: 'loggedFirstHourOnFourthProject', type: 'checkbox' },
  { name: 'submittedFourthProject', type: 'checkbox' },
  { name: 'fourthProjectApproved', type: 'checkbox' },
  { name: 'userExistsInBay', type: 'checkbox' }
];

// Map for our local field names to Airtable field names
const FIELD_MAPPING: Record<string, string> = {
  email: 'Email', // Used for matching records
  createdAt: 'createdAt',
  ageEligibleAt: 'ageEligibleAt',
  hasHackatimeAt: 'hasHackatimeAt',
  loggedFirstHour: 'loggedFirstHour',
  loggedTenHours: 'loggedTenHours',
  submittedFirstProject: 'submittedFirstProject', 
  firstProjectApproved: 'firstProjectApproved',
  loggedFirstHourOnSecondProject: 'loggedFirstHourOnSecondProject',
  submittedSecondProject: 'submittedSecondProject',
  secondProjectApproved: 'secondProjectApproved',
  loggedFirstHourOnThirdProject: 'loggedFirstHourOnThirdProject',
  submittedThirdProject: 'submittedThirdProject',
  thirdProjectApproved: 'thirdProjectApproved',
  loggedFirstHourOnFourthProject: 'loggedFirstHourOnFourthProject',
  submittedFourthProject: 'submittedFourthProject',
  fourthProjectApproved: 'fourthProjectApproved',
  userExistsInBay: 'userExistsInBay'
};

// Interface for our metrics data
interface UserMetrics {
  email: string;
  createdAt: Date;
  ageEligibleAt: boolean | null;
  hasHackatimeAt: Date | null;
  loggedFirstHour: boolean;
  loggedTenHours: boolean;
  submittedFirstProject: boolean;
  firstProjectApproved: boolean;
  loggedFirstHourOnSecondProject: boolean;
  submittedSecondProject: boolean;
  secondProjectApproved: boolean;
  loggedFirstHourOnThirdProject: boolean;
  submittedThirdProject: boolean;
  thirdProjectApproved: boolean;
  loggedFirstHourOnFourthProject: boolean;
  submittedFourthProject: boolean;
  fourthProjectApproved: boolean;
  userExistsInBay: boolean;
}

// Type for Airtable record
interface AirtableRecord {
  id: string;
  fields: {
    [key: string]: any;
    Email?: string;
  };
}

// Interface for Airtable update
interface AirtableUpdate {
  id: string;
  fields: {
    [key: string]: any;
  }
}

// Type for project with the fields we need
type ProjectInfo = {
  projectID: string;
  name: string;
  shipped: boolean;
  in_review: boolean;
  rawHours: number;
}

// Type for user with projects
type UserWithProjects = User & {
  projects: ProjectInfo[];
}

// Function to validate and create Airtable fields if needed
async function validateAndCreateAirtableFields(): Promise<boolean> {
  console.log('Validating Airtable table structure...');
  try {
    // 1. Check if we can access the table
    const metaRecords = await rsvpTable.select({ maxRecords: 1 }).firstPage();
    console.log(`Table exists and is accessible. Found ${metaRecords.length} records.`);

    // Get available field names from the first record
    const availableFields = new Set<string>();
    
    if (metaRecords && metaRecords.length > 0) {
      Object.keys(metaRecords[0].fields).forEach(field => availableFields.add(field));
      console.log(`Available Airtable fields: ${Array.from(availableFields).join(', ')}`);
    }
    
    // Check which fields are missing
    const missingFields = FIELD_DEFINITIONS.filter(field => !availableFields.has(field.name));
    
    if (missingFields.length > 0) {
      console.log(`Found ${missingFields.length} fields that need to be created:`);
      missingFields.forEach(field => {
        console.log(`  - ${field.name} (${field.type})`);
      });
      
      // Get Airtable table ID (needed for API calls)
      console.log('Getting Airtable table ID...');
      const baseId = AIRTABLE_BASE_ID as string;
      const tableId = await getAirtableTableId(baseId, AIRTABLE_RSVP_TABLE);
      
      if (!tableId) {
        console.error('Could not get table ID. Unable to create fields.');
        return false;
      }
      
      console.log(`Creating fields in table ${AIRTABLE_RSVP_TABLE} (ID: ${tableId})...`);
      
      // Create fields one by one
      const createdFields = [];
      const failedFields = [];
      
      for (const field of missingFields) {
        try {
          const fieldId = await createAirtableField(baseId, tableId, field);
          if (fieldId) {
            createdFields.push({ ...field, id: fieldId });
          } else {
            failedFields.push(field);
          }
        } catch (error) {
          console.error(`Error creating field ${field.name}:`, error);
          failedFields.push(field);
        }
      }
      
      // Show results
      if (createdFields.length > 0) {
        console.log(`Successfully created ${createdFields.length} fields:`);
        createdFields.forEach(field => {
          console.log(`  ✓ ${field.name} (${field.type}) - ID: ${field.id}`);
        });
        
        // Add a longer delay to allow Airtable to propagate the changes
        console.log('Waiting 3 seconds for Airtable to process changes...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (failedFields.length > 0) {
        console.warn(`Failed to create ${failedFields.length} fields:`);
        failedFields.forEach(field => {
          console.warn(`  ✗ ${field.name} (${field.type})`);
        });
        console.warn('Some fields could not be created. The script will continue, but some data updates may fail.');
      }
      
      // Verify field creation by loading records again
      console.log('Verifying field creation...');
      const verifyRecords = await rsvpTable.select({ maxRecords: 1 }).firstPage();
      const verifiedFields = new Set<string>();
      
      if (verifyRecords && verifyRecords.length > 0) {
        Object.keys(verifyRecords[0].fields).forEach(field => verifiedFields.add(field));
      }
      
      const stillMissingFields = missingFields.filter(field => !verifiedFields.has(field.name));
      
      if (stillMissingFields.length > 0) {
        console.warn(`After verification, ${stillMissingFields.length} fields are still missing:`);
        stillMissingFields.forEach(field => {
          console.warn(`  - ${field.name} (${field.type})`);
        });
      } else if (createdFields.length > 0) {
        console.log('Verification successful. All fields have been created.');
      }
    } else {
      console.log('All required fields already exist in the Airtable table.');
    }
    
    return true;
  } catch (error) {
    console.error('Error validating/creating Airtable fields:', error);
    return false;
  }
}

// Get the Airtable table ID from the base
async function getAirtableTableId(baseId: string, tableName: string): Promise<string | null> {
  try {
    console.log(`Fetching tables for base ${baseId}...`);
    
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Failed to fetch tables:', errorData);
      return null;
    }
    
    const tablesData = await response.json();
    const table = tablesData.tables.find((t: any) => t.name === tableName);
    
    if (!table) {
      console.error(`Table ${tableName} not found in base ${baseId}`);
      return null;
    }
    
    return table.id;
  } catch (error) {
    console.error('Error getting table ID:', error);
    return null;
  }
}

// Create a field in Airtable
async function createAirtableField(
  baseId: string,
  tableId: string,
  field: FieldDefinition
): Promise<string | null> {
  try {
    console.log(`Creating field ${field.name} (${field.type})...`);
    
    // Create options object based on field type
    let options = {};
    
    switch (field.type) {
      case 'dateTime':
        options = {
          dateFormat: {
            name: 'iso'
          },
          timeFormat: {
            name: '24hour'
          },
          timeZone: 'client' // Valid values are 'client', 'utc', or specific timezone names
        };
        break;
      case 'checkbox':
        options = {
          icon: 'check',
          color: 'greenBright'
        };
        break;
      case 'singleLineText':
        options = {};
        break;
      default:
        options = {};
    }
    
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        description: `Field created by Shipwrecked sync script on ${new Date().toISOString()}`,
        name: field.name,
        type: field.type,
        options
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to create field ${field.name}:`, errorData);
      return null;
    }
    
    const result = await response.json();
    console.log(`Successfully created field ${field.name} with ID ${result.id}`);
    
    // Add a small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 300));
    
    return result.id;
  } catch (error) {
    console.error(`Error creating field ${field.name}:`, error);
    return null;
  }
}

// Main function
async function updateAirtableRSVPs(): Promise<void> {
  console.log(`[${new Date().toISOString()}] Starting Airtable RSVP update...`);
  
  try {
    // Validate Airtable table structure and create missing fields
    const isTableAccessible = await validateAndCreateAirtableFields();
    if (!isTableAccessible) {
      console.error('Terminating script due to inability to access Airtable table.');
      return;
    }
    
    // Step 1: Load existing RSVP records from Airtable (will paginate if needed)
    console.log(`Fetching existing RSVP records from Airtable...`);
    const airtableRecords = await fetchAllAirtableRecords();
    console.log(`Found ${airtableRecords.length} RSVP records in Airtable.`);
    
    // Step 2: Create a map of emails to Airtable record IDs for easier lookup
    const emailToRecordMap = new Map<string, string>();
    
    // Also collect all available field names from the records
    const availableAirtableFields = new Set<string>();
    
    airtableRecords.forEach(record => {
      const email = record.fields.Email?.toLowerCase();
      if (email) {
        emailToRecordMap.set(email, record.id);
      }
      
      // Collect all field names
      Object.keys(record.fields).forEach(field => availableAirtableFields.add(field));
    });
    
    console.log(`Created lookup map for ${emailToRecordMap.size} valid email addresses.`);
    console.log(`Available Airtable fields: ${Array.from(availableAirtableFields).join(', ')}`);
    
    // If we've created fields, we need to fetch the records again to get the updated field list
    if (availableAirtableFields.size < FIELD_DEFINITIONS.length + 1) { // +1 for Email
      console.log('Fetching records again to check for newly created fields...');
      
      try {
        // Temporarily force a refresh of the base connection
        Airtable.configure({ apiKey: AIRTABLE_API_KEY });
        const refreshBase = Airtable.base(AIRTABLE_BASE_ID as string);
        const refreshTable = refreshBase(AIRTABLE_RSVP_TABLE);
        
        // Fetch a single record to check available fields
        const refreshRecords = await refreshTable.select({ maxRecords: 1 }).firstPage();
        if (refreshRecords && refreshRecords.length > 0) {
          // Clear and refill the set
          availableAirtableFields.clear();
          Object.keys(refreshRecords[0].fields).forEach(field => availableAirtableFields.add(field));
          console.log(`Updated available Airtable fields: ${Array.from(availableAirtableFields).join(', ')}`);
        }
        
        // If we still don't have all fields, force-add the fields we just created
        // This is a fallback since Airtable may have API caching that doesn't immediately show new fields
        if (availableAirtableFields.size < FIELD_DEFINITIONS.length + 1) {
          console.log('Adding newly created fields to available fields list...');
          FIELD_DEFINITIONS.forEach(field => {
            availableAirtableFields.add(field.name);
          });
          console.log(`Forced available fields: ${Array.from(availableAirtableFields).join(', ')}`);
        }
      } catch (error) {
        console.error('Error refreshing field list:', error);
      }
    }
    
    // Step 3: Find user data from PostgreSQL
    // We don't want to load all users - just those that match emails in Airtable
    const emails = Array.from(emailToRecordMap.keys());
    if (emails.length === 0) {
      console.log('No valid emails found in Airtable RSVP records. Nothing to update.');
      return;
    }

    // Step 4: Get users from PostgreSQL that match the Airtable emails
    console.log(`Querying PostgreSQL for users with matching emails...`);
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: emails,
          mode: 'insensitive' // Case-insensitive matching
        }
      },
      include: {
        projects: true // Include all project fields
      }
    }) as UserWithProjects[];
    console.log(`Found ${users.length} matching users in PostgreSQL.`);
    
    // Create a set of Bay user emails for faster lookups
    const bayUserEmails = new Set(users.map(user => user.email.toLowerCase()));
    
    // For debugging: check if userData contains the values we expect
    for (const user of users) {
      const email = user.email.toLowerCase();
      console.log(`\nDebug userData for ${email}:`);
      const userData = calculateUserMetrics(user);
      
      console.log(`- createdAt: ${userData.createdAt ? userData.createdAt.toISOString() : 'null'}`);
      console.log(`- ageEligibleAt: ${userData.ageEligibleAt}`);
      console.log(`- hasHackatimeAt: ${userData.hasHackatimeAt ? userData.hasHackatimeAt.toISOString() : 'null'}`);
      console.log(`- loggedFirstHour: ${userData.loggedFirstHour}`);
      console.log(`- loggedTenHours: ${userData.loggedTenHours}`);
      console.log(`- submittedFirstProject: ${userData.submittedFirstProject}`);
      console.log(`- firstProjectApproved: ${userData.firstProjectApproved}`);
      console.log(`- loggedFirstHourOnSecondProject: ${userData.loggedFirstHourOnSecondProject}`);
      console.log(`- submittedSecondProject: ${userData.submittedSecondProject}`);
      console.log(`- secondProjectApproved: ${userData.secondProjectApproved}`);
      console.log(`- loggedFirstHourOnThirdProject: ${userData.loggedFirstHourOnThirdProject}`);
      console.log(`- submittedThirdProject: ${userData.submittedThirdProject}`);
      console.log(`- thirdProjectApproved: ${userData.thirdProjectApproved}`);
      console.log(`- loggedFirstHourOnFourthProject: ${userData.loggedFirstHourOnFourthProject}`);
      console.log(`- submittedFourthProject: ${userData.submittedFourthProject}`);
      console.log(`- fourthProjectApproved: ${userData.fourthProjectApproved}`);
      console.log(`- userExistsInBay: ${userData.userExistsInBay}`);
    }
    
    // Step 5: Prepare to update all Airtable records
    // We'll update records with Bay user data if they exist, 
    // or explicitly set userExistsInBay=false if they don't have a Bay user
    const updates: AirtableUpdate[] = [];
    
    // For records with matching Bay users
    for (const user of users) {
      try {
        const email = user.email.toLowerCase();
        const recordId = emailToRecordMap.get(email);
        
        if (!recordId) {
          console.log(`No Airtable record found for user ${email}`);
          continue;
        }

        // Calculate derived fields
        const userData = calculateUserMetrics(user);
        
        // Prepare update object for Airtable
        const fieldsToUpdate: { [key: string]: any } = {};
        console.log(`\nPreparing fields for ${email}:`);
        
        for (const [pgField, atField] of Object.entries(FIELD_MAPPING)) {
          if (pgField === 'email') continue; // Skip email since we use it for matching
          
          // Debug info
          console.log(`  - Field ${pgField} -> ${atField}: ${typeof userData[pgField as keyof UserMetrics]} value=${userData[pgField as keyof UserMetrics]}, available=${availableAirtableFields.has(atField)}`);
          
          // Only include fields that exist in Airtable
          if (!availableAirtableFields.has(atField)) {
            console.log(`    (Skipping ${atField} - not available in Airtable)`);
            continue;
          }
          
          if (userData[pgField as keyof UserMetrics] !== undefined) {
            // Airtable requires Date objects to be in ISO format strings
            if (userData[pgField as keyof UserMetrics] instanceof Date) {
              fieldsToUpdate[atField] = (userData[pgField as keyof UserMetrics] as Date).toISOString();
              console.log(`    Added ${atField} = ${fieldsToUpdate[atField]} (date)`);
            } else {
              fieldsToUpdate[atField] = userData[pgField as keyof UserMetrics];
              console.log(`    Added ${atField} = ${fieldsToUpdate[atField]}`);
            }
          }
        }
        
        // Only add to updates if there are fields to update
        if (Object.keys(fieldsToUpdate).length > 0) {
          updates.push({
            id: recordId,
            fields: fieldsToUpdate
          });
          
          console.log(`Prepared update for ${email} with fields: ${Object.keys(fieldsToUpdate).join(', ')}`);
        } else {
          console.log(`No updatable fields found for ${email}. Skipping.`);
        }
      } catch (err) {
        console.error(`Error processing user ${user.email}:`, err);
      }
    }
    
    // Find Airtable records with no matching Bay user
    // We need to set userExistsInBay=false for these
    console.log('\nFinding RSVP records with no matching Bay user...');
    const unmatchedRecords = airtableRecords.filter(record => {
      const email = record.fields.Email?.toLowerCase();
      return email && !bayUserEmails.has(email);
    });
    
    console.log(`Found ${unmatchedRecords.length} RSVP records with no matching Bay user.`);
    
    // Add updates for unmatched records
    for (const record of unmatchedRecords) {
      updates.push({
        id: record.id,
        fields: {
          'userExistsInBay': false
        }
      });
    }

    // Step 6: Batch update Airtable (max 10 records per update)
    if (updates.length > 0) {
      console.log(`Updating ${updates.length} records in Airtable...`);
      
      for (let i = 0; i < updates.length; i += 10) {
        const batch = updates.slice(i, i + 10);
        await rsvpTable.update(batch);
        console.log(`Updated batch ${i/10 + 1}/${Math.ceil(updates.length/10)}`);
        
        // Add a small delay to avoid hitting rate limits
        if (i + 10 < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Successfully updated ${updates.length} records in Airtable.`);
    } else {
      console.log('No records to update in Airtable.');
    }
    
    // Step 7: Find Bay Area users who are not in the RSVP list
    console.log('\nChecking for Bay Area users who are not in the RSVP list...');
    
    // Query for all users since there's no specific Bay Area field in the schema
    // We'll get all users and print them - the Bay Area filtering would need to be 
    // implemented based on other data sources if available
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
      },
      where: {
        // No specific Bay Area filter in the schema
        // This is just getting all users for demonstration
        NOT: {
          email: {
            in: Array.from(emailToRecordMap.keys())
          }
        }
      }
    });
    
    console.log(`\nFound ${allUsers.length} users not in the RSVP list:`);
    allUsers.forEach(user => {
      console.log(user.email);
    });
    
    // Step 8: Add missing users to the Airtable RSVP table
    if (allUsers.length > 0) {
      console.log(`\nAdding ${allUsers.length} missing users to the Airtable RSVP table...`);
      
      // Get full user data including projects for each missing user
      const missingUsersWithData = await Promise.all(
        allUsers.map(async (user) => {
          return await prisma.user.findUnique({
            where: { email: user.email },
            include: { projects: true }
          }) as UserWithProjects;
        })
      );
      
      // Filter out any nulls in case some users weren't found
      const validMissingUsers = missingUsersWithData.filter(user => user !== null);
      
      // Create new records for Airtable
      const newRecords = validMissingUsers.map(user => {
        // Calculate user metrics
        const metrics = calculateUserMetrics(user);
        
        // Create record fields
        const fields: { [key: string]: any } = {
          // Required Airtable fields
          'Email': user.email,
          // Optional user fields if available
          'First Name': user.name?.split(' ')[0] || '',
          'Last Name': user.name?.split(' ').slice(1).join(' ') || '',
          // These users exist in the Bay database
          'userExistsInBay': true
        };
        
        // Add all metric fields
        for (const [pgField, atField] of Object.entries(FIELD_MAPPING)) {
          if (pgField === 'email') continue; // Skip email since we already set it
          
          // Only include fields that exist in Airtable and have values
          if (metrics[pgField as keyof UserMetrics] !== undefined) {
            // Format dates as ISO strings
            if (metrics[pgField as keyof UserMetrics] instanceof Date) {
              fields[atField] = (metrics[pgField as keyof UserMetrics] as Date).toISOString();
            } else {
              fields[atField] = metrics[pgField as keyof UserMetrics];
            }
          }
        }
        
        return { fields };
      });
      
      // Add new records to Airtable in batches
      if (newRecords.length > 0) {
        console.log(`Preparing to add ${newRecords.length} new records to Airtable...`);
        
        for (let i = 0; i < newRecords.length; i += 10) {
          const batch = newRecords.slice(i, i + 10);
          try {
            await rsvpTable.create(batch);
            console.log(`Added batch ${Math.floor(i/10) + 1}/${Math.ceil(newRecords.length/10)}`);
            
            // Add a small delay to avoid hitting rate limits
            if (i + 10 < newRecords.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          } catch (error) {
            console.error(`Error adding batch ${Math.floor(i/10) + 1}:`, error);
          }
        }
        
        console.log(`Successfully added ${newRecords.length} new records to Airtable.`);
      } else {
        console.log('No valid records to add to Airtable.');
      }
    }
    
  } catch (error) {
    console.error('Error updating Airtable RSVP records:', error);
  } finally {
    await prisma.$disconnect();
    console.log(`[${new Date().toISOString()}] Airtable RSVP update completed.`);
  }
}

// Fetch all records from Airtable (handling pagination)
async function fetchAllAirtableRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  
  await rsvpTable.select({
    // Don't limit the fields - we need all fields for proper validation
    // and for accessing all data in the records
  }).eachPage((pageRecords, fetchNextPage) => {
    records.push(...pageRecords);
    fetchNextPage();
  });
  
  return records;
}

// Calculate user metrics based on their data and projects
function calculateUserMetrics(user: UserWithProjects): UserMetrics {
  const metrics: UserMetrics = {
    email: user.email,
    createdAt: user.createdAt,
    ageEligibleAt: null,
    hasHackatimeAt: user.hackatimeId ? user.createdAt : null, // Approximation - using createdAt if they have hackatime
    loggedFirstHour: false,
    loggedTenHours: false,
    submittedFirstProject: false,
    firstProjectApproved: false,
    loggedFirstHourOnSecondProject: false,
    submittedSecondProject: false,
    secondProjectApproved: false,
    loggedFirstHourOnThirdProject: false,
    submittedThirdProject: false,
    thirdProjectApproved: false,
    loggedFirstHourOnFourthProject: false,
    submittedFourthProject: false,
    fourthProjectApproved: false,
    userExistsInBay: true // All users in the database exist in Bay
  };
  
  // Sort projects by project ID as a proxy for creation order
  // This assumes project IDs are chronological or have some ordering pattern
  const sortedProjects = [...user.projects].sort((a, b) => 
    a.projectID.localeCompare(b.projectID)
  );
  
  // Calculate ageEligibleAt based on user's status
  if (user.status === 'L1' || user.status === 'L2') {
    metrics.ageEligibleAt = true;
  } else {
    metrics.ageEligibleAt = false;
  }
  
  // If there are projects
  if (sortedProjects.length > 0) {
    // Check for first project with more than 1 hour
    const firstProjectWithHours = sortedProjects.find(p => p.rawHours >= 1);
    if (firstProjectWithHours) {
      metrics.loggedFirstHour = true;
    }
    
    // Check for any project with more than 10 hours
    if (sortedProjects.some(p => p.rawHours >= 10)) {
      metrics.loggedTenHours = true;
    }
    
    // First project metrics
    if (sortedProjects.length >= 1) {
      const firstProject = sortedProjects[0];
      
      // Submitted first project
      if (firstProject.in_review) {
        metrics.submittedFirstProject = true;
      }
      
      // First project approved
      if (firstProject.shipped) {
        metrics.firstProjectApproved = true;
      }
    }
    
    // Second project metrics
    if (sortedProjects.length >= 2) {
      const secondProject = sortedProjects[1];
      
      // Logged first hour on second project
      if (secondProject.rawHours >= 1) {
        metrics.loggedFirstHourOnSecondProject = true;
      }
      
      // Submitted second project
      if (secondProject.in_review) {
        metrics.submittedSecondProject = true;
      }
      
      // Second project approved
      if (secondProject.shipped) {
        metrics.secondProjectApproved = true;
      }
    }
    
    // Third project metrics
    if (sortedProjects.length >= 3) {
      const thirdProject = sortedProjects[2];
      
      // Logged first hour on third project
      if (thirdProject.rawHours >= 1) {
        metrics.loggedFirstHourOnThirdProject = true;
      }
      
      // Submitted third project
      if (thirdProject.in_review) {
        metrics.submittedThirdProject = true;
      }
      
      // Third project approved
      if (thirdProject.shipped) {
        metrics.thirdProjectApproved = true;
      }
    }
    
    // Fourth project metrics
    if (sortedProjects.length >= 4) {
      const fourthProject = sortedProjects[3];
      
      // Logged first hour on fourth project
      if (fourthProject.rawHours >= 1) {
        metrics.loggedFirstHourOnFourthProject = true;
      }
      
      // Submitted fourth project
      if (fourthProject.in_review) {
        metrics.submittedFourthProject = true;
      }
      
      // Fourth project approved
      if (fourthProject.shipped) {
        metrics.fourthProjectApproved = true;
      }
    }
  }
  
  return metrics;
}

// Run the script
updateAirtableRSVPs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
}); 