const nodemailer = require('nodemailer');
// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Generate OTP
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
};

// Store OTPs temporarily (in production, use Redis or database)
const otpStore = new Map();

// Send email helper
const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'SkillConnect <noreply@skillconnect.com>',
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    console.log(`Attempting to send email to: ${options.to}`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('Nodemailer Error:', error);
    // Throw error so it can be caught by the route handler's try-catch block
    throw new Error(`Email sending failed: ${error.message}`);
  }
};

// Email templates
const emailTemplates = {
  workerHired: (workerName, jobTitle, employerName, jobDetails) => ({
    subject: `🎉 You've been hired for: ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3498db; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; }
          .job-details { background: white; padding: 15px; margin: 15px 0; border-left: 4px solid #3498db; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
          .button { display: inline-block; background: #2ecc71; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Congratulations, ${workerName}!</h1>
          </div>
          <div class="content">
            <p>Great news! You have been hired for a new job on SkillConnect.</p>
            
            <div class="job-details">
              <h3>Job Details:</h3>
              <p><strong>Title:</strong> ${jobTitle}</p>
              <p><strong>Employer:</strong> ${employerName}</p>
              <p><strong>Location:</strong> ${jobDetails.location}</p>
              <p><strong>Duration:</strong> ${jobDetails.duration}</p>
              <p><strong>Rate:</strong> ₹${jobDetails.rate}</p>
              <p><strong>Start Date:</strong> ${jobDetails.startDate || 'To be confirmed'}</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Log in to your SkillConnect dashboard</li>
              <li>Contact the employer to confirm details</li>
              <li>Complete the work professionally</li>
              <li>Get rated and build your reputation</li>
            </ul>
            
            <center>
              <a href="${process.env.CLIENT_URL}/worker/dashboard" class="button">View Job Details</a>
            </center>
          </div>
          <div class="footer">
            <p>© 2026 SkillConnect - Connecting Workers with Opportunities</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `
  }),

  passwordReset: (resetUrl) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color:rgb(121, 193, 241);">Password Reset Request</h2>
        <p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
        <p>Please click on the following link, or paste this into your browser to complete the process within one hour of receiving it:</p>
        <a href="${resetUrl}" style="display: inline-block; background: #3498db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 20px 0;">Reset Password</a>
        <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
      </div>
    `
  }),

  jobApplication: (employerName, workerName, jobTitle) => ({
    subject: `New Application for: ${jobTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>New Job Application</h2>
          <p>Hello ${employerName},</p>
          <p><strong>${workerName}</strong> has applied for your job posting: <strong>${jobTitle}</strong></p>
          <p>Please log in to your dashboard to review the application and worker profile.</p>
          <a href="${process.env.CLIENT_URL}/employer/dashboard" style="display: inline-block; background: #3498db; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Application</a>
        </div>
      </body>
      </html>
    `
  }),

  otpVerification: (otp) => ({
    subject: 'Verify Your Email - SkillConnect OTP',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3498db; color: white; padding: 20px; text-align: center; }
          .content { background: #f9f9f9; padding: 20px; text-align: center; }
          .otp-box { background: white; padding: 20px; margin: 20px 0; border: 2px dashed #3498db; border-radius: 10px; }
          .otp { font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #3498db; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #777; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔒 Email Verification</h1>
          </div>
          <div class="content">
            <p>Thank you for registering with SkillConnect!</p>
            <p>Please use the following OTP to verify your email address:</p>
            
            <div class="otp-box">
              <div class="otp">${otp}</div>
            </div>
            
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>If you didn't request this verification, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>© 2026 SkillConnect - Connecting Workers with Opportunities</p>
          </div>
        </div>
      </body>
      </html>
    `
  })
};
module.exports = {
  sendEmail,
  emailTemplates,
  generateOTP,
  otpStore
};
