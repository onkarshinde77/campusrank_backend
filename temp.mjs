import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Admin from './src/models/Admin.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing users
    await User.deleteMany({});
    console.log('Cleared existing users');

    await Admin.deleteMany({});
    console.log('Cleared existing Admins');

    // Insert dummy users
    // await User.insertMany(dummyUsers);ze
    // console.log('Successfully inserted 10 dummy users');

    // console.log('\nDummy users created:');
    // dummyUsers.forEach((user, index) => {
    //   console.log(`${index + 1}. ${user.name} - ${user.leetcodeId} - Total Solved: ${user.leetcodeStats.totalSolved}`);
    // });
    console.log('\deleted users successfully');
    
    process.exit(0);
  }   catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();

// import mongoose from 'mongoose';
// import User from './src/models/User.js';
// import dotenv from 'dotenv';

// dotenv.config();

// const makeAdmin = async () => {
//   try {
//     await mongoose.connect(process.env.MONGODB_URI);
//     console.log('Connected to MongoDB');

//     const result = await User.updateOne(
//       { email: 'onkar@gmail.com' },
//       { $set: { isAdmin: true } }
//     );

//     if (result.matchedCount > 0) {
//       console.log('✅ User is now an admin!');
//     } else {
//       console.log('❌ User not found. Please register first.');
//     }

//     process.exit(0);
//   } catch (error) {
//     console.error('Error:', error);
//     process.exit(1);
//   }
// };

// makeAdmin();

