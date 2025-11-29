// FILE: server/src/models/SuperAdmin.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const superAdminSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Please provide a name'], trim: true },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  password: { type: String, required: [true, 'Please provide a password'], minlength: 6, select: false },
  profilePicture: { type: String, default: '' },
  phoneNumber: { type: String, trim: true, default: '' },
  yearsOfExperience: { type: Number, min: 0, default: 0 },
  linkedinUsername: { type: String, trim: true, default: '' },
  githubUsername: { type: String, trim: true, default: '' },
  role: { type: String, enum: ['superadmin'], default: 'superadmin' },
//   isBlocked: { type: Boolean, default: false },
//   blockedReason: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  rankingWeights: {
    leetcodeGlobalRank: { type: Number, default: 1, min: 0, max: 10 },
    leetcodeContestRating: { type: Number, default: 1, min: 0, max: 10 },
    leetcodeTotalSolved: { type: Number, default: 1, min: 0, max: 10 },
    githubTotalRepositories: { type: Number, default: 1, min: 0, max: 10 },
    githubTotalPRs: { type: Number, default: 1, min: 0, max: 10 },
    githubMergedPRs: { type: Number, default: 1, min: 0, max: 10 },
    gfgTotalSolved: { type: Number, default: 1, min: 0, max: 10 },
    gfgContestRating: { type: Number, default: 1, min: 0, max: 10 }
  }
}, { timestamps: true });

superAdminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

superAdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

const SuperAdmin = mongoose.model('SuperAdmin', superAdminSchema);
export default SuperAdmin;