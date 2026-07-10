-- AlterTable
ALTER TABLE "reservations" ADD COLUMN "listTotalAmount" DECIMAL(65,30);
ALTER TABLE "reservations" ADD COLUMN "discountReason" TEXT;
ALTER TABLE "reservations" ADD COLUMN "discountAppliedAt" TIMESTAMP(3);
ALTER TABLE "reservations" ADD COLUMN "discountAppliedBy" TEXT;

-- Backfill: sin descuento, lista = cobrado
UPDATE "reservations" SET "listTotalAmount" = "totalAmount" WHERE "listTotalAmount" IS NULL;

ALTER TABLE "reservations" ALTER COLUMN "listTotalAmount" SET NOT NULL;
