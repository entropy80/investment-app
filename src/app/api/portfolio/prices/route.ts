import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  isConfigured,
  refreshPortfolioPrices,
  refreshAccountPrices,
  getLatestPrices,
} from "@/lib/prices";
import { prisma } from "@/lib/prisma";
import { demoGuard } from "@/lib/demo/demo-guard";

/**
 * GET /api/portfolio/prices
 * Get latest prices for holdings
 *
 * Query params:
 * - portfolioId: Get prices for all holdings in portfolio
 * - accountId: Get prices for all holdings in account
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const portfolioId = searchParams.get("portfolioId");
    const accountId = searchParams.get("accountId");

    if (!portfolioId && !accountId) {
      return NextResponse.json(
        { error: "portfolioId or accountId required" },
        { status: 400 }
      );
    }

    let holdingIds: string[] = [];

    if (portfolioId) {
      // Verify ownership and get holdings
      const portfolio = await prisma.portfolio.findFirst({
        where: { id: portfolioId, userId: session.user.id },
        include: {
          accounts: {
            include: {
              holdings: {
                select: { id: true },
              },
            },
          },
        },
      });

      if (!portfolio) {
        return NextResponse.json(
          { error: "Portfolio not found" },
          { status: 404 }
        );
      }

      holdingIds = portfolio.accounts.flatMap((a) =>
        a.holdings.map((h) => h.id)
      );
    } else if (accountId) {
      // Verify ownership and get holdings
      const account = await prisma.financialAccount.findFirst({
        where: { id: accountId },
        include: {
          portfolio: { select: { userId: true } },
          holdings: { select: { id: true } },
        },
      });

      if (!account || account.portfolio.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      holdingIds = account.holdings.map((h) => h.id);
    }

    const prices = await getLatestPrices(holdingIds);

    // Convert Map to object for JSON response
    const pricesObj: Record<string, { price: number; timestamp: string; source: string }> = {};
    for (const [holdingId, priceInfo] of prices) {
      pricesObj[holdingId] = {
        price: priceInfo.price,
        timestamp: priceInfo.timestamp.toISOString(),
        source: priceInfo.source,
      };
    }

    return NextResponse.json({
      success: true,
      prices: pricesObj,
      count: prices.size,
    });
  } catch (error) {
    console.error("Error getting prices:", error);
    return NextResponse.json(
      { error: "Failed to get prices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portfolio/prices
 * Refresh prices from external API
 *
 * Body:
 * - portfolioId: Refresh prices for all holdings in portfolio
 * - accountId: Refresh prices for all holdings in account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Block demo users from refreshing prices (uses external API credits)
    const demoResponse = demoGuard(session);
    if (demoResponse) return demoResponse;

    if (!isConfigured()) {
      return NextResponse.json(
        { error: "Price API not configured" },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { portfolioId, accountId } = body;

    if (!portfolioId && !accountId) {
      return NextResponse.json(
        { error: "portfolioId or accountId required" },
        { status: 400 }
      );
    }

    let result;
    let lastPriceRefresh: Date | null = null;

    if (portfolioId) {
      result = await refreshPortfolioPrices(portfolioId, session.user.id);
      // Update lastPriceRefresh timestamp
      const updated = await prisma.portfolio.update({
        where: { id: portfolioId, userId: session.user.id },
        data: { lastPriceRefresh: new Date() },
        select: { lastPriceRefresh: true },
      });
      lastPriceRefresh = updated.lastPriceRefresh;
    } else if (accountId) {
      // Verify ownership
      const account = await prisma.financialAccount.findFirst({
        where: { id: accountId },
        include: { portfolio: { select: { userId: true, id: true } } },
      });

      if (!account || account.portfolio.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Account not found" },
          { status: 404 }
        );
      }

      result = await refreshAccountPrices(accountId);
      // Update lastPriceRefresh on portfolio
      const updated = await prisma.portfolio.update({
        where: { id: account.portfolio.id },
        data: { lastPriceRefresh: new Date() },
        select: { lastPriceRefresh: true },
      });
      lastPriceRefresh = updated.lastPriceRefresh;
    }

    return NextResponse.json({
      success: true,
      updated: result?.updated || 0,
      errors: result?.errors || 0,
      skipped: result?.skipped || 0,
      lastPriceRefresh: lastPriceRefresh?.toISOString() || null,
      results: result?.results.map((r) => ({
        symbol: r.symbol,
        price: r.price,
        change: r.change,
        changePercent: r.changePercent,
        error: r.error,
      })),
    });
  } catch (error) {
    console.error("Error refreshing prices:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to refresh prices" },
      { status: 500 }
    );
  }
}
