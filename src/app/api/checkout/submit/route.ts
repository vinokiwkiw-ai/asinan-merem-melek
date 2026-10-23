import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { PricingService } from '@/lib/pricing/pricingService'
import { DeliveryService } from '@/lib/delivery/deliveryService'
import { OutletService } from '@/lib/outlet/outletService'
import { SessionService, SESSION_COOKIE_NAME } from '@/lib/auth/sessionService'
import crypto from 'node:crypto'

// Phone number normalization
function normalizePhone(input: string): string {
  let cleaned = input.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.slice(1)
  }
  if (!cleaned.startsWith('62')) {
    cleaned = '62' + cleaned
  }
  return cleaned
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      idempotencyKey,
      branchId = 'greenlake',
      customerName,
      customerPhone,
      deliveryType = 'delivery',
      deliveryAddress,
      deliveryInstructions,
      quoteId,
      items,
      voucherCode,
      // Gifting options
      isGift = false,
      recipientName,
      recipientPhone,
      recipientAddress,
      senderName,
      isSenderVisible = true,
      cardDesign = 'merem_melek_special',
      cardMessage = '',
      hasGiftPackaging = false,
      hasGreetingCard = false,
      fruitNotes = '',
    } = body

    // 0. Enforce Store & Outlet Operating Status
    const outletStatus = OutletService.getOutletStatus(branchId)
    if (!outletStatus.isOpen) {
      return NextResponse.json(
        {
          error: `Outlet sedang tutup: ${outletStatus.reason || 'Toko sedang tidak menerima pesanan saat ini.'}`,
          outletStatus,
        },
        { status: 400 }
      )
    }

    // 1. Idempotency Check: if idempotency key already exists, return the existing order
    if (idempotencyKey) {
      const existing = db.queryOne<{
        order_number: string
        tracking_token: string
        total: number
        payment_expires_at: string
      }>('SELECT order_number, tracking_token, total, payment_expires_at FROM orders WHERE idempotency_key = ?', [
        idempotencyKey,
      ])
      if (existing) {
        return NextResponse.json({
          success: true,
          isDuplicate: true,
          orderNumber: existing.order_number,
          trackingToken: existing.tracking_token,
          total: existing.total,
          paymentExpiresAt: existing.payment_expires_at,
        })
      }
    }

    // 2. Validate Customer Info
    if (!customerName || customerName.trim().length < 2) {
      return NextResponse.json({ error: 'Nama pemesan wajib diisi (minimal 2 karakter).' }, { status: 400 })
    }

    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 9) {
      return NextResponse.json({ error: 'Nomor WhatsApp pemesan tidak valid.' }, { status: 400 })
    }

    const normalizedCustomerPhone = normalizePhone(customerPhone)

    // Resolve customer ID from session if authenticated, or find existing customer by phone
    const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value
    const sessionCustomer = sessionToken ? SessionService.getCustomerFromToken(sessionToken) : null
    let customerId = sessionCustomer?.id || null

    if (!customerId) {
      const existingCust = db.queryOne<{ id: string }>('SELECT id FROM customers WHERE phone = ?', [
        normalizedCustomerPhone,
      ])
      if (existingCust) {
        customerId = existingCust.id
      }
    }

    // 3. Validate Delivery & Shipping Quote (Store Pickup is disabled for all new orders)
    if (deliveryType === 'pickup') {
      return NextResponse.json(
        { error: 'Opsi ambil di toko (pickup) sudah dinonaktifkan. Seluruh pesanan baru wajib menggunakan pengiriman kurir online.' },
        { status: 400 }
      )
    }

    if (!deliveryAddress || deliveryAddress.trim().length < 5) {
      return NextResponse.json({ error: 'Alamat pengiriman lengkap wajib diisi.' }, { status: 400 })
    }

    if (!quoteId) {
      return NextResponse.json({ error: 'Silakan pilih layanan kurir pengiriman terlebih dahulu.' }, { status: 400 })
    }

    const quoteCheck = DeliveryService.validateQuote(quoteId)
    if (!quoteCheck.isValid || !quoteCheck.quote) {
      return NextResponse.json(
        { error: quoteCheck.reason || 'Kutipan ongkir kurir tidak valid atau sudah kedaluwarsa. Silakan hitung ulang pengiriman.' },
        { status: 400 }
      )
    }

    const deliveryFee = quoteCheck.quote.quotedAmount
    const verifiedProvider = quoteCheck.quote.provider

    // 4. Server Authoritative Price Calculation
    const pricing = PricingService.calculateTotal({
      items,
      voucherCode,
      hasGiftPackaging: Boolean(hasGiftPackaging),
      hasGreetingCard: Boolean(hasGreetingCard),
      deliveryFee,
      deliveryProvider: verifiedProvider,
    })

    // 5. Generate Order Identifiers
    const now = new Date()
    const expiryMinutes = 12
    const paymentExpires = new Date(now.getTime() + expiryMinutes * 60 * 1000)

    const datePrefix = now.toISOString().slice(2, 10).replace(/-/g, '')
    const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase()
    const orderNumber = `AMM-${datePrefix}-${randomHex}`
    const orderId = `ord_${crypto.randomUUID()}`
    const trackingToken = crypto.randomBytes(16).toString('hex')

    // 6. Fetch Bank Transfer Details from Settings
    const bankSetting = db.queryOne<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', [
      'bank_transfer_info',
    ])
    const bankInfo = bankSetting?.value ? JSON.parse(bankSetting.value) : {
      bank_name: 'BCA (Bank Central Asia)',
      account_number: '883-098-1220',
      account_holder: 'ASINAN MEREM MELEK PT',
    }

    // 7. Atomic Database Transaction
    db.transaction(() => {
      // Create Order
      db.run(
        `INSERT INTO orders (
          id, order_number, idempotency_key, customer_id, customer_name, customer_phone,
          branch_id, delivery_type, delivery_address, delivery_instructions,
          courier_name, courier_status,
          subtotal, discount, gift_charge, delivery_fee, total,
          order_status, payment_status, payment_expires_at, tracking_token
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderId,
          orderNumber,
          idempotencyKey || null,
          customerId,
          customerName.trim(),
          normalizedCustomerPhone,
          branchId,
          'delivery',
          deliveryAddress?.trim() || null,
          deliveryInstructions?.trim() || null,
          verifiedProvider,
          'WAITING_FOR_PAYMENT',
          pricing.subtotal,
          pricing.voucherDiscount,
          pricing.giftPackagingFee + pricing.greetingCardFee,
          pricing.deliveryFee,
          pricing.finalTotal,
          'menunggu_pembayaran',
          'pending',
          paymentExpires.toISOString(),
          trackingToken,
        ]
      )

      // Create Order Items & Seasonings
      for (const item of items) {
        const orderItemId = `item_${crypto.randomUUID()}`
        const detail = pricing.itemsDetail.find((d) => d.productId === item.productId)
        const unitPrice = detail ? detail.unitPrice : 0
        const itemSubtotal = detail ? detail.itemSubtotal : 0

        db.run(
          `INSERT INTO order_items (
            id, order_id, product_id, product_name, size, unit_price, qty, subtotal, custom_fruit_notes
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderItemId,
            orderId,
            item.productId,
            detail?.productName || 'Rujak/Asinan Buah',
            item.size || 'STANDARD',
            unitPrice,
            item.qty,
            itemSubtotal,
            fruitNotes?.trim() || null,
          ]
        )

        // Seasonings
        if (item.seasoningSelections && item.seasoningSelections.length > 0) {
          for (const s of item.seasoningSelections) {
            const seasonId = `os_${crypto.randomUUID()}`
            const seasonDb = db.queryOne<{ name: string; extra_price: number }>(
              'SELECT name, extra_price FROM seasonings WHERE id = ?',
              [s.seasoningId]
            )
            db.run(
              `INSERT INTO order_item_seasonings (id, order_item_id, seasoning_id, seasoning_name, qty, extra_price) VALUES (?, ?, ?, ?, ?, ?)`,
              [
                seasonId,
                orderItemId,
                s.seasoningId,
                seasonDb?.name || s.seasoningId,
                s.qty,
                seasonDb?.extra_price || 0,
              ]
            )
          }
        }
      }

      // Create Gift Details (if enabled)
      if (isGift || hasGreetingCard || hasGiftPackaging) {
        db.run(
          `INSERT INTO gift_details (
            id, order_id, is_gift, recipient_name, recipient_phone, recipient_address,
            sender_name, is_sender_visible, card_design, card_message, has_gift_packaging,
            packaging_fee, card_fee
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `gift_${crypto.randomUUID()}`,
            orderId,
            isGift ? 1 : 0,
            recipientName?.trim() || customerName.trim(),
            recipientPhone ? normalizePhone(recipientPhone) : normalizedCustomerPhone,
            recipientAddress?.trim() || deliveryAddress?.trim() || null,
            senderName?.trim() || customerName.trim(),
            isSenderVisible ? 1 : 0,
            cardDesign || 'standard',
            cardMessage?.trim().slice(0, 300) || '', // Plain text sanitized, max 300 chars
            hasGiftPackaging ? 1 : 0,
            pricing.giftPackagingFee,
            pricing.greetingCardFee,
          ]
        )
      }

      // Create Payment Record
      db.run(
        `INSERT INTO payments (
          id, order_id, bank_name, account_number, account_holder, amount_expected, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `pay_${crypto.randomUUID()}`,
          orderId,
          bankInfo.bank_name,
          bankInfo.account_number,
          bankInfo.account_holder,
          pricing.finalTotal,
          'awaiting_payment',
        ]
      )

      // Initial Status Event
      db.run(
        `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, notes) VALUES (?, ?, NULL, ?, ?, ?)`,
        [
          `evt_${crypto.randomUUID()}`,
          orderId,
          'menunggu_pembayaran',
          'CUSTOMER',
          'Pesanan dibuat. Menunggu transfer pembayaran 12 menit.',
        ]
      )

      // If voucher was used, increment usage count
      if (pricing.voucherCode) {
        db.run('UPDATE vouchers SET times_used = times_used + 1 WHERE code = ?', [pricing.voucherCode])
      }
    })

    return NextResponse.json({
      success: true,
      orderNumber,
      orderId,
      trackingToken,
      total: pricing.finalTotal,
      paymentExpiresAt: paymentExpires.toISOString(),
      bankInfo,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal membuat pesanan.' }, { status: 400 })
  }
}
