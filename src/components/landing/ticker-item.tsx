/**
 * TickerItem Component
 * Displays a single stock/crypto with symbol, price, and change
 * LED glow effect on price changes
 */

import { cn } from "@/lib/utils";

interface TickerItemProps {
  symbol: string;
  price: number;
  changePercent: number;
}

export function TickerItem({ symbol, price, changePercent }: TickerItemProps) {
  const isPositive = changePercent >= 0;
  const arrow = isPositive ? "▲" : "▼";
  const sign = isPositive ? "+" : "";

  // Format price based on magnitude
  const formattedPrice = price >= 1000
    ? price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : price.toFixed(2);

  return (
    <span className="inline-flex items-center gap-2 px-4">
      <span className="font-bold text-white font-mono">{symbol}</span>
      <span className="text-zinc-400 font-mono">${formattedPrice}</span>
      <span
        className={cn(
          "font-mono text-sm",
          isPositive ? "text-green-500 ticker-led-glow-green" : "text-red-500 ticker-led-glow-red"
        )}
      >
        {arrow}{sign}{changePercent.toFixed(2)}%
      </span>
    </span>
  );
}
