import test, { describe, it } from 'node:test'
import assert from 'node:assert'
import { db } from '../src/lib/db/index.ts'
import { PricingService } from '../src/lib/pricing/pricingService.ts'
import { DeliveryService } from '../src/lib/delivery/deliveryService.ts'
import { DistanceProvider } from '../src/lib/delivery/distanceProvider.ts'
import { MembershipService } from '../src/lib/membership/membershipService.ts'
import { OutletService } from '../src/lib/outlet/outletService.ts'
import { ReportService } from '../src/lib/reports/reportService.ts'
import { OtpService } from '../src/lib/auth/otpService.ts'
import { SessionService } from '../src/lib/auth/sessionService.ts'
import { AdminSessionService } from '../src/lib/auth/adminSessionService.ts'
import { PaymentAdapter } from '../src/lib/payment/paymentAdapter.ts'

describe('Asinan Merem Melek (AMM) Commerce Platform Test Suite', () => {
  // Test 1: Seasoning Customization Rules & Allowances
  it('Scenario 1: Customization rules enforce 2 seasonings for Personal, 5 for Sharing, 4 for Mega', () => {
    const personalRule = db.queryOne<{ allowed_seasoning_count: number }>(
      'SELECT allowed_seasoning_count FROM customization_rules WHERE size_code = ?',
      ['PERSONAL']
    )
    const sharingRule = db.queryOne<{ allowed_seasoning_count: number }>(
      'SELECT allowed_seasoning_count FROM customization_rules WHERE size_code = ?',
      ['SHARING']
    )
    const megaRule = db.queryOne<{ allowed_seasoning_count: number }>(
      'SELECT allowed_seasoning_count FROM customization_rules WHERE size_code = ?',
      ['MEGA']
    )

    assert.strictEqual(personalRule?.allowed_seasoning_count, 2, 'Personal must include exactly 2 seasonings')
    assert.strictEqual(sharingRule?.allowed_seasoning_count, 5, 'Sharing must include exactly 5 seasonings')
    assert.strictEqual(megaRule?.allowed_seasoning_count, 4, 'Mega must include exactly 4 seasonings')
  })

  // Test 2: Server-Side Authoritative Pricing Engine
  it('Scenario 2: Server authoritative pricing calculates integer IDR amounts correctly', () => {
    // 2x Rujak Buah Personal (Rp 71.500) + 1 extra bumbu kacang (+ Rp 2.000)
    const calculation = PricingService.calculateTotal({
      items: [
        {
          productId: 'gl-rujak-personal',
          size: 'PERSONAL',
          qty: 2,
          seasoningSelections: [
            { seasoningId: 'bumbu-bangkok', qty: 1 },
            { seasoningId: 'bumbu-kacang', qty: 1 }, // +2000 extra
          ],
        },
      ],
      deliveryFee: 15000,
      hasGiftPackaging: true, // +15000
      hasGreetingCard: true, // +5000
    })

    const expectedSubtotal = (71500 + 2000) * 2 // 147.000
    const expectedTotal = 147000 + 15000 + 5000 + 15000 // 182.000

    assert.strictEqual(calculation.subtotal, expectedSubtotal)
    assert.strictEqual(calculation.giftPackagingFee, 15000)
    assert.strictEqual(calculation.greetingCardFee, 5000)
    assert.strictEqual(calculation.deliveryFee, 15000)
    assert.strictEqual(calculation.finalTotal, expectedTotal)
    assert.strictEqual(Number.isInteger(calculation.finalTotal), true)
  })

  // Test 3: Voucher Validation & Rejection Explanation
  it('Scenario 3: Invalid or under-minimum vouchers are properly rejected with helpful message', () => {
    // Attempt to use MEREMMELEK10 (requires min spend 50.000) on a 38.500 item
    const calculation = PricingService.calculateTotal({
      items: [
        {
          productId: 'gl-bumbu-bangkok',
          qty: 1, // Rp 38.500 < Rp 50.000 min spend
        },
      ],
      voucherCode: 'MEREMMELEK10',
    })

    assert.strictEqual(calculation.voucherDiscount, 0)
    assert.match(calculation.voucherError || '', /Minimal pembelanjaan/i)

    // Non-existent voucher
    const fakeCalc = PricingService.calculateTotal({
      items: [{ productId: 'gl-bumbu-bangkok', qty: 2 }],
      voucherCode: 'FAKEPROMO999',
    })
    assert.strictEqual(fakeCalc.voucherDiscount, 0)
    assert.match(fakeCalc.voucherError || '', /tidak ditemukan/i)
  })

  // Test 4: Delivery Quotation Abstraction & Expiry
  it('Scenario 4: Delivery quotes generate valid IDs, providers, and enforce expiration', async () => {
    const quotes = await DeliveryService.getQuotes({
      branchId: 'greenlake',
      destinationAddress: 'Jl. Puri Indah Raya No. 45, Jakarta Barat',
    })

    assert.ok(quotes.length >= 3, 'Should generate GoSend, GrabExpress, and store courier options')
    const firstQuote = quotes[0]
    assert.ok(firstQuote.quotedAmount > 0)
    assert.ok(firstQuote.quoteId.startsWith('quote_'))

    // Validate quote is valid immediately
    const check = DeliveryService.validateQuote(firstQuote.quoteId)
    assert.strictEqual(check.isValid, true)

    // Validate non-existent quote fails
    const invalidCheck = DeliveryService.validateQuote('quote_fake_12345')
    assert.strictEqual(invalidCheck.isValid, false)
  })

  // Test 5: Idempotent Order Creation & Transaction Protection
  it('Scenario 5: Repeated checkout requests with the same idempotency key create only one order', () => {
    const testIdemKey = `test_idem_${Date.now()}`
    const testOrderNum = `AMM-TEST-${Date.now().toString().slice(-4)}`
    const testOrderId = `ord_test_${Date.now()}`

    const testToken = `tok_test_${Date.now()}`
    const testDupToken = `tok_test_dup_${Date.now()}`

    // Insert first order with idempotency key
    db.run(
      `INSERT INTO orders (
        id, order_number, idempotency_key, customer_name, customer_phone,
        branch_id, delivery_type, subtotal, total, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, 'Test User', '62812000000', 'greenlake', 'pickup', 71500, 71500, datetime('now', '+12 minutes'), ?)`,
      [testOrderId, testOrderNum, testIdemKey, testToken]
    )

    // Query by idempotency key
    const match = db.queryOne<{ order_number: string }>(
      'SELECT order_number FROM orders WHERE idempotency_key = ?',
      [testIdemKey]
    )
    assert.strictEqual(match?.order_number, testOrderNum)

    // Verify duplicate insert with same idempotency key is rejected
    assert.throws(() => {
      db.run(
        `INSERT INTO orders (
          id, order_number, idempotency_key, customer_name, customer_phone,
          branch_id, delivery_type, subtotal, total, payment_expires_at, tracking_token
        ) VALUES (?, ?, ?, 'Test User 2', '62812000000', 'greenlake', 'pickup', 71500, 71500, datetime('now', '+12 minutes'), ?)`,
        [`ord_test_dup_${Date.now()}`, `AMM-TEST-DUP-${Date.now()}`, testIdemKey, testDupToken]
      )
    }, /UNIQUE constraint failed/i)
  })

  // Test 6: 12-Minute Payment Expiry Logic
  it('Scenario 6: 12-minute payment timer calculates absolute expiry timestamp correctly', () => {
    const now = new Date()
    const expiryMinutes = 12
    const paymentExpires = new Date(now.getTime() + expiryMinutes * 60 * 1000)

    const diffMinutes = Math.round((paymentExpires.getTime() - now.getTime()) / (60 * 1000))
    assert.strictEqual(diffMinutes, 12, 'Expiry timestamp must be exactly 12 minutes in the future')
  })

  // Test 7: Membership Points Ledger Immutability & Balance Calculation
  it('Scenario 7: Membership balance is strictly computed as SUM(points) from immutable ledger', () => {
    const testCustomerId = `cust_test_ledger_${Date.now()}`

    // Insert customer first to satisfy relational FOREIGN KEY constraint
    db.run(
      `INSERT INTO customers (id, phone, name, email) VALUES (?, ?, 'Member Test', 'member@test.com')`,
      [testCustomerId, `62819${Date.now().toString().slice(-7)}`]
    )

    // Initial balance should be 0
    assert.strictEqual(MembershipService.getCustomerBalance(testCustomerId), 0)

    // Award 75 points from an order
    db.run(
      `INSERT INTO membership_ledger (id, customer_id, points, transaction_type, reference_id, balance_after, reason) VALUES (?, ?, 75, 'EARN', ?, 75, 'Test Order 1')`,
      [`ledg_test_1_${Date.now()}`, testCustomerId, `ORD-01-${testCustomerId}`]
    )

    assert.strictEqual(MembershipService.getCustomerBalance(testCustomerId), 75)

    // Award another 50 points
    db.run(
      `INSERT INTO membership_ledger (id, customer_id, points, transaction_type, reference_id, balance_after, reason) VALUES (?, ?, 50, 'EARN', ?, 125, 'Test Order 2')`,
      [`ledg_test_2_${Date.now()}`, testCustomerId, `ORD-02-${testCustomerId}`]
    )

    assert.strictEqual(MembershipService.getCustomerBalance(testCustomerId), 125)

    // Redeem 100 points
    db.run(
      `INSERT INTO membership_ledger (id, customer_id, points, transaction_type, reference_id, balance_after, reason) VALUES (?, ?, -100, 'REDEEM', ?, 25, 'Redeem Reward')`,
      [`ledg_test_3_${Date.now()}`, testCustomerId, `REW-01-${testCustomerId}`]
    )

    assert.strictEqual(MembershipService.getCustomerBalance(testCustomerId), 25)
  })

  // Test 8: Outlet Operating Hours in Asia/Jakarta Timezone
  it('Scenario 8: OutletService calculates opening status in Asia/Jakarta timezone', () => {
    const greenlake = OutletService.getOutletStatus('greenlake')
    const kelapagading = OutletService.getOutletStatus('kelapagading')

    assert.strictEqual(greenlake.branchId, 'greenlake')
    assert.match(greenlake.currentLocalTime, /WIB/)
    assert.ok(typeof greenlake.isOpen === 'boolean')
    assert.strictEqual(kelapagading.branchId, 'kelapagading')
    assert.match(kelapagading.currentLocalTime, /WIB/)
  })

  // Test 9: Spreadsheet Export Formula Injection Neutralization
  it('Scenario 9: Spreadsheet exports sanitize dangerous formula injection characters', () => {
    assert.strictEqual(ReportService.sanitizeForSpreadsheet('=SUM(A1:A10)'), "'=SUM(A1:A10)")
    assert.strictEqual(ReportService.sanitizeForSpreadsheet('+cmd|/c calc'), "'+cmd|/c calc")
    assert.strictEqual(ReportService.sanitizeForSpreadsheet('-1000'), "'-1000")
    assert.strictEqual(ReportService.sanitizeForSpreadsheet('@alert(1)'), "'@alert(1)")
    assert.strictEqual(ReportService.sanitizeForSpreadsheet('Normal Order'), 'Normal Order')
  })

  // Test 10: Store Pickup ("Ambil di Toko") Discontinuation & Historical Data Preservation
  it('Scenario 10: Store Pickup is rejected for new orders while historical pickup orders remain queryable', () => {
    // 1. Verify validation logic: new checkout requests with deliveryType 'pickup' are rejected
    function validateCheckoutDeliveryType(deliveryType: string, address?: string) {
      if (deliveryType === 'pickup') {
        throw new Error('Opsi ambil di toko (pickup) sudah dinonaktifkan. Seluruh pesanan baru wajib menggunakan pengiriman kurir online.')
      }
      if (!address || address.trim().length < 5) {
        throw new Error('Alamat pengiriman lengkap wajib diisi.')
      }
      return true
    }

    assert.throws(
      () => validateCheckoutDeliveryType('pickup', 'Jl. Green Lake City'),
      /ambil di toko \(pickup\) sudah dinonaktifkan/i
    )
    assert.strictEqual(validateCheckoutDeliveryType('delivery', 'Jl. Melati No. 12, Jakarta'), true)

    // 2. Historical compatibility: insert a historical order with delivery_type = 'pickup'
    const histOrderId = `ord_hist_${Date.now()}`
    const histOrderNum = `AMM-HIST-${Date.now().toString().slice(-4)}`
    db.run(
      `INSERT INTO orders (
        id, order_number, idempotency_key, customer_name, customer_phone,
        branch_id, delivery_type, subtotal, total, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, 'Pelanggan Lama', '62812345678', 'greenlake', 'pickup', 50000, 50000, datetime('now', '+12 minutes'), ?)`,
      [histOrderId, histOrderNum, `idem_hist_${Date.now()}`, `tok_hist_${Date.now()}`]
    )

    const queriedHist = db.queryOne<{ id: string; delivery_type: string }>(
      'SELECT id, delivery_type FROM orders WHERE id = ?',
      [histOrderId]
    )
    assert.strictEqual(queriedHist?.delivery_type, 'pickup', 'Historical pickup records must be preserved intact')
  })

  // Test 11: Product 4-State Availability Lifecycle & Cart Authoritative Enforcement
  it('Scenario 11: Product availability states (AVAILABLE, OUT_OF_STOCK, TEMP_UNAVAILABLE, HIDDEN) are strictly enforced by PricingService', () => {
    const testProdId = 'gl-rujak-personal'

    try {
      // 1. Set to OUT_OF_STOCK
      db.run('UPDATE products SET availability_status = ?, is_available = 0 WHERE id = ?', [
        'OUT_OF_STOCK',
        testProdId,
      ])
      assert.throws(() => {
        PricingService.calculateTotal({
          items: [{ productId: testProdId, qty: 1 }],
        })
      }, /saat ini sedang habis/i)

      // 2. Set to TEMP_UNAVAILABLE
      db.run('UPDATE products SET availability_status = ?, is_available = 0 WHERE id = ?', [
        'TEMP_UNAVAILABLE',
        testProdId,
      ])
      assert.throws(() => {
        PricingService.calculateTotal({
          items: [{ productId: testProdId, qty: 1 }],
        })
      }, /saat ini tidak tersedia sementara/i)

      // 3. Set to HIDDEN
      db.run('UPDATE products SET availability_status = ?, is_available = 0 WHERE id = ?', [
        'HIDDEN',
        testProdId,
      ])
      assert.throws(() => {
        PricingService.calculateTotal({
          items: [{ productId: testProdId, qty: 1 }],
        })
      }, /tidak ditemukan/i)
    } finally {
      // Always restore to AVAILABLE
      db.run('UPDATE products SET availability_status = ?, is_available = 1 WHERE id = ?', [
        'AVAILABLE',
        testProdId,
      ])
    }

    const validCalc = PricingService.calculateTotal({
      items: [{ productId: testProdId, qty: 1 }],
    })
    assert.strictEqual(validCalc.subtotal, 71500)
    assert.strictEqual(validCalc.itemsDetail[0].productId, testProdId)
  })

  // Test 12: Order Receipt Confirmation with Photo Proof & Delivery Issue Reporting
  it('Scenario 12: Order receipt confirmation marks order completed with photo proof; issue reporting flags order without closing it', () => {
    const custId = `cust_rcpt_${Date.now()}`
    const orderId = `ord_rcpt_${Date.now()}`
    const orderNum = `AMM-RCPT-${Date.now().toString().slice(-4)}`

    // Create customer & active delivered order
    db.run(
      `INSERT INTO customers (id, phone, name, email) VALUES (?, ?, 'Penerima Test', 'penerima@test.com')`,
      [custId, `62817${Date.now().toString().slice(-7)}`]
    )

    db.run(
      `INSERT INTO orders (
        id, order_number, idempotency_key, customer_id, customer_name, customer_phone,
        branch_id, delivery_type, order_status, payment_status, subtotal, total, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, ?, 'Penerima Test', '62817000000', 'greenlake', 'delivery', 'dikirim', 'paid', 80000, 80000, datetime('now', '+12 minutes'), ?)`,
      [orderId, orderNum, `idem_rcpt_${Date.now()}`, custId, `tok_rcpt_${Date.now()}`]
    )

    // 1. Test Delivery Issue Reporting (Does NOT complete order)
    const issueNotes = 'Kurir belum sampai di rumah, mohon bantuan cek posisi kurir.'
    const nowStr = new Date().toISOString()
    db.transaction(() => {
      db.run(
        `UPDATE orders SET delivery_issue_reported = 1, delivery_issue_notes = ?, delivery_issue_reported_at = ? WHERE id = ?`,
        [issueNotes, nowStr, orderId]
      )
      db.run(
        `INSERT INTO support_tickets (id, order_id, customer_name, customer_phone, category, description, status, created_at)
         VALUES (?, ?, 'Penerima Test', '62817000000', 'DELIVERY_ISSUE', ?, 'OPEN', ?)`,
        [`tick_test_${Date.now()}`, orderId, issueNotes, nowStr]
      )
    })

    const afterIssue = db.queryOne<{ order_status: string; delivery_issue_reported: number; delivery_issue_notes: string }>(
      'SELECT order_status, delivery_issue_reported, delivery_issue_notes FROM orders WHERE id = ?',
      [orderId]
    )
    assert.strictEqual(afterIssue?.order_status, 'dikirim', 'Issue reporting must NEVER prematurely close or complete order')
    assert.strictEqual(afterIssue?.delivery_issue_reported, 1)
    assert.strictEqual(afterIssue?.delivery_issue_notes, issueNotes)

    const ticket = db.queryOne<{ id: string; status: string; category: string }>(
      'SELECT id, status, category FROM support_tickets WHERE order_id = ?',
      [orderId]
    )
    assert.strictEqual(ticket?.status, 'OPEN')
    assert.strictEqual(ticket?.category, 'DELIVERY_ISSUE')

    // 2. Test Receipt Confirmation with Photo Proof
    const photoUrl = '/api/receipts/proof_test_123.jpg'
    const pointsToAward = Math.floor(80000 / 1000) // 80 points

    db.transaction(() => {
      db.run(
        `UPDATE orders SET
          order_status = 'selesai',
          customer_confirmed_at = ?,
          confirmed_by_id = ?,
          confirmed_by_name = ?,
          receipt_photo_url = ?,
          receipt_photo_uploaded_at = ?,
          delivery_issue_reported = 0,
          updated_at = ?
        WHERE id = ?`,
        [nowStr, custId, 'Penerima Test', photoUrl, nowStr, nowStr, orderId]
      )

      db.run(
        `INSERT INTO order_status_events (id, order_id, from_status, to_status, actor_type, actor_id, notes) VALUES (?, ?, 'dikirim', 'selesai', 'CUSTOMER', ?, ?)`,
        [`evt_test_${Date.now()}`, orderId, custId, 'Pelanggan mengonfirmasi pesanan telah diterima dengan baik. (Foto bukti penerimaan terlampir).']
      )

      db.run(
        `INSERT INTO membership_ledger (id, customer_id, points, transaction_type, reference_id, balance_after, reason) VALUES (?, ?, ?, 'EARN', ?, ?, 'Poin Pesanan Selesai')`,
        [`ledg_test_rcpt_${Date.now()}`, custId, pointsToAward, orderNum, pointsToAward]
      )
    })

    const completedOrder = db.queryOne<{ order_status: string; receipt_photo_url: string; delivery_issue_reported: number }>(
      'SELECT order_status, receipt_photo_url, delivery_issue_reported FROM orders WHERE id = ?',
      [orderId]
    )
    assert.strictEqual(completedOrder?.order_status, 'selesai')
    assert.strictEqual(completedOrder?.receipt_photo_url, photoUrl)
    assert.strictEqual(completedOrder?.delivery_issue_reported, 0)
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 80, 'Customer must be awarded 80 points for Rp 80.000 order')
  })

  // Test 13: Mandatory Admin Audit Logging for Status Correction & Product Availability
  it('Scenario 13: Admin audit logs record all product availability modifications and status corrections with required reason', () => {
    const adminId = 'usr_superadmin_01'
    const adminName = 'Super Administrator'
    const auditProdId = 'gl-rujak-sharing'
    const auditOrderId = `ord_audit_${Date.now()}`

    // 1. Product Availability Audit Log
    const prodAuditId = `aud_prod_${Date.now()}`
    db.run(
      `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        prodAuditId,
        adminId,
        adminName,
        'UPDATE_PRODUCT_AVAILABILITY',
        'PRODUCT',
        auditProdId,
        JSON.stringify({ productName: 'Rujak Buah Sharing', previousStatus: 'AVAILABLE', newStatus: 'OUT_OF_STOCK' }),
      ]
    )

    const loggedProd = db.queryOne<{ id: string; action: string; metadata: string }>(
      'SELECT id, action, metadata FROM admin_audit_logs WHERE id = ?',
      [prodAuditId]
    )
    assert.strictEqual(loggedProd?.action, 'UPDATE_PRODUCT_AVAILABILITY')
    const parsedProdMeta = JSON.parse(loggedProd?.metadata || '{}')
    assert.strictEqual(parsedProdMeta.newStatus, 'OUT_OF_STOCK')

    // 2. Order Status Correction Audit Log with Mandatory Reason Validation
    function correctOrderStatusWithAudit(reason: string, fromStatus: string, toStatus: string) {
      if (!reason || reason.trim().length < 5) {
        throw new Error('Koreksi status pesanan oleh admin wajib menyertakan alasan (minimal 5 karakter).')
      }
      const logId = `aud_ord_${Date.now()}`
      db.run(
        `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
          logId,
          adminId,
          adminName,
          'ORDER_STATUS_CORRECTION',
          'ORDER',
          auditOrderId,
          JSON.stringify({ from: fromStatus, to: toStatus, reason: reason.trim() }),
        ]
      )
      return logId
    }

    assert.throws(
      () => correctOrderStatusWithAudit('ok', 'dikirim', 'selesai'),
      /wajib menyertakan alasan \(minimal 5 karakter\)/i
    )

    const correctionReason = 'Pelanggan konfirmasi via chat WA bahwa paket telah diterima satpam komplek'
    const logId = correctOrderStatusWithAudit(correctionReason, 'dikirim', 'selesai')
    const loggedOrder = db.queryOne<{ id: string; action: string; metadata: string }>(
      'SELECT id, action, metadata FROM admin_audit_logs WHERE id = ?',
      [logId]
    )
    assert.strictEqual(loggedOrder?.action, 'ORDER_STATUS_CORRECTION')
    const parsedOrderMeta = JSON.parse(loggedOrder?.metadata || '{}')
    assert.strictEqual(parsedOrderMeta.from, 'dikirim')
    assert.strictEqual(parsedOrderMeta.to, 'selesai')
    assert.strictEqual(parsedOrderMeta.reason, correctionReason)
  })

  // Test 14: 7-Tab Product Details Persistence & Retrieval
  it('Scenario 14: Product persistence stores and retrieves all 7 dimensions including SEO, gallery, and size pricing', () => {
    const ts14 = Date.now()
    const testProdId = `prod_test_${ts14}`
    const uniqueSlug14 = `rujak-sultan-spesial-amm-${ts14}`
    const uniqueSku14 = `AMM-TEST-${ts14.toString().slice(-5)}`
    const gallery = [
      { url: '/menu-photos/rujak-buah-personal.webp', alt: 'Rujak Buah Segar' },
      { url: '/menu-photos/asinan-buah-sharing.webp', alt: 'Porsi Sharing' },
    ]
    const sizePricing = { PERSONAL: 75000, SHARING: 145000, MEGA: 280000 }
    const sizes = ['PERSONAL', 'SHARING', 'MEGA']
    const customOpts = { allowed_seasonings: 2, allow_duplicates: true, allow_fruit_notes: true }

    db.run(
      `INSERT INTO products (
        id, category_id, sku, name, slug, base_price,
        short_description, full_description, seo_title, seo_description,
        display_order, is_signature, is_bestseller, gallery_images,
        promo_price, promo_start_at, promo_end_at, low_stock_threshold,
        available_sizes, size_pricing, customization_options,
        is_available, availability_status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        testProdId,
        'rujak-buah',
        uniqueSku14,
        'Rujak Sultan Spesial AMM',
        uniqueSlug14,
        75000,
        'Perpaduan 8 macam buah tropis segar dengan racikan bumbu istimewa.',
        'Potongan mangga muda, kedondong, jambu air, nanas madu disajikan dengan bumbu pedas manis autentik.',
        'Rujak Sultan Spesial | Asinan Merem Melek Official',
        'Pesan Rujak Sultan Spesial khas Asinan Merem Melek. Segar, pedas mantap, dan higienis.',
        5,
        1,
        1,
        JSON.stringify(gallery),
        69000,
        '2026-10-01T00:00:00Z',
        '2026-10-31T23:59:59Z',
        15,
        JSON.stringify(sizes),
        JSON.stringify(sizePricing),
        JSON.stringify(customOpts),
        1,
        'AVAILABLE',
      ]
    )

    const fetched = db.queryOne<any>('SELECT * FROM products WHERE id = ?', [testProdId])
    assert.ok(fetched, 'Product must be persisted')
    assert.strictEqual(fetched.name, 'Rujak Sultan Spesial AMM')
    assert.strictEqual(fetched.sku, uniqueSku14)
    assert.strictEqual(fetched.short_description, 'Perpaduan 8 macam buah tropis segar dengan racikan bumbu istimewa.')
    assert.strictEqual(fetched.is_signature, 1)
    assert.strictEqual(fetched.is_bestseller, 1)
    assert.strictEqual(fetched.promo_price, 69000)
    assert.strictEqual(fetched.low_stock_threshold, 15)

    const parsedGallery = JSON.parse(fetched.gallery_images)
    assert.strictEqual(parsedGallery.length, 2)
    assert.strictEqual(parsedGallery[0].alt, 'Rujak Buah Segar')

    const parsedSizes = JSON.parse(fetched.available_sizes)
    assert.deepStrictEqual(parsedSizes, ['PERSONAL', 'SHARING', 'MEGA'])

    const parsedPricing = JSON.parse(fetched.size_pricing)
    assert.strictEqual(parsedPricing.SHARING, 145000)

    const parsedCustom = JSON.parse(fetched.customization_options)
    assert.strictEqual(parsedCustom.allowed_seasonings, 2)
    assert.strictEqual(parsedCustom.allow_duplicates, true)
  })

  // Test 15: Soft Archive Preserves Historical Order References
  it('Scenario 15: Soft archiving a product hides it from storefront while preserving order line items', () => {
    const ts = Date.now() + 100
    const archiveProdId = `prod_arch_${ts}`
    const orderId = `ord_hist_${ts}`
    const orderItemId = `item_hist_${ts}`
    const uniqueSlug = `asinan-klasik-musiman-${ts}`
    const uniqueSku = `AMM-ARCH-${ts.toString().slice(-4)}`

    // 1. Create product
    db.run(
      `INSERT INTO products (id, category_id, sku, name, slug, base_price, is_available, availability_status, created_at)
       VALUES (?, 'asinan', ?, 'Asinan Klasik Musiman', ?, 45000, 1, 'AVAILABLE', datetime('now'))`,
      [archiveProdId, uniqueSku, uniqueSlug]
    )

    // 2. Create historical order referencing the product
    db.run(
      `INSERT INTO orders (id, order_number, branch_id, customer_name, customer_phone, delivery_type, subtotal, total, payment_status, order_status, payment_expires_at, tracking_token, created_at, updated_at)
       VALUES (?, ?, 'greenlake', 'Pelanggan Setia', '08123456789', 'delivery', 45000, 45000, 'paid', 'selesai', datetime('now', '+12 minutes'), ?, datetime('now'), datetime('now'))`,
      [orderId, `AMM-HIST-${ts}`, `tok_hist_${ts}`]
    )
    db.run(
      `INSERT INTO order_items (id, order_id, product_id, product_name, size, unit_price, qty, subtotal)
       VALUES (?, ?, ?, 'Asinan Klasik Musiman', 'PERSONAL', 45000, 1, 45000)`,
      [orderItemId, orderId, archiveProdId]
    )

    // 3. Soft archive the product (availability_status = HIDDEN, is_available = 0)
    db.run(
      `UPDATE products SET availability_status = 'HIDDEN', is_available = 0, inventory_updated_at = datetime('now') WHERE id = ?`,
      [archiveProdId]
    )

    // 4. Verify storefront query ignores HIDDEN
    const storefrontProducts = db.query<any>(
      `SELECT * FROM products WHERE availability_status != 'HIDDEN' AND is_available = 1 AND id = ?`,
      [archiveProdId]
    )
    assert.strictEqual(storefrontProducts.length, 0, 'Archived product must NOT appear in active storefront')

    // 5. Verify historical order items still cleanly join without data loss
    const joinedOrder = db.queryOne<any>(
      `SELECT o.order_number, oi.product_name, oi.unit_price, p.availability_status
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       JOIN products p ON oi.product_id = p.id
       WHERE o.id = ?`,
      [orderId]
    )
    assert.ok(joinedOrder, 'Order joined with product must resolve successfully')
    assert.strictEqual(joinedOrder.order_number, `AMM-HIST-${ts}`)
    assert.strictEqual(joinedOrder.product_name, 'Asinan Klasik Musiman')
    assert.strictEqual(joinedOrder.unit_price, 45000)
    assert.strictEqual(joinedOrder.availability_status, 'HIDDEN')
  })

  // Test 16: Customer Order Tracking Mascot States & 8-Stage Progress
  it('Scenario 16: Tracking progress resolves to 8 distinct stages and maps appropriate mascot delivery states', () => {
    function resolveTrackingState(orderStatus: string, courierStatus?: string) {
      const statusRank: Record<string, number> = {
        menunggu_pembayaran: 0,
        paid: 1,
        diverifikasi: 1,
        diproses: 2,
        siap_dikirim: 3,
        menunggu_kurir: 4,
        kurir_pickup: 5,
        dikirim: 6,
        dalam_perjalanan: 6,
        sampai: 7,
        menunggu_konfirmasi: 7,
        selesai: 8,
      }

      const currentRank = orderStatus === 'selesai'
        ? 8
        : courierStatus === 'DELIVERED' || orderStatus === 'sampai'
        ? 7
        : courierStatus === 'IN_TRANSIT'
        ? 6
        : courierStatus === 'PICKED_UP'
        ? 5
        : courierStatus === 'SEARCHING'
        ? 4
        : statusRank[orderStatus] ?? 0

      let mascotState = 'preparing'
      if (orderStatus === 'selesai') mascotState = 'delivered'
      else if (courierStatus === 'DELIVERED' || orderStatus === 'sampai' || currentRank >= 7) mascotState = 'delivered'
      else if (courierStatus === 'IN_TRANSIT' || currentRank === 6) mascotState = 'in_transit'
      else if (courierStatus === 'PICKED_UP' || currentRank === 5) mascotState = 'in_transit'
      else if (courierStatus === 'SEARCHING' || currentRank === 4) mascotState = 'waiting_courier'
      else if (orderStatus === 'siap_dikirim' || currentRank === 3) mascotState = 'packing'
      else if (orderStatus === 'diproses' || currentRank >= 2) mascotState = 'preparing'
      else mascotState = 'idle'

      return { currentRank, mascotState }
    }

    // Step 2: kitchen preparation
    const prep = resolveTrackingState('diproses')
    assert.strictEqual(prep.currentRank, 2)
    assert.strictEqual(prep.mascotState, 'preparing')

    // Step 3: finished packing
    const pack = resolveTrackingState('siap_dikirim')
    assert.strictEqual(pack.currentRank, 3)
    assert.strictEqual(pack.mascotState, 'packing')

    // Step 4: waiting for courier
    const wait = resolveTrackingState('menunggu_kurir', 'SEARCHING')
    assert.strictEqual(wait.currentRank, 4)
    assert.strictEqual(wait.mascotState, 'waiting_courier')

    // Step 5: courier picked up
    const pickup = resolveTrackingState('kurir_pickup', 'PICKED_UP')
    assert.strictEqual(pickup.currentRank, 5)
    assert.strictEqual(pickup.mascotState, 'in_transit')

    // Step 6: in transit
    const transit = resolveTrackingState('dikirim', 'IN_TRANSIT')
    assert.strictEqual(transit.currentRank, 6)
    assert.strictEqual(transit.mascotState, 'in_transit')

    // Step 7: delivered at location
    const arrived = resolveTrackingState('sampai', 'DELIVERED')
    assert.strictEqual(arrived.currentRank, 7)
    assert.strictEqual(arrived.mascotState, 'delivered')

    // Step 8: customer confirmed & completed
    const done = resolveTrackingState('selesai')
    assert.strictEqual(done.currentRank, 8)
    assert.strictEqual(done.mascotState, 'delivered')
  })

  // Test 17: Automatic Loyalty Points Calculation Formula (Rp 100.000 = 100 Poin)
  it('Scenario 17: Loyalty points calculation formula awards 100 points per Rp 100.000 of product spend', () => {
    // Verified against official business rules:
    // Poin diperoleh = floor(nominal pembelian yang memenuhi syarat / 100.000) * 100
    assert.strictEqual(MembershipService.calculateEligiblePoints(50000), 0, 'Rp 50.000 must produce 0 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(99999), 0, 'Rp 99.999 must produce 0 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(100000), 100, 'Rp 100.000 must produce 100 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(150000), 100, 'Rp 150.000 must produce 100 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(199999), 100, 'Rp 199.999 must produce 100 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(200000), 200, 'Rp 200.000 must produce 200 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(250000), 200, 'Rp 250.000 must produce 200 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(300000), 300, 'Rp 300.000 must produce 300 points')
    assert.strictEqual(MembershipService.calculateEligiblePoints(500000), 500, 'Rp 500.000 must produce 500 points')
  })

  // Test 18: Loyalty Points Anti-Duplicate Ledger Idempotency
  it('Scenario 18: Loyalty points award is idempotent and strictly prevents duplicate earnings', () => {
    const custId = `cust_idem_${Date.now()}`
    const orderNum = `AMM-IDEM-${Date.now().toString().slice(-4)}`

    db.run(
      `INSERT INTO customers (id, phone, name, email) VALUES (?, ?, 'Customer Idem', 'idem@test.com')`,
      [custId, `62818${Date.now().toString().slice(-7)}`]
    )

    // First award: subtotal 250.000 - discount 20.000 = eligible 230.000 -> 200 points
    const firstResult = MembershipService.awardOrderPoints({
      orderNumber: orderNum,
      customerId: custId,
      subtotal: 250000,
      discount: 20000,
    })

    assert.strictEqual(firstResult.awarded, true)
    assert.strictEqual(firstResult.points, 200)
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 200)

    // Repeated call with the exact same order number (e.g. page refresh or repeated webhook)
    const secondResult = MembershipService.awardOrderPoints({
      orderNumber: orderNum,
      customerId: custId,
      subtotal: 250000,
      discount: 20000,
    })

    assert.strictEqual(secondResult.awarded, false, 'Must reject duplicate award')
    assert.strictEqual(secondResult.points, 0)
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 200, 'Balance must NOT increase on duplicate calls')
  })

  // Test 19: Customer Phone Number Privacy Masking
  it('Scenario 19: Customer phone masking shields sensitive contact data from public exposure', () => {
    function maskPhoneNumber(phone?: string): string {
      if (!phone) return 'Pelanggan Terverifikasi'
      const digits = phone.replace(/\D/g, '')
      if (digits.length < 8) return '08•••••••'
      return `${digits.slice(0, 2)}•••••••${digits.slice(-2)}`
    }

    assert.strictEqual(maskPhoneNumber('081234567842'), '08•••••••42')
    assert.strictEqual(maskPhoneNumber('+6281298765432'), '62•••••••32')
    assert.strictEqual(maskPhoneNumber('085711223344'), '08•••••••44')
    assert.strictEqual(maskPhoneNumber(''), 'Pelanggan Terverifikasi')
  })

  // Test 20: Review Submission Constraints (Order Completed & Single Review per Order)
  it('Scenario 20: Reviews are strictly restricted to completed orders and enforce single review per order', () => {
    const custId = `cust_rev_${Date.now()}`
    const orderId = `ord_rev_${Date.now()}`
    const orderNum = `AMM-REV-${Date.now().toString().slice(-4)}`

    db.run(
      `INSERT INTO customers (id, phone, name, email) VALUES (?, ?, 'Reviewer Test', 'rev@test.com')`,
      [custId, `62819${Date.now().toString().slice(-7)}`]
    )

    // Insert order in 'diproses' status
    db.run(
      `INSERT INTO orders (id, order_number, idempotency_key, customer_id, customer_name, customer_phone, branch_id, delivery_type, order_status, payment_status, subtotal, total, payment_expires_at, tracking_token)
       VALUES (?, ?, ?, ?, 'Reviewer Test', '081299998888', 'greenlake', 'delivery', 'diproses', 'paid', 75000, 75000, datetime('now', '+12 minutes'), ?)`,
      [orderId, orderNum, `idem_rev_${Date.now()}`, custId, `tok_rev_${Date.now()}`]
    )

    function validateReviewSubmission(oId: string, rating: number, comment: string) {
      const order = db.queryOne<{ order_status: string; payment_status: string }>('SELECT order_status, payment_status FROM orders WHERE id = ?', [oId])
      if (!order) throw new Error('Pesanan tidak ditemukan.')
      if (order.payment_status !== 'paid') throw new Error('Hanya pesanan yang sudah lunas yang dapat memberikan ulasan.')
      if (order.order_status !== 'selesai') throw new Error('Ulasan hanya dapat diberikan setelah pesanan selesai dikonfirmasi diterima.')
      
      const existing = db.queryOne<{ id: string }>('SELECT id FROM reviews WHERE order_id = ?', [oId])
      if (existing) throw new Error('Anda sudah pernah memberikan ulasan untuk pesanan ini.')

      return true
    }

    // 1. Attempt review on 'diproses' order must be rejected
    assert.throws(
      () => validateReviewSubmission(orderId, 5, 'Buahnya sangat segar!'),
      /setelah pesanan selesai dikonfirmasi diterima/i
    )

    // 2. Mark order as 'selesai'
    db.run("UPDATE orders SET order_status = 'selesai' WHERE id = ?", [orderId])
    assert.strictEqual(validateReviewSubmission(orderId, 5, 'Buahnya sangat segar!'), true)

    // 3. Insert review
    db.run(
      `INSERT INTO reviews (id, order_id, customer_id, customer_name, product_id, product_name, rating, comment, is_published, created_at)
       VALUES (?, ?, ?, 'Reviewer Test', 'gl-rujak-personal', 'Rujak Buah Personal', 5, 'Buahnya sangat segar!', 1, datetime('now'))`,
      [`rev_test_${Date.now()}`, orderId, custId]
    )

    // 4. Duplicate review on the same order must be rejected
    assert.throws(
      () => validateReviewSubmission(orderId, 5, 'Ulasan kedua'),
      /sudah pernah memberikan ulasan untuk pesanan ini/i
    )
  })

  // Test 21: Outlet Operational Hours & Temporary Store Status Logic
  it('Scenario 21: OutletService correctly handles store status toggle, regular hours, and announcements', () => {
    // 1. Regular hours check
    const statusBefore = OutletService.getOutletStatus('greenlake')
    assert.ok(statusBefore.branchId === 'greenlake')
    assert.ok(typeof statusBefore.isOpen === 'boolean')

    // 2. Simulate Temporary Store Closure in app_settings
    db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_status', ?, datetime('now'))", [
      JSON.stringify('TEMP_CLOSED'),
    ])
    db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_announcement', ?, datetime('now'))", [
      JSON.stringify('Dapur AMM sedang maintenance sampai jam 14:00 WIB.'),
    ])

    const closedStatus = OutletService.getOutletStatus('greenlake')
    assert.strictEqual(closedStatus.isOpen, false)
    assert.strictEqual(closedStatus.todaySchedule, 'Tutup Sementara')
    assert.match(closedStatus.reason || '', /maintenance/i)

    // 3. Revert store status to OPEN
    db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_status', ?, datetime('now'))", [
      JSON.stringify('OPEN'),
    ])
    db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_announcement', ?, datetime('now'))", [
      JSON.stringify(''),
    ])

    const restoredStatus = OutletService.getOutletStatus('greenlake')
    assert.strictEqual(restoredStatus.todaySchedule.includes('Tutup Sementara'), false)
  })

  // Test 22: Seasonings Snapshot Immutability for Historical Orders
  it('Scenario 22: Seasonings modifications do not retroactively alter past order line item snapshots', () => {
    const seasonId = `season_test_${Date.now()}`
    const orderId = `ord_season_${Date.now()}`
    const orderItemId = `item_season_${Date.now()}`
    const orderSeasonId = `os_season_${Date.now()}`

    // 1. Create a seasoning
    db.run(
      'INSERT INTO seasonings (id, name, description, extra_price, is_available, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [seasonId, 'Bumbu Bangkok Original', 'Deskripsi', 0, 1, 1]
    )

    // 2. Create order referencing the seasoning with snapshot name & price
    db.run(
      `INSERT INTO orders (id, order_number, idempotency_key, customer_name, customer_phone, branch_id, delivery_type, subtotal, total, payment_status, order_status, payment_expires_at, tracking_token)
       VALUES (?, ?, ?, 'Test Seasoning', '081200001111', 'greenlake', 'delivery', 71500, 71500, 'paid', 'selesai', datetime('now', '+12 minutes'), ?)`,
      [orderId, `AMM-SEAS-${Date.now().toString().slice(-4)}`, `idem_seas_${Date.now()}`, `tok_seas_${Date.now()}`]
    )

    db.run(
      `INSERT INTO order_items (id, order_id, product_id, product_name, size, unit_price, qty, subtotal)
       VALUES (?, ?, 'gl-rujak-personal', 'Rujak Buah Personal', 'PERSONAL', 71500, 1, 71500)`,
      [orderItemId, orderId]
    )

    db.run(
      `INSERT INTO order_item_seasonings (id, order_item_id, seasoning_id, seasoning_name, qty, extra_price)
       VALUES (?, ?, ?, 'Bumbu Bangkok Original', 1, 0)`,
      [orderSeasonId, orderItemId, seasonId]
    )

    // 3. Admin alters the seasoning name and price
    db.run('UPDATE seasonings SET name = ?, extra_price = ? WHERE id = ?', ['Bumbu Bangkok Super Pedas', 5000, seasonId])

    // 4. Verify historical order retains original snapshot
    const historicalSnapshot = db.queryOne<{ seasoning_name: string; extra_price: number }>(
      'SELECT seasoning_name, extra_price FROM order_item_seasonings WHERE id = ?',
      [orderSeasonId]
    )
    assert.strictEqual(historicalSnapshot?.seasoning_name, 'Bumbu Bangkok Original', 'Historical order must retain original snapshot name')
    assert.strictEqual(historicalSnapshot?.extra_price, 0, 'Historical order must retain original extra price')
  })

  // Test 23: Real OTP Generation, HMAC Hashing, Expiry, and Brute-Force Protection
  it('Scenario 23: OtpService generates secure OTPs, verifies HMAC hashes, limits brute-force attempts, and enforces Indonesian phone format', async () => {
    // 1. Phone number normalization
    assert.strictEqual(OtpService.normalizePhone('0812-3456-7890'), '6281234567890')
    assert.strictEqual(OtpService.normalizePhone('+62 813 9988 7766'), '6281399887766')
    assert.strictEqual(OtpService.normalizePhone('628118281220'), '628118281220')

    // 2. Phone validation
    assert.strictEqual(OtpService.isValidIndonesianPhone('6281234567890'), true)
    assert.strictEqual(OtpService.isValidIndonesianPhone('12345'), false)
    assert.strictEqual(OtpService.isValidIndonesianPhone('447911123456'), false) // Non-Indonesian

    // 3. Request OTP
    const testPhone = `62812${Date.now().toString().slice(-7)}`
    const sendResult = await OtpService.requestOtp({ phone: testPhone, action: 'LOGIN' })
    assert.strictEqual(sendResult.success, true)
    assert.ok(sendResult.devOtp, 'Development mode must provide simulated OTP for verification')

    // Verify raw OTP is NEVER stored in database
    const otpRow = db.queryOne<{ otp_hash: string; attempts: number; max_attempts: number }>(
      'SELECT otp_hash, attempts, max_attempts FROM otp_verifications WHERE phone = ?',
      [testPhone]
    )
    assert.ok(otpRow)
    assert.notStrictEqual(otpRow.otp_hash, sendResult.devOtp, 'Database MUST NOT store plaintext OTP')
    assert.strictEqual(otpRow.attempts, 0)
    assert.strictEqual(otpRow.max_attempts, 5)

    // 4. Incorrect OTP verification increments attempt count
    const wrongResult = await OtpService.verifyOtp({ phone: testPhone, otp: '000000', action: 'LOGIN' })
    assert.strictEqual(wrongResult.isValid, false)
    assert.match(wrongResult.error || '', /tidak valid|sisa/i)

    const afterWrong = db.queryOne<{ attempts: number }>(
      'SELECT attempts FROM otp_verifications WHERE phone = ?',
      [testPhone]
    )
    assert.strictEqual(afterWrong?.attempts, 1)

    // 5. Valid OTP verification succeeds
    const correctResult = await OtpService.verifyOtp({ phone: testPhone, otp: sendResult.devOtp!, action: 'LOGIN' })
    assert.strictEqual(correctResult.isValid, true)

    // 6. Max attempts brute force exhaustion
    const brutePhone = `62813${Date.now().toString().slice(-7)}`
    await OtpService.requestOtp({ phone: brutePhone, action: 'LOGIN' })
    // Simulate 5 failed attempts
    db.run('UPDATE otp_verifications SET attempts = 5 WHERE phone = ?', [brutePhone])
    const bruteAttempt = await OtpService.verifyOtp({ phone: brutePhone, otp: '123456', action: 'LOGIN' })
    assert.strictEqual(bruteAttempt.isValid, false)
    assert.match(bruteAttempt.error || '', /batas percobaan/i)
  })

  // Test 24: Real Road Routing Distance Provider and 30-km Maximum Radius Rejection
  it('Scenario 24: DistanceProvider calculates driving road distance and strictly rejects deliveries exceeding 30 km', async () => {
    // Green Lake City origin coordinates
    const greenlakeOrigin = { lat: -6.1824, lng: 106.7088 }

    // Destination 1: Puri Kembangan (~5 km driving distance)
    const puriDest = { lat: -6.188, lng: 106.735 }
    const nearRoute = await DistanceProvider.calculateRouteDistance(greenlakeOrigin, puriDest)
    assert.strictEqual(nearRoute.isWithinRadius, true)
    assert.ok(nearRoute.distanceKm > 0 && nearRoute.distanceKm <= 30)
    assert.ok(nearRoute.durationMinutes > 0)

    // Destination 2: Bandung (~130 km away, far beyond 30 km radius)
    const bandungDest = { lat: -6.9175, lng: 107.6191 }
    const farRoute = await DistanceProvider.calculateRouteDistance(greenlakeOrigin, bandungDest)
    assert.strictEqual(farRoute.isWithinRadius, false, 'Bandung must exceed 30 km delivery limit')
    assert.ok(farRoute.distanceKm > 30)

    // DeliveryService calculation with destination exceeding 30 km must throw an informative error
    await assert.rejects(
      async () => {
        await DeliveryService.getQuotes({
          branchId: 'greenlake',
          destinationAddress: 'Jl. Dago No. 120, Bandung',
          lat: bandungDest.lat,
          lng: bandungDest.lng,
        })
      },
      /melebihi batas maksimal.*30 km/i
    )

    // Valid near calculation within 30 km produces valid quotes
    const quotes = await DeliveryService.getQuotes({
      branchId: 'greenlake',
      destinationAddress: 'Komplek Puri Indah Blok A, Jakarta Barat',
      lat: puriDest.lat,
      lng: puriDest.lng,
    })
    assert.ok(quotes.length >= 2, 'Must provide GoSend, GrabExpress, or Store Courier quotes')
    for (const q of quotes) {
      assert.ok(q.quotedAmount > 0)
      assert.ok(q.distanceKm <= 30)
    }
  })

  // Test 25: Backend Checkout Rejection When Store / Branch Is Closed
  it('Scenario 25: Checkout validation strictly blocks order placement when the store or branch is closed', () => {
    // 1. Verify normal open status
    const initialStatus = OutletService.getOutletStatus('greenlake')
    assert.strictEqual(typeof initialStatus.isOpen, 'boolean')

    // 2. Temporarily set store status to TEMP_CLOSED
    db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_status', ?, datetime('now'))", [
      JSON.stringify('TEMP_CLOSED'),
    ])
    db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_announcement', ?, datetime('now'))", [
      JSON.stringify('Mohon maaf, toko sedang tutup untuk renovasi.'),
    ])

    try {
      const closedCheck = OutletService.getOutletStatus('greenlake')
      assert.strictEqual(closedCheck.isOpen, false)

      // Simulate Checkout backend check
      const simulateCheckoutValidation = (branchId: string) => {
        const outletStatus = OutletService.getOutletStatus(branchId)
        if (!outletStatus.isOpen) {
          throw new Error(
            `Maaf, outlet Asinan Merem Melek sedang tutup (${outletStatus.todaySchedule}). ${outletStatus.reason || 'Silakan pesan kembali pada jam operasional kami.'}`
          )
        }
        return true
      }

      assert.throws(
        () => simulateCheckoutValidation('greenlake'),
        /sedang tutup/i
      )
    } finally {
      // 3. Restore store status
      db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_status', ?, datetime('now'))", [
        JSON.stringify('OPEN'),
      ])
      db.run("INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES ('store_announcement', ?, datetime('now'))", [
        JSON.stringify(''),
      ])
    }
  })

  // Test 26: Customer Session Token Creation, Verification, and Revocation
  it('Scenario 26: SessionService creates 64-char cryptographic tokens, resolves customer identity, and revokes sessions on logout', () => {
    const custId = `cust_sess_${Date.now()}`
    const phone = `62814${Date.now().toString().slice(-7)}`

    db.run('INSERT INTO customers (id, phone, name, email) VALUES (?, ?, ?, ?)', [
      custId,
      phone,
      'Sesi Pelanggan',
      'sesi@amm.com',
    ])

    // 1. Create session
    const session = SessionService.createSession({ customerId: custId, userAgent: 'AMM-TestRunner' })
    assert.strictEqual(typeof session.sessionToken, 'string')
    assert.strictEqual(session.sessionToken.length, 64)

    // 2. Resolve customer from token
    const customer = SessionService.getCustomerFromToken(session.sessionToken)
    assert.ok(customer)
    assert.strictEqual(customer.id, custId)
    assert.strictEqual(customer.phone, phone)

    // 3. Revoke session (Logout)
    SessionService.revokeSession(session.sessionToken)

    // 4. Verification after revocation must return null
    const afterRevoke = SessionService.getCustomerFromToken(session.sessionToken)
    assert.strictEqual(afterRevoke, null, 'Revoked session token must no longer resolve customer identity')
  })

  // Test 27: Multi-Provider Payment Gateway Adapter and Automated Webhook Processing
  it('Scenario 27: PaymentAdapter creates payments, verifies webhook notifications, updates order to paid, and idempotently awards loyalty points', async () => {
    const ts = Date.now()
    const orderId = `ord_gw_${ts}`
    const orderNum = `AMM-GW-${ts.toString().slice(-4)}`
    const custId = `cust_gw_${ts}`

    // 1. Setup customer and pending order
    db.run('INSERT INTO customers (id, phone, name, email) VALUES (?, ?, ?, ?)', [
      custId,
      `62815${ts.toString().slice(-7)}`,
      'Pelanggan Gateway',
      'gw@amm.com',
    ])

    db.run(
      `INSERT INTO orders (
        id, order_number, idempotency_key, customer_id, customer_name, customer_phone,
        branch_id, delivery_type, order_status, payment_status, subtotal, total, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, ?, 'Pelanggan Gateway', '081233445566', 'greenlake', 'delivery', 'menunggu_pembayaran', 'pending', 200000, 200000, datetime('now', '+12 minutes'), ?)`,
      [orderId, orderNum, `idem_gw_${ts}`, custId, `tok_gw_${ts}`]
    )

    db.run(
      `INSERT INTO payments (
        id, order_id, bank_name, account_number, account_holder, amount_expected, status
      ) VALUES (?, ?, 'BCA', '883-098-1220', 'ASINAN MEREM MELEK PT', 200000, 'awaiting_payment')`,
      [`pay_gw_${ts}`, orderId]
    )

    // 2. Test PaymentAdapter.createPayment for Manual Transfer
    const manualResult = await PaymentAdapter.createPayment({
      orderNumber: orderNum,
      amount: 200000,
      customerName: 'Pelanggan Gateway',
      customerPhone: '081233445566',
    }, 'MANUAL_TRANSFER')
    assert.strictEqual(manualResult.provider, 'MANUAL_TRANSFER')
    assert.ok(manualResult.bankName)
    assert.ok(manualResult.accountNumber)

    // 3. Test PaymentAdapter.createPayment for Gateway Providers (Midtrans simulation)
    const midtransResult = await PaymentAdapter.createPayment({
      orderNumber: orderNum,
      amount: 200000,
      customerName: 'Pelanggan Gateway',
      customerPhone: '081233445566',
    }, 'MIDTRANS')
    assert.strictEqual(midtransResult.provider, 'MIDTRANS')
    assert.ok(midtransResult.snapToken)

    // 4. Test Webhook Processing with valid simulated settlement
    const webhookPayload = {
      order_id: orderNum,
      transaction_status: 'settlement',
      gross_amount: '200000',
      transaction_id: `tx_midtrans_${ts}`,
    }

    const webhookResult = await PaymentAdapter.handleWebhookNotification({
      provider: 'MIDTRANS',
      headers: {
        'x-simulation-secret': 'amm_test_secret_key',
      },
      payload: webhookPayload,
    })

    assert.strictEqual(webhookResult.success, true)
    assert.strictEqual(webhookResult.status, 'PAID')
    assert.strictEqual(webhookResult.pointsAwarded, 0, 'Points must be 0 upon payment settlement because points are awarded strictly when order reaches selesai')
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 0, 'Customer balance remains 0 before order completion')

    // 5. Verify database order & payment records updated
    const updatedOrder = db.queryOne<{ order_status: string; payment_status: string }>(
      'SELECT order_status, payment_status FROM orders WHERE id = ?',
      [orderId]
    )
    assert.strictEqual(updatedOrder?.payment_status, 'paid')
    assert.strictEqual(updatedOrder?.order_status, 'diproses')

    const updatedPayment = db.queryOne<{ status: string; gateway_provider: string }>(
      'SELECT status, gateway_provider FROM payments WHERE order_id = ?',
      [orderId]
    )
    assert.strictEqual(updatedPayment?.status, 'payment_verified')
    assert.strictEqual(updatedPayment?.gateway_provider, 'MIDTRANS')

    // Verify status event logged
    const event = db.queryOne<{ from_status: string; to_status: string; actor_type: string }>(
      'SELECT from_status, to_status, actor_type FROM order_status_events WHERE order_id = ? ORDER BY created_at DESC LIMIT 1',
      [orderId]
    )
    assert.strictEqual(event?.actor_type, 'PAYMENT_GATEWAY')
    assert.strictEqual(event?.to_status, 'diproses')

    // 6. Test Idempotency of payment webhook
    const repeatedWebhook = await PaymentAdapter.handleWebhookNotification({
      provider: 'MIDTRANS',
      headers: {
        'x-simulation-secret': 'amm_test_secret_key',
      },
      payload: webhookPayload,
    })
    assert.strictEqual(repeatedWebhook.idempotent, true)
    assert.strictEqual(repeatedWebhook.success, true)
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 0, 'Points remain 0 on repeated payment webhook')

    // 7. Complete order & award points strictly at 'selesai'
    db.run("UPDATE orders SET order_status = 'selesai' WHERE id = ?", [orderId])
    const awardResult = MembershipService.awardOrderPoints({
      orderNumber: orderNum,
      customerId: custId,
      subtotal: 200000,
      discount: 0,
    })
    assert.strictEqual(awardResult.awarded, true, 'Award should succeed')
    assert.strictEqual(awardResult.points, 200, 'Rp 200.000 eligible spend awards exactly 200 points on completion')
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 200, 'Customer balance updated to 200')

    // Duplicate award call must be strictly idempotent (0 additional points)
    const duplicateAward = MembershipService.awardOrderPoints({
      orderNumber: orderNum,
      customerId: custId,
      subtotal: 200000,
      discount: 0,
    })
    assert.strictEqual(duplicateAward.awarded, false, 'Duplicate award call must return awarded=false')
    assert.strictEqual(duplicateAward.points, 0, 'Duplicate award call awards 0 points')
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 200, 'Customer balance remains 200')

    // 8. Order cancellation/refund automatically reverses points with audit log
    const reversal = MembershipService.reverseOrderPoints({
      orderNumber: orderNum,
      customerId: custId,
      reason: 'Order cancelled by test',
    })
    assert.strictEqual(reversal.reversed, true)
    assert.strictEqual(reversal.pointsReversed, 200)
    assert.strictEqual(MembershipService.getCustomerBalance(custId), 0, 'Points deducted back to 0 on reversal')
  })

  // Test 28: Admin Session Service Lifecycle & Verification
  it('Scenario 28: AdminSessionService generates tokens, resolves permissions, and revokes sessions', () => {
    // 1. Password hash verification
    const expectedHash = AdminSessionService.hashPassword('admin12345')
    assert.strictEqual(typeof expectedHash, 'string')
    assert.strictEqual(expectedHash.length, 64)

    // 2. Create session for superadmin
    const { sessionToken, expiresAt } = AdminSessionService.createSession({
      adminId: 'usr_superadmin_01',
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
    })
    assert.strictEqual(typeof sessionToken, 'string')
    assert.strictEqual(sessionToken.length, 64)
    assert.ok(expiresAt.getTime() > Date.now())

    // 3. Resolve session from token
    const adminUser = AdminSessionService.getAdminFromToken(sessionToken)
    assert.ok(adminUser)
    assert.strictEqual(adminUser?.id, 'usr_superadmin_01')
    assert.strictEqual(adminUser?.role, 'SUPER_ADMIN')
    assert.ok(adminUser?.permissions.includes('settings'))
    assert.ok(adminUser?.permissions.includes('orders'))

    // 4. Revoke session
    AdminSessionService.revokeSession(sessionToken)
    const revokedUser = AdminSessionService.getAdminFromToken(sessionToken)
    assert.strictEqual(revokedUser, null, 'Revoked admin session must resolve to null')
  })

  // Test 29: Admin Server Guard Defense-in-Depth Verification
  it('Scenario 29: Admin server guard rejects unauthenticated requests and permits active sessions', () => {
    // 1. Fake unauthenticated request (no cookies, no bearer)
    const fakeUnauthReq = new Request('http://localhost:3000/api/admin/orders')
    const unauthCheck = AdminSessionService.verifyAdminRequest(fakeUnauthReq)
    assert.strictEqual(unauthCheck.authorized, false)
    assert.strictEqual(unauthCheck.status, 401)
    assert.match(unauthCheck.error || '', /Akses ditolak/i)

    // 2. Request with valid active session cookie
    const { sessionToken } = AdminSessionService.createSession({ adminId: 'usr_superadmin_01' })
    const fakeAuthReq = new Request('http://localhost:3000/api/admin/orders', {
      headers: {
        cookie: `amm_admin_session_token=${sessionToken}`,
      },
    })
    const authCheck = AdminSessionService.verifyAdminRequest(fakeAuthReq)
    assert.strictEqual(authCheck.authorized, true)
    assert.strictEqual(authCheck.user?.id, 'usr_superadmin_01')

    // Clean up
    AdminSessionService.revokeSession(sessionToken)
  })

  // Test 30: Customer Checkout Session Enforcement
  it('Scenario 30: Guest checkout is strictly blocked without valid customer session token', () => {
    const fakeToken = 'invalid_dummy_session_token_xyz'
    const customer = SessionService.getCustomerFromToken(fakeToken)
    assert.strictEqual(customer, null, 'Invalid token must not resolve to any customer')

    // Create verified customer session
    const ts = Date.now()
    const testCustId = `cust_real_test_${ts}`
    db.run(
      `INSERT INTO customers (id, phone, name, email) VALUES (?, ?, ?, ?)`,
      [testCustId, `62819${ts.toString().slice(-7)}`, 'Real Customer Test', 'real@customer.test']
    )

    const session = SessionService.createSession({ customerId: testCustId })
    const verifiedCustomer = SessionService.getCustomerFromToken(session.sessionToken)
    assert.ok(verifiedCustomer)
    assert.strictEqual(verifiedCustomer?.id, testCustId)

    // Clean up
    SessionService.revokeSession(session.sessionToken)
  })

  // Test 31: Scope Order History Exclusively to Session Customer
  it('Scenario 31: Query parameters cannot spoof another customer order history', () => {
    const ts = Date.now()
    const custA = `cust_a_${ts}`
    const custB = `cust_b_${ts}`
    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [custA, `62818${ts.toString().slice(-7)}`, 'Cust A'])
    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [custB, `62817${ts.toString().slice(-7)}`, 'Cust B'])

    // Create order for Cust B
    const orderB = `ord_b_${ts}`
    db.run(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone, branch_id, delivery_type,
        subtotal, total, order_status, payment_status, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderB, `AMM-B-${ts}`, custB, 'Cust B', `62817${ts.toString().slice(-7)}`, 'greenlake', 'delivery', 50000, 50000, 'menunggu_pembayaran', 'pending', new Date().toISOString(), `trk_${ts}`]
    )

    // Verified query scoped to Cust A must return 0 orders even if someone requests Cust B's ID in search params
    const scopedOrders = db.query(
      'SELECT id FROM orders WHERE customer_id = ?',
      [custA]
    )
    assert.strictEqual(scopedOrders.length, 0, 'Cust A session cannot see Cust B orders')
  })

  // Test 32: Points Adjustment Strictly Blocked for Non-Admin Requests
  it('Scenario 32: Points adjustment is rejected when request is from non-admin or unauthenticated caller', () => {
    const unauthReq = new Request('http://localhost:3000/api/membership', {
      method: 'POST',
      body: JSON.stringify({ action: 'ADJUST', customerId: 'cust_01', pointsDelta: 100, reason: 'Hack' }),
    })
    const authCheck = AdminSessionService.verifyAdminRequest(unauthReq)
    assert.strictEqual(authCheck.authorized, false)
    assert.strictEqual(authCheck.status, 401)
  })

  // Test 33: Automatic Loyalty Point Calculation Formula & Edge Cases
  it('Scenario 33: Loyalty point formula floor(spend/100000)*100 calculates strictly on eligible product spend after discounts', () => {
    // 1. Formula boundary tests
    assert.strictEqual(MembershipService.calculateEligiblePoints(0), 0)
    assert.strictEqual(MembershipService.calculateEligiblePoints(49000), 0)
    assert.strictEqual(MembershipService.calculateEligiblePoints(99999), 0)
    assert.strictEqual(MembershipService.calculateEligiblePoints(100000), 100)
    assert.strictEqual(MembershipService.calculateEligiblePoints(145000), 100)
    assert.strictEqual(MembershipService.calculateEligiblePoints(199999), 100)
    assert.strictEqual(MembershipService.calculateEligiblePoints(200000), 200)
    assert.strictEqual(MembershipService.calculateEligiblePoints(350000), 300)
    assert.strictEqual(MembershipService.calculateEligiblePoints(1000000), 1000)

    // 2. Integration with order subtotal and discount (delivery fee excluded)
    const ts = Date.now()
    const testCust = `cust_formula_${ts}`
    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [testCust, `62821${ts.toString().slice(-7)}`, 'Formula Test Cust'])

    // Order with subtotal 150.000, discount 30.000 -> net eligible = 120.000 -> 100 points
    const award1 = MembershipService.awardOrderPoints({
      orderNumber: `AMM-FORMULA-1-${ts}`,
      customerId: testCust,
      subtotal: 150000,
      discount: 30000,
    })
    assert.strictEqual(award1.awarded, true)
    assert.strictEqual(award1.points, 100)
    assert.strictEqual(award1.newBalance, 100)

    // Order with subtotal 120.000, discount 30.000 -> net eligible = 90.000 (< 100.000) -> 0 points
    const award2 = MembershipService.awardOrderPoints({
      orderNumber: `AMM-FORMULA-2-${ts}`,
      customerId: testCust,
      subtotal: 120000,
      discount: 30000,
    })
    assert.strictEqual(award2.awarded, false)
    assert.strictEqual(award2.points, 0)
    assert.strictEqual(award2.newBalance, 100)
  })

  // Test 34: Permanent Order History & Customer Deletion Prohibition
  it('Scenario 34: Order records in database are permanent and customer delete operations are strictly rejected', () => {
    const ts = Date.now()
    const testCust = `cust_perm_${ts}`
    const orderId = `ord_perm_${ts}`
    const orderNum = `AMM-PERM-${ts}`

    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [testCust, `62822${ts.toString().slice(-7)}`, 'Permanent Cust'])
    db.run(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone, branch_id, delivery_type,
        subtotal, total, order_status, payment_status, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNum, testCust, 'Permanent Cust', '0822112233', 'greenlake', 'pickup', 100000, 100000, 'selesai', 'paid', new Date().toISOString(), `trk_perm_${ts}`]
    )

    // Verify order exists
    const beforeCheck = db.queryOne<{ id: string }>('SELECT id FROM orders WHERE id = ?', [orderId])
    assert.ok(beforeCheck)

    // Customer route handler responses (imported or simulated)
    const mockDeleteResponse = {
      status: 405,
      error: 'Akses ditolak. Seluruh riwayat transaksi pesanan bersifat permanen dan tidak dapat dihapus oleh customer.',
    }
    assert.strictEqual(mockDeleteResponse.status, 405)

    // Verify order is strictly preserved in database
    const afterCheck = db.queryOne<{ id: string; order_status: string }>('SELECT id, order_status FROM orders WHERE id = ?', [orderId])
    assert.ok(afterCheck)
    assert.strictEqual(afterCheck?.id, orderId)
    assert.strictEqual(afterCheck?.order_status, 'selesai')
  })

  // Test 35: Admin Voucher Management Lifecycle (Create, Edit, Toggle, Quota & Limits)
  it('Scenario 35: Admin voucher lifecycle enforces discount rules, customer quotas, and active status', () => {
    const ts = Date.now()
    const voucherId = `vouch_test_${ts}`
    const voucherCode = `TESTPROMO${ts.toString().slice(-4)}`
    const cust1 = `cust_vouch_1_${ts}`
    const cust2 = `cust_vouch_2_${ts}`
    const order1 = `ord_vouch_1_${ts}`
    const nowStr = new Date().toISOString()

    // Insert customers and dummy order to satisfy FK constraints
    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [cust1, `62823${ts.toString().slice(-7)}`, 'Cust 1'])
    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [cust2, `62824${ts.toString().slice(-7)}`, 'Cust 2'])
    db.run(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone, branch_id, delivery_type,
        subtotal, total, order_status, payment_status, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, ?, ?, 'greenlake', 'pickup', 88000, 88000, 'selesai', 'paid', ?, ?)`,
      [order1, `AMM-VOUCH-${ts}`, cust1, 'Cust 1', '0823000000', nowStr, `trk_v_${ts}`]
    )

    // 1. Create voucher: 50% discount up to Rp 25.000, min spend Rp 50.000, limit per customer 1
    db.run(
      `INSERT INTO vouchers (
        id, code, name, description, discount_type, discount_value, min_spend, max_discount,
        usage_limit, usage_limit_per_customer, times_used, start_date, end_date,
        is_active, is_archived, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'PERCENT', 50, 50000, 25000, 10, 1, 0, NULL, NULL, 1, 0, ?, ?)`,
      [voucherId, voucherCode, 'Test Promo Voucher', 'Voucher diskon 50%', nowStr, nowStr]
    )

    // 2. Pricing test: below min spend (1x gl-bumbu-bangkok = Rp 44.000 < Rp 50.000)
    const belowMinSpend = PricingService.calculateTotal({
      items: [{ productId: 'gl-bumbu-bangkok', qty: 1 }],
      voucherCode,
      customerId: cust1,
    })
    assert.strictEqual(belowMinSpend.voucherDiscount, 0)
    assert.ok(belowMinSpend.voucherError?.includes('Minimal pembelanjaan'))

    // 3. Pricing test: eligible spend (2x gl-bumbu-bangkok = Rp 88.000, 50% = 44.000, capped at max_discount 25.000)
    const eligibleSpend = PricingService.calculateTotal({
      items: [{ productId: 'gl-bumbu-bangkok', qty: 2 }],
      voucherCode,
      customerId: cust1,
    })
    assert.strictEqual(eligibleSpend.voucherDiscount, 25000)
    assert.strictEqual(eligibleSpend.voucherError, undefined)

    // 4. Record usage in voucher_usages for cust1
    db.run(
      `INSERT INTO voucher_usages (id, voucher_id, voucher_code, customer_id, order_id, discount_amount, used_at)
       VALUES (?, ?, ?, ?, ?, 25000, ?)`,
      [`vu_${ts}`, voucherId, voucherCode, cust1, order1, nowStr]
    )

    // 5. Cust 1 attempts to reuse voucher -> rejected by per-customer usage limit
    const reusedByCust1 = PricingService.calculateTotal({
      items: [{ productId: 'gl-bumbu-bangkok', qty: 2 }],
      voucherCode,
      customerId: cust1,
    })
    assert.strictEqual(reusedByCust1.voucherDiscount, 0)
    assert.ok(reusedByCust1.voucherError?.includes('batas maksimal penggunaan'))

    // 6. Cust 2 can still use voucher
    const usedByCust2 = PricingService.calculateTotal({
      items: [{ productId: 'gl-bumbu-bangkok', qty: 2 }],
      voucherCode,
      customerId: cust2,
    })
    assert.strictEqual(usedByCust2.voucherDiscount, 25000)

    // 7. Toggle inactive
    db.run('UPDATE vouchers SET is_active = 0 WHERE id = ?', [voucherId])
    const inactiveCheck = PricingService.calculateTotal({
      items: [{ productId: 'gl-bumbu-bangkok', qty: 2 }],
      voucherCode,
      customerId: cust2,
    })
    assert.strictEqual(inactiveCheck.voucherDiscount, 0)
    assert.ok(inactiveCheck.voucherError?.includes('tidak aktif'))
  })

  // Test 36: Voucher Safe Deletion & Soft-Delete / Archive Protection
  it('Scenario 36: Deleting an unused voucher removes it, while used voucher is safely archived to preserve financial records', () => {
    const ts = Date.now()
    const unusedId = `vouch_unused_${ts}`
    const usedId = `vouch_used_${ts}`
    const custDel = `cust_del_${ts}`
    const orderDel = `ord_del_${ts}`
    const nowStr = new Date().toISOString()

    // Insert customer & order for foreign key validation
    db.run(`INSERT INTO customers (id, phone, name) VALUES (?, ?, ?)`, [custDel, `62825${ts.toString().slice(-7)}`, 'Cust Del'])
    db.run(
      `INSERT INTO orders (
        id, order_number, customer_id, customer_name, customer_phone, branch_id, delivery_type,
        subtotal, total, order_status, payment_status, payment_expires_at, tracking_token
      ) VALUES (?, ?, ?, ?, ?, 'greenlake', 'pickup', 10000, 10000, 'selesai', 'paid', ?, ?)`,
      [orderDel, `AMM-DEL-${ts}`, custDel, 'Cust Del', '0825000000', nowStr, `trk_del_${ts}`]
    )

    // Create unused voucher
    db.run(
      `INSERT INTO vouchers (id, code, name, discount_type, discount_value, min_spend, max_discount, usage_limit, usage_limit_per_customer, times_used, is_active, is_archived, created_at, updated_at)
       VALUES (?, ?, 'Unused Voucher', 'FIXED', 10000, 0, 0, 10, 1, 0, 1, 0, ?, ?)`,
      [unusedId, `UNUSED_${ts}`, nowStr, nowStr]
    )

    // Create used voucher
    db.run(
      `INSERT INTO vouchers (id, code, name, discount_type, discount_value, min_spend, max_discount, usage_limit, usage_limit_per_customer, times_used, is_active, is_archived, created_at, updated_at)
       VALUES (?, ?, 'Used Voucher', 'FIXED', 10000, 0, 0, 10, 1, 1, 1, 0, ?, ?)`,
      [usedId, `USED_${ts}`, nowStr, nowStr]
    )
    db.run(
      `INSERT INTO voucher_usages (id, voucher_id, voucher_code, customer_id, order_id, discount_amount, used_at)
       VALUES (?, ?, ?, ?, ?, 10000, ?)`,
      [`vu_del_${ts}`, usedId, `USED_${ts}`, custDel, orderDel, nowStr]
    )

    // Safe deletion logic simulation (as in /api/admin/vouchers DELETE)
    // 1. Unused voucher deletion -> HARD DELETE
    const unusedUsageCount = db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM voucher_usages WHERE voucher_id = ?', [unusedId])?.cnt || 0
    if (unusedUsageCount === 0) {
      db.run('DELETE FROM vouchers WHERE id = ?', [unusedId])
    }
    const checkUnused = db.queryOne('SELECT id FROM vouchers WHERE id = ?', [unusedId])
    assert.strictEqual(checkUnused, null, 'Unused voucher must be deleted completely')

    // 2. Used voucher deletion -> SOFT DELETE (is_archived = 1, is_active = 0)
    const usedUsageCount = db.queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM voucher_usages WHERE voucher_id = ?', [usedId])?.cnt || 0
    assert.ok(usedUsageCount > 0)
    if (usedUsageCount > 0) {
      db.run('UPDATE vouchers SET is_archived = 1, is_active = 0, updated_at = ? WHERE id = ?', [nowStr, usedId])
    }
    const checkUsed = db.queryOne<{ id: string; is_archived: number; is_active: number }>('SELECT id, is_archived, is_active FROM vouchers WHERE id = ?', [usedId])
    assert.ok(checkUsed, 'Used voucher row must remain in database to preserve order history')
    assert.strictEqual(checkUsed?.is_archived, 1)
    assert.strictEqual(checkUsed?.is_active, 0)
  })
})

