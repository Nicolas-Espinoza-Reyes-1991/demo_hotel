INSERT INTO tour_partners (id, name, description, whatsapp, phone, website, area, "logoUrl", active, "sortOrder", "createdAt", "updatedAt")
VALUES
  ('seed_partner_rios', 'Turismo Ríos del Sur', 'Cabalgatas y paseos a orillas del lago.', '56998218978', NULL, NULL, 'Futrono', NULL, true, 0, NOW(), NOW()),
  ('seed_partner_lancha', 'Navegación Lago Ranco', 'Salidas en lancha por el lago y costas cercanas.', '56998218978', NULL, NULL, 'Lago Ranco', NULL, true, 1, NOW(), NOW()),
  ('seed_partner_huella', 'Huella Andina', 'Trekking guiado por bosques y miradores.', '56998218978', NULL, NULL, 'Futrono', NULL, true, 2, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO experiences (id, "partnerId", title, description, category, duration, "priceFrom", "imageUrl", featured, active, "sortOrder", "createdAt", "updatedAt")
VALUES
  ('seed_exp_1', 'seed_partner_rios', 'Cabalgata al atardecer', 'Recorrido suave por campos y orilla del lago con guía local.', 'RIDING', '2 horas', 25000, NULL, true, true, 0, NOW(), NOW()),
  ('seed_exp_2', 'seed_partner_rios', 'Cabalgata familiar', 'Ideal para principiantes y niños acompañados.', 'RIDING', '1.5 horas', 18000, NULL, false, true, 1, NOW(), NOW()),
  ('seed_exp_3', 'seed_partner_lancha', 'Paseo en lancha por el lago', 'Salida panorámica con paradas para fotos.', 'BOAT', '1 hora', 35000, NULL, true, true, 0, NOW(), NOW()),
  ('seed_exp_4', 'seed_partner_lancha', 'Isla y picnic', 'Travesía a isla cercana con tiempo libre.', 'BOAT', 'Medio día', 55000, NULL, false, true, 1, NOW(), NOW()),
  ('seed_exp_5', 'seed_partner_huella', 'Mirador del valle', 'Trekking corto con vistas al valle y volcanes.', 'TREKKING', '3 horas', 22000, NULL, true, true, 0, NOW(), NOW()),
  ('seed_exp_6', 'seed_partner_huella', 'Bosque nativo', 'Caminata interpretativa entre árboles nativos.', 'TREKKING', '2 horas', NULL, NULL, false, true, 1, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
