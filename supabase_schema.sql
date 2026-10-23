-- Supabase PostgreSQL Schema for Asinan Merem Melek

-- 1. admin_users
CREATE TABLE admin_users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'STAFF')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- 2. customers
CREATE TABLE customers (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  phone TEXT UNIQUE NOT NULL,
  name TEXT,
  email TEXT UNIQUE,
  birthdate DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. addresses
CREATE TABLE addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  label TEXT NOT NULL, -- e.g., Rumah, Kantor
  recipient_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  province TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  subdistrict TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  full_address TEXT NOT NULL,
  landmark TEXT,
  notes TEXT,
  is_main BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. products (menu_items)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  base_price INTEGER NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. orders
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  discount INTEGER NOT NULL DEFAULT 0,
  total INTEGER NOT NULL,
  order_status TEXT NOT NULL DEFAULT 'menunggu_pembayaran',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  shipping_address_id UUID REFERENCES addresses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. order_items
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,
  bumbu_variant TEXT,
  qty INTEGER NOT NULL,
  price_each INTEGER NOT NULL,
  subtotal INTEGER NOT NULL
);

-- 7. points_ledger
CREATE TABLE points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive for earn, negative for redeem/reversal
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('EARN', 'REDEEM', 'REVERSAL', 'EXPIRED', 'MANUAL_ADJUSTMENT')),
  reference_id TEXT, -- e.g., Order ID or Reward ID
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. rewards
CREATE TABLE rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  points_required INTEGER NOT NULL,
  discount_amount INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. reward_redemptions
CREATE TABLE reward_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  reward_id UUID REFERENCES rewards(id),
  order_id UUID REFERENCES orders(id), -- Null if not yet used on an order
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'USED', 'EXPIRED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  used_at TIMESTAMPTZ
);

-- 10. audit_logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES admin_users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL, -- e.g., 'ORDER', 'PRODUCT', 'CUSTOMER'
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. admin_users
CREATE POLICY "Admins can view their own profile" ON admin_users FOR SELECT USING (auth.uid() = id);

-- 2. customers
CREATE POLICY "Customers can view own profile" ON customers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Customers can update own profile" ON customers FOR UPDATE USING (auth.uid() = id);

-- 3. addresses
CREATE POLICY "Customers can manage own addresses" ON addresses FOR ALL USING (auth.uid() = customer_id);

-- 4. products
CREATE POLICY "Public can view available products" ON products FOR SELECT USING (true);

-- 5. orders
CREATE POLICY "Customers can view own orders" ON orders FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Anyone can insert orders" ON orders FOR INSERT WITH CHECK (true);

-- 6. order_items
CREATE POLICY "Anyone can insert order items" ON order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Customers can view own order items" ON order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.customer_id = auth.uid())
);

-- 7. points_ledger
CREATE POLICY "Customers can view own points" ON points_ledger FOR SELECT USING (auth.uid() = customer_id);

-- 8. rewards
CREATE POLICY "Public can view active rewards" ON rewards FOR SELECT USING (is_active = true);

-- 9. reward_redemptions
CREATE POLICY "Customers can view own redemptions" ON reward_redemptions FOR SELECT USING (auth.uid() = customer_id);

-- ==========================================
-- POINTS SYSTEM TRIGGERS
-- ==========================================

-- Trigger to award points when order is completed (selesai)
CREATE OR REPLACE FUNCTION process_order_points()
RETURNS TRIGGER AS $$
DECLARE
  points_earned INTEGER;
BEGIN
  -- If order status changes to 'selesai' and it was not 'selesai' before
  IF NEW.order_status = 'selesai' AND OLD.order_status IS DISTINCT FROM 'selesai' THEN
    -- Calculate points: 1 point per Rp 10.000 of the total
    points_earned := FLOOR(NEW.total / 10000);
    
    IF points_earned > 0 AND NEW.customer_id IS NOT NULL THEN
      INSERT INTO points_ledger (customer_id, amount, transaction_type, reference_id, reason)
      VALUES (NEW.customer_id, points_earned, 'EARN', NEW.id::text, 'Points earned from Order ' || NEW.order_number);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_order_completed
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION process_order_points();
