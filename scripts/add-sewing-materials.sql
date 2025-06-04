-- First, let's add some real sewing materials to the database
-- This will ensure we have actual materials to reference instead of virtual ones

INSERT INTO raw_materials (name, category, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, created_at, updated_at)
VALUES 
  ('Buttons', 'Sewing', 0, 'pcs', 2.50, 'Lucky 8', 20, 'RAW-SEW-001', 'out-of-stock', NOW(), NOW()),
  ('Thread', 'Sewing', 0, 'pcs', 15.00, 'Lucky 8', 20, 'RAW-SEW-002', 'out-of-stock', NOW(), NOW()),
  ('Zipper', 'Sewing', 0, 'pcs', 25.00, 'Lucky 8', 20, 'RAW-SEW-003', 'out-of-stock', NOW(), NOW()),
  ('Needle', 'Sewing', 0, 'pcs', 5.00, 'Lucky 8', 20, 'RAW-SEW-004', 'out-of-stock', NOW(), NOW()),
  ('Scissors', 'Sewing', 0, 'pcs', 150.00, 'Lucky 8', 20, 'RAW-SEW-005', 'out-of-stock', NOW(), NOW())
ON CONFLICT (name, supplier) DO NOTHING;

-- Also add some fabric materials if they don't exist
INSERT INTO raw_materials (name, category, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status, created_at, updated_at)
VALUES 
  ('Cotton Fabric', 'Fabric', 0, 'rolls', 450.00, 'A&B Textile', 20, 'RAW-FAB-001', 'out-of-stock', NOW(), NOW()),
  ('Polyester Fabric', 'Fabric', 0, 'rolls', 380.00, 'A&B Textile', 20, 'RAW-FAB-002', 'out-of-stock', NOW(), NOW()),
  ('Denim Fabric', 'Fabric', 0, 'rolls', 520.00, 'A&B Textile', 20, 'RAW-FAB-003', 'out-of-stock', NOW(), NOW())
ON CONFLICT (name, supplier) DO NOTHING;
