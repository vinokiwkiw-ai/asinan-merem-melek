import crypto from 'node:crypto'
import { db } from '../db/index.ts'
import { MembershipService } from '../membership/membershipService.ts'

export type PaymentProvider = 'MANUAL_TRANSFER' | 'MIDTRANS' | 'XENDIT' | 'TRIPAY'

export interface CreatePaymentParams {
  orderNumber: string
  amount: number
  customerName: string
  customerPhone: string
  customerEmail?: string
  items?: Array<{ name: string; price: number; quantity: number }>
  method?: string
}

export interface CreatePaymentResult {
  provider: PaymentProvider
  paymentUrl?: string
  snapToken?: string
  qrCodeUrl?: string
  accountNumber?: string
  bankName?: string
  accountHolder?: string
  expiresAt: string
  instructions: string
  isSimulated?: boolean
  referenceId?: string
}

export interface WebhookVerificationParams {
  provider: PaymentProvider
  headers: Record<string, string | string[] | undefined> | Headers
  payload: any
  rawBody?: string
}

export interface WebhookProcessingResult {
  success: boolean
  orderNumber: string
  orderId: string
  status: 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING'
  amountPaid?: number
  pointsAwarded?: number
  message: string
  idempotent: boolean
}

function getHeaderValue(
  headers: Record<string, string | string[] | undefined> | Headers,
  headerName: string
): string | undefined {
  const target = headerName.toLowerCase()
  if (typeof (headers as any).get === 'function') {
    return (headers as Headers).get(target) || (headers as Headers).get(headerName) || undefined
  }
  const record = headers as Record<string, string | string[] | undefined>
  for (const key of Object.keys(record)) {
    if (key.toLowerCase() === target) {
      const val = record[key]
      return Array.isArray(val) ? val[0] : val
    }
  }
  return undefined
}

export class PaymentAdapter {
  /**
   * Determine currently active payment provider from environment
   */
  static getActiveProvider(): PaymentProvider {
    const raw = (process.env.PAYMENT_GATEWAY_PROVIDER || 'MANUAL_TRANSFER').toUpperCase().trim()
    if (raw === 'MIDTRANS') return 'MIDTRANS'
    if (raw === 'XENDIT') return 'XENDIT'
    if (raw === 'TRIPAY') return 'TRIPAY'
    return 'MANUAL_TRANSFER'
  }

  /**
   * Check whether live credentials exist for a provider
   */
  static isConfigured(provider: PaymentProvider): boolean {
    switch (provider) {
      case 'MIDTRANS':
        return !!(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_CLIENT_KEY)
      case 'XENDIT':
        return !!process.env.XENDIT_SECRET_KEY
      case 'TRIPAY':
        return !!(process.env.TRIPAY_API_KEY && process.env.TRIPAY_PRIVATE_KEY && process.env.TRIPAY_MERCHANT_CODE)
      case 'MANUAL_TRANSFER':
      default:
        return true
    }
  }

  /**
   * Retrieve official manual bank account settings from database or fallback
   */
  static getManualBankAccounts(): Array<{
    bankName: string
    accountNumber: string
    accountHolder: string
    qrImageUrl?: string
    notes?: string
  }> {
    try {
      const setting = db.queryOne<{ value: string }>(
        "SELECT value FROM app_settings WHERE key = 'bank_transfer_info'"
      )
      if (setting?.value) {
        const parsed = JSON.parse(setting.value)
        if (Array.isArray(parsed)) return parsed
        if (parsed.bank_name) {
          return [
            {
              bankName: parsed.bank_name,
              accountNumber: parsed.account_number,
              accountHolder: parsed.account_holder,
              qrImageUrl: parsed.qr_image_url || '/payment-qr-demo.png',
              notes: parsed.notes,
            },
          ]
        }
      }
    } catch {
      // fallback
    }

    return [
      {
        bankName: 'BCA (Bank Central Asia)',
        accountNumber: '883-098-1220',
        accountHolder: 'ASINAN MEREM MELEK PT',
        qrImageUrl: '/payment-qr-demo.png',
        notes: 'Transfer tepat sesuai nominal tagihan hingga 3 digit terakhir.',
      },
      {
        bankName: 'Bank Mandiri',
        accountNumber: '123-000-828-1220',
        accountHolder: 'ASINAN MEREM MELEK PT',
        notes: 'Sertakan nomor pesanan pada berita transfer.',
      },
    ]
  }

