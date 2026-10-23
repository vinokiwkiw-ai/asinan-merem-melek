import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'
import crypto from 'node:crypto'

/**
 * GET: Fetch vouchers with usage counts and detailed usage audit history
 */
export async function GET(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(req.url)
    const voucherId = searchParams.get('voucherId')?.trim()
    const includeArchived = searchParams.get('includeArchived') === 'true'

    // Case 1: Specific voucher usages history
    if (voucherId) {
      const voucher = db.queryOne<any>('SELECT * FROM vouchers WHERE id = ?', [voucherId])
      if (!voucher) {
        return NextResponse.json({ error: 'Voucher tidak ditemukan.' }, { status: 404 })
      }

      const usages = db.query<any>(
        `SELECT vu.*, o.order_number, o.customer_name, o.customer_phone, o.total as order_total, o.created_at as order_created_at
         FROM voucher_usages vu
         LEFT JOIN orders o ON vu.order_id = o.id
         WHERE vu.voucher_id = ? OR vu.voucher_code = ?
         ORDER BY vu.used_at DESC`,
        [voucherId, voucher.code]
      )

      return NextResponse.json({
        voucher,
        totalUsages: usages.length,
        totalDiscountGiven: usages.reduce((sum, u) => sum + (u.discount_amount || 0), 0),
        usages,
      })
    }

    // Case 2: List all vouchers
    let sql = 'SELECT * FROM vouchers'
    if (!includeArchived) {
      sql += ' WHERE is_archived = 0'
    }
    sql += ' ORDER BY is_active DESC, is_archived ASC, created_at DESC, code ASC'

    const vouchers = db.query<any>(sql)

    // Enrich each voucher with real usages count from voucher_usages
    const enriched = vouchers.map((v) => {
      const usageRow = db.queryOne<{ cnt: number; total_discount: number }>(
        'SELECT COUNT(*) as cnt, COALESCE(SUM(discount_amount), 0) as total_discount FROM voucher_usages WHERE voucher_id = ? OR voucher_code = ?',
        [v.id, v.code]
      )
      return {
        ...v,
        times_used: Math.max(v.times_used || 0, usageRow ? Number(usageRow.cnt) : 0),
        total_discount_given: usageRow ? Number(usageRow.total_discount) : 0,
      }
    })

    return NextResponse.json({ vouchers: enriched })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat voucher.' }, { status: 500 })
  }
}

/**
 * POST: Create a new voucher with strict validation
 */
