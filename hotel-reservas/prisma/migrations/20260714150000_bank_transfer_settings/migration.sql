-- CreateTable
CREATE TABLE "bank_transfer_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT NOT NULL,
    "accountHolder" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" TEXT NOT NULL DEFAULT 'Cuenta corriente',
    "taxId" TEXT,
    "cbu" TEXT,
    "alias" TEXT,
    "swift" TEXT,
    "contactEmail" TEXT,
    "deadlineHours" INTEGER NOT NULL DEFAULT 48,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transfer_settings_pkey" PRIMARY KEY ("id")
);
