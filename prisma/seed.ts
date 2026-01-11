import { PrismaClient, TransactionCategory } from "@prisma/client";

const prisma = new PrismaClient();

// Default merchant rules for auto-categorization (system-wide, userId = null)
const defaultMerchantRules: {
  pattern: string;
  patternType: "contains" | "starts_with" | "regex";
  merchant: string;
  category: TransactionCategory;
  subcategory?: string;
  isRecurring: boolean;
  priority: number;
}[] = [
  // === INCOME ===
  { pattern: "PAYROLL", patternType: "contains", merchant: "Payroll", category: "SALARY", isRecurring: true, priority: 10 },
  { pattern: "DIRECT DEP", patternType: "contains", merchant: "Direct Deposit", category: "SALARY", isRecurring: true, priority: 10 },
  { pattern: "SALARY", patternType: "contains", merchant: "Salary", category: "SALARY", isRecurring: true, priority: 5 },
  { pattern: "VENMO", patternType: "contains", merchant: "Venmo", category: "OTHER_INCOME", isRecurring: false, priority: 5 },
  { pattern: "ZELLE", patternType: "contains", merchant: "Zelle", category: "OTHER_INCOME", isRecurring: false, priority: 5 },

  // === STREAMING SUBSCRIPTIONS ===
  { pattern: "NETFLIX", patternType: "contains", merchant: "Netflix", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "SPOTIFY", patternType: "contains", merchant: "Spotify", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "YOUTUBE", patternType: "contains", merchant: "YouTube", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "DISNEY PLUS", patternType: "contains", merchant: "Disney+", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "DISNEY+", patternType: "contains", merchant: "Disney+", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "HBO MAX", patternType: "contains", merchant: "HBO Max", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "HULU", patternType: "contains", merchant: "Hulu", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "AMAZON PRIME", patternType: "contains", merchant: "Amazon Prime", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "APPLE TV", patternType: "contains", merchant: "Apple TV+", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "PARAMOUNT+", patternType: "contains", merchant: "Paramount+", category: "STREAMING", isRecurring: true, priority: 10 },
  { pattern: "PEACOCK", patternType: "contains", merchant: "Peacock", category: "STREAMING", isRecurring: true, priority: 10 },

  // === SOFTWARE SUBSCRIPTIONS ===
  { pattern: "GITHUB", patternType: "contains", merchant: "GitHub", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "DROPBOX", patternType: "contains", merchant: "Dropbox", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "GOOGLE STORAGE", patternType: "contains", merchant: "Google One", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "GOOGLE ONE", patternType: "contains", merchant: "Google One", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "ICLOUD", patternType: "contains", merchant: "iCloud", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "ADOBE", patternType: "contains", merchant: "Adobe", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "MICROSOFT 365", patternType: "contains", merchant: "Microsoft 365", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "CHATGPT", patternType: "contains", merchant: "OpenAI", category: "SOFTWARE", isRecurring: true, priority: 10 },
  { pattern: "OPENAI", patternType: "contains", merchant: "OpenAI", category: "SOFTWARE", isRecurring: true, priority: 10 },

  // === PHONE ===
  { pattern: "GOOGLE FI", patternType: "contains", merchant: "Google Fi", category: "PHONE", isRecurring: true, priority: 10 },
  { pattern: "T-MOBILE", patternType: "contains", merchant: "T-Mobile", category: "PHONE", isRecurring: true, priority: 10 },
  { pattern: "VERIZON", patternType: "contains", merchant: "Verizon", category: "PHONE", isRecurring: true, priority: 10 },
  { pattern: "AT&T", patternType: "contains", merchant: "AT&T", category: "PHONE", isRecurring: true, priority: 10 },
  { pattern: "ZAIN", patternType: "contains", merchant: "Zain", category: "PHONE", isRecurring: true, priority: 10 },

  // === GROCERIES ===
  { pattern: "WHOLE FOODS", patternType: "contains", merchant: "Whole Foods", category: "GROCERIES", subcategory: "Whole Foods", isRecurring: false, priority: 10 },
  { pattern: "TRADER JOE", patternType: "contains", merchant: "Trader Joe's", category: "GROCERIES", subcategory: "Trader Joe's", isRecurring: false, priority: 10 },
  { pattern: "INSTACART", patternType: "contains", merchant: "Instacart", category: "GROCERIES", subcategory: "Instacart", isRecurring: false, priority: 10 },
  { pattern: "SAFEWAY", patternType: "contains", merchant: "Safeway", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "KROGER", patternType: "contains", merchant: "Kroger", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "COSTCO", patternType: "contains", merchant: "Costco", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "WALMART", patternType: "contains", merchant: "Walmart", category: "GROCERIES", isRecurring: false, priority: 8 },
  { pattern: "TARGET", patternType: "contains", merchant: "Target", category: "GROCERIES", isRecurring: false, priority: 8 },
  { pattern: "ALDI", patternType: "contains", merchant: "Aldi", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "PUBLIX", patternType: "contains", merchant: "Publix", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "LULU HYPERMARKET", patternType: "contains", merchant: "Lulu Hypermarket", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "SULTAN CENTER", patternType: "contains", merchant: "Sultan Center", category: "GROCERIES", isRecurring: false, priority: 10 },
  { pattern: "CARREFOUR", patternType: "contains", merchant: "Carrefour", category: "GROCERIES", isRecurring: false, priority: 10 },

  // === DINING ===
  { pattern: "DOORDASH", patternType: "contains", merchant: "DoorDash", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "UBER EATS", patternType: "contains", merchant: "Uber Eats", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "GRUBHUB", patternType: "contains", merchant: "Grubhub", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "POSTMATES", patternType: "contains", merchant: "Postmates", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "STARBUCKS", patternType: "contains", merchant: "Starbucks", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "MCDONALD", patternType: "contains", merchant: "McDonald's", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "CHIPOTLE", patternType: "contains", merchant: "Chipotle", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "CHICK-FIL-A", patternType: "contains", merchant: "Chick-fil-A", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "SUBWAY", patternType: "contains", merchant: "Subway", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "PANERA", patternType: "contains", merchant: "Panera", category: "DINING", isRecurring: false, priority: 10 },
  { pattern: "RESTAURANT", patternType: "contains", merchant: "Restaurant", category: "DINING", isRecurring: false, priority: 3 },
  { pattern: "CAFE", patternType: "contains", merchant: "Cafe", category: "DINING", isRecurring: false, priority: 3 },

  // === TRANSPORTATION ===
  { pattern: "UBER *TRIP", patternType: "contains", merchant: "Uber", category: "PUBLIC_TRANSIT", isRecurring: false, priority: 10 },
  { pattern: "UBER   TRIP", patternType: "contains", merchant: "Uber", category: "PUBLIC_TRANSIT", isRecurring: false, priority: 10 },
  { pattern: "LYFT", patternType: "contains", merchant: "Lyft", category: "PUBLIC_TRANSIT", isRecurring: false, priority: 10 },

  // === FUEL ===
  { pattern: "SHELL", patternType: "contains", merchant: "Shell", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "CHEVRON", patternType: "contains", merchant: "Chevron", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "EXXON", patternType: "contains", merchant: "Exxon", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "MOBIL", patternType: "contains", merchant: "Mobil", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "BP ", patternType: "contains", merchant: "BP", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "76 GAS", patternType: "contains", merchant: "76", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "ARCO", patternType: "contains", merchant: "Arco", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "GAS STATION", patternType: "contains", merchant: "Gas Station", category: "FUEL", isRecurring: false, priority: 5 },
  { pattern: "OULA", patternType: "contains", merchant: "Oula", category: "FUEL", isRecurring: false, priority: 10 },
  { pattern: "KNPC", patternType: "contains", merchant: "KNPC", category: "FUEL", isRecurring: false, priority: 10 },

  // === UTILITIES ===
  { pattern: "COMCAST", patternType: "contains", merchant: "Comcast", category: "INTERNET", isRecurring: true, priority: 10 },
  { pattern: "XFINITY", patternType: "contains", merchant: "Xfinity", category: "INTERNET", isRecurring: true, priority: 10 },
  { pattern: "SPECTRUM", patternType: "contains", merchant: "Spectrum", category: "INTERNET", isRecurring: true, priority: 10 },
  { pattern: "ATT INTERNET", patternType: "contains", merchant: "AT&T Internet", category: "INTERNET", isRecurring: true, priority: 10 },
  { pattern: "PG&E", patternType: "contains", merchant: "PG&E", category: "ELECTRICITY", isRecurring: true, priority: 10 },
  { pattern: "EDISON", patternType: "contains", merchant: "Edison", category: "ELECTRICITY", isRecurring: true, priority: 10 },
  { pattern: "ELECTRIC", patternType: "contains", merchant: "Electric Company", category: "ELECTRICITY", isRecurring: true, priority: 3 },
  { pattern: "WATER UTILITY", patternType: "contains", merchant: "Water Utility", category: "WATER_SEWER", isRecurring: true, priority: 5 },

  // === HEALTH ===
  { pattern: "CVS", patternType: "contains", merchant: "CVS", category: "MEDICINE", isRecurring: false, priority: 10 },
  { pattern: "WALGREENS", patternType: "contains", merchant: "Walgreens", category: "MEDICINE", isRecurring: false, priority: 10 },
  { pattern: "PHARMACY", patternType: "contains", merchant: "Pharmacy", category: "MEDICINE", isRecurring: false, priority: 5 },
  { pattern: "KAISER", patternType: "contains", merchant: "Kaiser", category: "HEALTH_INSURANCE", isRecurring: true, priority: 10 },

  // === PERSONAL CARE ===
  { pattern: "AMAZON.COM", patternType: "contains", merchant: "Amazon", category: "PERSONAL_CARE", isRecurring: false, priority: 5 },
  { pattern: "AMZN", patternType: "contains", merchant: "Amazon", category: "PERSONAL_CARE", isRecurring: false, priority: 5 },

  // === MEMBERSHIPS ===
  { pattern: "GYM", patternType: "contains", merchant: "Gym", category: "MEMBERSHIPS", isRecurring: true, priority: 5 },
  { pattern: "FITNESS", patternType: "contains", merchant: "Fitness", category: "MEMBERSHIPS", isRecurring: true, priority: 5 },
  { pattern: "PLANET FITNESS", patternType: "contains", merchant: "Planet Fitness", category: "MEMBERSHIPS", isRecurring: true, priority: 10 },
  { pattern: "24 HOUR FITNESS", patternType: "contains", merchant: "24 Hour Fitness", category: "MEMBERSHIPS", isRecurring: true, priority: 10 },
  { pattern: "AMAZON PRIME", patternType: "contains", merchant: "Amazon Prime", category: "MEMBERSHIPS", isRecurring: true, priority: 10 },

  // === BANK FEES ===
  { pattern: "OVERDRAFT", patternType: "contains", merchant: "Overdraft Fee", category: "BANK_FEES", isRecurring: false, priority: 10 },
  { pattern: "SERVICE CHARGE", patternType: "contains", merchant: "Service Charge", category: "BANK_FEES", isRecurring: false, priority: 10 },
  { pattern: "MONTHLY FEE", patternType: "contains", merchant: "Monthly Fee", category: "BANK_FEES", isRecurring: true, priority: 10 },
  { pattern: "ATM FEE", patternType: "contains", merchant: "ATM Fee", category: "BANK_FEES", isRecurring: false, priority: 10 },
  { pattern: "WIRE FEE", patternType: "contains", merchant: "Wire Fee", category: "BANK_FEES", isRecurring: false, priority: 10 },

  // === ATM ===
  { pattern: "ATM WITHDRAWAL", patternType: "contains", merchant: "ATM", category: "ATM_WITHDRAWAL", isRecurring: false, priority: 10 },
  { pattern: "ATM CASH", patternType: "contains", merchant: "ATM", category: "ATM_WITHDRAWAL", isRecurring: false, priority: 10 },
  { pattern: "CASH WITHDRAWAL", patternType: "contains", merchant: "ATM", category: "ATM_WITHDRAWAL", isRecurring: false, priority: 10 },

  // === TRANSFERS ===
  { pattern: "TRANSFER TO", patternType: "contains", merchant: "Transfer", category: "TRANSFER", isRecurring: false, priority: 5 },
  { pattern: "TRANSFER FROM", patternType: "contains", merchant: "Transfer", category: "TRANSFER", isRecurring: false, priority: 5 },
  { pattern: "WIRE TRANSFER", patternType: "contains", merchant: "Wire Transfer", category: "TRANSFER", isRecurring: false, priority: 10 },
  { pattern: "ACH TRANSFER", patternType: "contains", merchant: "ACH Transfer", category: "TRANSFER", isRecurring: false, priority: 10 },

  // === INVESTMENT ===
  { pattern: "FIDELITY", patternType: "contains", merchant: "Fidelity", category: "INVESTMENT", isRecurring: false, priority: 10 },
  { pattern: "VANGUARD", patternType: "contains", merchant: "Vanguard", category: "INVESTMENT", isRecurring: false, priority: 10 },
  { pattern: "SCHWAB", patternType: "contains", merchant: "Charles Schwab", category: "INVESTMENT", isRecurring: false, priority: 10 },
  { pattern: "E*TRADE", patternType: "contains", merchant: "E*Trade", category: "INVESTMENT", isRecurring: false, priority: 10 },
  { pattern: "ROBINHOOD", patternType: "contains", merchant: "Robinhood", category: "INVESTMENT", isRecurring: false, priority: 10 },
  { pattern: "COINBASE", patternType: "contains", merchant: "Coinbase", category: "INVESTMENT", isRecurring: false, priority: 10 },

  // === INSURANCE ===
  { pattern: "GEICO", patternType: "contains", merchant: "Geico", category: "AUTO_INSURANCE", isRecurring: true, priority: 10 },
  { pattern: "STATE FARM", patternType: "contains", merchant: "State Farm", category: "AUTO_INSURANCE", isRecurring: true, priority: 10 },
  { pattern: "ALLSTATE", patternType: "contains", merchant: "Allstate", category: "AUTO_INSURANCE", isRecurring: true, priority: 10 },
  { pattern: "PROGRESSIVE", patternType: "contains", merchant: "Progressive", category: "AUTO_INSURANCE", isRecurring: true, priority: 10 },

  // === CLOTHING ===
  { pattern: "NORDSTROM", patternType: "contains", merchant: "Nordstrom", category: "CLOTHING", isRecurring: false, priority: 10 },
  { pattern: "MACYS", patternType: "contains", merchant: "Macy's", category: "CLOTHING", isRecurring: false, priority: 10 },
  { pattern: "H&M", patternType: "contains", merchant: "H&M", category: "CLOTHING", isRecurring: false, priority: 10 },
  { pattern: "ZARA", patternType: "contains", merchant: "Zara", category: "CLOTHING", isRecurring: false, priority: 10 },
  { pattern: "GAP", patternType: "contains", merchant: "Gap", category: "CLOTHING", isRecurring: false, priority: 8 },
  { pattern: "UNIQLO", patternType: "contains", merchant: "Uniqlo", category: "CLOTHING", isRecurring: false, priority: 10 },
  { pattern: "NIKE", patternType: "contains", merchant: "Nike", category: "CLOTHING", isRecurring: false, priority: 10 },

  // === HOME ===
  { pattern: "HOME DEPOT", patternType: "contains", merchant: "Home Depot", category: "HOME_MAINTENANCE", isRecurring: false, priority: 10 },
  { pattern: "LOWES", patternType: "contains", merchant: "Lowe's", category: "HOME_MAINTENANCE", isRecurring: false, priority: 10 },
  { pattern: "IKEA", patternType: "contains", merchant: "IKEA", category: "HOME_SUPPLIES", isRecurring: false, priority: 10 },
];

