-- Clean and Professional Database Schema for MOTHER BEST
-- Designed for scalability, ease of use, and professional management.

-- 1. UTILITY FUNCTIONS & EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. PRODUCTS & CATEGORIES
CREATE TABLE IF NOT EXISTS product_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  unit text NOT NULL CHECK (unit IN ('kg', 'litre', 'unit')),
  category_id uuid REFERENCES product_categories(id),
  category_name text, -- Keep for convenience or use JOINs
  description text,
  image_url text,
  is_available boolean DEFAULT true,
  stock_quantity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. PROFILES (Extends Auth Users)
-- We check if columns exist before adding to be safe
DO $$ 
BEGIN 
  -- Add missing columns to profiles if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='assigned_delivery_person_id') THEN
    ALTER TABLE profiles ADD COLUMN assigned_delivery_person_id uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_super_admin') THEN
    ALTER TABLE profiles ADD COLUMN is_super_admin boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='original_profile_pic_url') THEN
    ALTER TABLE profiles ADD COLUMN original_profile_pic_url text;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_available') THEN
    ALTER TABLE profiles ADD COLUMN is_available boolean DEFAULT false;
  END IF;
END $$;

-- Ensure triggers for profiles
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 4. USER ADDRESSES
DO $$ 
BEGIN 
  -- Ensure foreign key constraint on user_addresses
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='user_addresses_user_id_fkey') THEN
    ALTER TABLE user_addresses ADD CONSTRAINT user_addresses_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. ORDERS & SUBSCRIPTIONS
DO $$ 
BEGIN 
  -- Ensure foreign key on orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='orders_user_id_fkey') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='orders_delivery_person_id_fkey') THEN
    ALTER TABLE orders ADD CONSTRAINT orders_delivery_person_id_fkey FOREIGN KEY (delivery_person_id) REFERENCES profiles(id);
  END IF;

  -- Ensure foreign key on subscriptions
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='subscriptions_user_id_fkey') THEN
    ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;

  -- Ensure admin_notes column on orders
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='admin_notes') THEN
    ALTER TABLE orders ADD COLUMN admin_notes text;
  END IF;

  -- Ensure return_confirmed column on orders (used to hide confirmed returns from dashboards)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='return_confirmed') THEN
    ALTER TABLE orders ADD COLUMN return_confirmed boolean DEFAULT false;
  END IF;

  -- Ensure proper status constraint on orders
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'orders'::regclass AND conname = 'orders_status_check') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
  ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('pending', 'confirmed', 'assigned', 'out_for_delivery', 'delivered', 'attempted', 'returned', 'cancelled'));
END $$;

-- 6. AUTHORITIES (Admin/Sales/Delivery metadata)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='authorities_user_id_fkey') THEN
    ALTER TABLE authorities ADD CONSTRAINT authorities_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 7. SALES TRACKING
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='sales_targets_sales_person_id_fkey') THEN
    ALTER TABLE sales_targets ADD CONSTRAINT sales_targets_sales_person_id_fkey FOREIGN KEY (sales_person_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='sales_activities_sales_person_id_fkey') THEN
    ALTER TABLE sales_activities ADD CONSTRAINT sales_activities_sales_person_id_fkey FOREIGN KEY (sales_person_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='sales_activities_user_id_fkey') THEN
    ALTER TABLE sales_activities ADD CONSTRAINT sales_activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
  END IF;
END $$;

-- 8. COD SETTLEMENTS
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cod_settlements_delivery_person_id_fkey') THEN
    ALTER TABLE cod_settlements ADD CONSTRAINT cod_settlements_delivery_person_id_fkey FOREIGN KEY (delivery_person_id) REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cod_settlements_order_id_fkey') THEN
    ALTER TABLE cod_settlements ADD CONSTRAINT cod_settlements_order_id_fkey FOREIGN KEY (order_id) REFERENCES orders(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name='cod_settlements_settled_by_fkey') THEN
    ALTER TABLE cod_settlements ADD CONSTRAINT cod_settlements_settled_by_fkey FOREIGN KEY (settled_by) REFERENCES profiles(id);
  END IF;
END $$;

-- 9. CUSTOMER FOLLOW-UPS (New for proactive sales)
CREATE TABLE IF NOT EXISTS customer_follow_ups (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  sales_person_id uuid REFERENCES profiles(id),
  last_purchase_date timestamptz,
  days_since_last_purchase integer,
  needs_emergency_follow_up boolean DEFAULT false,
  last_follow_up_date timestamptz,
  follow_up_notes text,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 10. SEED INITIAL CATEGORIES
INSERT INTO product_categories (name, description)
VALUES 
  ('Laundry', 'Detergents and fabric softeners'),
  ('Kitchen', 'Dishwash liquids and cleaners'),
  ('Personal', 'Handwash and sanitizers'),
  ('Bathroom', 'Toilet and bathroom cleaners'),
  ('Floor', 'Phenyl and floor cleaners'),
  ('Special', 'Trial packs and bundles')
ON CONFLICT (name) DO NOTHING;

-- 11. REFRESH RLS POLICIES (Example for Products)
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Products viewable by everyone" ON products;
CREATE POLICY "Products viewable by everyone" ON products
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only admins can manage products" ON products;
CREATE POLICY "Only admins can manage products" ON products
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.is_super_admin = true)));

-- 12. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_activities_person_phone ON sales_activities(person_phone);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON customer_follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_sales_person_id ON customer_follow_ups(sales_person_id);
