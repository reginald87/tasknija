import crypto from 'crypto';

const PAYSTACK_SECRET_KEY = process.env.PAYMENT_SECRET_KEY || process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_API = 'https://api.paystack.co';

/**
 * Verify a Paystack webhook signature (HMAC SHA512 of the raw body).
 * Uses a timing-safe comparison to prevent timing attacks.
 *
 * @param {Buffer|string} rawBody - Raw request body (NOT parsed JSON).
 * @param {string|undefined} signature - Value of x-paystack-signature header.
 * @returns {boolean} true when signature is valid; false otherwise.
 */
export function verifyPaystackSignature(rawBody, signature) {
  const secret = process.env.PAYSTACK_SECRET_KEY || process.env.PAYMENT_SECRET_KEY || '';
  if (!secret) return false;
  if (!signature || typeof signature !== 'string') return false;
  if (!rawBody) return false;

  const computed = crypto
    .createHmac('sha512', secret)
    .update(rawBody)
    .digest('hex');

  // timing-safe comparison — requires equal-length buffers.
  let computedBuf;
  let sigBuf;
  try {
    computedBuf = Buffer.from(computed, 'hex');
    sigBuf = Buffer.from(signature, 'hex');
  } catch {
    return false;
  }
  if (computedBuf.length !== sigBuf.length) return false;
  try {
    return crypto.timingSafeEqual(computedBuf, sigBuf);
  } catch {
    return false;
  }
}

async function paystackRequest(method, path, body) {
  if (!PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY is not configured on the server.');
  }
  const res = await fetch(`${PAYSTACK_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let json;
  try {
    json = await res.json();
  } catch {
    json = {};
  }

  // Attach the HTTP status so callers can distinguish auth/validation
  // failures from successes instead of masking them as a generic error.
  return { ...json, httpStatus: res.status };
}

export async function initializeDeposit({ email, amount, reference, userId, channels }) {
  const response = await paystackRequest('POST', '/transaction/initialize', {
    email,
    amount: Math.round(amount * 100),
    reference,
    metadata: { userId },
    ...(Array.isArray(channels) && channels.length ? { channels } : {}),
    callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/wallet/verify`,
  });
  return response;
}

export async function initializeSubscriptionPayment({ email, amount, reference, userId, subscriptionId, packageName, billingCycle }) {
  const response = await paystackRequest('POST', '/transaction/initialize', {
    email,
    amount: Math.round(amount * 100),
    reference,
    metadata: { userId, subscriptionId, purpose: 'subscription', packageName, billingCycle },
    callback_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/subscription/verify`,
  });
  return response;
}

export async function verifyPayment(reference) {
  const response = await paystackRequest('GET', `/transaction/verify/${reference}`);
  return response;
}

export async function listBanks(country = 'nigeria') {
  const response = await paystackRequest('GET', `/bank?country=${country}`);
  return response;
}

export async function resolveAccountNumber(accountNumber, bankCode) {
  const response = await paystackRequest('GET', `/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`);
  return response;
}

export async function createTransferRecipient({ name, accountNumber, bankCode }) {
  const response = await paystackRequest('POST', '/transferrecipient', {
    type: 'nuban',
    name,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: 'NGN',
  });
  return response;
}

export async function initiateTransfer({ amount, recipientCode, reason }) {
  const response = await paystackRequest('POST', '/transfer', {
    source: 'balance',
    amount: Math.round(amount * 100),
    recipient: recipientCode,
    reason: reason || 'TaskNija withdrawal',
  });
  return response;
}
