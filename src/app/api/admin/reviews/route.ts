import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { AdminSessionService } from '@/lib/auth/adminSessionService'

export async function GET(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const { searchParams } = new URL(req.url)
    const rating = searchParams.get('rating')
    const published = searchParams.get('published')
    const search = searchParams.get('search')?.trim()

    let sql = 'SELECT * FROM reviews WHERE 1=1'
    const params: any[] = []

    if (rating && rating !== 'all') {
      sql += ' AND rating = ?'
      params.push(Number(rating))
    }

    if (published === 'published') {
      sql += ' AND is_published = 1'
    } else if (published === 'hidden') {
      sql += ' AND is_published = 0'
    }

    if (search) {
      sql += ' AND (customer_name LIKE ? OR comment LIKE ? OR product_name LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`)
    }

    sql += ' ORDER BY created_at DESC'

    const reviews = db.query<any>(sql, params)

    return NextResponse.json({
      success: true,
      count: reviews.length,
      reviews,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat ulasan admin.' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const auth = AdminSessionService.verifyAdminRequest(req)
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status || 401 })
    }

    const body = await req.json()
    const { id, isPublished, isFeatured, adminReply } = body

    if (!id) {
      return NextResponse.json({ error: 'ID ulasan wajib disertakan.' }, { status: 400 })
    }

    const updates: string[] = []
    const params: any[] = []

    if (isPublished !== undefined) {
      updates.push('is_published = ?')
      params.push(isPublished ? 1 : 0)
    }

    if (isFeatured !== undefined) {
      updates.push('is_featured = ?')
      params.push(isFeatured ? 1 : 0)
    }

    if (adminReply !== undefined) {
      updates.push('admin_reply = ?', 'admin_replied_at = datetime("now")')
      params.push(adminReply.trim())
    }

    if (updates.length > 0) {
      params.push(id)
      db.run(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, params)
    }

    return NextResponse.json({
      success: true,
      message: 'Status moderasi ulasan berhasil diperbarui.',
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memperbarui ulasan.' }, { status: 500 })
  }
}
