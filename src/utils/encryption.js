// server/src/utils/encryption.js
import crypto from 'crypto';

const algorithm = 'aes-256-cbc';

// Encryption key from environment or generate one
const getEncryptionKey = () => {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    console.warn('⚠️  ENCRYPTION_KEY not set - using insecure fallback');
    return crypto.createHash('sha256').update('default-key').digest();
  }
  return crypto.createHash('sha256').update(key).digest();
};

// Encrypt sensitive data
export const encryptData = (data) => {
  try {
    if (!data) return null;

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);

    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Return iv + encrypted data
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Error encrypting data:', error);
    throw error;
  }
};

// Decrypt sensitive data
export const decryptData = (encryptedData) => {
  try {
    if (!encryptedData) return null;

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];

    const decipher = crypto.createDecipheriv(algorithm, getEncryptionKey(), iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Error decrypting data:', error);
    throw error;
  }
};

// Encrypt username fields
export const encryptUsername = (username) => {
  if (!username) return null;
  return encryptData({ username }).substring(0, 50); // Store short hash
};

// Decrypt username fields
export const decryptUsername = (encrypted) => {
  if (!encrypted) return null;
  try {
    return decryptData(encrypted).username;
  } catch {
    return encrypted; // Return as-is if decryption fails
  }
};

// Encryption middleware for sensitive fields
export const sensitiveFieldsPlugin = (schema, fieldsToEncrypt = []) => {
  // Encrypt before save
  schema.pre('save', function(next) {
    fieldsToEncrypt.forEach(field => {
      if (this[field] && !this[field].includes(':')) {
        // Only encrypt if not already encrypted
        this[field] = encryptData(this[field]);
      }
    });
    next();
  });

  // Decrypt after retrieval
  schema.post('find', function(docs) {
    if (!Array.isArray(docs)) return;
    docs.forEach(doc => {
      fieldsToEncrypt.forEach(field => {
        if (doc[field]) {
          try {
            doc[field] = decryptData(doc[field]);
          } catch {
            // Keep original if decryption fails
          }
        }
      });
    });
  });

  schema.post('findOne', function(doc) {
    if (!doc) return;
    fieldsToEncrypt.forEach(field => {
      if (doc[field]) {
        try {
          doc[field] = decryptData(doc[field]);
        } catch {
          // Keep original if decryption fails
        }
      }
    });
  });
};

// Generate encryption key
export const generateEncryptionKey = () => {
  return crypto.randomBytes(32).toString('hex');
};

export default {
  encryptData,
  decryptData,
  encryptUsername,
  decryptUsername,
  sensitiveFieldsPlugin,
  generateEncryptionKey
};
