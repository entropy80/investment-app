-- AlterTable
ALTER TABLE "portfolio_transactions" ADD COLUMN     "costBasisUsed" DECIMAL(18,2),
ADD COLUMN     "holdingPeriodDays" INTEGER,
ADD COLUMN     "realizedGainLoss" DECIMAL(18,2);