export async function POST(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const {
      name,
      code,
      description,
      discount_type,
      discount_value,
      min_spend = 0,
      max_discount = 0,
      usage_limit = 100,
      usage_limit_per_customer = 1,
      start_date,
      end_date,
      is_active = 1,
    } = body

    if (!code || typeof code !== 'string' || code.trim().length < 3) {
      return NextResponse.json({ error: 'Kode voucher wajib diisi (minimal 3 karakter).' }, { status: 400 })
    }

    const normalizedCode = code.trim().toUpperCase()

    if (discount_type !== 'PERCENT' && discount_type !== 'FIXED') {
      return NextResponse.json({ error: 'Tipe diskon harus PERCENT atau FIXED.' }, { status: 400 })
    }

    const numDiscountValue = Number(discount_value)
    if (isNaN(numDiscountValue) || numDiscountValue <= 0) {
      return NextResponse.json({ error: 'Nilai diskon harus berupa angka lebih dari 0.' }, { status: 400 })
    }

    if (discount_type === 'PERCENT' && numDiscountValue > 100) {
      return NextResponse.json({ error: 'Diskon persentase tidak boleh melebihi 100%.' }, { status: 400 })
    }

    const numMinSpend = Math.max(0, Number(min_spend) || 0)
    const numMaxDiscount = Math.max(0, Number(max_discount) || 0)
    const numUsageLimit = Math.max(1, Number(usage_limit) || 100)
    const numPerCustLimit = Math.max(1, Number(usage_limit_per_customer) || 1)

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return NextResponse.json({ error: 'Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.' }, { status: 400 })
    }

    // Check duplicate active code
    const existing = db.queryOne<{ id: string }>(
      'SELECT id FROM vouchers WHERE code = ? AND is_archived = 0',
      [normalizedCode]
    )
    if (existing) {
      return NextResponse.json(
        { error: `Kode voucher "${normalizedCode}" sudah digunakan. Silakan gunakan kode unik lain.` },
        { status: 400 }
      )
    }

    const vouchId = `vouch_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`
    const nowStr = new Date().toISOString()
    const voucherName = (name || normalizedCode).trim()

    db.run(
      `INSERT INTO vouchers (
        id, code, name, description, discount_type, discount_value, min_spend, max_discount,
        usage_limit, usage_limit_per_customer, times_used, start_date, end_date,
        is_active, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 0, ?, ?)`,
      [
        vouchId,
        normalizedCode,
        voucherName,
        description?.trim() || null,
        discount_type,
        numDiscountValue,
        numMinSpend,
        numMaxDiscount,
        numUsageLimit,
        numPerCustLimit,
        start_date || null,
        end_date || null,
        is_active ? 1 : 0,
        nowStr,
        nowStr,
      ]
    )

    // Audit log
    db.run(
      `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        auth.user?.id || 'admin',
        auth.user?.name || 'Admin',
        'CREATE_VOUCHER',
        'VOUCHER',
        vouchId,
        JSON.stringify({ code: normalizedCode, name: voucherName, discount_type, discount_value: numDiscountValue }),
        nowStr,
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Voucher promo "${normalizedCode}" berhasil dibuat.`,
      voucherId: vouchId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal membuat voucher.' }, { status: 500 })
  }
}

/**
 * PATCH: Update voucher attributes or toggle active status
 */
