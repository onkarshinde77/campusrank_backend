// server/src/utils/createIndexes.js
import User from '../models/User.js';
import Admin from '../models/Admin.js';
import SuperAdmin from '../models/SuperAdmin.js';

export const createDatabaseIndexes = async () => {
  try {
    console.log('Creating database indexes...');

    // User Collection Indexes
    await User.collection.createIndex({ email: 1 }, { unique: true });
    // console.log('✓ User email index created');

    await User.collection.createIndex({ leetcodeId: 1 }, { unique: true, sparse: true });
    // console.log('✓ User leetcodeId index created');

    await User.collection.createIndex({ collegeId: 1 });
    // console.log('✓ User collegeId index created');

    await User.collection.createIndex({ department: 1, year: 1 });
    // console.log('✓ User department-year compound index created');

    await User.collection.createIndex({ 'leetcodeStats.ranking': 1 });
    // console.log('✓ User leetcodeStats ranking index created');

    await User.collection.createIndex({ createdAt: -1 });
    // console.log('✓ User createdAt index created');

    await User.collection.createIndex({ collegeId: 1, 'leetcodeStats.ranking': 1 });
    // console.log('✓ User collegeId-ranking compound index created');

    await User.collection.createIndex({ resetPasswordExpire: 1 }, { expireAfterSeconds: 0 });
    // console.log('✓ User password reset TTL index created');

    await User.collection.createIndex({ isBlocked: 1 });
    // console.log('✓ User isBlocked index created');

    // Admin Collection Indexes
    await Admin.collection.createIndex({ email: 1 }, { unique: true });
    // console.log('✓ Admin email index created');

    await Admin.collection.createIndex({ collegeName: 1 }, { unique: true });
    // console.log('✓ Admin collegeName index created');

    await Admin.collection.createIndex({ createdBy: 1 });
    // console.log('✓ Admin createdBy index created');

    await Admin.collection.createIndex({ isBlocked: 1 });
    // console.log('✓ Admin isBlocked index created');

    // SuperAdmin Collection Indexes
    await SuperAdmin.collection.createIndex({ email: 1 }, { unique: true });
    // console.log('✓ SuperAdmin email index created');

    console.log('✅ All database indexes created successfully!');
  } catch (error) {
    if (error.code === 85) {
      // Index already exists - not an error
      console.log('✓ Indexes already exist, skipping creation');
    } else {
      console.error('❌ Error creating indexes:', error.message);
      throw error;
    }
  }
};

export default createDatabaseIndexes;
