import { db } from '../db/index.ts'

export interface ReportFilter {
  startDate?: string
  endDate?: string
  branchId?: string
  orderStatus?: string
}

export interface SalesReportSummary {
  period: string
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  completionRate: number
  cancellationRate: number
  grossSales: number
  totalDiscounts: number
  totalShippingFees: number
  totalGiftFees: number
  verifiedRevenue: number
  averageOrderValue: number
  topProducts: { name: string; qty: number; revenue: number }[]
  topSeasonings: { name: string; count: number }[]
  orders: any[]
}

export class ReportService {
  /**
   * Escape spreadsheet formula injection (RFC 4180 safe)
   */
  static sanitizeForSpreadsheet(val: any): string {
    if (val === null || val === undefined) return ''
    let str = String(val).trim()
    if (/^[=+@-]/i.test(str)) {
      str = `'${str}`
    }
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  /**
   * Generate Sales Summary & Reconciled Metrics
   */
  static generateReport(filter: ReportFilter = {}): SalesReportSummary {
    const { startDate, endDate, branchId, orderStatus } = filter

    let sql = 'SELECT * FROM orders WHERE 1=1'
    const params: any[] = []

    if (startDate) {
      sql += ' AND created_at >= ?'
      params.push(startDate)
    }

    if (endDate) {
      sql += ' AND created_at <= ?'
      params.push(endDate + ' 23:59:59')
    }

    if (branchId) {
      sql += ' AND branch_id = ?'
      params.push(branchId)
    }

    if (orderStatus) {
      sql += ' AND order_status = ?'
      params.push(orderStatus)
    }

    sql += ' ORDER BY created_at DESC'
    const orders = db.query(sql, params)

    let grossSales = 0
    let totalDiscounts = 0
    let totalShippingFees = 0
    let totalGiftFees = 0
    let verifiedRevenue = 0
    let completedOrders = 0
    let cancelledOrders = 0

    orders.forEach((o) => {
      grossSales += o.subtotal || 0
      totalDiscounts += o.discount || 0
      totalShippingFees += o.delivery_fee || 0
      totalGiftFees += o.gift_charge || 0

      if (o.payment_status === 'paid') {
        verifiedRevenue += o.total || 0
      }

      if (o.order_status === 'selesai') {
        completedOrders++
      } else if (o.order_status === 'dibatalkan' || o.order_status === 'expired') {
        cancelledOrders++
      }
    })

    const totalOrders = orders.length
    const completionRate = totalOrders > 0 ? Number(((completedOrders / totalOrders) * 100).toFixed(1)) : 0
    const cancellationRate = totalOrders > 0 ? Number(((cancelledOrders / totalOrders) * 100).toFixed(1)) : 0
    const averageOrderValue = totalOrders > 0 ? Math.round(verifiedRevenue / Math.max(1, completedOrders || totalOrders)) : 0

    // Top selling products
    const topProducts = db.query<{ name: string; qty: number; revenue: number }>(
      `SELECT product_name as name, SUM(qty) as qty, SUM(subtotal) as revenue
       FROM order_items
       GROUP BY product_name
       ORDER BY revenue DESC LIMIT 5`
    )

    // Top Seasonings
    const topSeasonings = db.query<{ name: string; count: number }>(
      `SELECT seasoning_name as name, SUM(qty) as count
       FROM order_item_seasonings
       GROUP BY seasoning_name
       ORDER BY count DESC LIMIT 6`
    )

    return {
      period: `${startDate || 'Semua'} s/d ${endDate || 'Sekarang'}`,
      totalOrders,
      completedOrders,
      cancelledOrders,
      completionRate,
      cancellationRate,
      grossSales,
      totalDiscounts,
      totalShippingFees,
      totalGiftFees,
      verifiedRevenue,
      averageOrderValue,
      topProducts,
      topSeasonings,
      orders,
    }
  }

  /**
   * Export to RFC-4180 Compliant CSV with UTF-8 BOM
   */
  static exportCsv(report: SalesReportSummary): string {
    const BOM = '\uFEFF'
    const headers = [
      'Nomor Pesanan',
      'Tanggal (WIB)',
      'Nama Pemesan',
      'No. WhatsApp',
      'Cabang',
      'Metode',
      'Status Pesanan',
      'Status Bayar',
      'Subtotal (IDR)',
      'Diskon (IDR)',
      'Ongkos Kirim (IDR)',
      'Biaya Gift (IDR)',
      'Total Akhir (IDR)',
    ]

    const rows = report.orders.map((o) => [
      this.sanitizeForSpreadsheet(o.order_number),
      this.sanitizeForSpreadsheet(o.created_at),
      this.sanitizeForSpreadsheet(o.customer_name),
      this.sanitizeForSpreadsheet(o.customer_phone),
      this.sanitizeForSpreadsheet(o.branch_id),
      this.sanitizeForSpreadsheet(o.delivery_type),
      this.sanitizeForSpreadsheet(o.order_status),
      this.sanitizeForSpreadsheet(o.payment_status),
      this.sanitizeForSpreadsheet(o.subtotal),
      this.sanitizeForSpreadsheet(o.discount),
      this.sanitizeForSpreadsheet(o.delivery_fee),
      this.sanitizeForSpreadsheet(o.gift_charge),
      this.sanitizeForSpreadsheet(o.total),
    ])

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n')
    return BOM + csvContent
  }

  /**
   * Export to XML Spreadsheet (Clean Excel Format)
   */
  static exportXlsxXml(report: SalesReportSummary): string {
    const rowsXml = report.orders
      .map(
        (o) => `
      <Row>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.order_number)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.created_at)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.customer_name)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.customer_phone)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.branch_id)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.order_status)}</Data></Cell>
        <Cell><Data ss:Type="String">${this.sanitizeForSpreadsheet(o.payment_status)}</Data></Cell>
        <Cell><Data ss:Type="Number">${o.subtotal || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${o.discount || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${o.delivery_fee || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${o.gift_charge || 0}</Data></Cell>
        <Cell><Data ss:Type="Number">${o.total || 0}</Data></Cell>
      </Row>`
      )
      .join('')

    return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Worksheet ss:Name="Laporan Penjualan AMM">
  <Table>
   <Row>
    <Cell><Data ss:Type="String">No. Pesanan</Data></Cell>
    <Cell><Data ss:Type="String">Tanggal</Data></Cell>
    <Cell><Data ss:Type="String">Pelanggan</Data></Cell>
    <Cell><Data ss:Type="String">WhatsApp</Data></Cell>
    <Cell><Data ss:Type="String">Cabang</Data></Cell>
    <Cell><Data ss:Type="String">Status</Data></Cell>
    <Cell><Data ss:Type="String">Bayar</Data></Cell>
    <Cell><Data ss:Type="String">Subtotal</Data></Cell>
    <Cell><Data ss:Type="String">Diskon</Data></Cell>
    <Cell><Data ss:Type="String">Ongkir</Data></Cell>
    <Cell><Data ss:Type="String">Biaya Gift</Data></Cell>
    <Cell><Data ss:Type="String">Total Akhir</Data></Cell>
   </Row>
   ${rowsXml}
  </Table>
 </Worksheet>
</Workbook>`
  }

  /**
   * Printable HTML Report Document
   */
  static exportHtmlReport(report: SalesReportSummary): string {
    const tableRows = report.orders
      .map(
        (o) => `
      <tr>
        <td>${o.order_number}</td>
        <td>${o.created_at}</td>
        <td>${o.customer_name}</td>
        <td>${o.branch_id}</td>
        <td>${o.order_status}</td>
        <td>${o.payment_status}</td>
        <td style="text-align:right">Rp ${(o.total || 0).toLocaleString('id-ID')}</td>
      </tr>`
      )
      .join('')

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Laporan Penjualan - Asinan Merem Melek</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #183F2E; }
    h1 { color: #183F2E; margin-bottom: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 20px 0; }
    .kpi-card { border: 1px solid #8BC137; padding: 12px; border-radius: 8px; background: #FFF8E8; }
    .kpi-title { font-size: 11px; text-transform: uppercase; color: #666; }
    .kpi-value { font-size: 18px; font-weight: bold; margin-top: 4px; color: #183F2E; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #183F2E; color: #FFF8E8; }
    tr:nth-child(even) { background: #f9f9f9; }
  </style>
</head>
<body>
  <h1>Asinan Merem Melek — Laporan Penjualan Resmi</h1>
  <p>Periode: ${report.period} | Dicetak: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</p>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-title">Total Pesanan</div>
      <div class="kpi-value">${report.totalOrders}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Pendapatan Terverifikasi</div>
      <div class="kpi-value">Rp ${report.verifiedRevenue.toLocaleString('id-ID')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Gross Sales</div>
      <div class="kpi-value">Rp ${report.grossSales.toLocaleString('id-ID')}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-title">Tingkat Selesai</div>
      <div class="kpi-value">${report.completionRate}%</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>No. Pesanan</th>
        <th>Tanggal</th>
        <th>Pelanggan</th>
        <th>Cabang</th>
        <th>Status Pesanan</th>
        <th>Status Bayar</th>
        <th style="text-align:right">Total (IDR)</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
</body>
</html>`
  }
}
