-- Asinan Merem Melek Normalized Database Schema
-- Compatible with PostgreSQL (Production) and SQLite (Local / In-Process via node:sqlite)

CREATE TABLE IF NOT EXISTS admin_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ORDER_MANAGER', 'PAYMENT_VERIFIER', 'CUSTOMER_SUPPORT', 'REPORTING_VIEWER')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_login TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  birthdate TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS saved_addresses (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  label TEXT NOT NULL,
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  subdistrict TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  full_address TEXT NOT NULL,
  notes TEXT,
  lat REAL,
  lng REAL,
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category_id TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  description TEXT,
  photo_key TEXT,
  image_url TEXT,
  short_description TEXT,
  full_description TEXT,
  seo_title TEXT,
  seo_description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_bestseller INTEGER NOT NULL DEFAULT 0,
  gallery_images TEXT,
  promo_price INTEGER,
  promo_start_at TEXT,
  promo_end_at TEXT,
  stock INTEGER NOT NULL DEFAULT 999,
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  available_sizes TEXT,
  size_pricing TEXT,
  customization_options TEXT,
  is_available INTEGER NOT NULL DEFAULT 1,
  availability_status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (availability_status IN ('AVAILABLE', 'OUT_OF_STOCK', 'TEMP_UNAVAILABLE', 'HIDDEN')),
  is_signature INTEGER NOT NULL DEFAULT 0,
  mood TEXT,
  inventory_updated_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS seasonings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  extra_price INTEGER NOT NULL DEFAULT 0,
  is_available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customization_rules (
  size_code TEXT PRIMARY KEY,
  allowed_seasoning_count INTEGER NOT NULL,
  allow_duplicates INTEGER NOT NULL DEFAULT 1,
  max_duplicates INTEGER NOT NULL DEFAULT 2,
  description TEXT
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT UNIQUE NOT NULL,
  idempotency_key TEXT UNIQUE,
  customer_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  branch_id TEXT NOT NULL,
  delivery_type TEXT NOT NULL CHECK (delivery_type IN ('pickup', 'delivery')),
  delivery_address TEXT,
  delivery_instructions TEXT,
  courier_name TEXT,
  courier_tracking_number TEXT,
  courier_status TEXT,
  estimated_delivery_time TEXT,
  subtotal INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  gift_charge INTEGER NOT NULL DEFAULT 0,
  delivery_fee INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_expires_at TEXT NOT NULL,
  tracking_token TEXT UNIQUE NOT NULL,
  whatsapp_sent INTEGER NOT NULL DEFAULT 0,
  whatsapp_sent_at TEXT,
  customer_confirmed_at TEXT,
  confirmed_by_id TEXT,
  confirmed_by_name TEXT,
  receipt_photo_url TEXT,
  receipt_photo_uploaded_at TEXT,
  delivery_issue_reported INTEGER NOT NULL DEFAULT 0,
  delivery_issue_notes TEXT,
  delivery_issue_reported_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  size TEXT NOT NULL DEFAULT 'STANDARD',
  unit_price INTEGER NOT NULL,
  qty INTEGER NOT NULL,
  subtotal INTEGER NOT NULL,
  custom_fruit_notes TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE IF NOT EXISTS order_item_seasonings (
  id TEXT PRIMARY KEY,
  order_item_id TEXT NOT NULL,
  seasoning_id TEXT NOT NULL,
  seasoning_name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  extra_price INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  FOREIGN KEY (seasoning_id) REFERENCES seasonings(id)
);

CREATE TABLE IF NOT EXISTS gift_details (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  is_gift INTEGER NOT NULL DEFAULT 0,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_address TEXT,
  sender_name TEXT,
  is_sender_visible INTEGER NOT NULL DEFAULT 1,
  card_design TEXT,
  card_message TEXT,
  has_gift_packaging INTEGER NOT NULL DEFAULT 0,
  packaging_fee INTEGER NOT NULL DEFAULT 0,
  card_fee INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT UNIQUE NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  amount_expected INTEGER NOT NULL,
  amount_transferred INTEGER,
  reference_number TEXT,
  proof_image_path TEXT,
  uploaded_at TEXT,
  verified_at TEXT,
  verified_by TEXT,
  rejection_reason TEXT,
  status TEXT NOT NULL DEFAULT 'awaiting_payment',
  gateway_provider TEXT,
  gateway_reference TEXT,
  gateway_payload TEXT,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS delivery_quotes (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  provider TEXT NOT NULL,
  service_type TEXT NOT NULL,
  origin_address TEXT NOT NULL,
  destination_address TEXT NOT NULL,
  quoted_amount INTEGER NOT NULL,
  quoted_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS order_status_events (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  actor_id TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS membership_ledger (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  points INTEGER NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRED')),
  reference_id TEXT,
  balance_after INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rewards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  stock INTEGER NOT NULL DEFAULT 999
);

CREATE TABLE IF NOT EXISTS vouchers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('PERCENT', 'FIXED')),
  discount_value INTEGER NOT NULL,
  min_spend INTEGER NOT NULL DEFAULT 0,
  max_discount INTEGER NOT NULL DEFAULT 0,
  usage_limit INTEGER NOT NULL DEFAULT 100,
  times_used INTEGER NOT NULL DEFAULT 0,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  photo_url TEXT,
  admin_reply TEXT,
  admin_replied_at TEXT,
  is_published INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED')),
  admin_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('CUSTOMER', 'ADMIN')),
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS outlet_schedules (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TEXT NOT NULL,
  close_time TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS outlet_exceptions (
  id TEXT PRIMARY KEY,
  branch_id TEXT NOT NULL,
  date TEXT NOT NULL,
  is_closed INTEGER NOT NULL DEFAULT 0,
  open_time TEXT,
  close_time TEXT,
  reason TEXT
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  admin_name TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

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

