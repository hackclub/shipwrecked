import Airtable from 'airtable';

// Initialize Airtable with your API key
const base = new Airtable({
  apiKey: process.env.AIRTABLE_API_KEY
}).base(process.env.AIRTABLE_BASE_ID || '');

// Type for Airtable record
export interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

// Generic function to fetch records from a table
export async function getRecords(tableName: string, options?: {
  filterByFormula?: string;
  sort?: { field: string; direction: 'asc' | 'desc' }[];
  maxRecords?: number;
  view?: string;
}): Promise<AirtableRecord[]> {
  try {
    console.log('\n🚨 I HIT AIRTABLE - getRecords 🚨\n');
    const records = await base(tableName)
      .select({
        filterByFormula: options?.filterByFormula,
        sort: options?.sort,
        maxRecords: options?.maxRecords,
        ...(options?.view && { view: options.view })
      })
      .all();
    
    return records.map(record => ({
      id: record.id,
      fields: record.fields,
      createdTime: record._rawJson.createdTime,
    }));
  } catch (error) {
    console.error(`Error fetching records from ${tableName}:`, error);
    throw error;
  }
}

// Function to get the count of records in a table
export async function getRecordCount(tableName: string, options?: {
  filterByFormula?: string;
}): Promise<number> {
  try {
    console.log('\n🚨 I HIT AIRTABLE - getRecordCount 🚨\n');
    const records = await base(tableName)
      .select({
        filterByFormula: options?.filterByFormula || "",
      })
      .all();
    
    return records.length;
  } catch (error) {
    console.error(`Error getting record count from ${tableName}:`, error);
    throw error;
  }
}

// Generic function to create a record
export async function createRecord(tableName: string, fields: Record<string, any>): Promise<AirtableRecord> {
  try {
    console.log('\n🚨 I HIT AIRTABLE - createRecord 🚨\n');
    const record = await base(tableName).create(fields);
    return {
      id: record.id,
      fields: record.fields,
      createdTime: record._rawJson.createdTime,
    };
  } catch (error) {
    console.error(`Error creating record in ${tableName}:`, error);
    throw error;
  }
}

// Generic function to update a record
export async function updateRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, any>
): Promise<AirtableRecord> {
  try {
    console.log('\n🚨 I HIT AIRTABLE - updateRecord 🚨\n');
    const record = await base(tableName).update(recordId, fields);
    return {
      id: record.id,
      fields: record.fields,
      createdTime: record._rawJson.createdTime,
    };
  } catch (error) {
    console.error(`Error updating record in ${tableName}:`, error);
    throw error;
  }
}

// Generic function to delete a record
export async function deleteRecord(tableName: string, recordId: string): Promise<void> {
  try {
    console.log('\n🚨 I HIT AIRTABLE - deleteRecord 🚨\n');
    await base(tableName).destroy(recordId);
  } catch (error) {
    console.error(`Error deleting record from ${tableName}:`, error);
    throw error;
  }
} 
