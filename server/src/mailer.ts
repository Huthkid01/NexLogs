import nodemailer from 'nodemailer';
import { env } from './env.js';

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser(),
        pass: env.smtpPass(),
      },
    });
  }
  return transporter;
}

export async function sendMail(input: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  const fromAddress = env.emailFromAddress || env.smtpUser();
  await getTransporter().sendMail({
    from: `"${env.emailFromName}" <${fromAddress}>`,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });
}