  /**
   * Create payment transaction with active or selected provider
   */
  static async createPayment(
    params: CreatePaymentParams,
    overrideProvider?: PaymentProvider
  ): Promise<CreatePaymentResult> {
    const provider = overrideProvider || this.getActiveProvider()
    const expiryMinutes = 12
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString()

    switch (provider) {
      case 'MIDTRANS': {
        const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true'
        const serverKey = process.env.MIDTRANS_SERVER_KEY

        if (serverKey) {
          try {
            const endpoint = isProd
              ? 'https://app.midtrans.com/snap/v1/transactions'
              : 'https://app.sandbox.midtrans.com/snap/v1/transactions'

            const authHeader = 'Basic ' + Buffer.from(serverKey + ':').toString('base64')
            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                Authorization: authHeader,
              },
              body: JSON.stringify({
                transaction_details: {
                  order_id: params.orderNumber,
                  gross_amount: Math.round(params.amount),
                },
                customer_details: {
                  first_name: params.customerName,
                  phone: params.customerPhone,
                  email: params.customerEmail || `${params.orderNumber.toLowerCase()}@asinanmeremmelek.site`,
                },
                item_details: params.items?.map((it) => ({
                  id: it.name.substring(0, 50),
                  price: Math.round(it.price),
                  quantity: it.quantity,
                  name: it.name.substring(0, 50),
                })) || [
                  {
                    id: params.orderNumber,
                    price: Math.round(params.amount),
                    quantity: 1,
                    name: `Pesanan AMM ${params.orderNumber}`,
                  },
                ],
                expiry: {
                  unit: 'minute',
                  duration: expiryMinutes,
                },
              }),
            })

            if (response.ok) {
              const data = await response.json()
              return {
                provider: 'MIDTRANS',
                snapToken: data.token,
                paymentUrl: data.redirect_url,
                expiresAt,
                instructions: 'Selesaikan pembayaran melalui gateway Midtrans Snap sebelum batas waktu berakhir.',
                isSimulated: false,
                referenceId: data.token,
              }
            }
          } catch (err: any) {
            console.error('[PaymentAdapter Midtrans API Error]', err.message)
          }
        }

