import { prisma } from '../config/prisma.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * App-level replacement for the Postgres `atomic_wallet_update` RPC.
 *
 * Atomically adjusts a user's wallet balance inside a transaction and writes a
 * wallet_transactions audit row. Raises on insufficient balance or missing wallet.
 *
 * @returns the updated wallet row (with `balance`). Throws on failure.
 */
export async function atomicWalletUpdate({ userId, delta, kind, referenceId, referenceType, description }) {
  return prisma.$transaction(async (tx) => {
    const wallet = await tx.wallet.findUnique({ where: { user_id: userId } });
    if (!wallet) {
      const err = new Error('wallet_not_found');
      err.code = 'P0002';
      throw err;
    }
    const newBalance = wallet.balance + delta;
    if (newBalance < 0) {
      const err = new Error('insufficient_balance');
      err.code = 'P0001';
      throw err;
    }
    const updated = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance, updated_at: new Date() }
    });
    await tx.walletTransaction.create({
      data: {
        wallet_id: wallet.id,
        user_id: userId,
        type: kind || 'adjustment',
        amount: delta,
        balance_before: wallet.balance,
        balance_after: newBalance,
        reference_id: referenceId || null,
        reference_type: referenceType || null,
        description: description || null
      }
    });
    return updated;
  });
}

/**
 * App-level replacement for the Postgres `atomic_wallet_credit` RPC.
 *
 * Idempotent: the unique (reference_id, reference_type) on wallet_transactions
 * prevents double-credit. On conflict we re-read the existing wallet state and
 * return the latest balance.
 *
 * @returns the wallet_transactions row (with `balance` reflecting current wallet).
 */
export async function atomicWalletCredit({ userId, amount, referenceId, referenceType, description }) {
  // Ensure wallet exists.
  await prisma.$transaction(async (tx) => {
    const existing = await tx.wallet.findUnique({ where: { user_id: userId } });
    if (!existing) {
      await tx.wallet.create({ data: { user_id: userId, balance: 0 } });
    }
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const wallet = await tx.wallet.findUnique({ where: { user_id: userId } });
      const newBalance = wallet.balance + amount;
      const updated = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance, updated_at: new Date() }
      });
      const wt = await tx.walletTransaction.create({
        data: {
          wallet_id: wallet.id,
          user_id: userId,
          type: 'deposit',
          amount,
          balance_before: wallet.balance,
          balance_after: newBalance,
          reference_id: referenceId || null,
          reference_type: referenceType || null,
          description: description || null
        }
      });
      return { ...wt, balance: updated.balance, wallet: updated };
    });
  } catch (err) {
    // Unique violation => already credited (idempotent). Return current wallet.
    if (err?.code === 'P2002') {
      const wallet = await prisma.wallet.findUnique({ where: { user_id: userId } });
      return { id: null, balance: wallet?.balance ?? 0, wallet, duplicate: true };
    }
    throw err;
  }
}

/**
 * App-level replacement for the Postgres `hold_escrow` RPC.
 *
 * Validates business/customer exist and not self, debits the customer wallet for
 * the full amount (raises on insufficient balance), and creates the transaction
 * row in 'escrow' status. Returns the created transaction row.
 */
export async function holdEscrow({ customerId, businessId, amount, platformFee, conversationId, quoteId }) {
  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUnique({ where: { id: businessId } });
    if (!business) {
      const err = new Error('business_not_found');
      err.code = 'P0002';
      throw err;
    }
    if (business.owner_id === customerId) {
      const err = new Error('self_transaction_forbidden');
      err.code = 'P0001';
      throw err;
    }

    const customerWallet = await tx.wallet.findUnique({ where: { user_id: customerId } });
    if (!customerWallet) {
      const err = new Error('wallet_not_found');
      err.code = 'P0002';
      throw err;
    }
    if (customerWallet.balance < amount) {
      const err = new Error('insufficient_balance');
      err.code = 'P0001';
      throw err;
    }

    const newBalance = customerWallet.balance - amount;
    await tx.wallet.update({
      where: { id: customerWallet.id },
      data: { balance: newBalance, updated_at: new Date() }
    });
    await tx.walletTransaction.create({
      data: {
        wallet_id: customerWallet.id,
        user_id: customerId,
        type: 'escrow_hold',
        amount: -amount,
        balance_before: customerWallet.balance,
        balance_after: newBalance,
        reference_id: null,
        reference_type: 'escrow_hold',
        description: `Escrow hold for business ${businessId}`
      }
    });

    const txn = await tx.transaction.create({
      data: {
        customer_id: customerId,
        vendor_id: business.owner_id,
        business_id: businessId,
        amount,
        platform_fee: platformFee,
        status: 'escrow',
        quote_id: quoteId || null,
        held_at: new Date()
      }
    });
    return txn;
  });
}

/**
 * App-level replacement for the Postgres `release_milestone_to_vendor` RPC.
 *
 * Credits the vendor wallet with (amount - platform_fee) and marks the milestone
 * 'released' (idempotent: skips if already released). Returns the milestone row.
 */
export async function releaseMilestoneToVendor({ milestoneId }) {
  return prisma.$transaction(async (tx) => {
    const ms = await tx.escrowMilestone.findUnique({
      where: { id: milestoneId },
      include: { transaction: true }
    });
    if (!ms) {
      const err = new Error('milestone_not_found');
      err.code = 'P0002';
      throw err;
    }
    if (ms.status === 'released') {
      return ms; // idempotent
    }
    const vendorId = ms.transaction?.vendor_id;
    if (!vendorId) {
      const err = new Error('vendor_not_found');
      err.code = 'P0002';
      throw err;
    }
    const vendorWallet = await tx.wallet.findUnique({ where: { user_id: vendorId } });
    if (!vendorWallet) {
      const err = new Error('wallet_not_found');
      err.code = 'P0002';
      throw err;
    }
    const net = ms.amount - (ms.platform_fee || 0);
    const newBalance = vendorWallet.balance + net;
    await tx.wallet.update({
      where: { id: vendorWallet.id },
      data: { balance: newBalance, updated_at: new Date() }
    });
    await tx.walletTransaction.create({
      data: {
        wallet_id: vendorWallet.id,
        user_id: vendorId,
        type: 'escrow_release',
        amount: net,
        balance_before: vendorWallet.balance,
        balance_after: newBalance,
        reference_id: ms.transaction_id,
        reference_type: 'milestone_release',
        description: `Milestone release: ${ms.name}`
      }
    });
    const updated = await tx.escrowMilestone.update({
      where: { id: ms.id },
      data: { status: 'released', released_at: new Date(), updated_at: new Date() }
    });
    return updated;
  });
}
