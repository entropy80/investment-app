import { PortfolioTransactionType, TransactionCategory } from "@prisma/client";

/**
 * Supported import formats
 */
export type BrokerFormat = "schwab" | "ibkr" | "chase_bank" | "nbk" | "bofa";

/**
 * Raw parsed row from Schwab CSV
 */
export interface SchwabRawRow {
  Date: string;
  Action: string;
  Symbol: string;
  Description: string;
  Quantity: string;
  Price: string;
  "Fees & Comm": string;
  Amount: string;
}

/**
 * Raw parsed row from IBKR CSV (Transaction History section)
 */
export interface IBKRRawRow {
  Date: string;
  Account: string;
  Description: string;
  "Transaction Type": string;
  Symbol: string;
  Quantity: string;
  Price: string;
  "Gross Amount": string;
  Commission: string;
  "Net Amount": string;
  "Transaction Fees": string;
}

/**
 * Raw parsed row from Chase Bank CSV (Checking/Savings)
 */
export interface ChaseRawRow {
  Details: string;           // DEBIT or CREDIT
  "Posting Date": string;    // MM/DD/YYYY
  Description: string;       // Merchant/transaction description
  Amount: string;            // Decimal (negative for debits)
  Type: string;              // ACH_DEBIT, DEBIT_CARD, WIRE_INCOMING, etc.
  Balance: string;           // Running balance
  "Check or Slip #": string; // Usually empty
}

/**
 * Normalized transaction ready for import
 */
export interface NormalizedTransaction {
  date: Date;
  type: PortfolioTransactionType;
  symbol: string | null;
  description: string;
  quantity: number | null;
  price: number | null;
  amount: number;
  fees: number | null;
  currency: string;
  // For duplicate detection
  externalId: string;
  importSource: BrokerFormat;
  // Original raw data for debugging
  rawData: Record<string, string>;
  // Bank transaction fields (optional, for bank statement imports)
  category?: TransactionCategory;
  merchant?: string;
  isRecurring?: boolean;
}

/**
 * Import result for a single transaction
 */
export interface TransactionImportResult {
  transaction: NormalizedTransaction;
  status: "imported" | "skipped" | "error";
  reason?: string;
  dbId?: string;
}

/**
 * Overall import summary
 */
export interface ImportSummary {
  total: number;
  imported: number;
  skipped: number;
  errors: number;
  results: TransactionImportResult[];
  importBatch: string;
}

/**
 * Import options
 */
export interface ImportOptions {
  accountId: string;
  brokerFormat: BrokerFormat;
  dryRun?: boolean;
  skipDuplicates?: boolean;
  /** Currency code for transactions (e.g., USD, EUR, KWD). If not specified, defaults to USD */
  currency?: string;
}

/**
 * Schwab action to transaction type mapping
 */
export const SCHWAB_ACTION_MAP: Record<string, PortfolioTransactionType> = {
  Buy: "BUY",
  Sell: "SELL",
  "Qualified Dividend": "DIVIDEND",
  "Reinvest Dividend": "REINVEST_DIVIDEND",
  "Qual Div Reinvest": "REINVEST_DIVIDEND",
  "Reinvest Shares": "BUY", // Reinvested shares are effectively buys
  "NRA Tax Adj": "TAX_WITHHOLDING",
  "Credit Interest": "INTEREST",
  "MoneyLink Transfer": "DEPOSIT",
  Journal: "TRANSFER_IN", // Could also be TRANSFER_OUT, need to check amount sign
  "Journaled Shares": "TRANSFER_IN", // Shares transferred between accounts
  "Wire Transfer": "DEPOSIT",
  "Bank Interest": "INTEREST",
};

/**
 * IBKR transaction type to app type mapping
 */
export const IBKR_TYPE_MAP: Record<string, PortfolioTransactionType> = {
  Buy: "BUY",
  Sell: "SELL",
  Dividend: "DIVIDEND",
  "Credit Interest": "INTEREST",
  "Foreign Tax Withholding": "TAX_WITHHOLDING",
  "Forex Trade Component": "FOREX",
  Adjustment: "ADJUSTMENT",
  Deposit: "DEPOSIT",
  "Electronic Fund Transfer": "DEPOSIT",
  Withdrawal: "WITHDRAWAL",
  "System Transfer": "TRANSFER_IN", // Could be TRANSFER_OUT, check amount sign
};

/**
 * Chase Bank transaction type to app type mapping
 */
export const CHASE_TYPE_MAP: Record<string, PortfolioTransactionType> = {
  ACH_CREDIT: "DEPOSIT",
  ACH_DEBIT: "WITHDRAWAL",
  DEBIT_CARD: "WITHDRAWAL",
  CHECK_DEPOSIT: "DEPOSIT",
  CHECK_PAID: "WITHDRAWAL",
  WIRE_INCOMING: "TRANSFER_IN",
  WIRE_OUTGOING: "TRANSFER_OUT",
  FEE_TRANSACTION: "FEE",
  ATM_WITHDRAWAL: "WITHDRAWAL",
  ATM_DEPOSIT: "DEPOSIT",
  LOAN_PAYMENT: "WITHDRAWAL",
  BILL_PAYMENT: "WITHDRAWAL",
};

/**
 * Merchant patterns for auto-categorization
 * Pattern can be a string (partial match) or regex
 */
