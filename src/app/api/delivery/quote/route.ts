import { NextRequest, NextResponse } from 'next/server'
import { DeliveryService } from '@/lib/delivery/deliveryService'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { branchId, destinationAddress, destinationCity, lat, lng } = body

    if (!destinationAddress || destinationAddress.trim().length < 5) {
      return NextResponse.json({ error: 'Alamat tujuan pengiriman tidak valid.' }, { status: 400 })
    }

    const quotes = await DeliveryService.getQuotes({
      branchId: branchId || 'greenlake',
      destinationAddress: destinationAddress.trim(),
      destinationCity,
      lat: lat ? Number(lat) : undefined,
      lng: lng ? Number(lng) : undefined,
    })

    return NextResponse.json({ quotes })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghitung ongkos kirim.' }, { status: 400 })
  }
}
