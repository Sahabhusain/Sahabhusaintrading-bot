import React, { useState, useEffect } from 'react';
import { MarketPair, OrderSide, OrderType } from '../types/trading';
import { ASSET_CATALOG } from '../services/marketData';

interface ManualOrderFormProps {
  symbol: MarketPair;
  currentPrice: number;
  cashBalance: number;
  holdings: number;
  prefilledPrice?: number | null;
  onExecuteOrder: (params: {
    symbol: MarketPair;
    side: OrderSide;
    orderType: OrderType;
    price: number;
    size: number;
  }) => void;
}

export const ManualOrderForm: React.FC<ManualOrderFormProps> = ({
  symbol,
  currentPrice,
  cashBalance,
  holdings,
  prefilledPrice,
  onExecuteOrder,
}) => {
  const meta = ASSET_CATALOG[symbol];
  const [side, setSide] = useState<OrderSide>('BUY');
  const [orderType, setOrderType] = useState<OrderType>('MARKET');
  const [limitPrice, setLimitPrice] = useState<string>(currentPrice.toString());
  const [amount, setAmount] = useState<string>('');

  useEffect(() => {
    if (prefilledPrice) {
      setLimitPrice(prefilledPrice.toString());
      setOrderType('LIMIT');
    }
  }, [prefilledPrice]);

  const effPrice = orderType === 'MARKET' ? currentPrice : parseFloat(limitPrice) || currentPrice;
  const numAmount = parseFloat(amount) || 0;
  const totalValue = numAmount * effPrice;
  const feeEstimate = totalValue * 0.0005; // 5 bps

  const maxBuyAmount = effPrice > 0 ? (cashBalance * 0.999) / effPrice : 0;
  const maxSellAmount = holdings;

  const handlePercentageClick = (percent: number) => {
    if (side === 'BUY') {
      const targetSize = (maxBuyAmount * (percent / 100));
      setAmount(targetSize > 0 ? targetSize.toFixed(4) : '0');
    } else {
      const targetSize = maxSellAmount * (percent / 100);
      setAmount(targetSize > 0 ? targetSize.toFixed(4) : '0');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numAmount <= 0) return;
    if (side === 'BUY' && totalValue > cashBalance) return;
    if (side === 'SELL' && numAmount > holdings) return;

    onExecuteOrder({
      symbol,
      side,
      orderType,
      price: effPrice,
      size: numAmount,
    });

    setAmount('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden p-4 select-none">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <span className="text-xs font-semibold text-slate-200 tracking-wider uppercase">
          Manual Paper Execution
        </span>
        <span className="text-[11px] text-slate-400 font-mono">0.05% Taker Fee</span>
      </div>

      {/* Side Selector (Buy / Sell) */}
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button
          type="button"
          onClick={() => setSide('BUY')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
            side === 'BUY'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          BUY / LONG
        </button>
        <button
          type="button"
          onClick={() => setSide('SELL')}
          className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
            side === 'SELL'
              ? 'bg-rose-500 text-white shadow-md shadow-rose-900/30'
              : 'bg-slate-900 text-slate-400 hover:text-slate-200'
          }`}
        >
          SELL / SHORT
        </button>
      </div>

      {/* Order Type Toggle */}
      <div className="flex items-center gap-2 mt-3 text-xs">
        <button
          type="button"
          onClick={() => setOrderType('MARKET')}
          className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
            orderType === 'MARKET' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Market
        </button>
        <button
          type="button"
          onClick={() => setOrderType('LIMIT')}
          className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
            orderType === 'LIMIT' ? 'bg-slate-800 text-slate-100 font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          Limit
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3 mt-3 font-mono text-xs">
        {/* Limit Price Input if Limit Order */}
        {orderType === 'LIMIT' && (
          <div>
            <label className="text-[10px] text-slate-500 uppercase">Limit Price</label>
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg mt-1 focus-within:border-slate-600">
              <input
                type="number"
                step="any"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                className="w-full bg-transparent text-slate-100 outline-none tabular-nums"
                placeholder={currentPrice.toString()}
              />
              <span className="text-slate-500 text-[11px]">USD</span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div>
          <div className="flex justify-between text-[10px] text-slate-500 uppercase">
            <span>Size</span>
            <span>
              Avail:{' '}
              {side === 'BUY'
                ? `$${cashBalance.toFixed(2)}`
                : `${holdings.toFixed(4)} ${symbol.split('/')[0]}`}
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg mt-1 focus-within:border-slate-600">
            <input
              type="number"
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-transparent text-slate-100 outline-none tabular-nums"
              placeholder="0.00"
            />
            <span className="text-slate-500 text-[11px]">{symbol.split('/')[0]}</span>
          </div>
        </div>

        {/* Sizing Percentages */}
        <div className="grid grid-cols-4 gap-1.5 text-[10px]">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => handlePercentageClick(pct)}
              className="py-1 bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 rounded text-slate-400 hover:text-slate-200 transition-colors"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Order Details Breakdown */}
        <div className="p-2.5 bg-slate-900/40 rounded-lg border border-slate-800/60 space-y-1.5 text-[11px]">
          <div className="flex justify-between text-slate-400">
            <span>Order Value</span>
            <span className="text-slate-200 tabular-nums">${totalValue.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Estimated Fee</span>
            <span className="text-slate-300 tabular-nums">${feeEstimate.toFixed(3)}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>Est. Execution</span>
            <span className="text-slate-300 tabular-nums">${effPrice.toFixed(meta.decimals)}</span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={numAmount <= 0 || (side === 'BUY' && totalValue > cashBalance) || (side === 'SELL' && numAmount > holdings)}
          className={`w-full py-2.5 rounded-lg text-xs font-bold transition-all mt-1 ${
            side === 'BUY'
              ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:bg-slate-800 disabled:text-slate-600'
              : 'bg-rose-500 hover:bg-rose-400 text-white disabled:bg-slate-800 disabled:text-slate-600'
          }`}
        >
          {side === 'BUY'
            ? `Buy ${symbol.split('/')[0]}`
            : `Sell ${symbol.split('/')[0]}`}
        </button>
      </form>
    </div>
  );
};
