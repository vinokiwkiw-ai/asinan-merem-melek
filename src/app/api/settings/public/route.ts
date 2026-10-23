import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const announcementRow = db.queryOne<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      ['announcement_bar']
    )
    let announcementText = '🥭 PROMO MEREM MELEK: Gratis Greeting Card & Bonus Poin Membership untuk Pemesanan Online!'
    if (announcementRow?.value) {
      try {
        const parsed = JSON.parse(announcementRow.value)
        if (parsed?.text) announcementText = parsed.text
      } catch {
        announcementText = announcementRow.value
      }
    }

    const storeStatusRow = db.queryOne<{ value: string }>(
      'SELECT value FROM app_settings WHERE key = ?',
      ['store_status']
    )
    let storeStatus = 'OPEN'
    if (storeStatusRow?.value) {
      try {
        storeStatus = JSON.parse(storeStatusRow.value)
      } catch {
        storeStatus = storeStatusRow.value
      }
    }

    return NextResponse.json({
      success: true,
      announcement: announcementText,
      storeStatus,
    })
  } catch (error: any) {
    return NextResponse.json({
      success: true,
      announcement: '🥭 Segarnya Rujak & Asinan Buah Asli Merem Melek!',
      storeStatus: 'OPEN',
    })
  }
}
