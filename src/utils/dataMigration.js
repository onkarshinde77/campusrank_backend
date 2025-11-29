// server/src/utils/dataMigration.js
import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';

// Export data to CSV
export const exportToCSV = async (collection, filename) => {
  try {
    let data;
    let headers = [];

    switch (collection) {
      case 'users':
        data = await User.find({});
        headers = ['_id', 'name', 'email', 'department', 'year', 'college', 'leetcodeStats', 'githubStats', 'gfgStats'];
        break;
      case 'admins':
        data = await Admin.find({});
        headers = ['_id', 'email', 'collegeName', 'createdBy', 'isBlocked'];
        break;
      case 'superadmins':
        data = await SuperAdmin.find({});
        headers = ['_id', 'email', 'name', 'roleWeights'];
        break;
      default:
        throw new Error('Unknown collection');
    }

    const csv = convertToCSV(data, headers);
    
    // Create exports directory
    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filepath = path.join(exportDir, filename || `${collection}-${Date.now()}.csv`);
    fs.writeFileSync(filepath, csv);

    console.log(`✓ Exported ${data.length} records to ${filepath}`);
    return { success: true, path: filepath, count: data.length };
  } catch (error) {
    console.error('CSV export error:', error);
    throw error;
  }
};

// Convert data to CSV format
const convertToCSV = (data, headers) => {
  const csv = [headers.join(',')];

  data.forEach(record => {
    const row = headers.map(header => {
      const value = record[header];
      if (typeof value === 'object') {
        return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
      }
      return `"${String(value || '').replace(/"/g, '""')}"`;
    });
    csv.push(row.join(','));
  });

  return csv.join('\n');
};

// Import data from CSV
export const importFromCSV = async (filepath, collection) => {
  try {
    const data = fs.readFileSync(filepath, 'utf8');
    const lines = data.split('\n');
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const records = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = parseCSVLine(lines[i]);
      const record = {};

      headers.forEach((header, index) => {
        record[header] = values[index];
      });

      records.push(record);
    }

    // Insert into database
    let inserted = 0;
    const Model = getModel(collection);

    for (const record of records) {
      try {
        await Model.create(record);
        inserted++;
      } catch (error) {
        console.warn(`Skipped record due to error:`, error.message);
      }
    }

    console.log(`✓ Imported ${inserted}/${records.length} records`);
    return { success: true, inserted, skipped: records.length - inserted };
  } catch (error) {
    console.error('CSV import error:', error);
    throw error;
  }
};

// Parse CSV line handling quotes
const parseCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"' && (i === 0 || line[i - 1] !== '\\')) {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.replace(/^"|"$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.replace(/^"|"$/g, ''));
  return result;
};

// Export data to JSON
export const exportToJSON = async (collection, filename) => {
  try {
    let data;

    switch (collection) {
      case 'users':
        data = await User.find({});
        break;
      case 'admins':
        data = await Admin.find({});
        break;
      case 'superadmins':
        data = await SuperAdmin.find({});
        break;
      default:
        throw new Error('Unknown collection');
    }

    const exportDir = path.join(process.cwd(), 'exports');
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    const filepath = path.join(exportDir, filename || `${collection}-${Date.now()}.json`);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));

    console.log(`✓ Exported ${data.length} records to ${filepath}`);
    return { success: true, path: filepath, count: data.length };
  } catch (error) {
    console.error('JSON export error:', error);
    throw error;
  }
};

// Import data from JSON
export const importFromJSON = async (filepath, collection) => {
  try {
    const data = JSON.parse(fs.readFileSync(filepath, 'utf8'));
    const Model = getModel(collection);

    let inserted = 0;
    const records = Array.isArray(data) ? data : [data];

    for (const record of records) {
      try {
        await Model.create(record);
        inserted++;
      } catch (error) {
        console.warn(`Skipped record due to error:`, error.message);
      }
    }

    console.log(`✓ Imported ${inserted}/${records.length} records`);
    return { success: true, inserted, skipped: records.length - inserted };
  } catch (error) {
    console.error('JSON import error:', error);
    throw error;
  }
};

// Get model based on collection name
const getModel = (collection) => {
  switch (collection) {
    case 'users':
      return User;
    case 'admins':
      return Admin;
    case 'superadmins':
      return SuperAdmin;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
};

// Merge data from old database
export const migrateData = async (sourceData, collection) => {
  try {
    const Model = getModel(collection);
    let inserted = 0;
    let skipped = 0;

    for (const record of sourceData) {
      try {
        // Check if record already exists
        const existing = await Model.findOne({ email: record.email });
        if (!existing) {
          await Model.create(record);
          inserted++;
        } else {
          skipped++;
        }
      } catch (error) {
        console.warn(`Skipped record:`, error.message);
        skipped++;
      }
    }

    console.log(`✓ Migration complete: ${inserted} inserted, ${skipped} skipped`);
    return { success: true, inserted, skipped };
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
};

// Validate data before migration
export const validateMigrationData = (data, collection) => {
  const errors = [];

  const requiredFields = {
    users: ['name', 'email', 'department', 'year'],
    admins: ['email', 'collegeName'],
    superadmins: ['email', 'name']
  };

  const fields = requiredFields[collection] || [];

  data.forEach((record, index) => {
    fields.forEach(field => {
      if (!record[field]) {
        errors.push(`Row ${index + 1}: Missing required field '${field}'`);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    count: data.length
  };
};

export default {
  exportToCSV,
  importFromCSV,
  exportToJSON,
  importFromJSON,
  migrateData,
  validateMigrationData
};
