import { prisma } from '../config/prisma.js';
import crypto from 'crypto';
import { getConfig } from '../utils/platformConfig.js';
import { setMilestones } from '../utils/escrowMilestones.js';
import { AppError } from '../middleware/errorHandler.js';
import { sanitizeText } from '../utils/sanitize.js';
import { atomicWalletUpdate } from '../utils/wallet.js';

// ============================================================
// Quote storage
// ------------------------------------------------------------
// The `quotes` table does not have a `milestones` or `accepted_at` column.
// Milestones are encoded inside the existing `terms` TEXT column as a JSON
// blob with a `__milestones` marker. Plain-text `terms` (when no milestones
// are present) are stored as-is.
// ============================================================

const MILESTONES_MARKER = '__milestones';

function packQuoteRow(quote) {
  const row = {
    id: quote.id,
    conversation_id: quote.conversation_id,
    vendor_id: quote.vendor_id,
    customer_id: quote.customer_id,
    business_id: quote.business_id || null,
    title: quote.title,
    description: quote.description || '',
    amount: parseFloat(quote.amount) || 0,
    status: quote.status || 'pending',
  };

  // Encode milestones (if any) + terms together in the `terms` column.
  if (quote.milestones && Array.isArray(quote.milestones) && quote.milestones.length > 0) {
    row.terms = JSON.stringify({
      [MILESTONES_MARKER]: true,
      text: quote.terms || '',
      milestones: quote.milestones,
    });
  } else {
    row.terms = quote.terms || null;
  }

  return row;
}

function unpackQuoteRow(row) {
  if (!row) return row;
  let milestones = null;
  let terms = row.terms || '';
  if (row.terms && typeof row.terms === 'string' && row.terms.startsWith('{')) {
    try {
      const parsed = JSON.parse(row.terms);
      if (parsed && parsed[MILESTONES_MARKER]) {
        milestones = parsed.milestones || null;
        terms = parsed.text || '';
      }
    } catch {
      // not JSON — keep as plain text
    }
  }
  return { ...row, milestones, terms };
}

async function dbFetchQuote(id) {
  const row = await prisma.quote.findUnique({ where: { id } });
  if (!row) return null;
  return unpackQuoteRow(row);
}

async function dbInsertQuote(row) {
  const data = await prisma.quote.create({ data: packQuoteRow(row) });
  return unpackQuoteRow(data);
}

async function dbUpdateQuote(id, patch) {
  // Re-read existing so we can re-pack milestones consistently.
  const existing = await dbFetchQuote(id);
  if (!existing) return null;
  const merged = { ...existing, ...patch };
  const data = await prisma.quote.update({
    where: { id },
    data: packQuoteRow(merged),
  });
  return unpackQuoteRow(data);
}

export async function createQuote(req, res, next) {
  try {
    const { conversationId, amount, milestones } = req.body;
    // Sanitize UGC fields (title, description, terms) before any persistence.
    const title = sanitizeText(req.body?.title);
    const description = sanitizeText(req.body?.description);
    const terms = sanitizeText(req.body?.terms);
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'vendor') {
      return res.status(403).json({ success: false, error: 'Only vendors can create quotes' });
    }

    // Verify conversation exists and user is the vendor
    const conversation = await prisma.conversation.findUnique({ where: { id: conversationId } });
    if (!conversation || conversation.vendor_id !== userId) {
      return res.status(403).json({ success: false, error: 'Not authorized for this conversation' });
    }

    let parsedMilestones = [];
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      parsedMilestones = milestones.map((m) => ({
        id: m.id || crypto.randomUUID(),
        description: m.description || '',
        amount: parseFloat(m.amount) || 0,
      }));
    }

    const totalAmount = parsedMilestones.length > 0
      ? parsedMilestones.reduce((sum, m) => sum + m.amount, 0)
      : parseFloat(amount);

    const quote = {
      id: crypto.randomUUID(),
      conversation_id: conversationId,
      vendor_id: userId,
      customer_id: conversation.customer_id,
      business_id: conversation.business_id,
      title,
      description: description || '',
      amount: totalAmount,
      status: 'pending',
      terms: terms || '',
      milestones: parsedMilestones.length > 0 ? parsedMilestones : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const stored = await dbInsertQuote(quote);

    const amtStr = parsedMilestones.length > 0
      ? `₦${totalAmount.toLocaleString()} (${parsedMilestones.length} milestones)`
      : `₦${totalAmount.toLocaleString()}`;

    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: conversationId,
        sender_id: userId,
        content: `📋 Quote sent: "${title}" — ${amtStr}`,
        message_type: 'text',
      },
    });

    return res.status(201).json({ success: true, data: stored });
  } catch (err) { next(err); }
}

