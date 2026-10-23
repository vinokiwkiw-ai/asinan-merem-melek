import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const idsParam = req.nextUrl.searchParams.get('ids')

    if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean)
      if (ids.length === 0) {
        return NextResponse.json({ products: [] })
      }

      const placeholders = ids.map(() => '?').join(',')
      const products = db.query(
        `SELECT id, sku, name, base_price, is_available, availability_status FROM products WHERE id IN (${placeholders})`,
        ids
      )

      return NextResponse.json({ products })
    }

    // Public catalog returns all products except HIDDEN
    const products = db.query(
      `SELECT id, sku, name, slug, category_id, base_price, description, photo_key, image_url, stock,
              is_available, availability_status, is_signature, mood
       FROM products
       WHERE availability_status != 'HIDDEN'
       ORDER BY is_signature DESC, name ASC`
    )

    const categories = db.query('SELECT * FROM categories ORDER BY sort_order ASC')
    const seasonings = db.query('SELECT * FROM seasonings WHERE is_available = 1 ORDER BY extra_price ASC, name ASC')
    const customizationRules = db.query('SELECT * FROM customization_rules')

    return NextResponse.json({
      products,
      categories,
      seasonings,
      customizationRules,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat produk.' }, { status: 500 })
  }
}
