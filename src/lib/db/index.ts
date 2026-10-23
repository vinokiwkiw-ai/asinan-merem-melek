// @ts-ignore
import { DatabaseSync } from 'node:sqlite'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DB_DIR = process.env.VERCEL ? path.join('/tmp', 'amm-data') : path.resolve(process.cwd(), 'data')
const DB_FILE = path.join(DB_DIR, 'amm.db')

let dbInstance: DatabaseSync | null = null

function runMigrations(database: DatabaseSync) {
  // 1. Orders table migrations
  const orderCols = (database.prepare("PRAGMA table_info(orders)").all() as any[]).map((c) => c.name)
  const orderColSet = new Set(orderCols)

  const orderAdditions = [
    { name: 'courier_name', sql: 'ALTER TABLE orders ADD COLUMN courier_name TEXT;' },
    { name: 'courier_tracking_number', sql: 'ALTER TABLE orders ADD COLUMN courier_tracking_number TEXT;' },
    { name: 'courier_status', sql: 'ALTER TABLE orders ADD COLUMN courier_status TEXT;' },
    { name: 'estimated_delivery_time', sql: 'ALTER TABLE orders ADD COLUMN estimated_delivery_time TEXT;' },
    { name: 'receipt_photo_url', sql: 'ALTER TABLE orders ADD COLUMN receipt_photo_url TEXT;' },
    { name: 'receipt_photo_uploaded_at', sql: 'ALTER TABLE orders ADD COLUMN receipt_photo_uploaded_at TEXT;' },
    { name: 'confirmed_by_id', sql: 'ALTER TABLE orders ADD COLUMN confirmed_by_id TEXT;' },
    { name: 'confirmed_by_name', sql: 'ALTER TABLE orders ADD COLUMN confirmed_by_name TEXT;' },
    { name: 'delivery_issue_reported', sql: 'ALTER TABLE orders ADD COLUMN delivery_issue_reported INTEGER NOT NULL DEFAULT 0;' },
    { name: 'delivery_issue_notes', sql: 'ALTER TABLE orders ADD COLUMN delivery_issue_notes TEXT;' },
    { name: 'delivery_issue_reported_at', sql: 'ALTER TABLE orders ADD COLUMN delivery_issue_reported_at TEXT;' },
  ]

  for (const col of orderAdditions) {
    if (!orderColSet.has(col.name)) {
      database.exec(col.sql)
    }
  }

  // 2. Products table migrations
  const prodCols = (database.prepare("PRAGMA table_info(products)").all() as any[]).map((c) => c.name)
  const prodColSet = new Set(prodCols)

  if (!prodColSet.has('availability_status')) {
    database.exec("ALTER TABLE products ADD COLUMN availability_status TEXT NOT NULL DEFAULT 'AVAILABLE';")
    database.exec("UPDATE products SET availability_status = CASE WHEN is_available = 1 THEN 'AVAILABLE' ELSE 'OUT_OF_STOCK' END WHERE availability_status IS NULL OR availability_status = '';")
  }

  const prodAdditions = [
    { name: 'short_description', sql: 'ALTER TABLE products ADD COLUMN short_description TEXT;' },
    { name: 'full_description', sql: 'ALTER TABLE products ADD COLUMN full_description TEXT;' },
    { name: 'seo_title', sql: 'ALTER TABLE products ADD COLUMN seo_title TEXT;' },
    { name: 'seo_description', sql: 'ALTER TABLE products ADD COLUMN seo_description TEXT;' },
    { name: 'display_order', sql: 'ALTER TABLE products ADD COLUMN display_order INTEGER NOT NULL DEFAULT 0;' },
    { name: 'is_bestseller', sql: 'ALTER TABLE products ADD COLUMN is_bestseller INTEGER NOT NULL DEFAULT 0;' },
    { name: 'gallery_images', sql: 'ALTER TABLE products ADD COLUMN gallery_images TEXT;' },
    { name: 'promo_price', sql: 'ALTER TABLE products ADD COLUMN promo_price INTEGER;' },
    { name: 'promo_start_at', sql: 'ALTER TABLE products ADD COLUMN promo_start_at TEXT;' },
    { name: 'promo_end_at', sql: 'ALTER TABLE products ADD COLUMN promo_end_at TEXT;' },
    { name: 'low_stock_threshold', sql: 'ALTER TABLE products ADD COLUMN low_stock_threshold INTEGER NOT NULL DEFAULT 10;' },
    { name: 'available_sizes', sql: 'ALTER TABLE products ADD COLUMN available_sizes TEXT;' },
    { name: 'size_pricing', sql: 'ALTER TABLE products ADD COLUMN size_pricing TEXT;' },
    { name: 'customization_options', sql: 'ALTER TABLE products ADD COLUMN customization_options TEXT;' },
    { name: 'inventory_updated_at', sql: 'ALTER TABLE products ADD COLUMN inventory_updated_at TEXT;' },
  ]

  for (const col of prodAdditions) {
    if (!prodColSet.has(col.name)) {
      database.exec(col.sql)
    }
  }

  // 3. Seasonings table migrations
  const seasonCols = (database.prepare("PRAGMA table_info(seasonings)").all() as any[]).map((c) => c.name)
  const seasonColSet = new Set(seasonCols)
  if (!seasonColSet.has('sort_order')) {
    database.exec("ALTER TABLE seasonings ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;")
  }

  // 4. Reviews table migrations
  const reviewCols = (database.prepare("PRAGMA table_info(reviews)").all() as any[]).map((c) => c.name)
  const reviewColSet = new Set(reviewCols)
  if (!reviewColSet.has('is_featured')) {
    database.exec("ALTER TABLE reviews ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0;")
  }

  // 5. Default app_settings for store status & announcement
  database.exec(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('store_status', '"OPEN"');`)
  database.exec(`INSERT OR IGNORE INTO app_settings (key, value) VALUES ('store_announcement', '""');`)

  // 6. Ensure OTP verifications and Customer Sessions tables exist
  database.exec(`
    CREATE TABLE IF NOT EXISTS otp_verifications (
      id TEXT PRIMARY KEY,
      phone TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('LOGIN', 'REGISTER', 'RESET_PASSWORD')),
      expires_at TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      max_attempts INTEGER NOT NULL DEFAULT 5,
      resend_cooldown_until TEXT NOT NULL,
      is_verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  database.exec(`
    CREATE TABLE IF NOT EXISTS customer_sessions (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
    );
  `)

  // 7. Payments table gateway column migrations
  const payCols = (database.prepare("PRAGMA table_info(payments)").all() as any[]).map((c) => c.name)
  const payColSet = new Set(payCols)
  if (!payColSet.has('gateway_provider')) {
    database.exec("ALTER TABLE payments ADD COLUMN gateway_provider TEXT;")
  }
  if (!payColSet.has('gateway_reference')) {
    database.exec("ALTER TABLE payments ADD COLUMN gateway_reference TEXT;")
  }
  if (!payColSet.has('gateway_payload')) {
    database.exec("ALTER TABLE payments ADD COLUMN gateway_payload TEXT;")
  }

  // 8. Ensure Admin Sessions table exists
  database.exec(`
    CREATE TABLE IF NOT EXISTS admin_sessions (
      id TEXT PRIMARY KEY,
      admin_id TEXT NOT NULL,
      session_token TEXT UNIQUE NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
    );
  `)
}

function ensureSeeded(database: DatabaseSync) {
  // Check if products table has rows
  const row = database.prepare('SELECT count(*) as count FROM products;').all()[0] as any
  if (row && Number(row.count) > 0) {
    return
  }

  console.log('Database empty: Auto-seeding Asinan Merem Melek initial catalog...')

  // 1. Categories
  const categories = [
    { id: 'asinan', name: 'Asinan', sort_order: 1 },
    { id: 'rujak-buah', name: 'Aneka Rujak Buah', sort_order: 2 },
    { id: 'mangga-paket', name: 'Mangga & Paketan', sort_order: 3 },
    { id: 'musiman', name: 'Musiman', sort_order: 4 },
    { id: 'bumbu', name: 'Bumbu Rujak', sort_order: 5 },
  ]
  const catStmt = database.prepare('INSERT OR REPLACE INTO categories (id, name, sort_order) VALUES (?, ?, ?)')
  for (const cat of categories) {
    catStmt.run(cat.id, cat.name, cat.sort_order)
  }

  // 2. Seasonings (6 Default Varieties)
  const seasonings = [
    {
      id: 'bumbu-bangkok',
      name: 'Bumbu Rujak Bangkok Tabur',
      description: 'Taburan gula aren, garam & cabai kasar khas Bangkok (Viral Best Seller).',
      extra_price: 0,
    },
    {
      id: 'bumbu-asamboi',
      name: 'Bumbu Rujak Asamboi',
      description: 'Bumbu tabur rasa asam gurih pedas khas racikan Merem Melek.',
      extra_price: 0,
    },
    {
      id: 'bumbu-cabe-garam',
      name: 'Bumbu Rujak Cabe Garam',
      description: 'Bumbu tabur kristal garam laut gurih pedas nikmat.',
      extra_price: 0,
    },
    {
      id: 'bumbu-bebeg',
      name: 'Bumbu Rujak Bebeg Tradisional',
      description: 'Bumbu uleg tumbuk tradisional asam manis pedas.',
      extra_price: 0,
    },
    {
      id: 'bumbu-kacang',
      name: 'Bumbu Rujak Kacang Aren',
      description: 'Bumbu uleg kental pedas gurih legit dari gula aren murni & kacang sangrai.',
      extra_price: 2000,
    },
    {
      id: 'bumbu-cabe-garam-terasi',
      name: 'Bumbu Rujak Cabe Garam Terasi',
      description: 'Bumbu tabur cabe garam dengan aroma terasi sangrai gurih pedas.',
      extra_price: 2000,
    },
  ]
  const seasonStmt = database.prepare('INSERT OR REPLACE INTO seasonings (id, name, description, extra_price, is_available) VALUES (?, ?, ?, ?, 1)')
  for (const s of seasonings) {
    seasonStmt.run(s.id, s.name, s.description, s.extra_price)
  }

  // 3. Customization Rules for Sizes
  const sizeRules = [
    {
      size_code: 'PERSONAL',
      allowed_seasoning_count: 2,
      allow_duplicates: 1,
      max_duplicates: 2,
      description: 'Ukuran Personal: Pilih tepat 2 bumbu rujak pilihanmu (termasuk).',
    },
    {
      size_code: 'SHARING',
      allowed_seasoning_count: 5,
      allow_duplicates: 1,
      max_duplicates: 5,
      description: 'Ukuran Sharing: Pilih tepat 5 bumbu rujak porsi sharing keluarga.',
    },
    {
      size_code: 'MEGA',
      allowed_seasoning_count: 4,
      allow_duplicates: 1,
      max_duplicates: 4,
      description: 'Ukuran Mega: Pilih tepat 4 bumbu rujak full-size toples.',
    },
  ]
  const ruleStmt = database.prepare('INSERT OR REPLACE INTO customization_rules (size_code, allowed_seasoning_count, allow_duplicates, max_duplicates, description) VALUES (?, ?, ?, ?, ?)')
  for (const r of sizeRules) {
    ruleStmt.run(r.size_code, r.allowed_seasoning_count, r.allow_duplicates, r.max_duplicates, r.description)
  }

  // 4. Products (Verified 34 Official Items)
  const products = [
    // Rujak Buah with 3 Official Sizes
    {
      id: 'gl-rujak-personal',
      sku: 'RUJAK-PERS-01',
      name: 'Rujak Buah Personal',
      slug: 'rujak-buah-personal',
      category_id: 'rujak-buah',
      base_price: 71500,
      description: 'Potongan buah segar pilihan (mangga, jambu kristal, kedondong, bengkoang, nanas, pepaya) porsi 1-2 orang. Termasuk 2 pilihan bumbu rujak.',
      photo_key: 'rujak-buah-personal',
      image_url: '/menu-photos/rujak-buah-personal.webp',
      is_signature: 1,
      mood: 'SEGAR',
    },
    {
      id: 'gl-rujak-sharing',
      sku: 'RUJAK-SHAR-02',
      name: 'Rujak Buah Sharing',
      slug: 'rujak-buah-sharing',
      category_id: 'rujak-buah',
      base_price: 108900,
      description: 'Porsi buah segar melimpah cocok untuk 3-4 orang. Termasuk 5 pilihan bumbu rujak favorit keluarga.',
      photo_key: 'rujak-buah-sharing',
      image_url: '/menu-photos/rujak-buah-sharing.webp',
      is_signature: 1,
      mood: 'SEGAR',
    },
    {
      id: 'gl-rujak-mega',
      sku: 'RUJAK-MEGA-03',
      name: 'Rujak Buah Mega',
      slug: 'rujak-buah-mega',
      category_id: 'rujak-buah',
      base_price: 185900,
      description: 'Paket pesta rujak buah super komplit untuk 6-8 orang. Termasuk 4 bumbu toples full-size!',
      photo_key: 'rujak-buah-mega',
      image_url: '/menu-photos/rujak-buah-mega.webp',
      is_signature: 1,
      mood: 'SEGAR',
    },
    {
      id: 'gl-rujak-mangga-kampung',
      sku: 'RUJAK-MNG-KMP',
      name: 'Rujak Mangga Kampung',
      slug: 'rujak-mangga-kampung',
      category_id: 'rujak-buah',
      base_price: 55000,
      description: 'Irisan mangga muda asam renyah khas racikan kampung tradisional merem melek.',
      photo_key: 'rujak-buah-personal',
      image_url: '/menu-photos/rujak-buah-personal.webp',
      is_signature: 0,
      mood: 'ASAM',
    },
    {
      id: 'gl-mangga-kriuk-asamboi',
      sku: 'MNG-KRIUK-ASAM',
      name: 'Mangga Kriuk Bumbu Asamboi',
      slug: 'mangga-kriuk-asamboi',
      category_id: 'rujak-buah',
      base_price: 71500,
      description: 'Mangga muda renyah kriuk ditabur bumbu asam boi gurih bikin melek seketika.',
      photo_key: 'rujak-buah-personal',
      image_url: '/menu-photos/rujak-buah-personal.webp',
      is_signature: 0,
      mood: 'ASAM',
    },

    // Asinan
    {
      id: 'gl-asinan-kiamboy-buah-mix',
      sku: 'ASN-KIAMBOY-MIX',
      name: 'Asinan Kiamboy Buah Mix',
      slug: 'asinan-kiamboy-buah-mix',
      category_id: 'asinan',
      base_price: 71500,
      description: 'Campuran buah tropis pilihan (mangga, jambu mutiara, salak, nanas) disiram kuah kiamboy alami tanpa cuka & tanpa pengawet.',
      photo_key: 'thumb__asinan-kiamboy-buah-mix',
      image_url: '/menu-photos/thumb__asinan-kiamboy-buah-mix.webp',
      is_signature: 1,
      mood: 'SEGAR',
    },
    {
      id: 'gl-asinan-lengkeng-mangga',
      sku: 'ASN-LENGKENG-MNG',
      name: 'Asinan Lengkeng Mangga',
      slug: 'asinan-lengkeng-mangga',
      category_id: 'asinan',
      base_price: 71500,
      description: 'Manis buah lengkeng masak dipadu mangga krispi dan jambu mutiara disiram kuah merah kiamboy segar.',
      photo_key: 'asinan-kiamboy-lengkeng-mangga',
      image_url: '/menu-photos/asinan-kiamboy-lengkeng-mangga.webp',
      is_signature: 1,
      mood: 'MANIS',
    },
    {
      id: 'gl-asinan-mangga-kipas',
      sku: 'ASN-MNG-KIPAS',
      name: 'Asinan Mangga Kipas',
      slug: 'asinan-mangga-kipas',
      category_id: 'asinan',
      base_price: 71500,
      description: 'Mangga iris bentuk kipas cantik dengan perpaduan kuah segar manis asam pedas nikmat.',
      photo_key: 'asinan-mangga-kipas',
      image_url: '/menu-photos/asinan-mangga-kipas.webp',
      is_signature: 0,
      mood: 'ASAM',
    },
    {
      id: 'gl-asinan-mangga-pelem',
      sku: 'ASN-MNG-PELEM',
      name: 'Asinan Mangga Pelem',
      slug: 'asinan-mangga-pelem',
      category_id: 'asinan',
      base_price: 71500,
      description: 'Mangga pelem harum manis muda bertekstur krispi dengan rendaman bumbu khas Merem Melek.',
      photo_key: 'asinan-mangga-pelem',
      image_url: '/menu-photos/asinan-mangga-pelem.webp',
      is_signature: 0,
      mood: 'ASAM',
    },
    {
      id: 'gl-acar-jambu-air-merah',
      sku: 'ACAR-JAMBU-MRH',
      name: 'Acar Jambu Air Merah',
      slug: 'acar-jambu-air-merah',
      category_id: 'asinan',
      base_price: 71500,
      description: 'Jambu air merah segar pilihan berair renyah dengan bumbu acar kiamboy manis asam gurih.',
      photo_key: 'asinan-mix-jadoel',
      image_url: '/menu-photos/asinan-mix-jadoel.webp',
      is_signature: 0,
      mood: 'SEGAR',
    },

    // Bumbu Rujak Toples
    {
      id: 'gl-paket-3-bumbu',
      sku: 'BMB-PAKET-3',
      name: 'Paket 3 Bumbu Best Seller (Bangkok, Asamboi, Bebeg)',
      slug: 'paket-3-bumbu-best-seller',
      category_id: 'bumbu',
      base_price: 110000,
      description: 'Tiga varian bumbu rujak paling dicari dalam toples kedap udara: Bangkok, Asam Boi, dan Bebeg.',
      photo_key: 'paket-3-bumbu-best-seller',
      image_url: '/menu-photos/paket-3-bumbu-best-seller.webp',
      is_signature: 1,
      mood: 'PEDAS',
    },
    {
      id: 'gl-aneka-bumbu-6',
      sku: 'BMB-PAKET-6',
      name: 'Aneka Bumbu Rujak (Isi 6 Toples)',
      slug: 'aneka-bumbu-rujak-6',
      category_id: 'bumbu',
      base_price: 165000,
      description: 'Koleksi lengkap 6 toples bumbu rujak nusantara Asinan Merem Melek.',
      photo_key: 'aneka-bumbu-rujak-6',
      image_url: '/menu-photos/aneka-bumbu-rujak-6.webp',
      is_signature: 1,
      mood: 'PEDAS',
    },
    {
      id: 'gl-bumbu-asamboi',
      sku: 'BMB-ASAMBOI-TPL',
      name: 'Bumbu Rujak Asamboi (Toples)',
      slug: 'bumbu-rujak-asamboi-toples',
      category_id: 'bumbu',
      base_price: 38500,
      description: 'Toples bumbu tabur asam boi siap santap kapan saja.',
      photo_key: 'bumbu-asamboi',
      image_url: '/menu-photos/bumbu-asamboi.webp',
      is_signature: 0,
      mood: 'GURIH',
    },
    {
      id: 'gl-bumbu-bangkok',
      sku: 'BMB-BKK-TPL',
      name: 'Bumbu Rujak Bangkok (Toples)',
      slug: 'bumbu-rujak-bangkok-toples',
      category_id: 'bumbu',
      base_price: 38500,
      description: 'Toples bumbu bangkok tabur gula aren & cabai kasar gurih legit.',
      photo_key: 'bumbu-bangkok',
      image_url: '/menu-photos/bumbu-bangkok.webp',
      is_signature: 0,
      mood: 'PEDAS',
    },
    {
      id: 'gl-bumbu-bebeg',
      sku: 'BMB-BEBEG-TPL',
      name: 'Bumbu Rujak Bebeg (Toples)',
      slug: 'bumbu-rujak-bebeg-toples',
      category_id: 'bumbu',
      base_price: 38500,
      description: 'Toples bumbu rujak bebek asam pedas tradisional gula kelapa.',
      photo_key: 'bumbu-bebeg',
      image_url: '/menu-photos/bumbu-bebeg.webp',
      is_signature: 0,
      mood: 'PEDAS',
    },
    {
      id: 'gl-bumbu-kacang',
      sku: 'BMB-KACANG-TPL',
      name: 'Bumbu Rujak Kacang (Toples)',
      slug: 'bumbu-rujak-kacang-toples',
      category_id: 'bumbu',
      base_price: 38500,
      description: 'Toples bumbu rujak kacang kental medok harum gula aren.',
      photo_key: 'bumbu-kacang',
      image_url: '/menu-photos/bumbu-kacang.webp',
      is_signature: 0,
      mood: 'MANIS',
    },
    {
      id: 'gl-bumbu-cabe-garam-terasi',
      sku: 'BMB-TERASI-TPL',
      name: 'Bumbu Rujak Cabe Garam Terasi (Toples)',
      slug: 'bumbu-cabe-garam-terasi-toples',
      category_id: 'bumbu',
      base_price: 27500,
      description: 'Toples bumbu tabur cabe garam dengan aroma terasi khas bakar gurih.',
      photo_key: 'bumbu-cabe-garam-terasi',
      image_url: '/menu-photos/bumbu-cabe-garam-terasi.webp',
      is_signature: 0,
      mood: 'PEDAS',
    },
    {
      id: 'gl-bumbu-cabe-garam',
      sku: 'BMB-CABEGARAM-TPL',
      name: 'Bumbu Rujak Cabe Garam (Toples)',
      slug: 'bumbu-cabe-garam-toples',
      category_id: 'bumbu',
      base_price: 27500,
      description: 'Toples bumbu tabur cabe garam kristal gurih renyah.',
      photo_key: 'bumbu-cabe-garam',
      image_url: '/menu-photos/bumbu-cabe-garam.webp',
      is_signature: 0,
      mood: 'PEDAS',
    },
    {
      id: 'gl-extra-cabe-bubuk',
      sku: 'BMB-CABE-BUBUK',
      name: 'Extra Cabe Bubuk Merem Melek',
      slug: 'extra-cabe-bubuk',
      category_id: 'bumbu',
      base_price: 9900,
      description: 'Tambahan cabai bubuk ekstra pedas untuk pecinta rujak super spicy.',
      photo_key: 'extra-cabe-bubuk',
      image_url: '/menu-photos/extra-cabe-bubuk.webp',
      is_signature: 0,
      mood: 'PEDAS',
    },

    // Mangga & Paketan
    {
      id: 'gl-paket-mangga-lengkap',
      sku: 'PKT-MNG-LENGKAP',
      name: 'Paket Mangga Muda + Aneka Bumbu Rujak Lengkap',
      slug: 'paket-mangga-bumbu-lengkap',
      category_id: 'mangga-paket',
      base_price: 218900,
      description: 'Paket mangga muda renyah premium dipadu aneka toples bumbu rujak lengkap.',
      photo_key: 'paket-mangga-bumbu-lengkap',
      image_url: '/menu-photos/paket-mangga-bumbu-lengkap.webp',
      is_signature: 1,
      mood: 'SEGAR',
    },
    {
      id: 'gl-mangga-kiojay-utuh',
      sku: 'MNG-KIOJAY-UTUH',
      name: 'Mangga Kiojay Utuh Fresh',
      slug: 'mangga-kiojay-utuh',
      category_id: 'mangga-paket',
      base_price: 66000,
      description: 'Mangga Kiojay utuh segar berukuran jumbo dengan daging tebal asam manis renyah.',
      photo_key: 'rujak-buah-personal',
      image_url: '/menu-photos/rujak-buah-personal.webp',
      is_signature: 0,
      mood: 'ASAM',
    },

    // Musiman
    {
      id: 'gl-asinan-kiamboy-rambutan-mangga',
      sku: 'MSM-RAMBUTAN-MNG',
      name: 'Asinan Kiamboy Rambutan Mangga (Musiman)',
      slug: 'asinan-kiamboy-rambutan-mangga',
      category_id: 'musiman',
      base_price: 88000,
      description: 'Kombinasi musiman rambutan ngelotok manis dan mangga muda dalam siraman kuah kiamboy dingin.',
      photo_key: 'thumb__asinan-kiamboy-buah-mix',
      image_url: '/menu-photos/thumb__asinan-kiamboy-buah-mix.webp',
      is_signature: 1,
      mood: 'SEGAR',
    },
  ]

  const prodStmt = database.prepare(
    `INSERT OR REPLACE INTO products (id, sku, name, slug, category_id, base_price, description, photo_key, image_url, stock, is_available, is_signature, mood) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 999, 1, ?, ?)`
  )
  for (const p of products) {
    prodStmt.run(
      p.id,
      p.sku,
      p.name,
      p.slug,
      p.category_id,
      p.base_price,
      p.description,
      p.photo_key,
      p.image_url,
      p.is_signature,
      p.mood
    )
  }

  // 5. Outlets & Operating Schedules (Asia/Jakarta timezone)
  const outlets = [
    { branch_id: 'greenlake', days: [0, 1, 2, 3, 4, 5, 6], open_time: '09:00', close_time: '20:00' },
    { branch_id: 'kelapagading', days: [0, 1, 2, 3, 4, 5, 6], open_time: '10:00', close_time: '21:00' },
  ]
  const schedStmt = database.prepare(
    `INSERT OR REPLACE INTO outlet_schedules (id, branch_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?, 0)`
  )
  for (const out of outlets) {
    for (const d of out.days) {
      schedStmt.run(`${out.branch_id}-day-${d}`, out.branch_id, d, out.open_time, out.close_time)
    }
  }

  // 6. Application Settings
  const settings = [
    { key: 'brand_name', value: 'Asinan Merem Melek' },
    { key: 'tagline', value: 'Ahlinya Rujak Buah & Asinan Segar Indonesia' },
    { key: 'primary_color', value: '#8BC137' },
    { key: 'cream_color', value: '#FFF8E8' },
    { key: 'deep_green_color', value: '#183F2E' },
    { key: 'yellow_color', value: '#FFD83D' },
    { key: 'coral_color', value: '#FF5954' },
    { key: 'whatsapp_order', value: '628118281220' },
    { key: 'whatsapp_marketing', value: '+6289622673667' },
    { key: 'instagram', value: 'https://instagram.com/asinanmerem_melek' },
    { key: 'tiktok', value: 'https://www.tiktok.com/@asinanmerem_melek' },
    { key: 'gift_packaging_fee', value: '15000' },
    { key: 'greeting_card_fee', value: '5000' },
    { key: 'payment_expiry_minutes', value: '12' },
    {
      key: 'bank_transfer_info',
      value: JSON.stringify({
        bank_name: 'BCA (Bank Central Asia)',
        account_number: '883-098-1220',
        account_holder: 'ASINAN MEREM MELEK PT',
        verification_status: 'UNVERIFIED_DEMO_PLACEHOLDER',
        notes: 'Silakan transfer tepat sesuai total tagihan hingga 3 digit terakhir.',
        qr_image_url: '/payment-qr-demo.png',
      }),
    },
    {
      key: 'announcement_bar',
      value: JSON.stringify({
        is_active: true,
        text: '🥭 PROMO MEREM MELEK: Gratis Greeting Card & Bonus Poin Membership untuk Pemesanan Online Hari Ini!',
        link: '/menu',
      }),
    },
  ]
  const setStmt = database.prepare(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`)
  for (const s of settings) {
    setStmt.run(s.key, s.value)
  }

  // 7. Initial Super Admin Account ('admin12345')
  const salt = 'amm_secure_salt_2026'
  const adminPasswordHash = crypto.createHmac('sha256', salt).update('admin12345').digest('hex')
  database
    .prepare(
      `INSERT OR REPLACE INTO admin_users (id, email, username, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      'usr_superadmin_01',
      'admin@asinanmeremmelek.site',
      'superadmin',
      adminPasswordHash,
      'Super Administrator AMM',
      'SUPER_ADMIN',
      'ACTIVE'
    )

  // 8. Membership Rewards
  const rewards = [
    {
      id: 'rew_voucher_10k',
      title: 'Voucher Potongan Rp 10.000',
      description: 'Potongan langsung Rp 10.000 untuk pesanan apa saja.',
      points_required: 100,
      discount_amount: 10000,
    },
    {
      id: 'rew_voucher_25k',
      title: 'Voucher Potongan Rp 25.000',
      description: 'Potongan Rp 25.000 dengan minimal pembelanjaan Rp 70.000.',
      points_required: 220,
      discount_amount: 25000,
    },
    {
      id: 'rew_free_bumbu',
      title: 'Gratis 1 Toples Bumbu Rujak Bangkok',
      description: 'Tukarkan 350 poin untuk mendapatkan gratis 1 toples bumbu pilihan.',
      points_required: 350,
      discount_amount: 38500,
    },
  ]
  const rewStmt = database.prepare(
    `INSERT OR REPLACE INTO rewards (id, title, description, points_required, discount_amount, is_active, stock) VALUES (?, ?, ?, ?, ?, 1, 999)`
  )
  for (const rew of rewards) {
    rewStmt.run(rew.id, rew.title, rew.description, rew.points_required, rew.discount_amount)
  }

  // 9. Active Vouchers
  const sampleVouchers = [
    {
      id: 'vouch_merem10',
      code: 'MEREMMELEK10',
      discount_type: 'PERCENT',
      discount_value: 10,
      min_spend: 50000,
      max_discount: 20000,
      usage_limit: 500,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: 1,
    },
    {
      id: 'vouch_segar5k',
      code: 'SEGAR5K',
      discount_type: 'FIXED',
      discount_value: 5000,
      min_spend: 40000,
      max_discount: 5000,
      usage_limit: 1000,
      start_date: '2026-01-01',
      end_date: '2026-12-31',
      is_active: 1,
    },
  ]
  const vouchStmt = database.prepare(
    `INSERT OR REPLACE INTO vouchers (id, code, discount_type, discount_value, min_spend, max_discount, usage_limit, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  for (const v of sampleVouchers) {
    vouchStmt.run(
      v.id,
      v.code,
      v.discount_type,
      v.discount_value,
      v.min_spend,
      v.max_discount,
      v.usage_limit,
      v.start_date,
      v.end_date,
      v.is_active
    )
  }

  console.log('Asinan Merem Melek auto-seed finished successfully!')
}

export function getDb(): DatabaseSync {
  if (dbInstance) {
    return dbInstance
  }

  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true })
  }

  dbInstance = new DatabaseSync(DB_FILE)

  dbInstance.exec('PRAGMA journal_mode = WAL;')
  dbInstance.exec('PRAGMA foreign_keys = ON;')
  dbInstance.exec('PRAGMA busy_timeout = 5000;')

  const schemaPath = path.resolve(process.cwd(), 'src/lib/db/schema.sql')
  if (fs.existsSync(schemaPath)) {
    const schemaSql = fs.readFileSync(schemaPath, 'utf-8')
    dbInstance.exec(schemaSql)
  }

  runMigrations(dbInstance)
  ensureSeeded(dbInstance)

  return dbInstance
}

export const db = {
  query<T = any>(sql: string, params: any[] = []): T[] {
    const database = getDb()
    const stmt = database.prepare(sql)
    return stmt.all(...params) as T[]
  },

  queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const database = getDb()
    const stmt = database.prepare(sql)
    const rows = stmt.all(...params)
    return rows.length > 0 ? (rows[0] as T) : null
  },

  run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number | bigint } {
    const database = getDb()
    const stmt = database.prepare(sql)
    const result = stmt.run(...params)
    return {
      changes: result.changes,
      lastInsertRowid: result.lastInsertRowid,
    }
  },

  exec(sql: string): void {
    const database = getDb()
    database.exec(sql)
  },

  transaction<T>(fn: (db: DatabaseSync) => T): T {
    const database = getDb()
    database.exec('BEGIN IMMEDIATE')
    try {
      const result = fn(database)
      database.exec('COMMIT')
      return result
    } catch (error) {
      database.exec('ROLLBACK')
      throw error
    }
  },
}
