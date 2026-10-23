import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  const startTime = Date.now()
  let dbStatus = 'healthy'
  let dbLatencyMs = 0
  let tableStats: Record<string, number> = {}

  try {
    const t0 = Date.now()
    const testResult = db.queryOne<{ test: number }>('SELECT 1 as test')
    dbLatencyMs = Date.now() - t0

    if (!testResult || testResult.test !== 1) {
      dbStatus = 'degraded'
    }

    const orderCount = db.queryOne<{ count: number }>('SELECT count(*) as count FROM orders')
    const customerCount = db.queryOne<{ count: number }>('SELECT count(*) as count FROM customers')
    const productCount = db.queryOne<{ count: number }>('SELECT count(*) as count FROM products')

    tableStats = {
      orders: Number(orderCount?.count || 0),
      customers: Number(customerCount?.count || 0),
      products: Number(productCount?.count || 0),
    }
  } catch (err: any) {
    dbStatus = 'unhealthy'
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: err.message,
        database: { status: 'unhealthy' },
      },
      { status: 503 }
    )
  }

  const mem = process.memoryUsage()

  return NextResponse.json(
    {
      status: 'healthy',
      app: 'Asinan Merem Melek',
      version: '2.4.0-prod',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      responseTimeMs: Date.now() - startTime,
      environment: process.env.NODE_ENV || 'production',
      database: {
        status: dbStatus,
        driver: 'node:sqlite (WAL Mode)',
        latencyMs: dbLatencyMs,
        tables: tableStats,
      },
      memory: {
        rssMb: Math.round(mem.rss / (1024 * 1024)),
        heapUsedMb: Math.round(mem.heapUsed / (1024 * 1024)),
        heapTotalMb: Math.round(mem.heapTotal / (1024 * 1024)),
      },
    },
    { status: 200 }
  )
}
