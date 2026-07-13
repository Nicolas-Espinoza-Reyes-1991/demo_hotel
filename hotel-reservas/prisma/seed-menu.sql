-- Demo seed carta (idempotente básico)
INSERT INTO menu_categories (id, name, slug, "sortOrder", active, "createdAt", "updatedAt")
VALUES
  ('seed_cat_desayunos', 'Desayunos', 'desayunos', 0, true, NOW(), NOW()),
  ('seed_cat_platos', 'Platos', 'platos', 1, true, NOW(), NOW()),
  ('seed_cat_bar', 'Bar', 'bar', 2, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_items (id, "categoryId", name, description, price, tags, available, featured, "sortOrder", active, "createdAt", "updatedAt")
VALUES
  ('seed_item_1', 'seed_cat_desayunos', 'Desayuno continental', 'Pan amasado, mermelada, café o té y jugo natural.', 8500, '["vegetariano"]'::jsonb, true, true, 0, true, NOW(), NOW()),
  ('seed_item_2', 'seed_cat_desayunos', 'Huevos revueltos', 'Con tostadas y palta de la zona.', 7500, '[]'::jsonb, true, false, 1, true, NOW(), NOW()),
  ('seed_item_3', 'seed_cat_platos', 'Trucha a la plancha', 'Pescado local con ensalada y papas.', 14500, '[]'::jsonb, true, true, 0, true, NOW(), NOW()),
  ('seed_item_4', 'seed_cat_platos', 'Tabla de quesos', 'Selección regional para compartir.', 12000, '["vegetariano"]'::jsonb, true, false, 1, true, NOW(), NOW()),
  ('seed_item_5', 'seed_cat_bar', 'Pisco sour', 'Clásico chileno.', 6500, '[]'::jsonb, true, false, 0, true, NOW(), NOW()),
  ('seed_item_6', 'seed_cat_bar', 'Cerveza artesanal', 'Botella 330 ml.', 4500, '[]'::jsonb, true, false, 1, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