export async function PATCH(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const { id, is_active, name, description, discount_type, discount_value, min_spend, max_discount, usage_limit, usage_limit_per_customer, start_date, end_date } = body

    if (!id) {
      return NextResponse.json({ error: 'ID Voucher wajib disertakan.' }, { status: 400 })
    }

    const voucher = db.queryOne<any>('SELECT * FROM vouchers WHERE id = ?', [id])
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher tidak ditemukan.' }, { status: 404 })
    }

    const nowStr = new Date().toISOString()

    // 1. Quick toggle active/inactive
    if (typeof is_active === 'boolean' || typeof is_active === 'number') {
      const activeVal = is_active ? 1 : 0
      db.run('UPDATE vouchers SET is_active = ?, updated_at = ? WHERE id = ?', [activeVal, nowStr, id])

      db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `aud_${Date.now()}`,
          auth.user?.id || 'admin',
          auth.user?.name || 'Admin',
          'TOGGLE_VOUCHER_STATUS',
          'VOUCHER',
          id,
          JSON.stringify({ code: voucher.code, is_active: activeVal }),
          nowStr,
        ]
      )

      return NextResponse.json({
        success: true,
        message: `Status voucher "${voucher.code}" berhasil ${activeVal ? 'diaktifkan' : 'dinonaktifkan'}.`,
      })
    }

    // 2. Full edit
    const newName = name !== undefined ? name.trim() : voucher.name
    const newDesc = description !== undefined ? description.trim() : voucher.description
    const newType = discount_type || voucher.discount_type
    const newVal = discount_value !== undefined ? Number(discount_value) : voucher.discount_value
    const newMinSpend = min_spend !== undefined ? Number(min_spend) : voucher.min_spend
    const newMaxDisc = max_discount !== undefined ? Number(max_discount) : voucher.max_discount
    const newLimit = usage_limit !== undefined ? Number(usage_limit) : voucher.usage_limit
    const newPerCust = usage_limit_per_customer !== undefined ? Number(usage_limit_per_customer) : voucher.usage_limit_per_customer
    const newStart = start_date !== undefined ? start_date : voucher.start_date
    const newEnd = end_date !== undefined ? end_date : voucher.end_date

    if (newType === 'PERCENT' && newVal > 100) {
      return NextResponse.json({ error: 'Diskon persentase tidak boleh melebihi 100%.' }, { status: 400 })
    }

    if (newStart && newEnd && new Date(newEnd) < new Date(newStart)) {
      return NextResponse.json({ error: 'Tanggal berakhir tidak boleh lebih awal dari tanggal mulai.' }, { status: 400 })
    }

    db.run(
      `UPDATE vouchers SET
        name = ?, description = ?, discount_type = ?, discount_value = ?,
        min_spend = ?, max_discount = ?, usage_limit = ?, usage_limit_per_customer = ?,
        start_date = ?, end_date = ?, updated_at = ?
       WHERE id = ?`,
      [
        newName,
        newDesc,
        newType,
        newVal,
        newMinSpend,
        newMaxDisc,
        newLimit,
        newPerCust,
        newStart || null,
        newEnd || null,
        nowStr,
        id,
      ]
    )

    db.run(
      `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `aud_${Date.now()}`,
        auth.user?.id || 'admin',
        auth.user?.name || 'Admin',
        'UPDATE_VOUCHER',
        'VOUCHER',
        id,
        JSON.stringify({ code: voucher.code, name: newName, discount_type: newType, discount_value: newVal }),
        nowStr,
      ]
    )

    return NextResponse.json({
      success: true,
      message: `Voucher "${voucher.code}" berhasil diperbarui.`,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui voucher.' }, { status: 500 })
  }
}

/**
 * DELETE: Delete voucher safely (soft delete / archive if already used in transactions)
 */
export async function DELETE(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(req.url)
    let voucherId = searchParams.get('id')

    if (!voucherId) {
      try {
        const body = await req.json()
        voucherId = body.id
      } catch {}
    }

    if (!voucherId) {
      return NextResponse.json({ error: 'ID Voucher wajib disertakan.' }, { status: 400 })
    }

    const voucher = db.queryOne<any>('SELECT * FROM vouchers WHERE id = ?', [voucherId])
    if (!voucher) {
      return NextResponse.json({ error: 'Voucher tidak ditemukan.' }, { status: 404 })
    }

    // Check if voucher has been used in orders or voucher_usages
    const usagesCount = db.queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM voucher_usages WHERE voucher_id = ? OR voucher_code = ?',
      [voucherId, voucher.code]
    )
    const ordersCount = db.queryOne<{ cnt: number }>(
      'SELECT COUNT(*) as cnt FROM orders WHERE voucher_id = ? OR voucher_code = ?',
      [voucherId, voucher.code]
    )

    const isUsedInTransactions = (usagesCount?.cnt || 0) > 0 || (ordersCount?.cnt || 0) > 0
    const nowStr = new Date().toISOString()

    if (isUsedInTransactions) {
      // Soft-delete / Archive to protect historical financial integrity
      db.run('UPDATE vouchers SET is_archived = 1, is_active = 0, updated_at = ? WHERE id = ?', [nowStr, voucherId])

      db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `aud_${Date.now()}`,
          auth.user?.id || 'admin',
          auth.user?.name || 'Admin',
          'ARCHIVE_VOUCHER',
          'VOUCHER',
          voucherId,
          JSON.stringify({ code: voucher.code, reason: 'Used in past orders - soft deleted' }),
          nowStr,
        ]
      )

      return NextResponse.json({
        success: true,
        archived: true,
        message: `Voucher "${voucher.code}" pernah digunakan dalam pesanan pelanggan, sehingga diarsipkan secara aman (soft delete) untuk melindungi riwayat keuangan.`,
      })
    } else {
      // Hard delete if never used
      db.run('DELETE FROM vouchers WHERE id = ?', [voucherId])

      db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `aud_${Date.now()}`,
          auth.user?.id || 'admin',
          auth.user?.name || 'Admin',
          'DELETE_VOUCHER_PERMANENT',
          'VOUCHER',
          voucherId,
          JSON.stringify({ code: voucher.code }),
          nowStr,
        ]
      )

      return NextResponse.json({
        success: true,
        archived: false,
        message: `Voucher "${voucher.code}" berhasil dihapus secara permanen.`,
      })
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus voucher.' }, { status: 500 })
  }
}
