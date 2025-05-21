#!/usr/bin/env tsx

import { PrismaClient, User, UserStatus, UserRole, Prisma } from '../../../app/generated/prisma/client';
import Airtable from 'airtable';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config();

// Debug environment variables (with masking for security)
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
  { name: 'userExistsInBay', type: 'checkbox' },
  { 
    name: 'totalRawHackatimeHours', 
    type: 'number',
    options: {
      precision: 1 // 1 decimal place
    } 
  },
  { 
    name: 'totalApprovedHackatimeHours', 
    type: 'number',
    options: {
      precision: 1 // 1 decimal place
    }
  }
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
  userExistsInBay: 'userExistsInBay',
  totalRawHackatimeHours: 'totalRawHackatimeHours',
  totalApprovedHackatimeHours: 'totalApprovedHackatimeHours'
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
  totalRawHackatimeHours: number;
  totalApprovedHackatimeHours: number;
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
  hoursOverride?: number | null;
}

// Type for user with projects
type UserWithProjects = User & {
  projects: ProjectInfo[];
  ageEligibleAt?: boolean | null;
  hasHackatimeAt?: Date | null;
  loggedFirstHour?: boolean;
  loggedTenHours?: boolean;
  submittedFirstProject?: boolean;
  firstProjectApproved?: boolean;
  loggedFirstHourOnSecondProject?: boolean;
  submittedSecondProject?: boolean;
  secondProjectApproved?: boolean;
  loggedFirstHourOnThirdProject?: boolean;
  submittedThirdProject?: boolean;
  thirdProjectApproved?: boolean;
  loggedFirstHourOnFourthProject?: boolean;
  submittedFourthProject?: boolean;
  fourthProjectApproved?: boolean;
  userExistsInBay?: boolean;
  hackatimeId?: string | null;
}

