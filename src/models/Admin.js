import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    default: null
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  collegeName: {
    type: String,
    required: [true, 'Please provide a college name'],
    trim: true,
    unique: true // Each college should have only one admin
  },
  credentialCode: {
    type: Number,
    trim: true
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide a phone number'],
    trim: true
  },
  yearsOfExperience: {
    type: Number,
    required: [true, 'Please provide years of experience'],
    min: 0
  },
  linkedinUsername: {
    type: String,
    trim: true,
    required: [true, 'Please provide a LinkedIn username'],
  },
  githubUsername: {
    type: String,
    trim: true,
    required: [false, 'Please provide a GitHub username'],
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin'
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  blockedReason: {
    type: String,
    default: ''
  },
  isActive: {
    type: Boolean,
    default: true
  },
    displaySettings: {
    leaderboard: {
      showDepartment: { type: Boolean, default: true },
      showLeetCodeSolved: { type: Boolean, default: true },
      showGfgSolved: { type: Boolean, default: true },
      showGithubCommits: { type: Boolean, default: true },
      showGithubPrs: { type: Boolean, default: true }
    },
    dashboard: {
      showLeetCodeSection: { type: Boolean, default: true },
      showGfgSection: { type: Boolean, default: true },
      showGithubSection: { type: Boolean, default: true },
      showTopPerformers: { type: Boolean, default: true }
    },
    ranking: {
      includeLeetCodeGlobalRank: { type: Boolean, default: true },
      includeLeetCodeContestRating: { type: Boolean, default: true },
      includeLeetCodeTotalSolved: { type: Boolean, default: true },
      includeGithubTotalRepositories: { type: Boolean, default: true },
      includeGithubTotalPRs: { type: Boolean, default: true },
      includeGithubMergedPRs: { type: Boolean, default: true },
      includeGfgTotalSolved: { type: Boolean, default: true },
      includeGfgContestRating: { type: Boolean, default: true }
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare password method
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// College name index is already defined inline in the schema with unique: true

const Admin = mongoose.model('Admin', adminSchema);

export default Admin;