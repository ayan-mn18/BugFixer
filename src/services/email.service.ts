import nodemailer from 'nodemailer';
import config from '../config';
import logger from '../lib/logger';

// Create transporter
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    logger.warn({ err: error }, 'Email service not configured');
  } else {
    logger.info('Email service ready');
  }
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // Skip sending in development if not configured
  if (config.nodeEnv === 'development' && !config.email.user) {
    logger.debug({ to: options.to, subject: options.subject }, 'Email skipped in dev');
    return true;
  }

  try {
    await transporter.sendMail({
      from: config.email.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    logger.info({ to: options.to }, 'Email sent');
    return true;
  } catch (error) {
    logger.error({ err: error, to: options.to }, 'Failed to send email');
    return false;
  }
};

// ============================================
// BASE EMAIL TEMPLATE - Matching BugFixer UI
// ============================================
const baseTemplate = (content: string, preheader: string = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>BugFixer</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset styles */
    body, table, td, p, a, li, blockquote {
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }
    table, td {
      mso-table-lspace: 0pt;
      mso-table-rspace: 0pt;
    }
    img {
      -ms-interpolation-mode: bicubic;
      border: 0;
      height: auto;
      line-height: 100%;
      outline: none;
      text-decoration: none;
    }
    
    /* Base styles */
    body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #f4f7f6;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
    }
    
    /* Header gradient - BugFixer green theme */
    .header {
      background: linear-gradient(135deg, #1B4D3E 0%, #2D6A4F 50%, #40916C 100%);
      padding: 40px 40px 35px;
      border-radius: 16px 16px 0 0;
    }
    
    .logo-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .logo-icon {
      width: 42px;
      height: 42px;
      background: rgba(255,255,255,0.15);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }
    
    .logo-text {
      color: #ffffff;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin: 0;
    }
    
    .header-subtitle {
      color: rgba(255,255,255,0.85);
      font-size: 14px;
      margin: 12px 0 0;
      font-weight: 400;
    }
    
    /* Content area */
    .content {
      background: #ffffff;
      padding: 40px;
      border-left: 1px solid #e8ebe9;
      border-right: 1px solid #e8ebe9;
    }
    
    .content h2 {
      color: #1a2e26;
      font-size: 24px;
      font-weight: 600;
      margin: 0 0 16px;
      line-height: 1.3;
    }
    
    .content p {
      color: #4a5d55;
      font-size: 15px;
      line-height: 1.7;
      margin: 0 0 20px;
    }
    
    /* Badges */
    .badge {
      display: inline-block;
      padding: 6px 14px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 20px;
    }
    
    .badge-success {
      background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
      color: #065f46;
    }
    
    .badge-warning {
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      color: #92400e;
    }
    
    .badge-info {
      background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
      color: #1e40af;
    }
    
    .badge-primary {
      background: linear-gradient(135deg, #d1fae5 0%, #bbf7d0 100%);
      color: #166534;
    }
    
    .badge-purple {
      background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
      color: #5b21b6;
    }
    
    /* OTP Box */
    .otp-container {
      background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
      border: 2px dashed #86efac;
      border-radius: 12px;
      padding: 30px;
      text-align: center;
      margin: 25px 0;
    }
    
    .otp-code {
      font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
      font-size: 36px;
      font-weight: 700;
      letter-spacing: 8px;
      color: #166534;
      margin: 0;
    }
    
    .otp-label {
      color: #4ade80;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 10px;
    }
    
    .otp-expiry {
      color: #6b7280;
      font-size: 13px;
      margin-top: 15px;
    }
    
    /* Info card */
    .info-card {
      background: #f8faf9;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid #f0f0f0;
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      color: #6b7280;
      font-size: 13px;
    }
    
    .info-value {
      color: #1a2e26;
      font-size: 14px;
      font-weight: 500;
    }
    
    /* User card */
    .user-card {
      background: linear-gradient(135deg, #f8faf9 0%, #f0fdf4 100%);
      border: 1px solid #d1fae5;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    
    .user-avatar {
      width: 50px;
      height: 50px;
      background: linear-gradient(135deg, #1B4D3E 0%, #40916C 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: 20px;
      font-weight: 600;
    }
    
    .user-info h4 {
      color: #1a2e26;
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px;
    }
    
    .user-info p {
      color: #6b7280;
      font-size: 13px;
      margin: 0;
    }
    
    /* Message box */
    .message-box {
      background: #ffffff;
      border-left: 4px solid #40916C;
      padding: 15px 20px;
      margin: 20px 0;
      border-radius: 0 8px 8px 0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    
    .message-box-label {
      color: #40916C;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .message-box-content {
      color: #374151;
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
      font-style: italic;
    }
    
    /* Buttons */
    .btn {
      display: inline-block;
      padding: 14px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      text-decoration: none;
      text-align: center;
      transition: all 0.2s ease;
      margin: 5px;
    }
    
    .btn-primary {
      background: linear-gradient(135deg, #1B4D3E 0%, #2D6A4F 100%);
      color: #ffffff !important;
      box-shadow: 0 4px 14px rgba(27, 77, 62, 0.35);
    }
    
    .btn-secondary {
      background: #ffffff;
      color: #1B4D3E !important;
      border: 2px solid #1B4D3E;
    }
    
    .btn-success {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      color: #ffffff !important;
      box-shadow: 0 4px 14px rgba(5, 150, 105, 0.35);
    }
    
    .btn-danger {
      background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%);
      color: #ffffff !important;
    }
    
    /* Divider */
    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #e5e7eb, transparent);
      margin: 30px 0;
    }
    
    /* Feature list */
    .feature-list {
      margin: 20px 0;
      padding: 0;
      list-style: none;
    }
    
    .feature-list li {
      padding: 10px 0;
      padding-left: 30px;
      position: relative;
      color: #4a5d55;
      font-size: 14px;
    }
    
    .feature-list li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    
    /* Footer */
    .footer {
      background: #f8faf9;
      padding: 30px 40px;
      border: 1px solid #e8ebe9;
      border-top: none;
      border-radius: 0 0 16px 16px;
      text-align: center;
    }
    
    .footer p {
      color: #6b7280;
      font-size: 13px;
      margin: 0 0 10px;
      line-height: 1.6;
    }
    
    .footer-links {
      margin-top: 15px;
    }
    
    .footer-links a {
      color: #1B4D3E;
      text-decoration: none;
      font-size: 13px;
      margin: 0 10px;
    }
    
    .social-links {
      margin-top: 20px;
    }
    
    .social-links a {
      display: inline-block;
      width: 36px;
      height: 36px;
      background: #e5e7eb;
      border-radius: 50%;
      margin: 0 5px;
      line-height: 36px;
      text-decoration: none;
    }
    
    /* Security notice */
    .security-notice {
      background: #fef3c7;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      padding: 15px;
      margin: 20px 0;
      font-size: 13px;
      color: #92400e;
    }
    
    .security-notice strong {
      display: block;
      margin-bottom: 5px;
    }
    
    /* Responsive */
    @media screen and (max-width: 600px) {
      .header, .content, .footer {
        padding: 25px 20px !important;
      }
      .otp-code {
        font-size: 28px;
        letter-spacing: 5px;
      }
      .btn {
        display: block;
        margin: 10px 0;
      }
    }
  </style>
</head>
<body>
  <!-- Preheader text -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${preheader}
  </div>
  
  <!-- Email wrapper -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f7f6;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" class="email-container" width="600" cellspacing="0" cellpadding="0" align="center">
          <tr>
            <td>
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ============================================
// EMAIL TEMPLATES
// ============================================

export const emailTemplates = {
  // Welcome email after signup
  welcome: (userName: string) => ({
    subject: `🎉 Welcome to BugFixer, ${userName}!`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Your journey to bug-free code starts now</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-success">🎊 Account Created</span>
        
        <h2>Welcome aboard, ${userName}!</h2>
        
        <p>We're thrilled to have you join the BugFixer community. You've just taken the first step towards more organized and efficient bug tracking.</p>
        
        <div class="divider"></div>
        
        <p style="font-weight: 600; color: #1a2e26; margin-bottom: 15px;">Here's what you can do now:</p>
        
        <ul class="feature-list">
          <li><strong>Create your first project</strong> — Organize bugs by project for better clarity</li>
          <li><strong>Use the Kanban board</strong> — Drag and drop bugs through your workflow</li>
          <li><strong>Invite team members</strong> — Collaborate with your team seamlessly</li>
          <li><strong>Track everything</strong> — Priority, source, screenshots, and history</li>
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/dashboard" class="btn btn-primary">Go to Dashboard</a>
          <a href="${config.cors.origin}/new-project" class="btn btn-secondary">Create First Project</a>
        </div>
        
        <div class="divider"></div>
        
        <p style="text-align: center; color: #6b7280; font-size: 14px;">
          Need help getting started? Check out our <a href="${config.cors.origin}/docs" style="color: #1B4D3E; font-weight: 500;">documentation</a> or reach out to our support team.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You're receiving this because you signed up for BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
          <a href="${config.cors.origin}/profile">Settings</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Welcome to BugFixer, ${userName}! Your account has been created successfully.`),
    text: `Welcome to BugFixer, ${userName}!\n\nWe're thrilled to have you join the BugFixer community. You've just taken the first step towards more organized and efficient bug tracking.\n\nHere's what you can do now:\n- Create your first project\n- Use the Kanban board\n- Invite team members\n- Track everything\n\nVisit your dashboard: ${config.cors.origin}/dashboard`,
  }),

  // Login notification
  loginNotification: (userName: string, deviceInfo: string, ipAddress: string, timestamp: string) => ({
    subject: `🔐 New login to your BugFixer account`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Security Alert</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-info">🔐 New Sign-in</span>
        
        <h2>Hi ${userName},</h2>
        
        <p>We detected a new sign-in to your BugFixer account. If this was you, you can safely ignore this email.</p>
        
        <div class="info-card">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Device</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 500;">${deviceInfo}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">IP Address</span>
              </td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 500;">${ipAddress}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 10px 0;">
                <span style="color: #6b7280; font-size: 13px;">Time</span>
              </td>
              <td style="padding: 10px 0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 500;">${timestamp}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <div class="security-notice">
          <strong>⚠️ Wasn't you?</strong>
          If you didn't sign in, we recommend changing your password immediately to secure your account.
        </div>
        
        <div style="text-align: center; margin-top: 25px;">
          <a href="${config.cors.origin}/profile" class="btn btn-primary">Review Account Security</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>This is an automated security notification from BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/profile">Account Settings</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `New login detected on your BugFixer account from ${deviceInfo}`),
    text: `Hi ${userName},\n\nWe detected a new sign-in to your BugFixer account.\n\nDevice: ${deviceInfo}\nIP Address: ${ipAddress}\nTime: ${timestamp}\n\nIf this wasn't you, please secure your account immediately at ${config.cors.origin}/profile`,
  }),

  // OTP Verification
  otpVerification: (userName: string, otpCode: string, purpose: string = 'verify your email') => ({
    subject: `🔑 Your BugFixer verification code: ${otpCode}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Verification Required</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-purple">🔑 Verification Code</span>
        
        <h2>Hi ${userName},</h2>
        
        <p>Use the following code to ${purpose}. This code is valid for <strong>10 minutes</strong>.</p>
        
        <div class="otp-container">
          <p class="otp-label">Your Verification Code</p>
          <p class="otp-code">${otpCode}</p>
          <p class="otp-expiry">⏱️ Expires in 10 minutes</p>
        </div>
        
        <div class="security-notice">
          <strong>🛡️ Security Tip</strong>
          Never share this code with anyone. BugFixer team will never ask for your verification code via phone or email.
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 14px; margin-top: 25px;">
          If you didn't request this code, you can safely ignore this email.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>This code was requested for your BugFixer account.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/profile">Account Settings</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Your BugFixer verification code is ${otpCode}. Valid for 10 minutes.`),
    text: `Hi ${userName},\n\nYour verification code is: ${otpCode}\n\nUse this code to ${purpose}. This code is valid for 10 minutes.\n\nIf you didn't request this code, please ignore this email.`,
  }),

  // Password Reset
  passwordReset: (userName: string, resetLink: string) => ({
    subject: `🔒 Reset your BugFixer password`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Password Reset Request</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-warning">🔒 Password Reset</span>
        
        <h2>Hi ${userName},</h2>
        
        <p>We received a request to reset your password. Click the button below to create a new password. This link is valid for <strong>1 hour</strong>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" class="btn btn-primary" style="font-size: 16px; padding: 16px 40px;">Reset Password</a>
        </div>
        
        <div class="info-card" style="text-align: center;">
          <p style="margin: 0; color: #6b7280; font-size: 13px;">Or copy and paste this link into your browser:</p>
          <p style="margin: 10px 0 0; word-break: break-all; color: #1B4D3E; font-size: 13px;">${resetLink}</p>
        </div>
        
        <div class="security-notice">
          <strong>⚠️ Didn't request this?</strong>
          If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>This email was sent because a password reset was requested for your BugFixer account.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/login">Login</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Reset your BugFixer password. This link expires in 1 hour.`),
    text: `Hi ${userName},\n\nWe received a request to reset your password.\n\nClick this link to reset your password: ${resetLink}\n\nThis link is valid for 1 hour.\n\nIf you didn't request this, please ignore this email.`,
  }),

  // Project Invitation
  projectInvitation: (
    inviterName: string,
    inviterEmail: string,
    projectName: string,
    projectDescription: string,
    role: string,
    inviteLink: string
  ) => ({
    subject: `📨 ${inviterName} invited you to join ${projectName}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Project Invitation</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-primary">📨 Invitation</span>
        
        <h2>You're invited to collaborate!</h2>
        
        <p><strong>${inviterName}</strong> has invited you to join their project on BugFixer.</p>
        
        <div class="user-card">
          <div class="user-avatar">${inviterName.charAt(0).toUpperCase()}</div>
          <div class="user-info">
            <h4>${inviterName}</h4>
            <p>${inviterEmail}</p>
          </div>
        </div>
        
        <div class="info-card">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Project</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 600;">${projectName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Your Role</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">${role}</span>
              </td>
            </tr>
            ${projectDescription ? `
            <tr>
              <td colspan="2" style="padding: 12px 0;">
                <span style="color: #6b7280; font-size: 13px; display: block; margin-bottom: 8px;">Description</span>
                <span style="color: #4a5d55; font-size: 14px; line-height: 1.5;">${projectDescription}</span>
              </td>
            </tr>
            ` : ''}
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${inviteLink}" class="btn btn-success">Accept Invitation</a>
          <a href="${config.cors.origin}/dashboard" class="btn btn-secondary">View Dashboard</a>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 25px;">
          This invitation link will expire in 7 days.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because ${inviterName} invited you to collaborate on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `${inviterName} invited you to join ${projectName} on BugFixer`),
    text: `${inviterName} has invited you to join ${projectName} on BugFixer!\n\nRole: ${role}\n${projectDescription ? `Description: ${projectDescription}\n` : ''}\nAccept the invitation: ${inviteLink}\n\nThis invitation expires in 7 days.`,
  }),

  // Access Request (new request notification to owner)
  newAccessRequest: (
    projectName: string,
    requesterName: string,
    requesterEmail: string,
    message: string
  ) => ({
    subject: `🔔 New access request for ${projectName}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Access Request Notification</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-warning">⏳ Pending Request</span>
        
        <h2>New access request</h2>
        
        <p>Someone wants to join your project <strong>${projectName}</strong>.</p>
        
        <div class="user-card">
          <div class="user-avatar">${requesterName.charAt(0).toUpperCase()}</div>
          <div class="user-info">
            <h4>${requesterName}</h4>
            <p>${requesterEmail}</p>
          </div>
        </div>
        
        ${message ? `
        <div class="message-box">
          <p class="message-box-label">Message from requester</p>
          <p class="message-box-content">"${message}"</p>
        </div>
        ` : ''}
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/dashboard" class="btn btn-success">Approve Request</a>
          <a href="${config.cors.origin}/dashboard" class="btn btn-secondary">Review Details</a>
        </div>
        
        <p style="text-align: center; color: #6b7280; font-size: 13px; margin-top: 25px;">
          You can manage all access requests from your project settings.
        </p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you own ${projectName} on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `${requesterName} requested access to ${projectName}`),
    text: `New access request for ${projectName}\n\n${requesterName} (${requesterEmail}) is requesting access to your project.\n\n${message ? `Message: "${message}"\n\n` : ''}Review the request at ${config.cors.origin}/dashboard`,
  }),

  // Access Request Approved
  accessRequestApproved: (projectName: string, role: string) => ({
    subject: `✅ Access granted to ${projectName}!`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Access Request Update</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-success">✅ Approved</span>
        
        <h2>You're in! 🎉</h2>
        
        <p>Great news! Your access request to <strong>${projectName}</strong> has been approved.</p>
        
        <div class="info-card">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Project</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 600;">${projectName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: #6b7280; font-size: 13px;">Your Role</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">${role}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <p>You now have access to view and contribute to this project based on your assigned role.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/dashboard" class="btn btn-primary">Go to Project</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you requested access to a project on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Your access request to ${projectName} has been approved!`),
    text: `Great news! Your access request to ${projectName} has been approved!\n\nRole: ${role}\n\nYou can now access the project at ${config.cors.origin}/dashboard`,
  }),

  // Access Request Rejected
  accessRequestRejected: (projectName: string) => ({
    subject: `Access request update for ${projectName}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Access Request Update</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <h2>Access request update</h2>
        
        <p>Unfortunately, your access request to <strong>${projectName}</strong> was not approved at this time.</p>
        
        <p style="color: #6b7280;">This could be for various reasons, such as project privacy settings or team capacity. You're welcome to:</p>
        
        <ul class="feature-list">
          <li>Explore other public projects on BugFixer</li>
          <li>Reach out to the project owner directly</li>
          <li>Create your own project and invite collaborators</li>
        </ul>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/explore" class="btn btn-primary">Explore Projects</a>
          <a href="${config.cors.origin}/new-project" class="btn btn-secondary">Create a Project</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you requested access to a project on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Your access request to ${projectName} was not approved`),
    text: `Unfortunately, your access request to ${projectName} was not approved at this time.\n\nYou can explore other public projects at ${config.cors.origin}/explore or create your own project.`,
  }),

  // Bug Resolved
  bugResolved: (bugTitle: string, projectName: string, resolvedBy: string, bugId: string) => ({
    subject: `✅ Bug resolved: ${bugTitle}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Bug Resolution Notification</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-success">✅ Resolved</span>
        
        <h2>Bug has been fixed!</h2>
        
        <p>Great news! A bug you reported has been resolved.</p>
        
        <div class="info-card">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Bug</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 600;">${bugTitle}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Project</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 500;">${projectName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: #6b7280; font-size: 13px;">Resolved by</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 500;">${resolvedBy}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280;">Thank you for helping us improve the project! Your bug report made a difference.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/dashboard" class="btn btn-primary">View Details</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you reported a bug on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Bug "${bugTitle}" in ${projectName} has been resolved by ${resolvedBy}`),
    text: `Bug Resolved: ${bugTitle}\n\nGood news! A bug you reported in ${projectName} has been resolved by ${resolvedBy}.\n\nThank you for helping us improve!`,
  }),

  // Bug Assigned
  bugAssigned: (bugTitle: string, projectName: string, assignedBy: string, priority: string) => ({
    subject: `🐛 Bug assigned to you: ${bugTitle}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Bug Assignment Notification</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-info">🐛 New Assignment</span>
        
        <h2>Bug assigned to you</h2>
        
        <p><strong>${assignedBy}</strong> has assigned you a bug to work on.</p>
        
        <div class="info-card">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Bug</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 600;">${bugTitle}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Project</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #1a2e26; font-size: 14px; font-weight: 500;">${projectName}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: #6b7280; font-size: 13px;">Priority</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="display: inline-block; background: ${priority === 'HIGH' || priority === 'CRITICAL' ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); color: #991b1b;' : priority === 'MEDIUM' ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); color: #92400e;' : 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); color: #1e40af;'} padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">${priority}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/dashboard" class="btn btn-primary">View Bug Details</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you were assigned a bug on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `${assignedBy} assigned you the bug "${bugTitle}" in ${projectName}`),
    text: `Bug Assigned to You: ${bugTitle}\n\n${assignedBy} has assigned you a bug in ${projectName}.\n\nPriority: ${priority}\n\nView details: ${config.cors.origin}/dashboard`,
  }),

  // Member Removed
  memberRemoved: (projectName: string) => ({
    subject: `You've been removed from ${projectName}`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Membership Update</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <h2>Project access removed</h2>
        
        <p>Your access to <strong>${projectName}</strong> has been removed by the project owner.</p>
        
        <p style="color: #6b7280;">You will no longer be able to view or contribute to this project. If you believe this was a mistake, please contact the project owner directly.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/explore" class="btn btn-primary">Explore Other Projects</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you were a member of ${projectName} on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Your access to ${projectName} has been removed`),
    text: `Your access to ${projectName} has been removed by the project owner.\n\nExplore other projects: ${config.cors.origin}/explore`,
  }),

  // Role Changed
  roleChanged: (projectName: string, oldRole: string, newRole: string) => ({
    subject: `🔄 Your role in ${projectName} has been updated`,
    html: baseTemplate(`
      <!-- Header -->
      <div class="header">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 42px; height: 42px; background: rgba(255,255,255,0.15); border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 22px;">🐛</div>
                <span style="color: #ffffff; font-size: 26px; font-weight: 700; letter-spacing: -0.5px;">BugFixer</span>
              </div>
              <p class="header-subtitle">Role Update</p>
            </td>
          </tr>
        </table>
      </div>
      
      <!-- Content -->
      <div class="content">
        <span class="badge badge-info">🔄 Role Updated</span>
        
        <h2>Your role has been updated</h2>
        
        <p>Your role in <strong>${projectName}</strong> has been changed by the project owner.</p>
        
        <div class="info-card">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #6b7280; font-size: 13px;">Previous Role</span>
              </td>
              <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0; text-align: right;">
                <span style="color: #9ca3af; font-size: 14px; text-decoration: line-through;">${oldRole}</span>
              </td>
            </tr>
            <tr>
              <td style="padding: 12px 0;">
                <span style="color: #6b7280; font-size: 13px;">New Role</span>
              </td>
              <td style="padding: 12px 0; text-align: right;">
                <span style="display: inline-block; background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); color: #065f46; padding: 4px 12px; border-radius: 50px; font-size: 12px; font-weight: 600;">${newRole}</span>
              </td>
            </tr>
          </table>
        </div>
        
        <p style="color: #6b7280;">Your permissions in the project may have changed. Please check the project to see your updated capabilities.</p>
        
        <div style="text-align: center; margin-top: 30px;">
          <a href="${config.cors.origin}/dashboard" class="btn btn-primary">View Project</a>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>You received this because you are a member of ${projectName} on BugFixer.</p>
        <div class="footer-links">
          <a href="${config.cors.origin}">Website</a>
          <a href="${config.cors.origin}/dashboard">Dashboard</a>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
          © ${new Date().getFullYear()} BugFixer. Track bugs. Ship faster.
        </p>
      </div>
    `, `Your role in ${projectName} has been changed from ${oldRole} to ${newRole}`),
    text: `Your role in ${projectName} has been updated.\n\nPrevious Role: ${oldRole}\nNew Role: ${newRole}\n\nView project: ${config.cors.origin}/dashboard`,
  }),
};

// ============================================
// HELPER FUNCTIONS
// ============================================

// Send welcome email after signup
export const sendWelcomeEmail = async (to: string, userName: string): Promise<boolean> => {
  const template = emailTemplates.welcome(userName);
  return sendEmail({ to, ...template });
};

// Send login notification
export const sendLoginNotificationEmail = async (
  to: string,
  userName: string,
  deviceInfo: string,
  ipAddress: string
): Promise<boolean> => {
  const timestamp = new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const template = emailTemplates.loginNotification(userName, deviceInfo, ipAddress, timestamp);
  return sendEmail({ to, ...template });
};

// Send OTP verification email
export const sendOtpEmail = async (
  to: string,
  userName: string,
  otpCode: string,
  purpose: string = 'verify your email'
): Promise<boolean> => {
  const template = emailTemplates.otpVerification(userName, otpCode, purpose);
  return sendEmail({ to, ...template });
};

// Send password reset email
export const sendPasswordResetEmail = async (
  to: string,
  userName: string,
  resetToken: string
): Promise<boolean> => {
  const resetLink = `${config.cors.origin}/reset-password?token=${resetToken}`;
  const template = emailTemplates.passwordReset(userName, resetLink);
  return sendEmail({ to, ...template });
};

// Send project invitation email
export const sendProjectInvitationEmail = async (
  to: string,
  inviterName: string,
  inviterEmail: string,
  projectName: string,
  projectDescription: string,
  role: string,
  inviteToken: string
): Promise<boolean> => {
  const inviteLink = `${config.cors.origin}/invite/${inviteToken}`;
  const template = emailTemplates.projectInvitation(
    inviterName,
    inviterEmail,
    projectName,
    projectDescription,
    role,
    inviteLink
  );
  return sendEmail({ to, ...template });
};

// Send new access request notification email
export const sendNewAccessRequestEmail = async (
  to: string,
  projectName: string,
  requesterName: string,
  requesterEmail: string,
  message: string = ''
): Promise<boolean> => {
  const template = emailTemplates.newAccessRequest(projectName, requesterName, requesterEmail, message);
  return sendEmail({ to, ...template });
};

// Send access request approved email
export const sendAccessRequestApprovedEmail = async (
  to: string,
  projectName: string,
  role: string
): Promise<boolean> => {
  const template = emailTemplates.accessRequestApproved(projectName, role);
  return sendEmail({ to, ...template });
};

// Send access request rejected email
export const sendAccessRequestRejectedEmail = async (
  to: string,
  projectName: string
): Promise<boolean> => {
  const template = emailTemplates.accessRequestRejected(projectName);
  return sendEmail({ to, ...template });
};

// Send bug resolved email
export const sendBugResolvedEmail = async (
  to: string,
  bugTitle: string,
  projectName: string,
  resolvedBy: string,
  bugId: string = ''
): Promise<boolean> => {
  const template = emailTemplates.bugResolved(bugTitle, projectName, resolvedBy, bugId);
  return sendEmail({ to, ...template });
};

// Send bug assigned email
export const sendBugAssignedEmail = async (
  to: string,
  bugTitle: string,
  projectName: string,
  assignedBy: string,
  priority: string
): Promise<boolean> => {
  const template = emailTemplates.bugAssigned(bugTitle, projectName, assignedBy, priority);
  return sendEmail({ to, ...template });
};

// Send member removed email
export const sendMemberRemovedEmail = async (
  to: string,
  projectName: string
): Promise<boolean> => {
  const template = emailTemplates.memberRemoved(projectName);
  return sendEmail({ to, ...template });
};

// Send role changed email
export const sendRoleChangedEmail = async (
  to: string,
  projectName: string,
  oldRole: string,
  newRole: string
): Promise<boolean> => {
  const template = emailTemplates.roleChanged(projectName, oldRole, newRole);
  return sendEmail({ to, ...template });
};

// Generate OTP code
export const generateOTP = (length: number = 6): string => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

export default transporter;
