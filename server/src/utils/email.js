import nodemailer from 'nodemailer';
import { logger } from '../middleware/logger.js';

let transporter = null;
let transporterResolved = false;

// Read env lazily (at call time, not import time) so the transporter is
// built after dotenv has loaded, regardless of module import order.
function getConfig() {
  return {
    FROM: process.env.EMAIL_FROM || process.env.SMTP_FROM || 'noreply@tasknija.com',
    HOST: process.env.SMTP_HOST || '',
    PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    USER: process.env.SMTP_USER || '',
    PASS: process.env.SMTP_PASS || '',
  };
}

function getTransporter() {
  if (transporterResolved) return transporter;
  transporterResolved = true;
  const { HOST, PORT, USER, PASS } = getConfig();
  if (HOST && USER) {
    try {
      transporter = nodemailer.createTransport({
        host: HOST,
        port: PORT,
        secure: PORT === 465,
        auth: { user: USER, pass: PASS },
      });
    } catch (err) {
      logger.warn({ err }, 'email transporter init failed, falling back to console');
      transporter = null;
    }
  }
  return transporter;
}

async function send({ to, subject, html }) {
  const t = getTransporter();
  if (t) {
    try {
      await t.sendMail({ from: getConfig().FROM, to, subject, html });
      logger.info({ to, subject }, 'email sent');
    } catch (err) {
      logger.warn({ err, to }, 'email send failed');
    }
  } else {
    logger.info({ to, subject }, 'email simulated (no SMTP configured)');
  }
}

/**
 * Generic email send used by the central notifications dispatcher.
 * Accepts plain text body. Logs to console in dev mode if SMTP is not configured.
 *
 * @param {object} opts
 * @param {string} opts.to       - Recipient email address
 * @param {string} opts.subject  - Email subject line
 * @param {string} opts.body     - Plain-text body
 */
export async function sendEmail({ to, subject, body }) {
  if (!to) return { sent: false, reason: 'no_recipient' };
  const t = getTransporter();
  const text = String(body || '');
  if (!t) {
    logger.info({ to, subject }, 'email simulated (no SMTP configured)');
    return { sent: true, dev: true };
  }
  try {
    await t.sendMail({ from: getConfig().FROM, to, subject, text });
    return { sent: true };
  } catch (err) {
    logger.warn({ err, to }, 'email send failed');
    return { sent: false, reason: 'send_failed', error: err.message };
  }
}

export async function sendWithdrawalRequestNotification({ email, name, amount, bankName, accountNumber }) {
  await send({
    to: email,
    subject: 'Withdrawal Request Received — TaskNija',
    html: `<h2>Withdrawal Request Received</h2>
<p>Hi ${name},</p>
<p>Your withdrawal request for <strong>₦${Number(amount).toLocaleString()}</strong> to <strong>${bankName} (${accountNumber})</strong> has been received.</p>
<p>Our admin team will review and process it shortly. You'll be notified once it's approved or rejected.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendWithdrawalApproved({ email, name, amount, bankName, accountNumber }) {
  await send({
    to: email,
    subject: 'Withdrawal Approved — TaskNija',
    html: `<h2>Withdrawal Approved ✅</h2>
<p>Hi ${name},</p>
<p>Your withdrawal of <strong>₦${Number(amount).toLocaleString()}</strong> to <strong>${bankName} (${accountNumber})</strong> has been approved!</p>
<p>The funds have been sent to your bank account. Please allow 1-3 business days for the transfer to reflect.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendWithdrawalRejected({ email, name, amount, reason }) {
  await send({
    to: email,
    subject: 'Withdrawal Rejected — TaskNija',
    html: `<h2>Withdrawal Rejected ❌</h2>
<p>Hi ${name},</p>
<p>Your withdrawal request for <strong>₦${Number(amount).toLocaleString()}</strong> was rejected.</p>
${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
<p>The amount has been refunded to your TaskNija wallet.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendDepositConfirmation({ email, name, amount, balance }) {
  await send({
    to: email,
    subject: 'Deposit Successful — TaskNija',
    html: `<h2>Deposit Successful 🎉</h2>
<p>Hi ${name},</p>
<p><strong>₦${Number(amount).toLocaleString()}</strong> has been deposited into your TaskNija wallet.</p>
<p>Your new balance is <strong>₦${Number(balance).toLocaleString()}</strong>.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendPasswordResetEmail({ email, resetUrl }) {
  await send({
    to: email,
    subject: 'Reset your TaskNija password',
    html: `<h2>Password Reset</h2>
<p>We received a request to reset your TaskNija password.</p>
<p><a href="${resetUrl}">Click here to reset your password</a></p>
<p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendVerificationEmail({ email, fullName }) {
  await send({
    to: email,
    subject: 'Welcome to TaskNija — verify your email',
    html: `<h2>Welcome to TaskNija${fullName ? `, ${fullName}` : ''}!</h2>
<p>Thanks for creating your account. Your email <strong>${email}</strong> is on file and you're ready to go.</p>
<p>You can now browse verified service providers, message vendors, and manage your bookings and wallet.</p>
<p>If this wasn't you, you can ignore this email — no further action is needed.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendMilestoneReleaseReceipt({ email, name, amount, fee, net, transactionId, milestoneTitle }) {
  await send({
    to: email,
    subject: 'Payment received — TaskNija milestone released',
    html: `<h2>Payment Received ✅</h2>
<p>Hi ${name},</p>
<p>A milestone payment has been released to your TaskNija wallet.</p>
${milestoneTitle ? `<p><strong>Milestone:</strong> ${milestoneTitle}</p>` : ''}
<p><strong>Gross amount:</strong> ₦${Number(amount).toLocaleString()}</p>
<p><strong>Platform fee:</strong> ₦${Number(fee || 0).toLocaleString()}</p>
<p><strong>Net credited to wallet:</strong> ₦${Number(net || 0).toLocaleString()}</p>
<p><strong>Transaction ID:</strong> ${transactionId}</p>
<p>The net amount is now available in your wallet for withdrawal.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}

export async function sendSubscriptionReceipt({ email, name, packageName, billingCycle, amount, reference }) {
  await send({
    to: email,
    subject: 'Subscription payment received — TaskNija',
    html: `<h2>Subscription Activated 🎉</h2>
<p>Hi ${name},</p>
<p>Thanks for subscribing to the <strong>${packageName}</strong> plan (${billingCycle}).</p>
<p><strong>Amount paid:</strong> ₦${Number(amount).toLocaleString()}</p>
<p><strong>Reference:</strong> ${reference}</p>
<p>Your subscription is now active and your business will enjoy boosted visibility.</p>
<p>Thanks,<br/>TaskNija Team</p>`,
  });
}
