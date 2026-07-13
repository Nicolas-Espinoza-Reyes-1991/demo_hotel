-- CreateEnum
CREATE TYPE "ExperienceCategory" AS ENUM ('RIDING', 'BOAT', 'TREKKING', 'THERMAL', 'FISHING', 'CULTURE', 'OTHER');

-- CreateTable
CREATE TABLE "tour_partners" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "whatsapp" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "area" TEXT,
    "logoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tour_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "experiences" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "ExperienceCategory" NOT NULL DEFAULT 'OTHER',
    "duration" TEXT,
    "priceFrom" DECIMAL(65,30),
    "imageUrl" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "experiences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tour_partners_active_sortOrder_idx" ON "tour_partners"("active", "sortOrder");

-- CreateIndex
CREATE INDEX "experiences_partnerId_sortOrder_idx" ON "experiences"("partnerId", "sortOrder");

-- CreateIndex
CREATE INDEX "experiences_active_category_idx" ON "experiences"("active", "category");

-- CreateIndex
CREATE INDEX "experiences_featured_idx" ON "experiences"("featured");

-- AddForeignKey
ALTER TABLE "experiences" ADD CONSTRAINT "experiences_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "tour_partners"("id") ON DELETE CASCADE ON UPDATE CASCADE;
