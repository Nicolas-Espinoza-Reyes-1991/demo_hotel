-- Snapshot del nombre del huésped por reserva (evita que un upsert por email pise nombres históricos)
ALTER TABLE "reservations" ADD COLUMN "guestFullName" TEXT;

UPDATE "reservations" AS r
SET "guestFullName" = g."fullName"
FROM "guests" AS g
WHERE r."guestId" = g."id";

ALTER TABLE "reservations" ALTER COLUMN "guestFullName" SET NOT NULL;
