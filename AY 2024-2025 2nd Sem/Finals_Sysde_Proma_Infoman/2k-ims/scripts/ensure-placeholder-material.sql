-- Check if we have a raw material with ID 1
SELECT id FROM raw_materials WHERE id = 1;

-- If not, create a placeholder material
INSERT INTO raw_materials (id, name, category, quantity, unit, cost_per_unit, supplier, reorder_level, sku, status)
SELECT 1, 'Placeholder Material', 'System', 0, 'pcs', 0, 'System', 0, 'PLACEHOLDER', 'inactive'
WHERE NOT EXISTS (SELECT 1 FROM raw_materials WHERE id = 1);
