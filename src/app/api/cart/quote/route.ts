import { NextRequest, NextResponse } from 'next/server'
import { PricingService } from '@/lib/pricing/pricingService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, voucherCode, hasGiftPackaging, hasGreetingCard, deliveryFee, deliveryProvider } = body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Keranjang belanja tidak boleh kosong.' }, { status: 400 })
    }

    const calculation = PricingService.calculateTotal({
      items,
      voucherCode,
      hasGiftPackaging: Boolean(hasGiftPackaging),
      hasGreetingCard: Boolean(hasGreetingCard),
      deliveryFee: Number(deliveryFee) || 0,
      deliveryProvider: deliveryProvider || 'MANUAL_STORE_COURIER',
    })

    return NextResponse.json(calculation)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Terjadi kesalahan kalkulasi harga.' }, { status: 400 })
  }
}