async function main() {
  console.log("Seeding currencies...");

  // Seed currencies
  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "KWD", name: "Kuwaiti Dinar", symbol: "KD" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {},
      create: currency,
    });
    console.log(`  Created/updated currency: ${currency.code}`);
  }

  console.log("\nSeeding exchange rates...");

  // Get currency IDs
  const usd = await prisma.currency.findUnique({ where: { code: "USD" } });
  const kwd = await prisma.currency.findUnique({ where: { code: "KWD" } });
  const gbp = await prisma.currency.findUnique({ where: { code: "GBP" } });
  const eur = await prisma.currency.findUnique({ where: { code: "EUR" } });
  const chf = await prisma.currency.findUnique({ where: { code: "CHF" } });

  if (!usd || !kwd || !gbp || !eur || !chf) {
    throw new Error("Failed to find currencies");
  }

  // Seed exchange rates (as of 2024-12-17 from finance_cli data)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const exchangeRates = [
    // KWD conversions
    {
      fromCurrencyId: kwd.id,
      toCurrencyId: usd.id,
      rate: 3.2757,
      effectiveDate: today,
      source: "manual",
    },
    {
      fromCurrencyId: usd.id,
      toCurrencyId: kwd.id,
      rate: 0.3053,
      effectiveDate: today,
      source: "manual",
    },
    // GBP conversions
    {
      fromCurrencyId: gbp.id,
      toCurrencyId: usd.id,
      rate: 1.3572,
      effectiveDate: today,
      source: "manual",
    },
    {
      fromCurrencyId: usd.id,
      toCurrencyId: gbp.id,
      rate: 0.7368,
      effectiveDate: today,
      source: "manual",
    },
    // EUR conversions
    {
      fromCurrencyId: eur.id,
      toCurrencyId: usd.id,
      rate: 1.04,
      effectiveDate: today,
      source: "manual",
    },
    {
      fromCurrencyId: usd.id,
      toCurrencyId: eur.id,
      rate: 0.9615,
      effectiveDate: today,
      source: "manual",
    },
    // CHF conversions
    {
      fromCurrencyId: chf.id,
      toCurrencyId: usd.id,
      rate: 1.11,
      effectiveDate: today,
      source: "manual",
    },
    {
      fromCurrencyId: usd.id,
      toCurrencyId: chf.id,
      rate: 0.9009,
      effectiveDate: today,
      source: "manual",
    },
  ];

  for (const rate of exchangeRates) {
    const fromCurrency = await prisma.currency.findUnique({
      where: { id: rate.fromCurrencyId },
    });
    const toCurrency = await prisma.currency.findUnique({
      where: { id: rate.toCurrencyId },
    });

    await prisma.exchangeRate.upsert({
      where: {
        fromCurrencyId_toCurrencyId_effectiveDate: {
          fromCurrencyId: rate.fromCurrencyId,
          toCurrencyId: rate.toCurrencyId,
          effectiveDate: rate.effectiveDate,
        },
      },
      update: { rate: rate.rate, source: rate.source },
      create: rate,
    });
    console.log(
      `  Created/updated rate: ${fromCurrency?.code} → ${toCurrency?.code} = ${rate.rate}`
    );
  }

  console.log("\nSeeding merchant rules...");

  // Seed default merchant rules (system-wide, no userId)
  for (const rule of defaultMerchantRules) {
    await prisma.merchantRule.upsert({
      where: {
        id: `system-${rule.pattern.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
      },
      update: {
        patternType: rule.patternType,
        merchant: rule.merchant,
        category: rule.category,
        subcategory: rule.subcategory,
        isRecurring: rule.isRecurring,
        priority: rule.priority,
        isActive: true,
      },
      create: {
        id: `system-${rule.pattern.toLowerCase().replace(/[^a-z0-9]/g, "-")}`,
        pattern: rule.pattern,
        patternType: rule.patternType,
        merchant: rule.merchant,
        category: rule.category,
        subcategory: rule.subcategory,
        isRecurring: rule.isRecurring,
        priority: rule.priority,
        isActive: true,
        userId: null, // System-wide rule
      },
    });
  }
  console.log(`  Created/updated ${defaultMerchantRules.length} merchant rules`);

  console.log("\nSeeding complete!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
