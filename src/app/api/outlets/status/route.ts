import { NextRequest, NextResponse } from 'next/server'
import { OutletService } from '@/lib/outlet/outletService'

export async function GET(req: NextRequest) {
  try {
    const branchId = req.nextUrl.searchParams.get('branchId')
    if (branchId) {
      const status = OutletService.getOutletStatus(branchId)
      return NextResponse.json(status)
    }

    const all = OutletService.getAllBranchStatuses()
    return NextResponse.json({ branches: all })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat status outlet.' }, { status: 500 })
  }
}
