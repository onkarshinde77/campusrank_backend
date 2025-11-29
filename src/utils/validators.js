// server/src/utils/validators.js

// Email validation
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// LeetCode ID validation (username format: alphanumeric, dash, underscore)
export const validateLeetcodeId = (id) => {
  const leetcodeRegex = /^[a-zA-Z0-9_-]{1,15}$/;
  return leetcodeRegex.test(id);
};

// GitHub username validation
export const validateGithubUsername = (username) => {
  const githubRegex = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i;
  return githubRegex.test(username);
};

// GeeksforGeeks username validation
export const validateGfgId = (id) => {
  return id && id.length > 0 && id.length <= 50;
};

// Department validation
export const validateDepartment = (dept) => {
  const validDepts = [
    'Computer Science',
    'Information Technology',
    'Artificial Intelligence and Machine Learning',
    'Artificial Intelligence and Data Science',
    'Electronics',
    'Mechanical',
    'Civil',
    'Instrumentation',
    'Robotics',
    'Electrical'
  ];
  return validDepts.includes(dept);
};

// Year validation
export const validateYear = (year) => {
  const yearNum = parseInt(year);
  return yearNum >= 1 && yearNum <= 5;
};

// Phone number validation
export const validatePhoneNumber = (phone) => {
  const phoneRegex = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,4}[)]?[-\s\.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

// LinkedIn username validation
export const validateLinkedinUsername = (username) => {
  // LinkedIn usernames are typically 3-50 chars, alphanumeric and hyphens
  const linkedinRegex = /^[a-zA-Z0-9-]{3,50}$/;
  return linkedinRegex.test(username);
};

// Name validation
export const validateName = (name) => {
  return name && name.trim().length >= 2 && name.trim().length <= 100;
};

// Password validation
export const validatePassword = (password) => {
  // Min 6 chars, at least one letter and one number
  const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{6,}$/;
  return passwordRegex.test(password);
};

// College name validation
export const validateCollegeName = (collegeName) => {
  return collegeName && collegeName.trim().length >= 3 && collegeName.trim().length <= 100;
};

// Profile picture base64 validation
export const validateProfilePicture = (base64String) => {
  if (!base64String) return false;
  
  // Check if valid base64
  try {
    if (typeof base64String === 'string' && base64String.includes(',')) {
      const [header, data] = base64String.split(',');
      
      // Check if data URI format
      if (!header.includes('data:image/')) {
        return false;
      }
      
      // Check size (max 2MB)
      const bytes = Math.ceil(data.length * 0.75);
      if (bytes > 2 * 1024 * 1024) {
        return { valid: false, error: 'Image size exceeds 2MB limit' };
      }
      
      return { valid: true };
    }
    return false;
  } catch {
    return false;
  }
};

// Credential code validation
export const validateCredentialCode = (code) => {
  return code && code.trim().length >= 6 && code.trim().length <= 50;
};

// Statistics validation
export const validateStatistics = (stats) => {
  if (!stats || typeof stats !== 'object') return false;
  
  const requiredFields = ['totalSolved', 'ranking'];
  return requiredFields.every(field => 
    field in stats && typeof stats[field] === 'number' && stats[field] >= 0
  );
};

// Batch validation utility
export const validateUser = (userData) => {
  const errors = [];

  if (!validateEmail(userData.email)) {
    errors.push('Invalid email format');
  }

  if (userData.name && !validateName(userData.name)) {
    errors.push('Name must be 2-100 characters');
  }

  if (userData.password && !validatePassword(userData.password)) {
    errors.push('Password must be at least 6 characters with letters and numbers');
  }

  if (userData.leetcodeId && !validateLeetcodeId(userData.leetcodeId)) {
    errors.push('Invalid LeetCode ID format');
  }

  if (userData.githubUsername && !validateGithubUsername(userData.githubUsername)) {
    errors.push('Invalid GitHub username format');
  }

  if (userData.gfgId && !validateGfgId(userData.gfgId)) {
    errors.push('Invalid GeeksforGeeks ID');
  }

  if (userData.department && !validateDepartment(userData.department)) {
    errors.push('Invalid department');
  }

  if (userData.year && !validateYear(userData.year)) {
    errors.push('Year must be between 1 and 5');
  }

  if (userData.phoneNumber && !validatePhoneNumber(userData.phoneNumber)) {
    errors.push('Invalid phone number format');
  }

  if (userData.linkedinUsername && !validateLinkedinUsername(userData.linkedinUsername)) {
    errors.push('Invalid LinkedIn username format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateAdmin = (adminData) => {
  const errors = [];

  if (!validateEmail(adminData.email)) {
    errors.push('Invalid email format');
  }

  if (!validateName(adminData.name)) {
    errors.push('Name must be 2-100 characters');
  }

  if (!validatePassword(adminData.password)) {
    errors.push('Password must be at least 6 characters with letters and numbers');
  }

  if (!validateCollegeName(adminData.collegeName)) {
    errors.push('College name must be 3-100 characters');
  }

  if (!validatePhoneNumber(adminData.phoneNumber)) {
    errors.push('Invalid phone number format');
  }

  if (adminData.yearsOfExperience && (adminData.yearsOfExperience < 0 || adminData.yearsOfExperience > 60)) {
    errors.push('Years of experience must be between 0 and 60');
  }

  if (!validateLinkedinUsername(adminData.linkedinUsername)) {
    errors.push('Invalid LinkedIn username format');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export default {
  validateEmail,
  validateLeetcodeId,
  validateGithubUsername,
  validateGfgId,
  validateDepartment,
  validateYear,
  validatePhoneNumber,
  validateLinkedinUsername,
  validateName,
  validatePassword,
  validateCollegeName,
  validateProfilePicture,
  validateCredentialCode,
  validateStatistics,
  validateUser,
  validateAdmin
};
