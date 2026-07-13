-- CreateTable
CREATE TABLE "room_price_rules" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "pricePerNight" DECIMAL(65,30) NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_price_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "room_price_rules_roomId_startDate_endDate_idx" ON "room_price_rules"("roomId", "startDate", "endDate");

-- AddForeignKey
ALTER TABLE "room_price_rules" ADD CONSTRAINT "room_price_rules_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
