import { NextRequest, NextResponse } from 'next/server'
import { MembershipService } from '@/lib/membership/membershipService'
import { db } from '@/lib/db'
import { SessionService, SESSION_COOKIE_NAME } from '@/lib/auth/sessionService'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

function getSessionCustomer(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7).trim() : null)
  return sessionToken ? SessionService.getCustomerFromToken(sessionToken) : null
}

export async function GET(req: NextRequest) {
  try {
    const sessionCustomer = getSessionCustomer(req)
    const admin = AdminSessionService.getAdminFromRequest(req)

    if (!sessionCustomer && !admin) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk melihat informasi poin.' }, { status: 401 })
    }

    // Admins can query any customer ID; customers can only query their own session ID
    let targetCustomerId = sessionCustomer ? sessionCustomer.id : req.nextUrl.searchParams.get('customerId')
    if (!targetCustomerId) {
      return NextResponse.json({ error: 'Customer ID wajib disertakan.' }, { status: 400 })
    }

    const summary = MembershipService.getCustomerSummary(targetCustomerId)
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
    const { action, rewardId, pointsDelta, reason, customerId } = body

    if (action === 'REDEEM') {
      const sessionCustomer = getSessionCustomer(req)
      if (!sessionCustomer) {
        return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk menukarkan poin reward.' }, { status: 401 })
      }

      if (!rewardId) {
        return NextResponse.json({ error: 'Reward ID wajib disertakan.' }, { status: 400 })
      }

      const result = MembershipService.redeemReward({ customerId: sessionCustomer.id, rewardId })
      return NextResponse.json(result)
    }

    if (action === 'ADJUST') {
      // Points adjustment strictly requires authenticated Admin
      const auth = AdminSessionService.verifyAdminRequest(req)
      if (!auth.authorized) {
        return NextResponse.json(
          { error: 'Akses ditolak. Hanya staf admin yang berwenang melakukan penyesuaian saldo poin.' },
          { status: 403 }
        )
      }

      if (!customerId || typeof pointsDelta !== 'number' || !reason) {
        return NextResponse.json({ error: 'Parameter penyesuaian poin tidak lengkap.' }, { status: 400 })
      }

      const result = MembershipService.adjustPoints({
        customerId,
        pointsDelta,
        reason,
        adminId: auth.user?.id || 'admin',
        adminName: auth.user?.name || 'Administrator',
      })
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Aksi membership tidak dikenal.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memproses transaksi membership.' }, { status: 500 })
  }
}
