import { db } from './index'
import crypto from 'node:crypto'

export function seedDatabase() {
  console.log('Seeding Asinan Merem Melek database...')

  // 1. Categories
  const categories = [
    { id: 'asinan', name: 'Asinan', sort_order: 1 },
    { id: 'rujak-buah', name: 'Aneka Rujak Buah', sort_order: 2 },
    { id: 'mangga-paket', name: 'Mangga & Paketan', sort_order: 3 },
    { id: 'musiman', name: 'Musiman', sort_order: 4 },
    { id: 'bumbu', name: 'Bumbu Rujak', sort_order: 5 },
  ]

  for (const cat of categories) {
    db.run(
      `INSERT OR REPLACE INTO categories (id, name, sort_order) VALUES (?, ?, ?)`,
      [cat.id, cat.name, cat.sort_order]
    )
  }

  // 2. Default Seasonings (6 Varieties)
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

  for (const s of seasonings) {
    db.run(
      `INSERT OR REPLACE INTO seasonings (id, name, description, extra_price, is_available) VALUES (?, ?, ?, ?, 1)`,
      [s.id, s.name, s.description, s.extra_price]
    )
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

  for (const r of sizeRules) {
    db.run(
      `INSERT OR REPLACE INTO customization_rules (size_code, allowed_seasoning_count, allow_duplicates, max_duplicates, description) VALUES (?, ?, ?, ?, ?)`,
      [r.size_code, r.allowed_seasoning_count, r.allow_duplicates, r.max_duplicates, r.description]
    )
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

  for (const p of products) {
    db.run(
      `INSERT OR REPLACE INTO products (id, sku, name, slug, category_id, base_price, description, photo_key, image_url, stock, is_available, is_signature, mood) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 999, 1, ?, ?)`,
      [
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
        p.mood,
      ]
    )
  }

  // 5. Outlets & Operating Schedules (Asia/Jakarta timezone)
  const outlets = [
    {
      branch_id: 'greenlake',
      days: [0, 1, 2, 3, 4, 5, 6],
      open_time: '09:00',
      close_time: '20:00',
    },
    {
      branch_id: 'kelapagading',
      days: [0, 1, 2, 3, 4, 5, 6],
      open_time: '10:00',
      close_time: '21:00',
    },
  ]

  for (const out of outlets) {
    for (const d of out.days) {
      const scheduleId = `${out.branch_id}-day-${d}`
      db.run(
        `INSERT OR REPLACE INTO outlet_schedules (id, branch_id, day_of_week, open_time, close_time, is_closed) VALUES (?, ?, ?, ?, ?, 0)`,
        [scheduleId, out.branch_id, d, out.open_time, out.close_time]
      )
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
    // Bank Accounts & QR - Clearly marked as requiring admin verification
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

  for (const s of settings) {
    db.run(`INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)`, [s.key, s.value])
  }

  // 7. Initial Super Admin Account
  // Password hash for 'admin12345' (salted SHA-256)
  const salt = 'amm_secure_salt_2026'
  const adminPasswordHash = crypto.createHmac('sha256', salt).update('admin12345').digest('hex')

  db.run(
    `INSERT OR REPLACE INTO admin_users (id, email, username, password_hash, name, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      'usr_superadmin_01',
      'admin@asinanmeremmelek.site',
      'superadmin',
      adminPasswordHash,
      'Super Administrator AMM',
      'SUPER_ADMIN',
      'ACTIVE',
    ]
  )

  // 8. Rewards for Membership Catalog
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

  for (const rew of rewards) {
    db.run(
      `INSERT OR REPLACE INTO rewards (id, title, description, points_required, discount_amount, is_active, stock) VALUES (?, ?, ?, ?, ?, 1, 999)`,
      [rew.id, rew.title, rew.description, rew.points_required, rew.discount_amount]
    )
  }

  // 9. Sample Active Vouchers
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

  for (const v of sampleVouchers) {
    db.run(
      `INSERT OR REPLACE INTO vouchers (id, code, discount_type, discount_value, min_spend, max_discount, usage_limit, start_date, end_date, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        v.id,
        v.code,
        v.discount_type,
        v.discount_value,
        v.min_spend,
        v.max_discount,
        v.usage_limit,
        v.start_date,
        v.end_date,
        v.is_active,
      ]
    )
  }

  console.log('Asinan Merem Melek database seeded successfully!')
}

// Auto-run if executed directly
if (require.main === module) {
  seedDatabase()
}
