import { db } from '../db/index.ts'
import { toZonedTime, format } from 'date-fns-tz'

export interface OutletStatus {
  branchId: string
  branchName: string
  isOpen: boolean
  todaySchedule: string
  currentLocalTime: string
  reason?: string
  nextOpenTime?: string
  announcement?: string
  storeStatus?: 'OPEN' | 'TEMP_CLOSED'
}

export class OutletService {
  private static TIMEZONE = 'Asia/Jakarta'

  /**
   * Determine live opening status in Asia/Jakarta timezone
   */
  static getOutletStatus(branchId: string): OutletStatus {
    const branchName =
      branchId === 'kelapagading'
        ? 'Asinan Merem Melek - Kelapa Gading'
        : 'Asinan Merem Melek - Greenlake City'

    // Get current time in WIB (Asia/Jakarta)
    const now = new Date()
    const zonedNow = toZonedTime(now, this.TIMEZONE)
    const dayOfWeek = zonedNow.getDay() // 0 = Sunday, 1 = Monday, ...
    const currentTimeStr = format(zonedNow, 'HH:mm', { timeZone: this.TIMEZONE })
    const currentDateStr = format(zonedNow, 'yyyy-MM-dd', { timeZone: this.TIMEZONE })

    // Check global store temporary closure setting
    const storeStatusRow = db.queryOne<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', ['store_status'])
    const storeAnnounceRow = db.queryOne<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', ['store_announcement'])

    let storeStatus: 'OPEN' | 'TEMP_CLOSED' = 'OPEN'
    if (storeStatusRow?.value) {
      try {
        storeStatus = JSON.parse(storeStatusRow.value)
      } catch {
        storeStatus = storeStatusRow.value as any
      }
    }

    let announcement = ''
    if (storeAnnounceRow?.value) {
      try {
        announcement = JSON.parse(storeAnnounceRow.value)
      } catch {
        announcement = storeAnnounceRow.value
      }
    }

    if (storeStatus === 'TEMP_CLOSED') {
      return {
        branchId,
        branchName,
        isOpen: false,
        todaySchedule: 'Tutup Sementara',
        currentLocalTime: `${currentTimeStr} WIB`,
        reason: announcement || 'Outlet sedang tutup sementara oleh pengelola.',
        announcement,
        storeStatus: 'TEMP_CLOSED',
      }
    }

    // Check special holiday exceptions first
    const exception = db.queryOne<{
      id: string
      is_closed: number
      open_time: string
      close_time: string
      reason: string
    }>('SELECT * FROM outlet_exceptions WHERE branch_id = ? AND date = ?', [branchId, currentDateStr])

    if (exception) {
      if (exception.is_closed === 1) {
        return {
          branchId,
          branchName,
          isOpen: false,
          todaySchedule: 'Tutup Khusus / Hari Libur',
          currentLocalTime: `${currentTimeStr} WIB`,
          reason: exception.reason || 'Libur Khusus Outlet',
          announcement,
          storeStatus: 'OPEN',
        }
      }
      const isOpen = currentTimeStr >= exception.open_time && currentTimeStr < exception.close_time
      return {
        branchId,
        branchName,
        isOpen,
        todaySchedule: `${exception.open_time} - ${exception.close_time} WIB`,
        currentLocalTime: `${currentTimeStr} WIB`,
        reason: exception.reason,
        nextOpenTime: !isOpen && currentTimeStr < exception.open_time ? `Buka pukul ${exception.open_time} WIB` : undefined,
        announcement,
        storeStatus: 'OPEN',
      }
    }

    // Check regular schedule for today
    const schedule = db.queryOne<{
      open_time: string
      close_time: string
      is_closed: number
    }>('SELECT * FROM outlet_schedules WHERE branch_id = ? AND day_of_week = ?', [branchId, dayOfWeek])

    if (!schedule || schedule.is_closed === 1) {
      // Find next opening day
      const nextDay = (dayOfWeek + 1) % 7
      const nextSched = db.queryOne<{ open_time: string; is_closed: number }>(
        'SELECT open_time, is_closed FROM outlet_schedules WHERE branch_id = ? AND day_of_week = ?',
        [branchId, nextDay]
      )
      const nextOpenTime = nextSched && !nextSched.is_closed ? `Buka besok pukul ${nextSched.open_time} WIB` : undefined

      return {
        branchId,
        branchName,
        isOpen: false,
        todaySchedule: 'Tutup Hari Ini',
        currentLocalTime: `${currentTimeStr} WIB`,
        nextOpenTime,
        announcement,
        storeStatus: 'OPEN',
      }
    }

    const isOpen = currentTimeStr >= schedule.open_time && currentTimeStr < schedule.close_time
    let nextOpenTime: string | undefined

    if (!isOpen) {
      if (currentTimeStr < schedule.open_time) {
        nextOpenTime = `Buka hari ini pukul ${schedule.open_time} WIB`
      } else {
        const nextDay = (dayOfWeek + 1) % 7
        const nextSched = db.queryOne<{ open_time: string; is_closed: number }>(
          'SELECT open_time, is_closed FROM outlet_schedules WHERE branch_id = ? AND day_of_week = ?',
          [branchId, nextDay]
        )
        nextOpenTime = nextSched && !nextSched.is_closed ? `Buka besok pukul ${nextSched.open_time} WIB` : undefined
      }
    }

    return {
      branchId,
      branchName,
      isOpen,
      todaySchedule: `${schedule.open_time} - ${schedule.close_time} WIB`,
      currentLocalTime: `${currentTimeStr} WIB`,
      nextOpenTime,
      announcement,
      storeStatus: 'OPEN',
    }
  }

  /**
   * Get all branch statuses
   */
  static getAllBranchStatuses(): OutletStatus[] {
    return [this.getOutletStatus('greenlake'), this.getOutletStatus('kelapagading')]
  }
}
