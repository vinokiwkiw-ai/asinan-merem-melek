import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

export async function GET(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const seasonings = db.query<any>('SELECT * FROM seasonings ORDER BY sort_order ASC, name ASC')
    return NextResponse.json({ success: true, seasonings })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat daftar bumbu.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const { id, name, description, extraPrice = 0, isAvailable = 1, sortOrder = 0 } = body

    if (!name || name.trim().length < 2) {
      return NextResponse.json({ error: 'Nama bumbu wajib diisi (minimal 2 karakter).' }, { status: 400 })
    }

    const seasoningId = id || `bumbu_${Date.now()}`

    db.run(
      `INSERT INTO seasonings (id, name, description, extra_price, is_available, sort_order)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [seasoningId, name.trim(), description?.trim() || null, Number(extraPrice) || 0, isAvailable ? 1 : 0, Number(sortOrder) || 0]
    )

    return NextResponse.json({
      success: true,
      message: `Bumbu "${name}" berhasil ditambahkan.`,
      seasoning: { id: seasoningId, name, description, extra_price: extraPrice, is_available: isAvailable, sort_order: sortOrder },
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menambahkan bumbu.' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const { id, name, description, extraPrice, isAvailable, sortOrder } = body

    if (!id) {
      return NextResponse.json({ error: 'ID bumbu wajib disertakan.' }, { status: 400 })
    }

    const existing = db.queryOne<{ id: string }>('SELECT id FROM seasonings WHERE id = ?', [id])
    if (!existing) {
      return NextResponse.json({ error: 'Bumbu tidak ditemukan.' }, { status: 404 })
    }

    const updates: string[] = []
    const params: any[] = []

    if (name !== undefined) {
      updates.push('name = ?')
      params.push(name.trim())
    }
    if (description !== undefined) {
      updates.push('description = ?')
      params.push(description.trim())
    }
    if (extraPrice !== undefined) {
      updates.push('extra_price = ?')
      params.push(Number(extraPrice))
    }
    if (isAvailable !== undefined) {
      updates.push('is_available = ?')
      params.push(isAvailable ? 1 : 0)
    }
    if (sortOrder !== undefined) {
      updates.push('sort_order = ?')
      params.push(Number(sortOrder))
    }

    if (updates.length > 0) {
      params.push(id)
      db.run(`UPDATE seasonings SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    return NextResponse.json({ success: true, message: 'Data bumbu berhasil diperbarui.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui bumbu.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'ID bumbu wajib disertakan.' }, { status: 400 })
    }

    // Soft disable instead of deleting to protect relational historical order items
    db.run('UPDATE seasonings SET is_available = 0 WHERE id = ?', [id])

    return NextResponse.json({ success: true, message: 'Bumbu berhasil dinonaktifkan dari menu.' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menonaktifkan bumbu.' }, { status: 500 })
  }
}
