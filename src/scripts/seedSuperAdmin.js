// server/src/scripts/seedSuperAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import SuperAdmin from '../models/SuperAdmin.js';

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Check if super admin already exists
    let superAdmin = await SuperAdmin.findOne({ email: 'superadmin@gmail.com' });
    
    if (superAdmin) {
      // Reset password and role in case they were created with incorrect hashing
      superAdmin.password = 'superadmin123';
      superAdmin.role = 'superadmin';
      await superAdmin.save();
      console.log('Super admin updated successfully');
      process.exit(0);
    }

    // Create super admin with plain password (will be hashed by pre-save hook)
    superAdmin = new SuperAdmin({
      name: 'Super Admin',
      email: 'superadmin@gmail.com',
      password: 'superadmin123',
      phoneNumber: '7700770077',
      yearsOfExperience: 1,
      linkedinUsername: 'superadmin',
      githubUsername: 'superadmin',
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