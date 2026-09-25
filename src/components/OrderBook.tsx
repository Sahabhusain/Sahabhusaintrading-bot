import React from 'react';
import { OrderBook } from '../types/trading';

interface OrderBookProps {
  orderBook: OrderBook;
  decimals?: number;
  onSelectPrice?: (price: number) => void;
}

export const OrderBookView: React.FC<OrderBookProps> = ({
  orderBook,
  decimals = 2,
  onSelectPrice,
}) => {
  const maxAskTotal = orderBook.asks[orderBook.asks.length - 1]?.total || 1;
  const maxBidTotal = orderBook.bids[orderBook.bids.length - 1]?.total || 1;
  const maxTotal = Math.max(maxAskTotal, maxBidTotal);

  // Reverse asks so highest ask is on top and lowest ask is just above mid-market spread
  const sortedAsks = [...orderBook.asks].reverse();

  return (
    <div className="flex flex-col h-full bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden text-xs font-mono select-none">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80 bg-[#0f1624]">
        <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
          Order Book
        </span>
        <span className="text-[10px] text-slate-500">Depth L2</span>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-3 px-3 py-1.5 text-[10px] text-slate-500 border-b border-slate-800/60 uppercase">
        <span className="text-left">Price (USD)</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      {/* Asks (Sells) */}
      <div className="flex flex-col justify-end flex-1 overflow-hidden py-1">
        {sortedAsks.map((ask, i) => {
          const depthPercent = Math.min(100, (ask.total / maxTotal) * 100);
          return (
            <div
              key={`ask-${i}`}
              onClick={() => onSelectPrice?.(ask.price)}
              className="relative grid grid-cols-3 px-3 py-0.5 hover:bg-rose-500/10 cursor-pointer text-[11px] tabular-nums transition-colors"
            >
              {/* Depth Bar Background */}
              <div
                className="absolute inset-y-0 right-0 bg-rose-500/15 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-rose-400 font-medium z-10">${ask.price.toFixed(decimals)}</span>
              <span className="text-right text-slate-300 z-10">{ask.amount.toFixed(3)}</span>
              <span className="text-right text-slate-400 z-10">{ask.total.toFixed(3)}</span>
            </div>
          );
        })}
      </div>

      {/* Mid Market Spread Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 my-0.5 bg-[#121927] border-y border-slate-800/80 text-[11px]">
        <div className="flex items-center gap-2">
          <span className="text-slate-200 font-bold tabular-nums">
            ${orderBook.midPrice.toFixed(decimals)}
          </span>
          <span className="text-[10px] text-slate-400">Mid Price</span>
        </div>
        <span className="text-[10px] text-slate-400 tabular-nums">
          Spread: ${orderBook.spread.toFixed(decimals)} ({orderBook.spreadPercent.toFixed(2)}%)
        </span>
      </div>

      {/* Bids (Buys) */}
      <div className="flex flex-col flex-1 overflow-hidden py-1">
        {orderBook.bids.map((bid, i) => {
          const depthPercent = Math.min(100, (bid.total / maxTotal) * 100);
          return (
            <div
              key={`bid-${i}`}
              onClick={() => onSelectPrice?.(bid.price)}
              className="relative grid grid-cols-3 px-3 py-0.5 hover:bg-emerald-500/10 cursor-pointer text-[11px] tabular-nums transition-colors"
            >
              {/* Depth Bar Background */}
              <div
                className="absolute inset-y-0 right-0 bg-emerald-500/15 pointer-events-none"
                style={{ width: `${depthPercent}%` }}
              />
              <span className="text-emerald-400 font-medium z-10">${bid.price.toFixed(decimals)}</span>
              <span className="text-right text-slate-300 z-10">{bid.amount.toFixed(3)}</span>
              <span className="text-right text-slate-400 z-10">{bid.total.toFixed(3)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
