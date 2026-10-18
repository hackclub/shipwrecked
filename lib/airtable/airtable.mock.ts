// MOCKS
//
interface AirtableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime: string;
}

// Generic function to fetch records from a table
export async function getRecords(
  tableName: string,
  options?: {
    filterByFormula?: string;
    sort?: { field: string; direction: 'asc' | 'desc' }[];
    maxRecords?: number;
  },
): Promise<AirtableRecord[]> {
  console.log('[MOCK_AIRTABLE] getRecords');
  return [];
}

// Function to get the count of records in a table
export async function getRecordCount(
  tableName: string,
  options?: {
    filterByFormula?: string;
  },
): Promise<number> {
  console.log('[MOCK_AIRTABLE] getRecordCount');
  return 0;
}

// Generic function to create a record
export async function createRecord(
  tableName: string,
  fields: Record<string, any>,
): Promise<AirtableRecord> {
  console.log('[MOCK_AIRTABLE] createRecord');
  return {
    id: 'sample',
    fields: { a: 'b' },
    createdTime: new Date().toString(),
  };
}

// Generic function to update a record
export async function updateRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, any>,
): Promise<AirtableRecord> {
  console.log('[MOCK_AIRTABLE] updateRecord');
  return {
    id: 'sample',
    fields: { a: 'b' },
    createdTime: new Date().toString(),
  };
}

// Generic function to delete a record
export async function deleteRecord(tableName: string, recordId: string): Promise<void> {
  console.log('[MOCK_AIRTABLE] deleteRecord');
  return;
}

// export default { getRecords, getRecordCount, createRecord, updateRecord, deleteRecord };
