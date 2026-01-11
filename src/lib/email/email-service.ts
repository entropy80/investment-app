/**
 * Email Service - Transactional Email Handlers
 *
 * Provides functions for sending various types of emails using Resend
 */

import { resend, EMAIL_FROM } from '@/lib/resend';

// Base URL for email links - uses NEXT_PUBLIC_APP_URL in production
const getBaseUrl = () => process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';

export type EmailTemplate =
  | 'welcome'
  | 'verification'
  | 'password-reset'
  | 'two-factor-code'
  | 'admin-notification';

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error('Error sending email:', error);
      return { success: false, error };
    }

    console.log('Email sent successfully:', data?.id);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { success: false, error };
  }
}

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(to: string, name: string) {
  const subject = 'Welcome to Investment App!';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to Investment App!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Thank you for joining Investment App! We're excited to have you on board.
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Your account has been successfully created. You now have access to all our educational content, broker reviews, and portfolio tracking tools.
          </p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
            <h3 style="margin-top: 0; color: #667eea;">Getting Started</h3>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li style="margin-bottom: 10px;">Set up your first portfolio to track your investments</li>
              <li style="margin-bottom: 10px;">Explore our educational articles and guides</li>
              <li style="margin-bottom: 10px;">Check out our broker reviews</li>
            </ul>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${getBaseUrl()}/dashboard" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Dashboard</a>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
            If you have any questions, feel free to reach out to our support team.
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2025 Investment App. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Welcome to Investment App!

Hi ${name},

Thank you for joining Investment App! We're excited to have you on board.

Your account has been successfully created. You now have access to all our educational content, broker reviews, and portfolio tracking tools.

Getting Started:
- Set up your first portfolio to track your investments
- Explore our educational articles and guides
- Check out our broker reviews

Visit your dashboard: ${getBaseUrl()}/dashboard

If you have any questions, feel free to reach out to our support team.

(c) 2025 Investment App. All rights reserved.
  `;

  return sendEmail({ to, subject, html, text });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(to: string, name: string, token: string) {
  const resetUrl = `${getBaseUrl()}/auth/reset-password?token=${token}`;
  const subject = 'Reset Your Password';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Reset Your Password</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            We received a request to reset your password for your Investment App account.
          </p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background: #667eea; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
          </div>
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b;">
            <p style="font-size: 13px; color: #92400e; margin: 0;">
              <strong>This link expires in 1 hour.</strong> If you didn't request a password reset, you can safely ignore this email.
            </p>
          </div>
          <p style="font-size: 14px; color: #666; margin-top: 20px;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="font-size: 12px; color: #999; word-break: break-all;">
            ${resetUrl}
          </p>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2025 Investment App. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Reset Your Password

Hi ${name},

We received a request to reset your password for your Investment App account.

Click the link below to create a new password:
${resetUrl}

This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.

(c) 2025 Investment App. All rights reserved.
  `;

  return sendEmail({ to, subject, html, text });
}

/**
 * Send two-factor authentication code
 */
export async function send2FACode(to: string, name: string, code: string) {
  const subject = 'Your Two-Factor Authentication Code';
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #1e293b; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 28px;">Two-Factor Authentication</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
          <p style="font-size: 16px; margin-bottom: 20px;">Hi ${name},</p>
          <p style="font-size: 16px; margin-bottom: 20px;">
            You requested a two-factor authentication code to sign in to your account.
          </p>
          <div style="background: white; padding: 30px; border-radius: 8px; margin: 25px 0; text-align: center; border: 2px solid #667eea;">
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your verification code is:</p>
            <p style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #1e293b; margin: 10px 0; font-family: 'Courier New', monospace;">${code}</p>
            <p style="font-size: 12px; color: #999; margin-top: 10px;">This code expires in 10 minutes</p>
          </div>
          <p style="font-size: 14px; color: #666;">
            If you didn't request this code, please ignore this email or contact support if you have concerns.
          </p>
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin-top: 20px; border-left: 4px solid #f59e0b;">
            <p style="font-size: 13px; color: #92400e; margin: 0;">
              <strong>Security Tip:</strong> Never share this code with anyone. We will never ask you for this code.
            </p>
          </div>
        </div>
        <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
          <p>&copy; 2025 Investment App. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
Two-Factor Authentication Code

Hi ${name},

You requested a two-factor authentication code to sign in to your account.

Your verification code is: ${code}

This code expires in 10 minutes.

If you didn't request this code, please ignore this email or contact support if you have concerns.

Security Tip: Never share this code with anyone. We will never ask you for this code.

(c) 2025 Investment App. All rights reserved.
  `;

  return sendEmail({ to, subject, html, text });
}
