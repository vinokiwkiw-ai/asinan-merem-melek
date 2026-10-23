import { db } from '../db/index.ts'

export interface MembershipSummary {
  customerId: string
  totalPoints: number
  transactionsCount: number
  history: {
    id: string
    points: number
    transactionType: 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRED'
    referenceId: string
    balanceAfter: number
    reason: string
    createdAt: string
  }[]
}

export class MembershipService {
  /**
   * Authoritative loyalty points calculation formula:
   * Setiap pembelian produk Rp 100.000 memperoleh 100 poin, berlaku kelipatan.
   * Poin diperoleh = floor(nominal pembelian yang memenuhi syarat / 100.000) × 100
   * Digunakan integer IDR untuk mencegah kesalahan pembulatan.
   */
  static calculateEligiblePoints(productSpendAfterDiscount: number): number {
    if (productSpendAfterDiscount < 100000) return 0
    return Math.floor(productSpendAfterDiscount / 100000) * 100
  }

  /**
   * Idempotently award loyalty points for an eligible order.
   * Guards against duplicate webhooks, page refreshes, and concurrent requests.
   */
  static awardOrderPoints(params: {
    orderNumber: string
    customerId: string
    subtotal: number
    discount: number
  }): { awarded: boolean; points: number; newBalance: number } {
    const { orderNumber, customerId, subtotal, discount } = params

    // 1. Idempotency check: verify if EARN ledger entry already exists for this order
    const existingLedger = db.queryOne<{ id: string }>(
      `SELECT id FROM membership_ledger WHERE reference_id = ? AND transaction_type = 'EARN'`,
      [orderNumber]
    )

    if (existingLedger) {
      return {
        awarded: false,
        points: 0,
        newBalance: this.getCustomerBalance(customerId),
      }
    }

    // 2. Calculate eligible spend on products after discount (excluding delivery & gift fees)
    const eligibleSpend = Math.max(0, subtotal - discount)
    const pointsToAward = this.calculateEligiblePoints(eligibleSpend)

    if (pointsToAward <= 0) {
      return {
        awarded: false,
        points: 0,
        newBalance: this.getCustomerBalance(customerId),
      }
    }

    // 3. Atomically insert into immutable ledger
    return db.transaction(() => {
      // Re-check inside transaction for concurrent safety
      const doubleCheck = db.queryOne<{ id: string }>(
        `SELECT id FROM membership_ledger WHERE reference_id = ? AND transaction_type = 'EARN'`,
        [orderNumber]
      )
      if (doubleCheck) {
        return {
          awarded: false,
          points: 0,
          newBalance: this.getCustomerBalance(customerId),
        }
      }

      const currentBalance = this.getCustomerBalance(customerId)
      const newBalance = currentBalance + pointsToAward
      const nowStr = new Date().toISOString()
      const ledgerId = `ledg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

      try {
        db.run(
          `INSERT INTO membership_ledger (
            id, customer_id, points, transaction_type, reference_id, balance_after, reason, created_at
          ) VALUES (?, ?, ?, 'EARN', ?, ?, ?, ?)`,
          [
            ledgerId,
            customerId,
            pointsToAward,
            orderNumber,
            newBalance,
            `Poin loyalitas dari pesanan ${orderNumber} (Belanja produk Rp ${eligibleSpend.toLocaleString('id-ID')})`,
            nowStr,
          ]
        )
      } catch (err: any) {
        if (err.message?.includes('UNIQUE') || err.code === 'SQLITE_CONSTRAINT') {
          return {
            awarded: false,
            points: 0,
            newBalance: this.getCustomerBalance(customerId),
          }
        }
        throw err
      }

      return {
        awarded: true,
        points: pointsToAward,
        newBalance,
      }
    })
  }

  /**
   * Idempotently reverse points if an order is refunded, cancelled, or returned.
   * Creates an AUDIT-logged negative adjustment ledger entry.
   */
  static reverseOrderPoints(params: {
    orderNumber: string
    customerId: string
    reason?: string
    adminId?: string
    adminName?: string
  }): { reversed: boolean; pointsReversed: number; newBalance: number } {
    const {
      orderNumber,
      customerId,
      reason = 'Pesanan dibatalkan atau direfund',
      adminId = 'system',
      adminName = 'Sistem AMM',
    } = params

    // 1. Find original EARN ledger entry
    const earnEntry = db.queryOne<{ id: string; points: number }>(
      `SELECT id, points FROM membership_ledger WHERE reference_id = ? AND transaction_type = 'EARN'`,
      [orderNumber]
    )

    if (!earnEntry || earnEntry.points <= 0) {
      return {
        reversed: false,
        pointsReversed: 0,
        newBalance: this.getCustomerBalance(customerId),
      }
    }

    // 2. Check if already reversed for this order
    const existingReversal = db.queryOne<{ id: string }>(
      `SELECT id FROM membership_ledger WHERE reference_id = ? AND transaction_type = 'ADJUSTMENT' AND points < 0`,
      [`reversal_${orderNumber}`]
    )

    if (existingReversal) {
      return {
        reversed: false,
        pointsReversed: 0,
        newBalance: this.getCustomerBalance(customerId),
      }
    }

    return db.transaction(() => {
      const currentBalance = this.getCustomerBalance(customerId)
      const pointsToReverse = earnEntry.points
      const newBalance = Math.max(0, currentBalance - pointsToReverse)
      const nowStr = new Date().toISOString()
      const ledgerId = `ledg_rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`

      db.run(
        `INSERT INTO membership_ledger (
          id, customer_id, points, transaction_type, reference_id, balance_after, reason, created_at
        ) VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?)`,
        [
          ledgerId,
          customerId,
          -pointsToReverse,
          `reversal_${orderNumber}`,
          newBalance,
          `Pembatalan poin pesanan ${orderNumber}: ${reason}`,
          nowStr,
        ]
      )

      // Audit log
      db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `aud_${Date.now()}`,
          adminId,
          adminName,
          'REVERSE_LOYALTY_POINTS',
          'ORDER',
          orderNumber,
          JSON.stringify({ orderNumber, customerId, pointsReversed: pointsToReverse, reason, newBalance }),
          nowStr,
        ]
      )

      return {
        reversed: true,
        pointsReversed: pointsToReverse,
        newBalance,
      }
    })
  }

  /**
   * Get customer current points balance strictly computed from the immutable ledger
   */
  static getCustomerBalance(customerId: string): number {
    const row = db.queryOne<{ balance: number }>(
      'SELECT COALESCE(SUM(points), 0) as balance FROM membership_ledger WHERE customer_id = ?',
      [customerId]
    )
    return row ? Number(row.balance) : 0
  }

  /**
   * Get detailed points ledger summary
   */
  static getCustomerSummary(customerId: string): MembershipSummary {
    const totalPoints = this.getCustomerBalance(customerId)
    const history = db.query<{
      id: string
      points: number
      transaction_type: 'EARN' | 'REDEEM' | 'ADJUSTMENT' | 'EXPIRED'
      reference_id: string
      balance_after: number
      reason: string
      created_at: string
    }>(
      'SELECT * FROM membership_ledger WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50',
      [customerId]
    )

    return {
      customerId,
      totalPoints,
      transactionsCount: history.length,
      history: history.map((h) => ({
        id: h.id,
        points: h.points,
        transactionType: h.transaction_type,
        referenceId: h.reference_id,
        balanceAfter: h.balance_after,
        reason: h.reason,
        createdAt: h.created_at,
      })),
    }
  }

  /**
   * Redeem points for a reward voucher
   */
  static redeemReward(params: {
    customerId: string
    rewardId: string
  }): { success: boolean; rewardName: string; discountCode: string; remainingPoints: number } {
    const { customerId, rewardId } = params

    return db.transaction(() => {
      const reward = db.queryOne<{
        id: string
        title: string
        points_required: number
        discount_amount: number
        is_active: number
      }>('SELECT * FROM rewards WHERE id = ?', [rewardId])

      if (!reward || !reward.is_active) {
        throw new Error('Hadiah reward tidak tersedia.')
      }

      const currentBalance = this.getCustomerBalance(customerId)
      if (currentBalance < reward.points_required) {
        throw new Error(
          `Poin Anda tidak mencukupi (${currentBalance} poin). Diperlukan ${reward.points_required} poin.`
        )
      }

      const newBalance = currentBalance - reward.points_required
      const nowStr = new Date().toISOString()
      const codeSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
      const discountCode = `REW-${codeSuffix}`

      // Create personal voucher
      db.run(
        `INSERT INTO vouchers (
          id, code, discount_type, discount_value, min_spend, max_discount, usage_limit, is_active
        ) VALUES (?, ?, 'FIXED', ?, 0, ?, 1, 1)`,
        [`vouch_${Date.now()}`, discountCode, reward.discount_amount, reward.discount_amount]
      )

      // Record in immutable ledger
      db.run(
        `INSERT INTO membership_ledger (
          id, customer_id, points, transaction_type, reference_id, balance_after, reason, created_at
        ) VALUES (?, ?, ?, 'REDEEM', ?, ?, ?, ?)`,
        [
          `ledg_${Date.now()}`,
          customerId,
          -reward.points_required,
          reward.id,
          newBalance,
          `Penukaran reward: ${reward.title} (Voucher ${discountCode})`,
          nowStr,
        ]
      )

      return {
        success: true,
        rewardName: reward.title,
        discountCode,
        remainingPoints: newBalance,
      }
    })
  }

  /**
   * Admin manual points adjustment with mandatory audit log
   */
  static adjustPoints(params: {
    customerId: string
    pointsDelta: number
    reason: string
    adminId: string
    adminName: string
  }): { success: boolean; newBalance: number } {
    const { customerId, pointsDelta, reason, adminId, adminName } = params

    if (!reason || reason.trim().length < 5) {
      throw new Error('Alasan penyesuaian poin wajib diisi (minimal 5 karakter).')
    }

    return db.transaction(() => {
      const currentBalance = this.getCustomerBalance(customerId)
      const newBalance = currentBalance + pointsDelta

      if (newBalance < 0) {
        throw new Error(`Penyesuaian tidak dapat menghasilkan saldo negatif (${newBalance}).`)
      }

      const nowStr = new Date().toISOString()

      db.run(
        `INSERT INTO membership_ledger (
          id, customer_id, points, transaction_type, reference_id, balance_after, reason, created_at
        ) VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?, ?, ?)`,
        [
          `ledg_${Date.now()}`,
          customerId,
          pointsDelta,
          adminId,
          newBalance,
          `Penyesuaian manual oleh ${adminName}: ${reason.trim()}`,
          nowStr,
        ]
      )

      db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `aud_${Date.now()}`,
          adminId,
          adminName,
          'ADJUST_MEMBERSHIP_POINTS',
          'CUSTOMER',
          customerId,
          JSON.stringify({ pointsDelta, reason, newBalance }),
          nowStr,
        ]
      )

      return {
        success: true,
        newBalance,
      }
    })
  }
}