export async function getConversationQuotes(req, res, next) {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const data = await prisma.quote.findMany({
      where: {
        conversation_id: conversationId,
        OR: [{ vendor_id: userId }, { customer_id: userId }],
      },
      orderBy: { created_at: 'desc' },
    });
    if (!data) throw new Error('query failed');

    const quotes = (data || []).map(unpackQuoteRow);
    return res.json({ success: true, data: quotes });
  } catch (err) { next(err); }
}

export async function acceptQuote(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Review #1.12: only customers (role='user') may accept quotes.
    if (req.user.role !== 'user') {
      throw new AppError(403, 'NOT_CUSTOMER', 'Only customers can accept quotes.');
    }

    const quote = await dbFetchQuote(id);
    if (!quote) {
      throw new AppError(404, 'NOT_FOUND', 'Quote not found.');
    }
    if (quote.customer_id !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Only the customer on this quote can accept it.');
    }
    if (!['pending', 'quoted'].includes(quote.status)) {
      throw new AppError(
        400,
        'INVALID_STATE',
        `Quote is in status '${quote.status}' and cannot be accepted.`
      );
    }

    // Fee rate from platform config (DB-backed, defaults to 5%).
    const feePercent = await getConfig('platform_fee_rate');
    const safeFeePercent = typeof feePercent === 'number' ? feePercent : 5;
    const feeFor = (amount) =>
      Math.round((parseFloat(amount) || 0) * (safeFeePercent / 100) * 100) / 100;

    // Build milestones. First one goes to 'held' (deducted from customer, NOT
    // yet released to vendor — this is the core escrow fix, review #1.3/#1.8).
    let txMilestones;
    if (quote.milestones && Array.isArray(quote.milestones) && quote.milestones.length > 0) {
      txMilestones = quote.milestones.map((m, i) => {
        const amount = parseFloat(m.amount) || 0;
        const isFirst = i === 0;
        return {
          id: m.id || crypto.randomUUID(),
          name: m.description || m.name || `Milestone ${i + 1}`,
          amount,
          status: isFirst ? 'held' : 'pending',
          platform_fee: feeFor(amount),
          held_at: isFirst ? new Date() : null,
          released_at: null,
          completed_at: null,
          cancelled_at: null,
        };
      });
    } else {
      // Single milestone: full amount, status 'held' (customer pays upfront).
      const amount = parseFloat(quote.amount) || 0;
      txMilestones = [
        {
          id: crypto.randomUUID(),
          name: 'Full payment',
          amount,
          status: 'held',
          platform_fee: feeFor(amount),
          held_at: new Date(),
          released_at: null,
          completed_at: null,
          cancelled_at: null,
        },
      ];
    }

    const totalAmount = txMilestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const totalFee = txMilestones.reduce((sum, m) => sum + (m.platform_fee || 0), 0);
    const firstMs = txMilestones[0];

    // Atomic debit of customer's wallet for the first milestone. Raises on
    // insufficient balance.
    let debitedWallet;
    try {
      debitedWallet = await atomicWalletUpdate({
        userId: quote.customer_id,
        delta: -firstMs.amount,
        kind: 'milestone_hold',
      });
    } catch (err) {
      if (/insufficient_balance/.test(err.message) || err.code === 'P0001') {
        throw new AppError(
          400,
          'INSUFFICIENT_BALANCE',
          'Insufficient wallet balance for the first milestone.'
        );
      }
      throw err;
    }

    // Create the transaction row in 'escrow' status.
    const txId = crypto.randomUUID();
    let transaction;
    try {
      transaction = await prisma.transaction.create({
        data: {
          id: txId,
          customer_id: quote.customer_id,
          vendor_id: quote.vendor_id,
          business_id: quote.business_id,
          amount: totalAmount,
          platform_fee: totalFee,
          status: 'escrow',
          quote_id: id,
          milestones_enabled: txMilestones.length > 1,
          total_milestones: txMilestones.length,
          completed_milestones: 0,
        },
      });
    } catch (txError) {
      // Best-effort refund before propagating the failure.
      try {
        await atomicWalletUpdate({
          userId: quote.customer_id,
          delta: firstMs.amount,
          kind: 'milestone_hold_refund',
        });
      } catch (refundErr) {
        req.log?.error?.({ err: refundErr, txId }, 'milestone_hold_refund_failed');
      }
      throw txError;
    }

    // Persist milestones (DB-only via setMilestones).
    await setMilestones(txId, txMilestones);

    // Audit row in wallet_transactions for the debit.
    if (debitedWallet) {
      await prisma.walletTransaction.create({
        data: {
          id: crypto.randomUUID(),
          wallet_id: debitedWallet.id,
          user_id: quote.customer_id,
          type: 'escrow_hold',
          amount: firstMs.amount,
          balance_before: parseFloat(debitedWallet.balance) + firstMs.amount,
          balance_after: parseFloat(debitedWallet.balance),
          reference_id: txId,
          reference_type: 'milestone_hold',
          description: `Escrow hold for first milestone of "${quote.title}"`,
        },
      });
    }

    // Mark quote accepted in DB.
    await dbUpdateQuote(id, {
      status: 'accepted',
      updated_at: new Date().toISOString(),
    });

    // Conversation notification.
    const remaining = txMilestones.length - 1;
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: quote.conversation_id,
        sender_id: userId,
        content:
          `✅ Quote accepted: "${quote.title}" — ₦${totalAmount.toLocaleString()}. ` +
          `First milestone of ₦${firstMs.amount.toLocaleString()} held in escrow. ` +
          `Remaining milestones: ${remaining}.`,
        message_type: 'text',
      },
    });

    req.log?.info?.(
      {
        vendorId: quote.vendor_id,
        customerId: quote.customer_id,
        txId,
        firstMilestoneId: firstMs.id,
        amount: firstMs.amount,
      },
      'quote.accepted'
    );

    // NOTE: vendor wallet is NOT credited here. Funds remain in platform
    // escrow until the customer confirms the milestone (confirmMilestone).
    return res.json({
      success: true,
      data: {
        transaction_id: txId,
        first_milestone: firstMs,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function rejectQuote(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const quote = await dbFetchQuote(id);
    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }
    if (quote.customer_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the customer can reject this quote' });
    }
    if (quote.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Quote is not pending' });
    }

    const updated = await dbUpdateQuote(id, {
      status: 'rejected',
      updated_at: new Date().toISOString(),
    });

    // Notification message
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: quote.conversation_id,
        sender_id: userId,
        content: `❌ Quote rejected: "${quote.title}"`,
        message_type: 'text',
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}

export async function cancelQuote(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const quote = await dbFetchQuote(id);
    if (!quote) {
      return res.status(404).json({ success: false, error: 'Quote not found' });
    }
    if (quote.vendor_id !== userId) {
      return res.status(403).json({ success: false, error: 'Only the vendor can cancel this quote' });
    }
    if (quote.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Quote is not pending' });
    }

    const updated = await dbUpdateQuote(id, {
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    });

    // Notification message
    await prisma.message.create({
      data: {
        id: crypto.randomUUID(),
        conversation_id: quote.conversation_id,
        sender_id: userId,
        content: `🗑️ Quote cancelled: "${quote.title}"`,
        message_type: 'text',
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) { next(err); }
}
