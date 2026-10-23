import { NextRequest, NextResponse } from 'next/server'
import { ReportService } from '@/lib/reports/reportService'

export async function GET(req: NextRequest) {
  try {
    const startDate = req.nextUrl.searchParams.get('startDate') || undefined
    const endDate = req.nextUrl.searchParams.get('endDate') || undefined
    const branchId = req.nextUrl.searchParams.get('branchId') || undefined
    const orderStatus = req.nextUrl.searchParams.get('orderStatus') || undefined

    const report = ReportService.generateReport({
      startDate,
      endDate,
      branchId,
      orderStatus,
    })

    return NextResponse.json(report)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat ringkasan laporan.' }, { status: 500 })
  }
}
