-- Add personalized room display fields
ALTER TABLE "rooms"
ADD COLUMN "bedType" TEXT,
ADD COLUMN "bathroomDetail" TEXT;
