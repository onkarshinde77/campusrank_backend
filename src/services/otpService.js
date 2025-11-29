// services/otpService.js
const OTP_EXPIRY_MINUTES = 10; // OTP expires in 10 minutes
const otpStore = new Map();

// Generate a random 6-digit OTP
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Store OTP with expiration
export const storeOTP = (email, otp) => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);
  
  otpStore.set(email, {
    otp,
    expiresAt
  });

  // Auto-delete OTP after expiry
  setTimeout(() => {
    otpStore.delete(email);
  }, OTP_EXPIRY_MINUTES * 60 * 1000);
};

// Verify OTP
export const verifyOTP = (email, otp) => {
  const storedData = otpStore.get(email);
  
  if (!storedData) return false;
  if (storedData.expiresAt < new Date()) {
    otpStore.delete(email);
    return false;
  }
  if (storedData.otp !== otp) return false;
  
  // OTP is valid, remove it from store
  otpStore.delete(email);
  return true;
};