import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

/**
 * Server-side customer phone privacy masking utility
 * Example: '081234567842' -> '08•••••••42'
 * Prevents raw phone leakage in public APIs, HTML metadata, or review cards.
 */
function maskPhoneNumber(phone?: string): string {
  if (!phone) return 'Pelanggan Terverifikasi'
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return '08•••••••'
  return `${digits.slice(0, 2)}•••••••${digits.slice(-2)}`
}

export async function GET(req: NextRequest) {
  try {
    const limit = Number(req.nextUrl.searchParams.get('limit')) || 20
    const productId = req.nextUrl.searchParams.get('productId')
    const featuredOnly = req.nextUrl.searchParams.get('featured') === 'true'

    let sql = 'SELECT * FROM reviews WHERE is_published = 1'
    const params: any[] = []

    if (productId) {
      sql += ' AND product_id = ?'
      params.push(productId)
    }

    if (featuredOnly) {
      sql += ' AND is_featured = 1'
    }

    sql += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const rawReviews = db.query<any>(sql, params)

    // Strict privacy projection: NEVER return raw customer_id, order_id, or raw phone numbers
    const safeReviews = rawReviews.map((r) => {
      let displayName = r.customer_name?.trim() || 'Pelanggan Terverifikasi'
      // Mask if the display name looks like a phone number
      const cleanPhone = displayName.replace(/\D/g, '')
      if (cleanPhone.length >= 8 && (displayName.startsWith('08') || displayName.startsWith('62') || displayName.startsWith('+62'))) {
        displayName = maskPhoneNumber(displayName)
      }

      return {
        id: r.id,
        customerName: displayName,
        rating: r.rating,
        comment: r.comment,
        productName: r.product_name,
        photoUrl: r.photo_url,
        createdAt: r.created_at,
        isVerifiedPurchase: true,
        isFeatured: Boolean(r.is_featured),
      }
    })

    // Calculate rating summary from all published reviews
    const summary = db.queryOne<{ avg_rating: number; total_count: number }>(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as total_count FROM reviews WHERE is_published = 1'
    )

    return NextResponse.json({
      success: true,
      reviews: safeReviews,
      summary: {
        avgRating: summary?.avg_rating ? Number(summary.avg_rating.toFixed(1)) : 5.0,
        totalCount: summary?.total_count || 0,
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat ulasan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, orderNumber, customerName, productId, rating, comment, photoUrl } = body

    if (!orderId && !orderNumber) {
      return NextResponse.json({ error: 'Order ID atau nomor pesanan wajib disertakan.' }, { status: 400 })
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating harus antara 1 sampai 5 bintang.' }, { status: 400 })
    }

    if (!comment || comment.trim().length < 5) {
      return NextResponse.json({ error: 'Ulasan minimal 5 karakter.' }, { status: 400 })
    }

    // Verify order completion
    let order: any
    if (orderId) {
      order = db.queryOne('SELECT * FROM orders WHERE id = ?', [orderId])
    } else {
      order = db.queryOne('SELECT * FROM orders WHERE order_number = ?', [orderNumber])
    }

    if (!order) {
      return NextResponse.json({ error: 'Pesanan tidak ditemukan.' }, { status: 404 })
    }

    // Must be paid & completed
    if (order.payment_status !== 'paid') {
      return NextResponse.json(
        { error: 'Hanya pesanan yang sudah lunas yang dapat memberikan ulasan terverifikasi.' },
        { status: 400 }
      )
    }

    if (order.order_status !== 'selesai') {
      return NextResponse.json(
        { error: 'Ulasan hanya dapat diberikan setelah pesanan selesai dikonfirmasi diterima.' },
        { status: 400 }
      )
    }

    // Single review per order constraint
    const existingReview = db.queryOne<{ id: string }>('SELECT id FROM reviews WHERE order_id = ?', [order.id])
    if (existingReview) {
      return NextResponse.json(
        { error: 'Anda sudah pernah memberikan ulasan untuk pesanan ini.' },
        { status: 400 }
      )
    }

    // Get first item name if not specified
    const item = db.queryOne<{ product_id: string; product_name: string }>(
      'SELECT product_id, product_name FROM order_items WHERE order_id = ? LIMIT 1',
      [order.id]
    )

    const reviewId = `rev_${Date.now()}`
    const nowStr = new Date().toISOString()
    const finalCustomerName = customerName?.trim() || order.customer_name?.trim() || maskPhoneNumber(order.customer_phone)

    db.run(
      `INSERT INTO reviews (
        id, order_id, customer_id, customer_name, product_id, product_name,
        rating, comment, photo_url, is_published, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
      [
        reviewId,
        order.id,
        order.customer_id || `cust_${order.id}`,
        finalCustomerName,
        productId || item?.product_id || 'gl-rujak-personal',
        item?.product_name || 'Rujak Buah Segar AMM',
        rating,
        comment.trim(),
        photoUrl || null,
        nowStr,
      ]
    )

    return NextResponse.json({
      success: true,
      message: 'Ulasan pembeli terverifikasi berhasil dikirim!',
      reviewId,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan ulasan.' }, { status: 500 })
  }
}
