import { NextRequest, NextResponse } from 'next/server'
import { MembershipService } from '@/lib/membership/membershipService'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID wajib disertakan.' }, { status: 400 })
    }

    const summary = MembershipService.getCustomerSummary(customerId)
    const availableRewards = db.query('SELECT * FROM rewards WHERE is_active = 1')

    return NextResponse.json({
      summary,
      rewards: availableRewards,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat data membership.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, customerId, rewardId, pointsDelta, reason, adminName, adminId } = body

    if (action === 'REDEEM') {
      if (!customerId || !rewardId) {
        return NextResponse.json({ error: 'Customer ID dan Reward ID wajib disertakan.' }, { status: 400 })
      }
      const result = MembershipService.redeemReward({ customerId, rewardId })
      return NextResponse.json(result)
    }

    if (action === 'ADJUST') {
      if (!customerId || typeof pointsDelta !== 'number' || !reason) {
        return NextResponse.json({ error: 'Parameter penyesuaian poin tidak lengkap.' }, { status: 400 })
      }
      const result = MembershipService.adjustPoints({
        customerId,
        pointsDelta,
        reason,
        adminId: adminId || 'admin_super',
        adminName: adminName || 'Administrator',
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Aksi membership tidak dikenal.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memproses transaksi membership.' }, { status: 400 })
  }
}
