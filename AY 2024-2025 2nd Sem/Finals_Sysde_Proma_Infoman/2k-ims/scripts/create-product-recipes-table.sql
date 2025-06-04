-- Create product_recipes table for storing bill of materials
CREATE TABLE IF NOT EXISTS product_recipes (
    id SERIAL PRIMARY KEY,
    product_id INTEGER NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    raw_material_id INTEGER NOT NULL,
    raw_material_name VARCHAR(255) NOT NULL,
    quantity_required DECIMAL(10,3) NOT NULL DEFAULT 0,
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_recipes_product_id ON product_recipes(product_id);
CREATE INDEX IF NOT EXISTS idx_product_recipes_raw_material_id ON product_recipes(raw_material_id);

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow all operations on product_recipes" ON product_recipes;

-- Enable RLS
ALTER TABLE product_recipes ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations
CREATE POLICY "Allow all operations on product_recipes" ON product_recipes
FOR ALL USING (true) WITH CHECK (true);

-- Clear existing data
DELETE FROM product_recipes;

-- Insert realistic product recipes based on fixed_prices table
-- Note: We'll use the item_name from fixed_prices to match products

-- First, let's insert recipes for common garment products
-- Blouse recipes
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
-- Assuming Blouse has product_id from fixed_prices table
(1, 'Blouse', 1, 'Cotton Fabric', 1.2, 'rolls'),
(1, 'Blouse', 4, 'Button', 6, 'pcs'),
(1, 'Blouse', 6, 'Thread', 0.08, 'pcs');

-- Pants recipes  
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
(2, 'Pants', 2, 'Denim Fabric', 1.5, 'rolls'),
(2, 'Pants', 4, 'Button', 5, 'pcs'),
(2, 'Pants', 5, 'Zipper', 1, 'pcs'),
(2, 'Pants', 6, 'Thread', 0.1, 'pcs');

-- Shirt recipes
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
(3, 'Shirt', 1, 'Cotton Fabric', 1.3, 'rolls'),
(3, 'Shirt', 4, 'Button', 8, 'pcs'),
(3, 'Shirt', 6, 'Thread', 0.09, 'pcs');

-- T-Shirt recipes
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
(4, 'T-Shirt', 1, 'Cotton Fabric', 0.8, 'rolls'),
(4, 'T-Shirt', 6, 'Thread', 0.05, 'pcs');

-- Dress recipes
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
(5, 'Dress', 1, 'Cotton Fabric', 2.0, 'rolls'),
(5, 'Dress', 5, 'Zipper', 1, 'pcs'),
(5, 'Dress', 4, 'Button', 3, 'pcs'),
(5, 'Dress', 6, 'Thread', 0.12, 'pcs');

-- Jacket recipes
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
(6, 'Jacket', 2, 'Denim Fabric', 2.5, 'rolls'),
(6, 'Jacket', 5, 'Zipper', 1, 'pcs'),
(6, 'Jacket', 4, 'Button', 6, 'pcs'),
(6, 'Jacket', 6, 'Thread', 0.15, 'pcs');

-- Add more generic recipes that will work with any product names
-- These will serve as fallback recipes
INSERT INTO product_recipes (product_id, product_name, raw_material_id, raw_material_name, quantity_required, unit) VALUES
-- Generic garment recipe (can be used for any clothing item)
(999, 'Generic Garment', 1, 'Cotton Fabric', 1.0, 'rolls'),
(999, 'Generic Garment', 4, 'Button', 4, 'pcs'),
(999, 'Generic Garment', 6, 'Thread', 0.06, 'pcs');

-- Update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_product_recipes_updated_at ON product_recipes;
CREATE TRIGGER update_product_recipes_updated_at
    BEFORE UPDATE ON product_recipes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON product_recipes TO authenticated;
GRANT ALL ON product_recipes TO anon;
GRANT USAGE, SELECT ON SEQUENCE product_recipes_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE product_recipes_id_seq TO anon;