// Improved field validation to handle duplicate fields
let failedFieldCreation = false;

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
    }
    
    // Check which fields are missing
    const missingFields = FIELD_DEFINITIONS.filter(field => !availableFields.has(field.name));
    
    if (missingFields.length > 0) {
      console.log(`Found ${missingFields.length} fields that need to be created`);
      
      // Get Airtable table structure to check for field names that might exist with different casing
      const baseId = AIRTABLE_BASE_ID as string;
      const tableId = await getAirtableTableId(baseId, AIRTABLE_RSVP_TABLE);
      
      if (!tableId) {
        console.error('Could not get table ID. Unable to create fields.');
        return false;
      }
      
      try {
        // Get existing fields to check for duplicates
        const fieldsResponse = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables/${tableId}/fields`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!fieldsResponse.ok) {
          console.error('Could not fetch existing fields. Will try to create fields anyway.');
        } else {
          const fieldsData = await fieldsResponse.json();
          const existingFieldNames = new Set(fieldsData.fields.map((f: any) => f.name.toLowerCase()));
          
          // Filter out fields that might exist with different casing
          missingFields.forEach(field => {
            if (existingFieldNames.has(field.name.toLowerCase())) {
              console.log(`Field "${field.name}" might exist with different casing. Skipping creation.`);
              availableFields.add(field.name); // Consider it available
            }
          });
        }
      } catch (error) {
        console.warn('Error checking for existing fields:', error);
      }
      
      // Create fields one by one (only those still considered missing)
      const createdFields = [];
      const failedFields = [];
      const stillMissingFields = FIELD_DEFINITIONS.filter(field => 
        !availableFields.has(field.name) && field.name !== 'Email' // Skip Email field which is always required
      );
      
      console.log(`Attempting to create ${stillMissingFields.length} fields...`);
      
      for (const field of stillMissingFields) {
        try {
          const fieldId = await createAirtableField(baseId, tableId, field);
          if (fieldId) {
            createdFields.push({ ...field, id: fieldId });
            availableFields.add(field.name); // Mark as available now
          } else {
            failedFields.push(field);
            // Still consider it available for our script
            availableFields.add(field.name);
          }
        } catch (error) {
          console.error(`Error creating field ${field.name}:`, error);
          failedFields.push(field);
          // Still consider it available for our script
          availableFields.add(field.name);
        }
      }
      
      // Show results
      if (createdFields.length > 0) {
        console.log(`Successfully created ${createdFields.length} fields`);
        
        // Add a longer delay to allow Airtable to propagate the changes
        console.log('Waiting 3 seconds for Airtable to process changes...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
      
      if (failedFields.length > 0) {
        console.warn(`Failed to create ${failedFields.length} fields`);
        console.warn('Some fields could not be created. The script will continue, but some data updates may fail.');
        failedFieldCreation = true;
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
    let options = field.options || {};
    
    // Default options if not provided
    switch (field.type) {
      case 'dateTime':
        options = {
          dateFormat: {
            name: 'iso'
          },
          timeFormat: {
            name: '24hour'
          },
          timeZone: 'client', // Valid values are 'client', 'utc', or specific timezone names
          ...options
        };
        break;
      case 'checkbox':
        options = {
          icon: 'check',
          color: 'greenBright',
          ...options
        };
        break;
      case 'number':
        // Ensure precision is set
        options = {
          precision: 1, // Default to 1 decimal place
          ...options
        };
        break;
      case 'singleLineText':
        options = {
          ...options
        };
        break;
      default:
        options = {
          ...options
        };
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
    console.log(`Successfully created field ${field.name}`);
    
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
    console.log(`\nFetching existing RSVP records from Airtable...`);
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
    
    // If we've created fields, ensure they're in our available fields
    FIELD_DEFINITIONS.forEach(field => {
      availableAirtableFields.add(field.name);
    });
    
    // Step 3: Get emails from Airtable
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
    
    // Step 5: Prepare to update all Airtable records
    const updates: AirtableUpdate[] = [];
    
    // Track metrics for logging
    let userStats = {
      totalUsers: users.length,
      hasHackatimeId: 0,
      loggedFirstHour: 0,
      loggedTenHours: 0,
      submittedFirstProject: 0,
      firstProjectApproved: 0,
      submittedSecondProject: 0,
      totalRawHours: 0,
      totalApprovedHours: 0
    };
    
    // For records with matching Bay users
    for (const user of users) {
      try {
        const email = user.email.toLowerCase();
        const recordId = emailToRecordMap.get(email);
        
        if (!recordId) {
          continue;
        }

        // Calculate derived fields
        const userData = calculateUserMetrics(user);
        
        // Track metrics for summary
        if (userData.hasHackatimeAt) userStats.hasHackatimeId++;
        if (userData.loggedFirstHour) userStats.loggedFirstHour++;
        if (userData.loggedTenHours) userStats.loggedTenHours++;
        if (userData.submittedFirstProject) userStats.submittedFirstProject++;
        if (userData.firstProjectApproved) userStats.firstProjectApproved++;
        if (userData.submittedSecondProject) userStats.submittedSecondProject++;
        userStats.totalRawHours += userData.totalRawHackatimeHours;
        userStats.totalApprovedHours += userData.totalApprovedHackatimeHours;
        
        // Prepare update object for Airtable
        const fieldsToUpdate: { [key: string]: any } = {};
        
        for (const [pgField, atField] of Object.entries(FIELD_MAPPING)) {
          if (pgField === 'email') continue; // Skip email since we use it for matching
          
          // Only include fields that exist in Airtable
          if (!availableAirtableFields.has(atField)) {
            continue;
          }
          
          if (userData[pgField as keyof UserMetrics] !== undefined) {
            // Airtable requires Date objects to be in ISO format strings
            if (userData[pgField as keyof UserMetrics] instanceof Date) {
              fieldsToUpdate[atField] = (userData[pgField as keyof UserMetrics] as Date).toISOString();
            } else {
              fieldsToUpdate[atField] = userData[pgField as keyof UserMetrics];
            }
          }
        }
        
        // Only add to updates if there are fields to update
        if (Object.keys(fieldsToUpdate).length > 0) {
          updates.push({
            id: recordId,
            fields: fieldsToUpdate
          });
        }
      } catch (err) {
        console.error(`Error processing user ${user.email}:`, err);
      }
    }
    
    // Log metrics summary
    console.log('\nUser metrics summary:');
    console.log(`- Total users: ${userStats.totalUsers}`);
    console.log(`- Users with Hackatime ID: ${userStats.hasHackatimeId} (${Math.round(userStats.hasHackatimeId/userStats.totalUsers*100)}%)`);
    console.log(`- Users with 1+ hours: ${userStats.loggedFirstHour} (${Math.round(userStats.loggedFirstHour/userStats.totalUsers*100)}%)`);
    console.log(`- Users with 10+ hours: ${userStats.loggedTenHours} (${Math.round(userStats.loggedTenHours/userStats.totalUsers*100)}%)`);
    console.log(`- Users with submitted first project: ${userStats.submittedFirstProject} (${Math.round(userStats.submittedFirstProject/userStats.totalUsers*100)}%)`);
    console.log(`- Users with approved first project: ${userStats.firstProjectApproved} (${Math.round(userStats.firstProjectApproved/userStats.totalUsers*100)}%)`);
    console.log(`- Users with submitted second project: ${userStats.submittedSecondProject} (${Math.round(userStats.submittedSecondProject/userStats.totalUsers*100)}%)`);
    console.log(`- Total raw Hackatime hours: ${Math.round(userStats.totalRawHours)} hours`);
    console.log(`- Total approved Hackatime hours: ${Math.round(userStats.totalApprovedHours)} hours`);
    console.log(`- Average raw hours per user: ${Math.round(userStats.totalRawHours/userStats.totalUsers * 10) / 10} hours`);
    
    // Find Airtable records with no matching Bay user
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
      console.log(`\nUpdating ${updates.length} records in Airtable...`);
      
      // Progress indicators
      let processed = 0;
      const totalBatches = Math.ceil(updates.length/10);
      
      // Airtable has a hard limit of 10 records per request
      const BATCH_SIZE = 10;
      for (let i = 0; i < updates.length; i += BATCH_SIZE) {
        const batch = updates.slice(i, i + BATCH_SIZE);
        const batchStart = Date.now();
        try {
          await rsvpTable.update(batch);
          processed += batch.length;
          const batchDuration = Date.now() - batchStart;
          
          // Log progress every 10th batch
          if (Math.floor(i/BATCH_SIZE) % 10 === 0 || i + BATCH_SIZE >= updates.length) {
            console.log(`Progress: ${processed}/${updates.length} records (${Math.round(processed/updates.length*100)}%) - Batch ${Math.floor(i/BATCH_SIZE) + 1}/${totalBatches} took ${batchDuration}ms`);
          }
        } catch (error) {
          console.error(`Error updating batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error);
        }
        
        // Add a small delay between batches
        if (i + BATCH_SIZE < updates.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      console.log(`Successfully updated ${processed} records in Airtable.`);
    } else {
      console.log('No records to update in Airtable.');
    }
    
    // Step 7: Find Bay users who are not in the RSVP list
    console.log('\nChecking for Bay users who are not in the RSVP list...');
    
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
      },
      where: {
        NOT: {
          email: {
            in: Array.from(emailToRecordMap.keys())
          }
        }
      }
    });
    
    console.log(`Found ${allUsers.length} users not in the RSVP list.`);
    
    // Step 8: Add missing users to the Airtable RSVP table
    if (allUsers.length > 0) {
      console.log(`Adding ${allUsers.length} missing users to the Airtable RSVP table...`);
      
      // Get full user data including projects - process in batches to avoid memory issues
      const BATCH_SIZE = 50;
      
      for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
        const userBatch = allUsers.slice(i, i + BATCH_SIZE);
        const emails = userBatch.map(u => u.email);
        
        const missingUserBatch = await prisma.user.findMany({
          where: { 
            email: { in: emails } 
          },
          include: { projects: true }
        }) as UserWithProjects[];
        
        // Create new records for Airtable batch
        const newRecords = missingUserBatch.map((user: UserWithProjects) => {
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
            
            // Only include fields that have values
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
        
        // Add new records to Airtable in internal batches
        if (newRecords.length > 0) {
          // Airtable has a hard limit of 10 records per request
          const AIRTABLE_BATCH_SIZE = 10;
          for (let j = 0; j < newRecords.length; j += AIRTABLE_BATCH_SIZE) {
            const recordBatch = newRecords.slice(j, j + AIRTABLE_BATCH_SIZE);
            try {
              const batchStart = Date.now();
              await rsvpTable.create(recordBatch);
              const batchDuration = Date.now() - batchStart;
              
              // Only log every 10 batches to reduce noise
              if (Math.floor(j/AIRTABLE_BATCH_SIZE) % 10 === 0 || j + AIRTABLE_BATCH_SIZE >= newRecords.length) {
                console.log(`User batch ${Math.floor(i/BATCH_SIZE) + 1}: Added ${j+recordBatch.length}/${newRecords.length} records in ${batchDuration}ms`);
              }
            } catch (error) {
              console.error(`Error adding batch of new users:`, error);
            }
            
            // Always add a small delay between batches to avoid rate limits
            if (j + AIRTABLE_BATCH_SIZE < newRecords.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }
          }
        }
      }
      
      console.log(`Completed adding new users to Airtable.`);
    }
    
    console.log(`[${new Date().toISOString()}] Airtable RSVP update complete.`);
  } catch (error) {
    console.error('Error updating Airtable RSVPs:', error);
  }
}

