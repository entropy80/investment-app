import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getCurrencies,
  getExchangeRatesForCurrency,
  fetchLatestExchangeRates,
  convertCurrency,
} from "@/lib/currency";

/**
 * GET /api/currency
 * Get currencies and exchange rates
 *
 * Query params:
 * - action: "list" (default) | "rates" | "convert"
 * - base: Base currency for rates (default: USD)
 * - from: Source currency for conversion
 * - to: Target currency for conversion
 * - amount: Amount to convert
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "list";

    switch (action) {
      case "list": {
        const currencies = await getCurrencies();
        return NextResponse.json({ currencies });
      }

      case "rates": {
        const base = searchParams.get("base") || "USD";
        const rates = await getExchangeRatesForCurrency(base);
        return NextResponse.json({ base, rates });
      }

      case "convert": {
        const from = searchParams.get("from");
        const to = searchParams.get("to");
        const amountStr = searchParams.get("amount");

        if (!from || !to || !amountStr) {
          return NextResponse.json(
            { error: "from, to, and amount are required" },
            { status: 400 }
          );
        }

        const amount = parseFloat(amountStr);
        if (isNaN(amount)) {
          return NextResponse.json(
            { error: "Invalid amount" },
            { status: 400 }
          );
        }

        const result = await convertCurrency(amount, from, to);
        if (!result) {
          return NextResponse.json(
            { error: "Exchange rate not found" },
            { status: 404 }
          );
        }

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error in currency API:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/currency
 * Refresh exchange rates from external API
 *
 * Body:
 * - base: Base currency (default: USD)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const base = body.base || "USD";

    const result = await fetchLatestExchangeRates(base);

    return NextResponse.json({
      success: true,
      base,
      updated: result.updated,
      rates: result.rates,
    });
  } catch (error) {
    console.error("Error refreshing exchange rates:", error);
    return NextResponse.json(
      { error: "Failed to refresh exchange rates" },
      { status: 500 }
    );
  }
}
