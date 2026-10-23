import { NextRequest, NextResponse } from 'next/server'
import { ReportService } from '@/lib/reports/reportService'

export async function GET(req: NextRequest) {
  try {
    const format = req.nextUrl.searchParams.get('format') || 'csv'
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

    const timestamp = new Date().toISOString().slice(0, 10)

    if (format === 'csv') {
      const csv = ReportService.exportCsv(report)
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="AMM-Laporan-Penjualan-${timestamp}.csv"`,
        },
      })
    }

    if (format === 'xlsx') {
      const xlsx = ReportService.exportXlsxXml(report)
      return new NextResponse(xlsx, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.ms-excel; charset=utf-8',
          'Content-Disposition': `attachment; filename="AMM-Laporan-Penjualan-${timestamp}.xls"`,
        },
      })
    }

    // Default: Printable HTML report (convertible/printable to PDF)
    const html = ReportService.exportHtmlReport(report)
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal mengekspor laporan.' }, { status: 500 })
  }
}
