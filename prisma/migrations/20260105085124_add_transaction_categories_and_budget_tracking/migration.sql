-- CreateEnum
CREATE TYPE "TransactionCategory" AS ENUM ('SALARY', 'RENTAL_INCOME', 'ALLOWANCE', 'INVESTMENT_INCOME', 'REFUND', 'OTHER_INCOME', 'RENT', 'ELECTRICITY', 'WATER_SEWER', 'INTERNET', 'HOME_MAINTENANCE', 'HOUSE_CLEANING', 'HOME_SUPPLIES', 'LAWN_GARDEN', 'AUTO_INSURANCE', 'AUTO_REPAIRS', 'FUEL', 'DMV_FEES', 'PARKING', 'PUBLIC_TRANSIT', 'HEALTH_INSURANCE', 'DOCTOR_DENTIST', 'MEDICINE', 'VETERINARY', 'GROCERIES', 'DINING', 'CLOTHING', 'PERSONAL_CARE', 'PHONE', 'STREAMING', 'SOFTWARE', 'MEMBERSHIPS', 'TAXES', 'LEGAL_FEES', 'BANK_FEES', 'ATM_WITHDRAWAL', 'TRANSFER', 'INVESTMENT', 'SAVINGS', 'UNCATEGORIZED');

-- AlterTable
ALTER TABLE "portfolio_transactions" ADD COLUMN     "category" "TransactionCategory",
ADD COLUMN     "categorySource" TEXT DEFAULT 'auto',
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "merchant" TEXT,
ADD COLUMN     "recurringPattern" TEXT,
ADD COLUMN     "subcategory" TEXT;

-- CreateTable
CREATE TABLE "budget_categories" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_items" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budget_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_mappings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "transactionCategory" "TransactionCategory" NOT NULL,
    "budgetCategoryId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "category_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "merchant_rules" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "pattern" TEXT NOT NULL,
    "patternType" TEXT NOT NULL DEFAULT 'contains',
    "merchant" TEXT NOT NULL,
    "category" "TransactionCategory" NOT NULL,
    "subcategory" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchant_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "budget_categories_userId_idx" ON "budget_categories"("userId");

-- CreateIndex
CREATE INDEX "budget_categories_parentId_idx" ON "budget_categories"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "budget_categories_userId_name_parentId_key" ON "budget_categories"("userId", "name", "parentId");

-- CreateIndex
CREATE INDEX "budget_items_categoryId_idx" ON "budget_items"("categoryId");

-- CreateIndex
CREATE INDEX "budget_items_year_month_idx" ON "budget_items"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "budget_items_categoryId_year_month_key" ON "budget_items"("categoryId", "year", "month");

-- CreateIndex
CREATE INDEX "category_mappings_userId_idx" ON "category_mappings"("userId");

-- CreateIndex
CREATE INDEX "category_mappings_budgetCategoryId_idx" ON "category_mappings"("budgetCategoryId");

-- CreateIndex
CREATE UNIQUE INDEX "category_mappings_userId_transactionCategory_key" ON "category_mappings"("userId", "transactionCategory");

-- CreateIndex
CREATE INDEX "merchant_rules_userId_idx" ON "merchant_rules"("userId");

-- CreateIndex
CREATE INDEX "merchant_rules_category_idx" ON "merchant_rules"("category");

-- CreateIndex
CREATE INDEX "merchant_rules_isActive_priority_idx" ON "merchant_rules"("isActive", "priority");

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "budget_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_categories" ADD CONSTRAINT "budget_categories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_mappings" ADD CONSTRAINT "category_mappings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_mappings" ADD CONSTRAINT "category_mappings_budgetCategoryId_fkey" FOREIGN KEY ("budgetCategoryId") REFERENCES "budget_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "merchant_rules" ADD CONSTRAINT "merchant_rules_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