export const MERCHANT_CATEGORY_PATTERNS: Array<{
  pattern: string | RegExp;
  category: TransactionCategory;
  merchant?: string;
  isRecurring?: boolean;
}> = [
  // Groceries
  { pattern: /COSTCO|SAFEWAY|WHOLE FOODS|TRADER JOE|KROGER|PUBLIX|ALDI|WALMART.*GROCERY/i, category: "GROCERIES", merchant: "Grocery Store" },
  { pattern: /INSTACART/i, category: "GROCERIES", merchant: "Instacart" },

  // Dining
  { pattern: /DOORDASH|UBER EATS|GRUBHUB|POSTMATES/i, category: "DINING", merchant: "Food Delivery" },
  { pattern: /STARBUCKS|DUNKIN|COFFEE/i, category: "DINING", merchant: "Coffee Shop" },
  { pattern: /MCDONALD|BURGER KING|WENDY|CHICK-FIL|TACO BELL|CHIPOTLE/i, category: "DINING", merchant: "Fast Food" },

  // Streaming & Software Subscriptions
  { pattern: /NETFLIX/i, category: "STREAMING", merchant: "Netflix", isRecurring: true },
  { pattern: /SPOTIFY/i, category: "STREAMING", merchant: "Spotify", isRecurring: true },
  { pattern: /APPLE\.COM.*BILL|APPLE MUSIC|ITUNES/i, category: "STREAMING", merchant: "Apple", isRecurring: true },
  { pattern: /AMAZON PRIME/i, category: "MEMBERSHIPS", merchant: "Amazon Prime", isRecurring: true },
  { pattern: /HULU/i, category: "STREAMING", merchant: "Hulu", isRecurring: true },
  { pattern: /DISNEY\+|DISNEYPLUS/i, category: "STREAMING", merchant: "Disney+", isRecurring: true },
  { pattern: /HBO|MAX\.COM/i, category: "STREAMING", merchant: "HBO Max", isRecurring: true },
  { pattern: /YOUTUBE|GOOGLE.*PLAY/i, category: "STREAMING", merchant: "YouTube/Google", isRecurring: true },

  // Shopping
  { pattern: /AMAZON\.COM|AMZN\.COM|AMAZON MKTPL/i, category: "CLOTHING", merchant: "Amazon" }, // General Amazon purchases
  { pattern: /TARGET/i, category: "CLOTHING", merchant: "Target" },
  { pattern: /WALMART(?!.*GROCERY)/i, category: "CLOTHING", merchant: "Walmart" },

  // Transportation
  { pattern: /UBER(?!\s*EATS)/i, category: "FUEL", merchant: "Uber" },
  { pattern: /LYFT/i, category: "FUEL", merchant: "Lyft" },
  { pattern: /SHELL|CHEVRON|EXXON|MOBIL|BP |76 |ARCO|GAS|FUEL/i, category: "FUEL", merchant: "Gas Station" },
  { pattern: /PARKING|PARKWHIZ|SPOTHERO/i, category: "PARKING" },

  // Utilities & Phone
  { pattern: /AT&T|VERIZON|T-MOBILE|SPRINT/i, category: "PHONE", merchant: "Phone Carrier", isRecurring: true },
  { pattern: /ELECTRIC|POWER|ENERGY|EDISON/i, category: "ELECTRICITY", isRecurring: true },
  { pattern: /WATER.*UTILITY|WATER.*DISTRICT/i, category: "WATER_SEWER", isRecurring: true },
  { pattern: /COMCAST|XFINITY|SPECTRUM|COX|INTERNET/i, category: "INTERNET", isRecurring: true },

  // Transfers & Income
  { pattern: /PAYROLL|DIRECT DEP|SALARY/i, category: "SALARY", merchant: "Employer" },
  { pattern: /ZELLE|VENMO|PAYPAL.*TRANSFER|CASH APP/i, category: "TRANSFER" },
  { pattern: /WIRE.*CREDIT|FEDWIRE.*CREDIT/i, category: "TRANSFER" },

  // Banking
  { pattern: /ATM.*WITHDRAWAL|ATM.*CASH/i, category: "ATM_WITHDRAWAL" },
  { pattern: /WIRE.*FEE|BANK.*FEE|SERVICE.*FEE|MAINTENANCE.*FEE/i, category: "BANK_FEES" },
  { pattern: /OVERDRAFT/i, category: "BANK_FEES" },

  // Health
  { pattern: /CVS|WALGREENS|RITE AID|PHARMACY/i, category: "MEDICINE", merchant: "Pharmacy" },
  { pattern: /DOCTOR|MEDICAL|HOSPITAL|CLINIC|HEALTH/i, category: "DOCTOR_DENTIST" },

  // Insurance
  { pattern: /GEICO|ALLSTATE|STATE FARM|PROGRESSIVE|AUTO.*INS/i, category: "AUTO_INSURANCE", isRecurring: true },
  { pattern: /HEALTH.*INS|BLUE.*CROSS|AETNA|CIGNA|UNITED.*HEALTH/i, category: "HEALTH_INSURANCE", isRecurring: true },

  // Home
  { pattern: /RENT|LANDLORD|PROPERTY.*MGMT/i, category: "RENT", isRecurring: true },
  { pattern: /HOME.*DEPOT|LOWE'?S|ACE.*HARDWARE/i, category: "HOME_MAINTENANCE", merchant: "Home Improvement" },
  { pattern: /CLEANING|MAID|HOUSE.*CLEAN/i, category: "HOUSE_CLEANING" },

  // Storage
  { pattern: /EXTRA SPACE|PUBLIC STORAGE|CUBESMART|STORAGE/i, category: "HOME_SUPPLIES", merchant: "Storage Unit", isRecurring: true },
];