        // Midtrans Fallback / Sandbox Simulation
        return {
          provider: 'MIDTRANS',
          snapToken: `sim_snap_${params.orderNumber}_${Date.now()}`,
          paymentUrl: `/payment?order=${params.orderNumber}&provider=midtrans_sim`,
          expiresAt,
          instructions: 'Simulasi Gateway Midtrans aktif (Menunggu konfigurasi MIDTRANS_SERVER_KEY produksi).',
          isSimulated: true,
          referenceId: `midtrans_sim_${params.orderNumber}`,
        }
      }

      case 'XENDIT': {
        const secretKey = process.env.XENDIT_SECRET_KEY
        if (secretKey) {
          try {
            const authHeader = 'Basic ' + Buffer.from(secretKey + ':').toString('base64')
            const response = await fetch('https://api.xendit.co/v2/invoices', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: authHeader,
              },
              body: JSON.stringify({
                external_id: params.orderNumber,
                amount: Math.round(params.amount),
                payer_email: params.customerEmail || `${params.orderNumber.toLowerCase()}@asinanmeremmelek.site`,
                description: `Pembayaran Asinan Merem Melek #${params.orderNumber}`,
                invoice_duration: expiryMinutes * 60,
                customer: {
                  given_names: params.customerName,
                  mobile_number: params.customerPhone,
                },
              }),
            })

            if (response.ok) {
              const data = await response.json()
              return {
                provider: 'XENDIT',
                paymentUrl: data.invoice_url,
                expiresAt: data.expiry_date || expiresAt,
                instructions: 'Selesaikan pembayaran melalui invoice Xendit yang aman.',
                isSimulated: false,
                referenceId: data.id,
              }
            }
          } catch (err: any) {
            console.error('[PaymentAdapter Xendit API Error]', err.message)
          }
        }

        return {
          provider: 'XENDIT',
          paymentUrl: `/payment?order=${params.orderNumber}&provider=xendit_sim`,
          expiresAt,
          instructions: 'Simulasi Gateway Xendit aktif (Menunggu konfigurasi XENDIT_SECRET_KEY produksi).',
          isSimulated: true,
          referenceId: `xendit_sim_${params.orderNumber}`,
        }
      }

      case 'TRIPAY': {
        const apiKey = process.env.TRIPAY_API_KEY
        const privateKey = process.env.TRIPAY_PRIVATE_KEY
        const merchantCode = process.env.TRIPAY_MERCHANT_CODE
        const isProd = process.env.TRIPAY_IS_PRODUCTION === 'true'

        if (apiKey && privateKey && merchantCode) {
          try {
            const endpoint = isProd
              ? 'https://tripay.co.id/api/transaction/create'
              : 'https://tripay.co.id/api-sandbox/transaction/create'

            const amount = Math.round(params.amount)
            const signature = crypto
              .createHmac('sha256', privateKey)
              .update(merchantCode + params.orderNumber + amount)
              .digest('hex')

            const response = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                method: params.method || 'QRIS2',
                merchant_ref: params.orderNumber,
                amount,
                customer_name: params.customerName,
                customer_email: params.customerEmail || `${params.orderNumber.toLowerCase()}@asinanmeremmelek.site`,
                customer_phone: params.customerPhone,
                order_items: [
                  {
                    sku: params.orderNumber,
                    name: `Pesanan AMM #${params.orderNumber}`,
                    price: amount,
                    quantity: 1,
                  },
                ],
                signature,
              }),
            })

            if (response.ok) {
              const data = await response.json()
              if (data.success && data.data) {
                return {
                  provider: 'TRIPAY',
                  paymentUrl: data.data.checkout_url,
                  qrCodeUrl: data.data.qr_url,
                  accountNumber: data.data.pay_code,
                  expiresAt: new Date(data.data.expired_time * 1000).toISOString(),
                  instructions: 'Selesaikan transaksi melalui instruksi pembayaran Tripay.',
                  isSimulated: false,
                  referenceId: data.data.reference,
                }
              }
            }
          } catch (err: any) {
            console.error('[PaymentAdapter Tripay API Error]', err.message)
          }
        }

        return {
          provider: 'TRIPAY',
          paymentUrl: `/payment?order=${params.orderNumber}&provider=tripay_sim`,
          expiresAt,
          instructions: 'Simulasi Gateway Tripay aktif (Menunggu konfigurasi TRIPAY_API_KEY produksi).',
          isSimulated: true,
          referenceId: `tripay_sim_${params.orderNumber}`,
        }
      }

      case 'MANUAL_TRANSFER':
      default: {
        const accounts = this.getManualBankAccounts()
        const primary = accounts[0]
        return {
          provider: 'MANUAL_TRANSFER',
          bankName: primary.bankName,
          accountNumber: primary.accountNumber,
          accountHolder: primary.accountHolder,
          qrCodeUrl: primary.qrImageUrl,
          expiresAt,
          instructions:
            'Silakan transfer tepat sesuai total nominal ke rekening resmi di atas, kemudian unggah foto bukti transfer sebelum 12 menit.',
          isSimulated: false,
        }
      }
    }
  }

  /**
   * Verify authenticity of incoming webhook notifications
   */
  static verifyWebhookSignature(params: WebhookVerificationParams): boolean {
    const { provider, headers, payload, rawBody } = params

    // Developer / Test simulation bypass
    const simHeader = getHeaderValue(headers, 'x-simulation-secret')
    if (
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_PAYMENT_SIMULATION === 'true'
    ) {
      if (simHeader === 'amm_test_secret_key' || getHeaderValue(headers, 'x-amm-simulated') === 'true') {
        return true
      }
    }

    switch (provider) {
      case 'MIDTRANS': {
        const serverKey = process.env.MIDTRANS_SERVER_KEY
        if (!serverKey) {
          return process.env.NODE_ENV !== 'production'
        }
        const orderId = payload?.order_id || ''
        const statusCode = payload?.status_code || ''
        const grossAmount = payload?.gross_amount || ''
        const signatureKey = payload?.signature_key || ''

        const expectedSignature = crypto
          .createHash('sha512')
          .update(orderId + statusCode + grossAmount + serverKey)
          .digest('hex')

        return crypto.timingSafeEqual(
          Buffer.from(signatureKey, 'utf-8'),
          Buffer.from(expectedSignature, 'utf-8')
        )
      }

      case 'XENDIT': {
        const verificationToken = process.env.XENDIT_WEBHOOK_VERIFICATION_TOKEN
        if (!verificationToken) {
          return process.env.NODE_ENV !== 'production'
        }
        const token = getHeaderValue(headers, 'x-callback-token')
        return token === verificationToken
      }

      case 'TRIPAY': {
        const privateKey = process.env.TRIPAY_PRIVATE_KEY
        if (!privateKey) {
          return process.env.NODE_ENV !== 'production'
        }
        const callbackSignature = getHeaderValue(headers, 'x-callback-signature') || ''
        const bodyToSign = rawBody || JSON.stringify(payload)
        const expectedSignature = crypto
          .createHmac('sha256', privateKey)
          .update(bodyToSign)
          .digest('hex')

        return crypto.timingSafeEqual(
          Buffer.from(callbackSignature, 'utf-8'),
          Buffer.from(expectedSignature, 'utf-8')
        )
      }

      case 'MANUAL_TRANSFER':
      default:
        return false
    }
  }

  /**
   * Authoritative webhook handler:
   * 1. Validates signature
   * 2. Idempotently updates order and payment status
   * 3. Records audit event
   * 4. Awards loyalty points automatically on successful payment
   */
  static async handleWebhookNotification(params: {
    provider: PaymentProvider
    headers: Record<string, string | string[] | undefined> | Headers
    payload: any
    rawBody?: string
  }): Promise<WebhookProcessingResult> {
    const { provider, headers, payload, rawBody } = params

    // 1. Signature Check
    const isValid = this.verifyWebhookSignature({ provider, headers, payload, rawBody })
    if (!isValid) {
      throw new Error(`Tanda tangan webhook (${provider}) tidak sah. Akses ditolak.`)
    }

    // 2. Extract standard fields per provider
    let orderNumber = ''
    let normalizedStatus: 'PAID' | 'EXPIRED' | 'FAILED' | 'PENDING' = 'PENDING'
    let referenceNumber = ''
    let grossAmount = 0

    if (provider === 'MIDTRANS') {
      orderNumber = payload.order_id
      referenceNumber = payload.transaction_id || payload.order_id
      grossAmount = parseFloat(payload.gross_amount) || 0
      const txStatus = payload.transaction_status
      const fraudStatus = payload.fraud_status

      if (txStatus === 'capture') {
        normalizedStatus = fraudStatus === 'accept' || !fraudStatus ? 'PAID' : 'FAILED'
      } else if (txStatus === 'settlement') {
        normalizedStatus = 'PAID'
      } else if (['cancel', 'deny', 'expire'].includes(txStatus)) {
        normalizedStatus = 'EXPIRED'
      } else if (txStatus === 'pending') {
        normalizedStatus = 'PENDING'
      }
    } else if (provider === 'XENDIT') {
      orderNumber = payload.external_id
      referenceNumber = payload.id || payload.external_id
      grossAmount = payload.amount || 0
      const status = (payload.status || '').toUpperCase()

      if (status === 'PAID') {
        normalizedStatus = 'PAID'
      } else if (status === 'EXPIRED') {
        normalizedStatus = 'EXPIRED'
      } else {
        normalizedStatus = 'PENDING'
      }
    } else if (provider === 'TRIPAY') {
      orderNumber = payload.merchant_ref
      referenceNumber = payload.reference || payload.merchant_ref
      grossAmount = payload.total_amount || 0
      const status = (payload.status || '').toUpperCase()

      if (status === 'PAID') {
        normalizedStatus = 'PAID'
      } else if (status === 'EXPIRED') {
        normalizedStatus = 'EXPIRED'
      } else if (status === 'FAILED') {
        normalizedStatus = 'FAILED'
      }
    }

    if (!orderNumber) {
      throw new Error('Nomor pesanan tidak ditemukan di dalam payload webhook.')
    }

    // 3. Find Order in Database
    const order = db.queryOne<{
      id: string
      order_number: string
      subtotal: number
      discount: number
      total: number
      order_status: string
      payment_status: string
      customer_id: string
    }>('SELECT * FROM orders WHERE order_number = ?', [orderNumber])

    if (!order) {
      throw new Error(`Pesanan dengan nomor ${orderNumber} tidak ditemukan di database.`)
    }

    // 4. Idempotency Check
    if (order.payment_status === 'paid' && normalizedStatus === 'PAID') {
      return {
        success: true,
        orderNumber,
        orderId: order.id,
        status: 'PAID',
        amountPaid: grossAmount || order.total,
        message: 'Pesanan sudah berstatus lunas sebelumnya (Idempotent).',
        idempotent: true,
      }
    }

    const nowStr = new Date().toISOString()
    let pointsAwarded = 0

    // 5. Atomic state update
    db.transaction(() => {
      if (normalizedStatus === 'PAID') {
        // Update Order
        db.run(
          `UPDATE orders SET
            payment_status = 'paid',
            order_status = CASE WHEN order_status = 'menunggu_pembayaran' THEN 'diproses' ELSE order_status END,
            updated_at = ?
          WHERE id = ?`,
          [nowStr, order.id]
        )

        // Update Payment record
        db.run(
          `UPDATE payments SET
            status = 'payment_verified',
            amount_transferred = ?,
            reference_number = ?,
            verified_at = ?,
            verified_by = ?,
            gateway_provider = ?,
            gateway_reference = ?,
            gateway_payload = ?,
            rejection_reason = NULL
          WHERE order_id = ?`,
          [
            grossAmount || order.total,
            referenceNumber,
            nowStr,
            `WEBHOOK_${provider}`,
            provider,
            referenceNumber,
            JSON.stringify(payload),
            order.id,
          ]
        )

        // Insert Order Status Event
        db.run(
          `INSERT INTO order_status_events (
            id, order_id, from_status, to_status, actor_type, actor_id, notes, created_at
          ) VALUES (?, ?, ?, ?, 'PAYMENT_GATEWAY', ?, ?, ?)`,
          [
            `evt_${Date.now()}`,
            order.id,
            order.order_status,
            order.order_status === 'menunggu_pembayaran' ? 'diproses' : order.order_status,
            provider,
            `Pembayaran lunas via webhook ${provider} (Ref: ${referenceNumber}). Pesanan masuk antrean dapur.`,
            nowStr,
          ]
        )
      } else if (normalizedStatus === 'EXPIRED' || normalizedStatus === 'FAILED') {
        if (order.order_status === 'menunggu_pembayaran') {
          db.run(
            `UPDATE orders SET
              payment_status = ?,
              order_status = 'dibatalkan',
              updated_at = ?
            WHERE id = ?`,
            [normalizedStatus.toLowerCase(), nowStr, order.id]
          )

          db.run(
            `UPDATE payments SET
              status = ?,
              gateway_provider = ?,
              gateway_reference = ?,
              gateway_payload = ?
            WHERE order_id = ?`,
            [normalizedStatus.toLowerCase(), provider, referenceNumber, JSON.stringify(payload), order.id]
          )

          db.run(
            `INSERT INTO order_status_events (
              id, order_id, from_status, to_status, actor_type, actor_id, notes, created_at
            ) VALUES (?, ?, ?, 'dibatalkan', 'PAYMENT_GATEWAY', ?, ?, ?)`,
            [
              `evt_${Date.now()}`,
              order.id,
              order.order_status,
              provider,
              `Pembayaran ${normalizedStatus.toLowerCase()} melalui ${provider}. Pesanan otomatis dibatalkan.`,
              nowStr,
            ]
          )
        }
      }
    })

    // 6. Award Loyalty Points on Paid
    if (normalizedStatus === 'PAID') {
      const customerId = order.customer_id || `cust_${order.order_number}`
      const awardResult = MembershipService.awardOrderPoints({
        orderNumber: order.order_number,
        customerId,
        subtotal: order.subtotal,
        discount: order.discount || 0,
      })
      pointsAwarded = awardResult.points
    }

    return {
      success: true,
      orderNumber,
      orderId: order.id,
      status: normalizedStatus,
      amountPaid: grossAmount || order.total,
      pointsAwarded,
      message: `Status pesanan ${orderNumber} berhasil diperbarui menjadi ${normalizedStatus}.`,
      idempotent: false,
    }
  }
}
