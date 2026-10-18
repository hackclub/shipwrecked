// const isMock = process.env.NODE_ENV === 'development';
const isMock = process.env.MOCK_API === 'true';

const { getRecordCount, getRecords, createRecord, updateRecord, deleteRecord } = isMock
  ? require('./airtable.mock')
  : require('./airtable');

// Re-export individual functions for direct import
export { getRecordCount, getRecords, createRecord, updateRecord, deleteRecord };

export type { AirtableRecord } from './airtable';
