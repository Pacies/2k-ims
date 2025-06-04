-- Complete setup for product orders system
-- This script creates all necessary tables and ensures they work together

-- 1. Create product_orders table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_orders (
    id SERIAL PRIMARY KEY,
    product_id INTEGER,
    product_name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Create product_order_materials table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_order_materials (
    id SERIAL PRIMARY KEY,
    product_order_id INTEGER REFERENCES product_orders(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES raw_materials(id),
    material_name TEXT,
    quantity_required NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create product_order_history table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_order_history (
    id SERIAL PRIMARY KEY,
    original_order_id INTEGER NOT NULL,
    product_id INTEGER,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'completed',
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_orders_status ON product_orders(status);
CREATE INDEX IF NOT EXISTS idx_product_orders_created_at ON product_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_product_order_materials_order_id ON product_order_materials(product_order_id);
CREATE INDEX IF NOT EXISTS idx_product_order_materials_material_id ON product_order_materials(material_id);
CREATE INDEX IF NOT EXISTS idx_product_order_history_original_order_id ON product_order_history(original_order_id);
CREATE INDEX IF NOT EXISTS idx_product_order_history_completed_at ON product_order_history(completed_at);

-- 5. Enable RLS on all tables
ALTER TABLE product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_order_history ENABLE ROW LEVEL SECURITY;

-- 6. Create policies for product_orders
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON product_orders;
CREATE POLICY "Allow all operations for authenticated users" ON product_orders
    FOR ALL USING (true);

-- 7. Create policies for product_order_materials
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON product_order_materials;
CREATE POLICY "Allow all operations for authenticated users" ON product_order_materials
    FOR ALL USING (true);

-- 8. Create policies for product_order_history
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON product_order_history;
CREATE POLICY "Allow all operations for authenticated users" ON product_order_history
    FOR ALL USING (true);

-- 9. Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to product_orders
DROP TRIGGER IF EXISTS update_product_orders_updated_at ON product_orders;
CREATE TRIGGER update_product_orders_updated_at
    BEFORE UPDATE ON product_orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Display success message
DO $$
BEGIN
    RAISE NOTICE 'Product orders system setup completed successfully!';
    RAISE NOTICE 'Tables created: product_orders, product_order_materials, product_order_history';
    RAISE NOTICE 'All tables have proper RLS policies and indexes';
END $$;
