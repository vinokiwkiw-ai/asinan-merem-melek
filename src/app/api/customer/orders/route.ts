import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { MembershipService } from '@/lib/membership/membershipService'
import { SessionService, SESSION_COOKIE_NAME } from '@/lib/auth/sessionService'

export async function GET(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ||
      (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7).trim() : null)
    const sessionCustomer = sessionToken ? SessionService.getCustomerFromToken(sessionToken) : null

    if (!sessionCustomer) {
      return NextResponse.json(
        { error: 'Silakan login terlebih dahulu untuk melihat riwayat pesanan.' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')?.trim()
    const search = searchParams.get('search')?.trim()

    const rawPhone = String(sessionCustomer.phone || '').replace(/\D/g, '')
    const phone62 = rawPhone.startsWith('62') ? rawPhone : (rawPhone.startsWith('0') ? '62' + rawPhone.slice(1) : '62' + rawPhone)
    const phone08 = phone62.startsWith('62') ? '0' + phone62.slice(2) : phone62

    // Security: Strictly query orders belonging to authenticated session customer
    let sql = `
      SELECT o.*,
             p.bank_name, p.status as payment_txn_status, p.reference_number as payment_reference
      FROM orders o
      LEFT JOIN payments p ON o.id = p.order_id
      WHERE (o.customer_id = ? OR o.customer_phone = ? OR o.customer_phone = ? OR o.customer_phone = ?)
    `
    const params: any[] = [sessionCustomer.id, sessionCustomer.phone, phone62, phone08]

    // Optional status filter
    if (status && status !== 'semua') {
      if (status === 'menunggu_pembayaran') {
        sql += ` AND o.order_status = 'menunggu_pembayaran'`
      } else if (status === 'diproses') {
        sql += ` AND o.order_status IN ('diproses', 'siap_dikirim', 'menunggu_kurir', 'kurir_pickup')`
      } else if (status === 'dikirim') {
        sql += ` AND o.order_status IN ('dikirim', 'dalam_perjalanan', 'sampai')`
      } else if (status === 'selesai') {
        sql += ` AND o.order_status = 'selesai'`
      } else if (status === 'batal') {
        sql += ` AND o.order_status = 'dibatalkan'`
      }
    }

    // Optional search by order number
    if (search) {
      sql += ` AND (o.order_number LIKE ?)`
      params.push(`%${search}%`)
    }

    sql += ` ORDER BY o.created_at DESC`

    const rawOrders = db.query<any>(sql, params)

    // For each order, fetch items and their seasonings snapshots
    const ordersWithDetails = rawOrders.map((order) => {
      const items = db.query<any>(
        `SELECT id, product_id, product_name, size, unit_price, qty, subtotal, custom_fruit_notes
         FROM order_items
         WHERE order_id = ?`,
        [order.id]
      )

      const itemsWithSeasonings = items.map((item) => {
        const seasonings = db.query<any>(
          `SELECT seasoning_id, seasoning_name, qty, extra_price
           FROM order_item_seasonings
           WHERE order_item_id = ?`,
          [item.id]
        )
        return {
          ...item,
          seasonings,
        }
      })

      // Calculate loyalty points earned for this transaction: floor(eligibleSpend / 100.000) * 100
      const eligibleSpend = Math.max(0, order.subtotal - (order.discount || 0))
      const pointsEarned = MembershipService.calculateEligiblePoints(eligibleSpend)

      return {
        id: order.id,
        orderNumber: order.order_number,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        customerName: order.customer_name,
        customerPhone: order.customer_phone,
        branchId: order.branch_id,
        deliveryType: order.delivery_type,
        deliveryAddress: order.delivery_address,
        deliveryInstructions: order.delivery_instructions,
        courierName: order.courier_name,
        courierTrackingNumber: order.courier_tracking_number,
        courierStatus: order.courier_status,
        estimatedDeliveryTime: order.estimated_delivery_time,
        subtotal: order.subtotal,
        voucherCode: order.voucher_code || null,
        discount: order.discount,
        giftCharge: order.gift_charge,
        deliveryFee: order.delivery_fee,
        total: order.total,
        orderStatus: order.order_status,
        paymentStatus: order.payment_status,
        paymentExpiresAt: order.payment_expires_at,
        trackingToken: order.tracking_token,
        trackingUrl: `/track/${order.order_number}?token=${order.tracking_token}`,
        customerConfirmedAt: order.customer_confirmed_at,
        receiptPhotoUrl: order.receipt_photo_url,
        deliveryIssueReported: Boolean(order.delivery_issue_reported),
        deliveryIssueNotes: order.delivery_issue_notes,
        paymentDetails: {
          bankName: order.bank_name || 'BCA',
          paymentStatus: order.payment_status,
          referenceNumber: order.payment_reference,
        },
        pointsEarned,
        items: itemsWithSeasonings,
      }
    })

    return NextResponse.json({
      success: true,
      count: ordersWithDetails.length,
      orders: ordersWithDetails,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat riwayat transaksi.' }, { status: 500 })
  }
}

/**
 * Permanent Order History Guard:
 * Backend strictly blocks DELETE, PUT, and unauthorized manipulation of historical orders.
 */
export async function DELETE() {
  return NextResponse.json(
    { error: 'Akses ditolak. Seluruh riwayat transaksi pesanan bersifat permanen dan tidak dapat dihapus oleh customer.' },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Akses ditolak. Catatan riwayat pesanan bersifat permanen dan tidak dapat dimanipulasi.' },
    { status: 405 }
  )
}

export async function POST() {
  return NextResponse.json(
    { error: 'Gunakan endpoint resmi /api/checkout/submit untuk membuat pesanan baru.' },
    { status: 405 }
  )
}
