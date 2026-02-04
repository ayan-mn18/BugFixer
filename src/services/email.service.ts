import nodemailer from 'nodemailer';
import config from '../config';

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

// Verify connection (only in production)
if (config.nodeEnv === 'production') {
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Email service not configured:', error.message);
    } else {
      console.log('✅ Email service ready');
    }
  });
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  // Skip sending in development if not configured
  if (config.nodeEnv === 'development' && !config.email.user) {
    console.log('📧 Email would be sent (skipped in dev):', {
      to: options.to,
      subject: options.subject,
    });
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
    console.log('✅ Email sent to:', options.to);
    return true;
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return false;
  }
};

// Email templates
export const emailTemplates = {
  bugResolved: (bugTitle: string, projectName: string, resolvedBy: string) => ({
    subject: `🎉 Bug Resolved: ${bugTitle}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4D3E 0%, #2D5A3D 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; background: #4ADE80; color: #0F2E24; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🐛 BugFixer</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Bug Resolution Notification</p>
            </div>
            <div class="content">
              <span class="badge">✅ RESOLVED</span>
              <h2 style="margin-top: 20px;">${bugTitle}</h2>
              <p>Good news! A bug you reported has been resolved.</p>
              <table style="width: 100%; margin: 20px 0;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Project:</td>
                  <td style="padding: 8px 0; font-weight: 500;">${projectName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280;">Resolved by:</td>
                  <td style="padding: 8px 0; font-weight: 500;">${resolvedBy}</td>
                </tr>
              </table>
              <p style="color: #6b7280;">Thank you for helping us improve!</p>
            </div>
            <div class="footer">
              <p>This email was sent by BugFixer. You received this because you reported a bug.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Bug Resolved: ${bugTitle}\n\nGood news! A bug you reported in ${projectName} has been resolved by ${resolvedBy}.\n\nThank you for helping us improve!`,
  }),

  accessRequestApproved: (projectName: string, role: string) => ({
    subject: `✅ Access Granted: ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4D3E 0%, #2D5A3D 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; background: #4ADE80; color: #0F2E24; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .button { display: inline-block; background: #1B4D3E; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🐛 BugFixer</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Access Request Update</p>
            </div>
            <div class="content">
              <span class="badge">✅ APPROVED</span>
              <h2 style="margin-top: 20px;">Welcome to ${projectName}!</h2>
              <p>Your access request has been approved. You've been granted the <strong>${role}</strong> role.</p>
              <p style="margin-top: 30px;">
                <a href="${config.cors.origin}/dashboard" class="button">Go to Dashboard</a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent by BugFixer.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Access Granted: ${projectName}\n\nYour access request has been approved! You've been granted the ${role} role.\n\nVisit your dashboard to get started.`,
  }),

  accessRequestRejected: (projectName: string) => ({
    subject: `Access Request Update: ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4D3E 0%, #2D5A3D 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🐛 BugFixer</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">Access Request Update</p>
            </div>
            <div class="content">
              <h2>Access Request for ${projectName}</h2>
              <p>Unfortunately, your access request was not approved at this time.</p>
              <p style="color: #6b7280;">You can explore other public projects or reach out to the project owner directly.</p>
            </div>
            <div class="footer">
              <p>This email was sent by BugFixer.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Access Request Update: ${projectName}\n\nUnfortunately, your access request was not approved at this time.\n\nYou can explore other public projects or reach out to the project owner directly.`,
  }),

  newAccessRequest: (projectName: string, requesterName: string, requesterEmail: string, message: string) => ({
    subject: `🔔 New Access Request: ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1B4D3E 0%, #2D5A3D 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
            .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
            .badge { display: inline-block; background: #FCD34D; color: #78350F; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
            .message-box { background: white; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 16px 0; }
            .button { display: inline-block; background: #1B4D3E; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500; }
            .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🐛 BugFixer</h1>
              <p style="margin: 10px 0 0; opacity: 0.9;">New Access Request</p>
            </div>
            <div class="content">
              <span class="badge">⏳ PENDING</span>
              <h2 style="margin-top: 20px;">New request for ${projectName}</h2>
              <p><strong>${requesterName}</strong> (${requesterEmail}) is requesting access to your project.</p>
              ${message ? `
                <div class="message-box">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">Message:</p>
                  <p style="margin: 8px 0 0;">${message}</p>
                </div>
              ` : ''}
              <p style="margin-top: 30px;">
                <a href="${config.cors.origin}/dashboard" class="button">Review Request</a>
              </p>
            </div>
            <div class="footer">
              <p>This email was sent by BugFixer.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `New Access Request: ${projectName}\n\n${requesterName} (${requesterEmail}) is requesting access to your project.\n\n${message ? `Message: ${message}\n\n` : ''}Visit your dashboard to review this request.`,
  }),
};

// Helper functions for sending specific emails
export const sendBugResolvedEmail = async (
  to: string,
  userName: string,
  bugTitle: string,
  projectName: string
): Promise<boolean> => {
  const template = emailTemplates.bugResolved(bugTitle, projectName, userName);
  return sendEmail({ to, ...template });
};

export const sendAccessRequestApprovedEmail = async (
  to: string,
  userName: string,
  projectName: string,
  role: string = 'MEMBER'
): Promise<boolean> => {
  const template = emailTemplates.accessRequestApproved(projectName, role);
  return sendEmail({ to, ...template });
};

export const sendAccessRequestRejectedEmail = async (
  to: string,
  userName: string,
  projectName: string
): Promise<boolean> => {
  const template = emailTemplates.accessRequestRejected(projectName);
  return sendEmail({ to, ...template });
};

export const sendNewAccessRequestEmail = async (
  to: string,
  ownerName: string,
  requesterName: string,
  projectName: string,
  message: string = ''
): Promise<boolean> => {
  const template = emailTemplates.newAccessRequest(projectName, requesterName, '', message);
  return sendEmail({ to, ...template });
};

export default transporter;
