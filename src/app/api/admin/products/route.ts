import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const products = db.query('SELECT * FROM products ORDER BY is_signature DESC, name ASC')
    const categories = db.query('SELECT * FROM categories ORDER BY sort_order ASC')
    const seasonings = db.query('SELECT * FROM seasonings ORDER BY extra_price ASC, name ASC')
    const customizationRules = db.query('SELECT * FROM customization_rules')

    return NextResponse.json({
      products,
      categories,
      seasonings,
      customizationRules,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal memuat data menu.' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, product, seasoning, customizationRule, productId, availabilityStatus, adminName = 'Admin', adminId = 'admin' } = body

    if (action === 'UPDATE_AVAILABILITY') {
      if (!productId || !availabilityStatus) {
        return NextResponse.json({ error: 'Product ID dan status ketersediaan wajib diisi.' }, { status: 400 })
      }

      const validStatuses = ['AVAILABLE', 'OUT_OF_STOCK', 'TEMP_UNAVAILABLE', 'HIDDEN']
      if (!validStatuses.includes(availabilityStatus)) {
        return NextResponse.json({ error: 'Status ketersediaan tidak valid.' }, { status: 400 })
      }

      const existing = db.queryOne<{ id: string; name: string; availability_status: string; is_available: number }>(
        'SELECT id, name, availability_status, is_available FROM products WHERE id = ?',
        [productId]
      )

      if (!existing) {
        return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 })
      }

      const prevStatus = existing.availability_status || (existing.is_available ? 'AVAILABLE' : 'OUT_OF_STOCK')
      const isAvailableVal = availabilityStatus === 'AVAILABLE' ? 1 : 0
      const nowStr = new Date().toISOString()

      db.transaction(() => {
        db.run('UPDATE products SET availability_status = ?, is_available = ? WHERE id = ?', [
          availabilityStatus,
          isAvailableVal,
          productId,
        ])

        db.run(
          `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `aud_${Date.now()}`,
            adminId,
            adminName,
            'UPDATE_PRODUCT_AVAILABILITY',
            'PRODUCT',
            productId,
            JSON.stringify({
              productName: existing.name,
              previousStatus: prevStatus,
              newStatus: availabilityStatus,
            }),
            nowStr,
          ]
        )
      })

      return NextResponse.json({
        success: true,
        message: `Status ketersediaan ${existing.name} diubah menjadi ${availabilityStatus}.`,
        product: {
          id: productId,
          name: existing.name,
          availability_status: availabilityStatus,
          is_available: isAvailableVal,
        },
      })
    }

    if (action === 'SAVE_PRODUCT') {
      const {
        id,
        sku,
        name,
        slug,
        category_id,
        base_price,
        short_description,
        full_description,
        description,
        is_available,
        availability_status,
        is_signature,
        is_bestseller,
        display_order = 0,
        mood,
        photo_key,
        image_url,
        gallery_images,
        promo_price,
        promo_start_at,
        promo_end_at,
        stock = 999,
        low_stock_threshold = 10,
        available_sizes,
        size_pricing,
        customization_options,
      } = product

      if (!name || name.trim().length < 2) {
        return NextResponse.json({ error: 'Nama produk wajib diisi (minimal 2 karakter).' }, { status: 400 })
      }

      if (base_price === undefined || base_price === null || isNaN(Number(base_price)) || Number(base_price) < 0) {
        return NextResponse.json({ error: 'Harga dasar produk tidak valid.' }, { status: 400 })
      }

      if (!category_id) {
        return NextResponse.json({ error: 'Kategori produk wajib dipilih.' }, { status: 400 })
      }

      const prodId = id || `prod_${Date.now()}`
      const prodSku = sku || `AMM-${Date.now().toString().slice(-6)}`
      const prodSlug = slug || name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')

      const validStatuses = ['AVAILABLE', 'OUT_OF_STOCK', 'TEMP_UNAVAILABLE', 'HIDDEN']
      const finalStatus = validStatuses.includes(availabilityStatus)
        ? availabilityStatus
        : is_available === 0
        ? 'OUT_OF_STOCK'
        : 'AVAILABLE'
      const isAvailableVal = finalStatus === 'AVAILABLE' ? 1 : 0

      // Stringify JSON fields if provided as objects/arrays
      const galleryImagesStr = typeof gallery_images === 'string' ? gallery_images : JSON.stringify(gallery_images || [])
      const availableSizesStr = typeof available_sizes === 'string' ? available_sizes : JSON.stringify(available_sizes || ['PERSONAL', 'SHARING', 'MEGA'])
      const sizePricingStr = typeof size_pricing === 'string' ? size_pricing : JSON.stringify(size_pricing || {})
      const customizationOptionsStr = typeof customization_options === 'string' ? customization_options : JSON.stringify(customization_options || {})

      const existing = db.queryOne<{ id: string }>('SELECT id FROM products WHERE id = ?', [prodId])
      const isNew = !existing
      const nowStr = new Date().toISOString()

      db.transaction(() => {
        db.run(
          `INSERT OR REPLACE INTO products (
            id, sku, name, slug, category_id, base_price,
            short_description, full_description, description,
            photo_key, image_url, gallery_images,
            seo_title, seo_description, display_order, is_bestseller,
            promo_price, promo_start_at, promo_end_at,
            stock, low_stock_threshold, available_sizes, size_pricing, customization_options,
            is_available, availability_status, is_signature, mood, inventory_updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            prodId,
            prodSku,
            name.trim(),
            prodSlug,
            category_id,
            Math.round(Number(base_price)),
            short_description?.trim() || null,
            full_description?.trim() || null,
            description?.trim() || short_description?.trim() || null,
            photo_key || null,
            image_url || '/menu-photos/rujak-buah-personal.webp',
            galleryImagesStr,
            product.seo_title?.trim() || null,
            product.seo_description?.trim() || null,
            Number(display_order) || 0,
            is_bestseller ? 1 : 0,
            promo_price !== undefined && promo_price !== null && promo_price !== '' ? Number(promo_price) : null,
            promo_start_at || null,
            promo_end_at || null,
            Number(stock) || 999,
            Number(low_stock_threshold) || 10,
            availableSizesStr,
            sizePricingStr,
            customizationOptionsStr,
            isAvailableVal,
            finalStatus,
            is_signature ? 1 : 0,
            mood || 'SEGAR',
            nowStr,
          ]
        )

        // Audit Log
        db.run(
          `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            `aud_${Date.now()}`,
            adminId,
            adminName,
            isNew ? 'CREATE_PRODUCT' : 'UPDATE_PRODUCT',
            'PRODUCT',
            prodId,
            JSON.stringify({
              productName: name.trim(),
              basePrice: Number(base_price),
              status: finalStatus,
              isNew,
            }),
            nowStr,
          ]
        )
      })

      return NextResponse.json({
        success: true,
        message: `Produk "${name.trim()}" berhasil ${isNew ? 'ditambahkan' : 'diperbarui'}.`,
        product: {
          id: prodId,
          sku: prodSku,
          name: name.trim(),
          availability_status: finalStatus,
        },
      })
    }

    if (action === 'ARCHIVE_PRODUCT') {
      if (!productId) {
        return NextResponse.json({ error: 'Product ID wajib disertakan.' }, { status: 400 })
      }

      const existing = db.queryOne<{ id: string; name: string }>('SELECT id, name FROM products WHERE id = ?', [productId])
      if (!existing) {
        return NextResponse.json({ error: 'Produk tidak ditemukan.' }, { status: 404 })
      }

      const nowStr = new Date().toISOString()
      db.transaction(() => {
        // Soft archive: set HIDDEN & is_available = 0, never DELETE row to keep historical orders intact!
        db.run("UPDATE products SET availability_status = 'HIDDEN', is_available = 0 WHERE id = ?", [productId])
        db.run(
          `INSERT INTO admin_audit_logs (id, admin_id, admin_name, action, resource_type, resource_id, metadata, created_at)
           VALUES (?, ?, ?, 'ARCHIVE_PRODUCT', 'PRODUCT', ?, ?, ?)`,
          [
            `aud_${Date.now()}`,
            adminId,
            adminName,
            productId,
            JSON.stringify({ productName: existing.name, reason: 'Archived from catalog' }),
            nowStr,
          ]
        )
      })

      return NextResponse.json({
        success: true,
        message: `Produk "${existing.name}" berhasil diarsipkan dan disembunyikan dari katalog pelanggan.`,
      })
    }

    if (action === 'SAVE_SEASONING') {
      const { id, name, description, extra_price, is_available } = seasoning
      if (!name) {
        return NextResponse.json({ error: 'Nama bumbu wajib diisi.' }, { status: 400 })
      }
      const seasonId = id || `bumbu_${Date.now()}`
      db.run(
        `INSERT OR REPLACE INTO seasonings (id, name, description, extra_price, is_available) VALUES (?, ?, ?, ?, ?)`,
        [seasonId, name.trim(), description || '', Number(extra_price) || 0, is_available ? 1 : 0]
      )
      return NextResponse.json({ success: true, message: 'Bumbu rujak berhasil disimpan.' })
    }

    if (action === 'UPDATE_RULE') {
      const { size_code, allowed_seasoning_count, allow_duplicates, max_duplicates, description } =
        customizationRule
      db.run(
        `INSERT OR REPLACE INTO customization_rules (
          size_code, allowed_seasoning_count, allow_duplicates, max_duplicates, description
        ) VALUES (?, ?, ?, ?, ?)`,
        [
          size_code,
          Number(allowed_seasoning_count),
          allow_duplicates ? 1 : 0,
          Number(max_duplicates) || 3,
          description || '',
        ]
      )
      return NextResponse.json({ success: true, message: 'Aturan ukuran berhasil diperbarui.' })
    }

    return NextResponse.json({ error: 'Aksi produk tidak dikenal.' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Gagal menyimpan perubahan produk.' }, { status: 500 })
  }
}
