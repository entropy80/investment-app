/**
 * Currency Conversion Service
 * Handles exchange rate lookups and currency conversions
 */

import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

export interface ExchangeRateResult {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  effectiveDate: Date;
  source: string | null;
}

export interface ConversionResult {
  originalAmount: number;
  originalCurrency: string;
  convertedAmount: number;
  targetCurrency: string;
  rate: number;
  rateDate: Date;
}

/**
 * Get the latest exchange rate between two currencies
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string
): Promise<ExchangeRateResult | null> {
  // Same currency = 1:1
  if (fromCurrency === toCurrency) {
    return {
      fromCurrency,
      toCurrency,
      rate: 1,
      effectiveDate: new Date(),
      source: "identity",
    };
  }

  // Look up currencies
  const [fromCurr, toCurr] = await Promise.all([
    prisma.currency.findUnique({ where: { code: fromCurrency } }),
    prisma.currency.findUnique({ where: { code: toCurrency } }),
  ]);

  if (!fromCurr || !toCurr) {
    return null;
  }

  // Get latest exchange rate
  const exchangeRate = await prisma.exchangeRate.findFirst({
    where: {
      fromCurrencyId: fromCurr.id,
      toCurrencyId: toCurr.id,
    },
    orderBy: { effectiveDate: "desc" },
  });

  if (!exchangeRate) {
    // Try to find inverse rate
    const inverseRate = await prisma.exchangeRate.findFirst({
      where: {
        fromCurrencyId: toCurr.id,
        toCurrencyId: fromCurr.id,
      },
      orderBy: { effectiveDate: "desc" },
    });

    if (inverseRate) {
      return {
        fromCurrency,
        toCurrency,
        rate: 1 / Number(inverseRate.rate),
        effectiveDate: inverseRate.effectiveDate,
        source: inverseRate.source,
      };
    }

    return null;
  }

  return {
    fromCurrency,
    toCurrency,
    rate: Number(exchangeRate.rate),
    effectiveDate: exchangeRate.effectiveDate,
    source: exchangeRate.source,
  };
}

/**
 * Convert an amount from one currency to another
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<ConversionResult | null> {
  const rate = await getExchangeRate(fromCurrency, toCurrency);

  if (!rate) {
    return null;
  }

  return {
    originalAmount: amount,
    originalCurrency: fromCurrency,
    convertedAmount: amount * rate.rate,
    targetCurrency: toCurrency,
    rate: rate.rate,
    rateDate: rate.effectiveDate,
  };
}

/**
 * Get all available currencies
 */
export async function getCurrencies(): Promise<
  { code: string; name: string; symbol: string | null }[]
> {
  const currencies = await prisma.currency.findMany({
    orderBy: { code: "asc" },
  });

  return currencies.map((c) => ({
    code: c.code,
    name: c.name,
    symbol: c.symbol,
  }));
}

/**
 * Get all exchange rates for a base currency
 */
export async function getExchangeRatesForCurrency(
  baseCurrency: string
): Promise<ExchangeRateResult[]> {
  const baseCurr = await prisma.currency.findUnique({
    where: { code: baseCurrency },
  });

  if (!baseCurr) {
    return [];
  }

  const rates = await prisma.exchangeRate.findMany({
    where: { fromCurrencyId: baseCurr.id },
    include: {
      toCurrency: true,
    },
    orderBy: { effectiveDate: "desc" },
    distinct: ["toCurrencyId"],
  });

  return rates.map((r) => ({
    fromCurrency: baseCurrency,
    toCurrency: r.toCurrency.code,
    rate: Number(r.rate),
    effectiveDate: r.effectiveDate,
    source: r.source,
  }));
}

/**
 * Update or create an exchange rate
 */
export async function setExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  rate: number,
  effectiveDate: Date = new Date(),
  source: string = "manual"
): Promise<ExchangeRateResult | null> {
  const [fromCurr, toCurr] = await Promise.all([
    prisma.currency.findUnique({ where: { code: fromCurrency } }),
    prisma.currency.findUnique({ where: { code: toCurrency } }),
  ]);

  if (!fromCurr || !toCurr) {
    return null;
  }

  // Normalize date to start of day
  const normalizedDate = new Date(effectiveDate);
  normalizedDate.setHours(0, 0, 0, 0);

  const exchangeRate = await prisma.exchangeRate.upsert({
    where: {
      fromCurrencyId_toCurrencyId_effectiveDate: {
        fromCurrencyId: fromCurr.id,
        toCurrencyId: toCurr.id,
        effectiveDate: normalizedDate,
      },
    },
    update: {
      rate: new Decimal(rate),
      source,
    },
    create: {
      fromCurrencyId: fromCurr.id,
      toCurrencyId: toCurr.id,
      rate: new Decimal(rate),
      effectiveDate: normalizedDate,
      source,
    },
  });

  return {
    fromCurrency,
    toCurrency,
    rate: Number(exchangeRate.rate),
    effectiveDate: exchangeRate.effectiveDate,
    source: exchangeRate.source,
  };
}

/**
 * Fetch latest exchange rates from an external API
 * Using exchangerate.host (free, no API key required)
 */
export async function fetchLatestExchangeRates(
  baseCurrency: string = "USD"
): Promise<{ updated: number; rates: Record<string, number> }> {
  const targetCurrencies = ["USD", "KWD", "GBP", "EUR", "CHF"];
  const rates: Record<string, number> = {};
  let updated = 0;

  // Fetch rates for each target currency
  for (const target of targetCurrencies) {
    if (target === baseCurrency) continue;

    try {
      // Using frankfurter.app (free, no API key)
      const response = await fetch(
        `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${target}`
      );

      if (!response.ok) {
        console.error(`Failed to fetch ${baseCurrency}→${target} rate`);
        continue;
      }

      const data = await response.json();
      const rate = data.rates?.[target];

      if (rate) {
        rates[target] = rate;

        // Save to database (only forward rate - inverse calculated mathematically when needed)
        await setExchangeRate(baseCurrency, target, rate, new Date(), "frankfurter");

        updated += 1;
      }
    } catch (error) {
      console.error(`Error fetching ${baseCurrency}→${target} rate:`, error);
    }

    // Small delay to be nice to the API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return { updated, rates };
}
