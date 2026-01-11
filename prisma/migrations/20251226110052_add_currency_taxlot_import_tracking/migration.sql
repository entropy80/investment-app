-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PortfolioTransactionType" ADD VALUE 'REINVEST_DIVIDEND';
ALTER TYPE "PortfolioTransactionType" ADD VALUE 'TAX_WITHHOLDING';
ALTER TYPE "PortfolioTransactionType" ADD VALUE 'FOREX';
ALTER TYPE "PortfolioTransactionType" ADD VALUE 'ADJUSTMENT';

-- AlterTable
ALTER TABLE "portfolio_transactions" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "importBatch" TEXT,
ADD COLUMN     "importSource" TEXT,
ADD COLUMN     "importedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "currencies" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "currencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "fromCurrencyId" TEXT NOT NULL,
    "toCurrencyId" TEXT NOT NULL,
    "rate" DECIMAL(18,8) NOT NULL,
    "effectiveDate" DATE NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_lots" (
    "id" TEXT NOT NULL,
    "holdingId" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "quantity" DECIMAL(18,8) NOT NULL,
    "remaining" DECIMAL(18,8) NOT NULL,
    "costBasis" DECIMAL(18,2) NOT NULL,
    "costPerUnit" DECIMAL(18,8) NOT NULL,
    "acquiredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_lots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "currencies_code_key" ON "currencies"("code");

-- CreateIndex
CREATE INDEX "exchange_rates_fromCurrencyId_toCurrencyId_idx" ON "exchange_rates"("fromCurrencyId", "toCurrencyId");

-- CreateIndex
CREATE INDEX "exchange_rates_effectiveDate_idx" ON "exchange_rates"("effectiveDate");

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_fromCurrencyId_toCurrencyId_effectiveDate_key" ON "exchange_rates"("fromCurrencyId", "toCurrencyId", "effectiveDate");

-- CreateIndex
CREATE INDEX "tax_lots_holdingId_idx" ON "tax_lots"("holdingId");

-- CreateIndex
CREATE INDEX "tax_lots_acquiredAt_idx" ON "tax_lots"("acquiredAt");

-- CreateIndex
CREATE INDEX "tax_lots_transactionId_idx" ON "tax_lots"("transactionId");

-- CreateIndex
CREATE INDEX "portfolio_transactions_externalId_idx" ON "portfolio_transactions"("externalId");

-- CreateIndex
CREATE INDEX "portfolio_transactions_importBatch_idx" ON "portfolio_transactions"("importBatch");

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_fromCurrencyId_fkey" FOREIGN KEY ("fromCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_toCurrencyId_fkey" FOREIGN KEY ("toCurrencyId") REFERENCES "currencies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_holdingId_fkey" FOREIGN KEY ("holdingId") REFERENCES "holdings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_lots" ADD CONSTRAINT "tax_lots_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "portfolio_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
