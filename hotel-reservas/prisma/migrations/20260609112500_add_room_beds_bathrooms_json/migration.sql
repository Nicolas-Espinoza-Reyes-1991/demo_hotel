-- Add structured bed and bathroom fields
ALTER TABLE "rooms"
ADD COLUMN "beds" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN "bathrooms" JSONB NOT NULL DEFAULT '[]';
