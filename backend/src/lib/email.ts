import nodemailer from 'nodemailer';
import { env } from '../config/env';

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (transporter) {
    return transporter;
  }

  if (env.EMAIL_HOST && env.EMAIL_USER && env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
      host: env.EMAIL_HOST,
      port: env.EMAIL_PORT,
      secure: env.EMAIL_PORT === 465,
      auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
    });
  }

  return transporter;
}

export async function sendEmail(options: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<void> {
  const t = getTransporter();

  if (!t) {
    const sanitizedText = options.text.replace(/token=[a-f0-9]{64}/gi, 'token=[REDACTED]');
    console.log(`[email] No SMTP configured. Would send to ${options.to}:`);
    console.log(`[email] Subject: ${options.subject}`);
    console.log(`[email] Body: ${sanitizedText}`);
    return;
  }

  await t.sendMail({
    from: env.EMAIL_FROM,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
  });
}

export async function sendPasswordResetEmail(
  email: string,
  resetLink: string
): Promise<void> {
  await sendEmail({
    to: email,
    subject: 'Reset your Whatta Cup password',
    text: `You requested a password reset. Click the link to reset your password: ${resetLink}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, please ignore this email.`,
    html: `<p>You requested a password reset. Click the link below to reset your password:</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 15 minutes.</p><p>If you didn't request this, please ignore this email.</p>`,
  });
}
