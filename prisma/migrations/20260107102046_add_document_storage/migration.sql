-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('TAX_1099_DIV', 'TAX_1099_INT', 'TAX_1099_B', 'TAX_K1', 'TAX_SUMMARY', 'TAX_OTHER', 'STATEMENT_MONTHLY', 'STATEMENT_QUARTERLY', 'STATEMENT_ANNUAL', 'PROOF_OF_FUNDS', 'IMPORTED_CSV', 'OTHER');

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "portfolioId" TEXT,
    "category" "DocumentCategory" NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "storageUrl" TEXT NOT NULL,
    "year" INTEGER,
    "notes" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_userId_idx" ON "documents"("userId");

-- CreateIndex
CREATE INDEX "documents_portfolioId_idx" ON "documents"("portfolioId");

-- CreateIndex
CREATE INDEX "documents_category_idx" ON "documents"("category");

-- CreateIndex
CREATE INDEX "documents_year_idx" ON "documents"("year");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
