-- AlterTable
ALTER TABLE "guests" ADD COLUMN "documentType" TEXT NOT NULL DEFAULT 'RUT';
ALTER TABLE "guests" ADD COLUMN "passport" TEXT;
ALTER TABLE "guests" ADD COLUMN "birthDate" DATE;

-- AlterTable
ALTER TABLE "reservations" ADD COLUMN "guestDocumentType" TEXT;
ALTER TABLE "reservations" ADD COLUMN "guestPassport" TEXT;
ALTER TABLE "reservations" ADD COLUMN "guestBirthDate" DATE;
