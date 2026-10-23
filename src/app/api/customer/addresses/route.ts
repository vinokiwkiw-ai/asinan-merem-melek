import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const customerId = req.nextUrl.searchParams.get('customerId')
    if (!customerId) {
      return NextResponse.json({ error: 'Customer ID wajib disertakan.' }, { status: 400 })
    }

    const addresses = db.query(
      'SELECT * FROM saved_addresses WHERE customer_id = ? ORDER BY is_default DESC, created_at DESC',
      [customerId]
    )

    return NextResponse.json({ addresses })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat alamat tersimpan.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      customerId,
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

    if (!customerId || !recipientName || !phone || !fullAddress) {
      return NextResponse.json({ error: 'Data alamat tidak lengkap.' }, { status: 400 })
    }

    const addressId = `addr_${Date.now()}`

    db.transaction(() => {
      if (isDefault) {
        db.run('UPDATE saved_addresses SET is_default = 0 WHERE customer_id = ?', [customerId])
      }

      db.run(
        `INSERT INTO saved_addresses (
          id, customer_id, label, recipient_name, phone, province, city,
          district, subdistrict, postal_code, full_address, notes, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          addressId,
          customerId,
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
    const addressId = req.nextUrl.searchParams.get('id')
    const customerId = req.nextUrl.searchParams.get('customerId')

    if (!addressId || !customerId) {
      return NextResponse.json({ error: 'Parameter tidak lengkap.' }, { status: 400 })
    }

    db.run('DELETE FROM saved_addresses WHERE id = ? AND customer_id = ?', [addressId, customerId])
    return NextResponse.json({ success: true, message: 'Alamat berhasil dihapus.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menghapus alamat.' }, { status: 500 })
  }
}
