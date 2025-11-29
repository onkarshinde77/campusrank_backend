// server/src/utils/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false // Only for development with self-signed certificates
  }
});

// Send password reset email
export const sendPasswordResetEmail = async (req, res) => {
  try {
    const { email, resetUrl } = req.body;

    if (!email || !resetUrl) {
      return res.status(400).json({
        success: false,
        message: 'Email and reset URL are required'
      });
    }

    const mailOptions = {
      from: `"CampusRank" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="margin: 25px 0;">
            <a 
              href="${resetUrl}" 
              style="
                background-color: #2563eb; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 4px; 
                font-weight: bold;
                display: inline-block;
              "
            >
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all;">${resetUrl}</p>
          <p>This link will expire in 10 minutes.</p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    
    // Preview URL for Ethereal
    if (process.env.NODE_ENV === 'development') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log('Preview URL:', previewUrl);
    }
    
    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};