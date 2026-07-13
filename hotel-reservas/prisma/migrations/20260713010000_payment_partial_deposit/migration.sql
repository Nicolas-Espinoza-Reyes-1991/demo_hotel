-- Abono parcial (50%) + monto ya pagado
ALTER TYPE "PaymentStatus" ADD VALUE 'PARTIAL';

ALTER TABLE "reservations" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(65,30) NOT NULL DEFAULT 0;

UPDATE "reservations"
SET "amountPaid" = "totalAmount"
WHERE "paymentStatus" = 'PAID' AND "amountPaid" = 0;
