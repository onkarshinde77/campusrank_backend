// server/src/scripts/seedSuperAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import SuperAdmin from '../models/SuperAdmin.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    // Check if super admin already exists
    let superAdmin = await SuperAdmin.findOne({ email: 'rankincampus@gmail.com' });
    
    if (superAdmin) {
      // Reset password and role in case they were created with incorrect hashing
      superAdmin.password = 'sarkar77*77';
      superAdmin.role = 'superadmin';
      await superAdmin.save();
      console.log('Super admin updated successfully');
      process.exit(0);
    }

    // Create super admin with plain password (will be hashed by pre-save hook)
    superAdmin = new SuperAdmin({
      name: 'Campus Rank',
      email: 'rankincampus@gmail.com',
      password: 'sarkar77*77',
      phoneNumber: '9309313545',
      yearsOfExperience: 1,
      linkedinUsername: '/sarkar',
      githubUsername: 'sarkar',
      profilePicture: '',
      role: 'superadmin'
    });

    await superAdmin.save();
    console.log('Super admin created successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding super admin:', error);
    process.exit(1);
  }
};

seedSuperAdmin();