// Calculate user metrics
function calculateUserMetrics(user: UserWithProjects): UserMetrics {
  // Extract real metrics from projects
  const hasProjects = user.projects?.length > 0;
  const totalHours = hasProjects 
    ? user.projects.reduce((sum, project) => sum + (project.rawHours || 0), 0) 
    : 0;
  
  // Calculate approved hours using ONLY hoursOverride
  const approvedHours = hasProjects
    ? user.projects.reduce((sum, project) => {
        // Only count hoursOverride as approved hours
        if (project.hoursOverride !== undefined && project.hoursOverride !== null) {
          return sum + project.hoursOverride;
        }
        // No hoursOverride means no approved hours for this project
        return sum;
      }, 0)
    : 0;
  
  // Actually calculate metrics based on project data
  const loggedFirstHour = totalHours >= 1;
  const loggedTenHours = totalHours >= 10;
  
  // Count projects in various states
  let submittedProjects = 0;
  let approvedProjects = 0;
  
  if (hasProjects) {
    for (const project of user.projects) {
      if (project.in_review) submittedProjects++;
      if (project.shipped) approvedProjects++;
    }
  }
  
  // Set hasHackatimeAt based on whether user has a hackatimeId
  const hasHackatimeAt = user.hackatimeId ? user.createdAt : null;
  
  return {
    email: user.email,
    createdAt: user.createdAt,
    ageEligibleAt: user.ageEligibleAt ?? null,
    hasHackatimeAt: hasHackatimeAt,
    loggedFirstHour: loggedFirstHour,
    loggedTenHours: loggedTenHours,
    submittedFirstProject: submittedProjects >= 1,
    firstProjectApproved: approvedProjects >= 1,
    loggedFirstHourOnSecondProject: submittedProjects >= 2 && loggedFirstHour,
    submittedSecondProject: submittedProjects >= 2,
    secondProjectApproved: approvedProjects >= 2,
    loggedFirstHourOnThirdProject: submittedProjects >= 3 && loggedFirstHour,
    submittedThirdProject: submittedProjects >= 3,
    thirdProjectApproved: approvedProjects >= 3,
    loggedFirstHourOnFourthProject: submittedProjects >= 4 && loggedFirstHour,
    submittedFourthProject: submittedProjects >= 4,
    fourthProjectApproved: approvedProjects >= 4,
    userExistsInBay: true,
    totalRawHackatimeHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
    totalApprovedHackatimeHours: Math.round(approvedHours * 10) / 10 // Round to 1 decimal place
  };
}

// Fetch all Airtable records
async function fetchAllAirtableRecords(): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  
  try {
    await new Promise<void>((resolve, reject) => {
      rsvpTable.select({
        // Don't limit the fields - we need all fields for proper validation
      }).eachPage(
        function page(pageRecords, fetchNextPage) {
          records.push(...pageRecords);
          fetchNextPage();
        },
        function done(err) {
          if (err) {
            console.error('Error fetching records from Airtable:', err);
            reject(err);
          } else {
            resolve();
          }
        }
      );
    });
    
    return records;
  } catch (error) {
    console.error('Error fetching all Airtable records:', error);
    return [];
  }
}

// Entry point
if (require.main === module) {
  updateAirtableRSVPs();
}
