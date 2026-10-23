import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { SessionService, SESSION_COOKIE_NAME } from '@/lib/auth/sessionService'

function getSessionCustomer(req: NextRequest) {
  const sessionToken = req.cookies.get(SESSION_COOKIE_NAME)?.value ||
    (req.headers.get('authorization')?.startsWith('Bearer ') ? req.headers.get('authorization')?.slice(7).trim() : null)
  return sessionToken ? SessionService.getCustomerFromToken(sessionToken) : null
}

export async function GET(req: NextRequest) {
  try {
    const sessionCustomer = getSessionCustomer(req)
    if (!sessionCustomer) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk melihat alamat tersimpan.' }, { status: 401 })
    }

    const addresses = db.query(
      'SELECT * FROM saved_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [sessionCustomer.id]
    )

    return NextResponse.json({ addresses })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat alamat tersimpan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionCustomer = getSessionCustomer(req)
    if (!sessionCustomer) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk menyimpan alamat.' }, { status: 401 })
    }

    const body = await req.json()
    const {
      label,
      recipientName,
      phone,
      province,
      city,
      district,
      subdistrict,
      postalCode,
      fullAddress,
      notes,
      isDefault,
    } = body

    if (!recipientName || !phone || !fullAddress) {
      return NextResponse.json({ error: 'Data alamat tidak lengkap.' }, { status: 400 })
    }

    const addressId = `addr_${Date.now()}`

    db.transaction(() => {
      if (isDefault) {
        db.run('UPDATE saved_addresses SET is_default = 0 WHERE customer_id = ?', [sessionCustomer.id])
      }

      db.run(
        `INSERT INTO saved_addresses (
          id, customer_id, label, recipient_name, phone, province, city,
          district, subdistrict, postal_code, full_address, notes, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          addressId,
          sessionCustomer.id,
          label || 'Rumah',
          recipientName.trim(),
          phone.trim(),
          province || 'DKI Jakarta',
          city || 'Jakarta',
          district || '',
          subdistrict || '',
          postalCode || '',
          fullAddress.trim(),
          notes || null,
          isDefault ? 1 : 0,
        ]
      )
    })

    return NextResponse.json({ success: true, addressId, message: 'Alamat berhasil disimpan.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan alamat.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionCustomer = getSessionCustomer(req)
    if (!sessionCustomer) {
      return NextResponse.json({ error: 'Silakan login terlebih dahulu untuk menghapus alamat.' }, { status: 401 })
    }

    const addressId = req.nextUrl.searchParams.get('id')
    if (!addressId) {
      return NextResponse.json({ error: 'Parameter ID alamat wajib disertakan.' }, { status: 400 })
    }

    db.run('DELETE FROM saved_addresses WHERE id = ? AND customer_id = ?', [addressId, sessionCustomer.id])
    return NextResponse.json({ success: true, message: 'Alamat berhasil dihapus.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus alamat.' }, { status: 500 })
  }
}
