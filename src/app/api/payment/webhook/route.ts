import { NextRequest, NextResponse } from 'next/server'
import { PaymentAdapter, PaymentProvider } from '@/lib/payment/paymentAdapter'

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text()
    let payload: any = {}
    try {
      payload = JSON.parse(rawBody)
    } catch {
      return NextResponse.json({ error: 'Payload bukan format JSON yang valid.' }, { status: 400 })
    }

    // Determine provider from query parameter or auto-detect from payload/headers
    const queryProvider = req.nextUrl.searchParams.get('provider')?.toUpperCase() as PaymentProvider | undefined
    let provider: PaymentProvider = queryProvider || 'MIDTRANS'

    if (!queryProvider) {
      if (req.headers.get('x-callback-token')) {
        provider = 'XENDIT'
      } else if (req.headers.get('x-callback-signature')) {
        provider = 'TRIPAY'
      } else if (payload.transaction_status || payload.order_id) {
        provider = 'MIDTRANS'
      } else {
        provider = PaymentAdapter.getActiveProvider()
      }
    }

    const result = await PaymentAdapter.handleWebhookNotification({
      provider,
      headers: req.headers,
      payload,
      rawBody,
    })

    return NextResponse.json({
      success: true,
      provider,
      orderNumber: result.orderNumber,
      status: result.status,
      amountPaid: result.amountPaid,
      pointsAwarded: result.pointsAwarded,
      idempotent: result.idempotent,
      message: result.message,
    })
  } catch (error: any) {
    console.error('[Payment Webhook Error]', error.message)
    const status = error.message?.includes('tidak sah')
      ? 401
      : error.message?.includes('tidak ditemukan')
      ? 404
      : 400
    return NextResponse.json({ success: false, error: error.message || 'Webhook processing failed.' }, { status })
  }
}
