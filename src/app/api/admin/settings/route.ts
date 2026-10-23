import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

export async function GET(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const settingsRows = db.query<{ key: string; value: string }>('SELECT key, value FROM app_settings')
    const settings: Record<string, any> = {}
    settingsRows.forEach((r) => {
      try {
        settings[r.key] = JSON.parse(r.value)
      } catch {
        settings[r.key] = r.value
      }
    })

    const schedules = db.query('SELECT * FROM outlet_schedules ORDER BY branch_id, day_of_week')
    const exceptions = db.query('SELECT * FROM outlet_exceptions ORDER BY date DESC')

    return NextResponse.json({
      settings,
      schedules,
      exceptions,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat pengaturan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const { action, key, value, schedule, exception } = body

    if (action === 'SAVE_SETTING') {
      const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
      db.run('INSERT OR REPLACE INTO app_settings (key, value, updated_at) VALUES (?, ?, datetime("now"))', [
        key,
        valStr,
      ])
      return NextResponse.json({ success: true, message: `Pengaturan "${key}" berhasil disimpan.` })
    }

    if (action === 'SAVE_SCHEDULE') {
      const { id, branch_id, day_of_week, open_time, close_time, is_closed } = schedule
      const schedId = id || `${branch_id}-day-${day_of_week}`
      db.run(
        `INSERT OR REPLACE INTO outlet_schedules (id, branch_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?, ?)`,
        [schedId, branch_id, Number(day_of_week), open_time, close_time, is_closed ? 1 : 0]
      )
      return NextResponse.json({ success: true, message: 'Jadwal outlet berhasil diperbarui.' })
    }

    if (action === 'SAVE_EXCEPTION') {
      const { id, branch_id, date, is_closed, open_time, close_time, reason } = exception
      const excId = id || `exc_${Date.now()}`
      db.run(
        `INSERT OR REPLACE INTO outlet_exceptions (id, branch_id, date, is_closed, open_time, close_time, reason) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [excId, branch_id, date, is_closed ? 1 : 0, open_time || null, close_time || null, reason || null]
      )
      return NextResponse.json({ success: true, message: 'Pengecualian jadwal berhasil disimpan.' })
    }

    if (action === 'DELETE_EXCEPTION') {
      const { id } = body
      db.run('DELETE FROM outlet_exceptions WHERE id = ?', [id])
      return NextResponse.json({ success: true, message: 'Pengecualian jadwal berhasil dihapus.' })
    }

    return NextResponse.json({ error: 'Aksi pengaturan tidak dikenal.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan pengaturan.' }, { status: 500 })
  }
}
