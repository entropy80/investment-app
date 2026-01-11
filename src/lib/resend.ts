/**
 * Resend Email Service Configuration
 *
 * Initializes the Resend client for sending transactional emails
 */

import { Resend } from 'resend';

if (!process.env.RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is not defined in environment variables');
}

export const resend = new Resend(process.env.RESEND_API_KEY);

export const EMAIL_FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
