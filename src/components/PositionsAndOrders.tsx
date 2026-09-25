import React, { useState } from 'react';
import { Position, Trade } from '../types/trading';
import { Download, XCircle, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface PositionsAndOrdersProps {
  positions: Position[];
  trades: Trade[];
  onClosePosition: (positionId: string) => void;
  decimals?: number;
}

export const PositionsAndOrders: React.FC<PositionsAndOrdersProps> = ({
  positions,
  trades,
  onClosePosition,
  decimals = 2,
}) => {
  const [activeTab, setActiveTab] = useState<'POSITIONS' | 'HISTORY'>('POSITIONS');
  const [filterSide, setFilterSide] = useState<'ALL' | 'BUY' | 'SELL'>('ALL');

  const filteredTrades = trades.filter((t) => {
    if (filterSide === 'ALL') return true;
    return t.side === filterSide;
  });

  const handleExportCSV = () => {
    if (trades.length === 0) return;
    const headers = [
      'Timestamp',
      'Date',
      'Symbol',
      'Side',
      'Action',
      'OrderType',
      'Price',
      'Size',
      'Value',
      'Fee',
      'RealizedPnL',
      'RealizedPnLPercent',
      'Reason',
    ];

    const rows = trades.map((t) => [
      t.timestamp,
      new Date(t.timestamp).toISOString(),
      t.symbol,
      t.side,
      t.action,
      t.orderType,
      t.price,
      t.size,
      t.value,
      t.fee,
      t.realizedPnl ?? 0,
      t.realizedPnlPercent ?? 0,
      `"${t.reason.replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `axiom_trades_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden select-none">
      {/* Header Tabs */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-[#0f1624]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('POSITIONS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'POSITIONS'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Open Positions ({positions.length})
          </button>
          <button
            onClick={() => setActiveTab('HISTORY')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'HISTORY'
                ? 'bg-slate-800 text-slate-100'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Trade Execution Log ({trades.length})
          </button>
        </div>

        {activeTab === 'HISTORY' && (
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-[11px]">
              {(['ALL', 'BUY', 'SELL'] as const).map((side) => (
                <button
                  key={side}
                  onClick={() => setFilterSide(side)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    filterSide === side
                      ? 'bg-slate-800 text-slate-200 font-medium'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {side}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              title="Export CSV"
              className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-md text-[11px] text-slate-300 transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Export</span>
            </button>
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'POSITIONS' ? (
          positions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
              <Clock className="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
              <p className="text-xs font-medium text-slate-400">No Open Positions</p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                The trading bot or manual order form will list active positions here once filled.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 bg-slate-900/60 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3 text-right">Entry Price</th>
                  <th className="py-2 px-3 text-right">Mark Price</th>
                  <th className="py-2 px-3 text-right">Size</th>
                  <th className="py-2 px-3 text-right">Position Value</th>
                  <th className="py-2 px-3 text-right">Unrealized PnL</th>
                  <th className="py-2 px-3 text-right">Stop Loss / TP</th>
                  <th className="py-2 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {positions.map((pos) => {
                  const isProfit = pos.unrealizedPnl >= 0;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 font-bold text-slate-200">{pos.symbol}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            pos.type === 'LONG' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {pos.type}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                        ${pos.entryPrice.toFixed(decimals)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-200 tabular-nums font-semibold">
                        ${pos.currentPrice.toFixed(decimals)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                        {pos.size.toFixed(4)}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                        ${pos.currentValue.toFixed(2)}
                      </td>
                      <td
                        className={`py-2 px-3 text-right font-bold tabular-nums ${
                          isProfit ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isProfit ? '+' : ''}${pos.unrealizedPnl.toFixed(2)} (
                        {isProfit ? '+' : ''}
                        {pos.unrealizedPnlPercent.toFixed(2)}%)
                      </td>
                      <td className="py-2 px-3 text-right text-slate-400 tabular-nums text-[11px]">
                        SL: ${pos.stopLoss?.toFixed(decimals) || '—'} / TP: $
                        {pos.takeProfit?.toFixed(decimals) || '—'}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <button
                          onClick={() => onClosePosition(pos.id)}
                          className="px-2 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded text-[11px] font-medium transition-colors"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : (
          filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
              <Clock className="w-8 h-8 stroke-[1.5] mb-2 text-slate-600" />
              <p className="text-xs font-medium text-slate-400">No Executed Orders Yet</p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-0.5">
                Completed market orders, stop-losses, and algorithmic strategy fills appear here.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 bg-slate-900/60 uppercase border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Symbol</th>
                  <th className="py-2 px-3">Side</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3 text-right">Exec Price</th>
                  <th className="py-2 px-3 text-right">Size</th>
                  <th className="py-2 px-3 text-right">Value</th>
                  <th className="py-2 px-3 text-right">Fee</th>
                  <th className="py-2 px-3 text-right">Realized PnL</th>
                  <th className="py-2 px-3">Trigger / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTrades
                  .slice()
                  .reverse()
                  .map((t) => {
                    const isBuy = t.side === 'BUY';
                    const hasPnl = t.realizedPnl !== undefined;
                    const isProfit = (t.realizedPnl ?? 0) >= 0;

                    return (
                      <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 px-3 text-slate-500 text-[11px] tabular-nums">
                          {new Date(t.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-200">{t.symbol}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`font-bold flex items-center gap-0.5 ${
                              isBuy ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {isBuy ? (
                              <ArrowUpRight className="w-3.5 h-3.5" />
                            ) : (
                              <ArrowDownRight className="w-3.5 h-3.5" />
                            )}
                            {t.side}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{t.orderType}</td>
                        <td className="py-2 px-3 text-right text-slate-200 tabular-nums font-semibold">
                          ${t.price.toFixed(decimals)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                          {t.size.toFixed(4)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                          ${t.value.toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right text-slate-500 tabular-nums text-[11px]">
                          ${t.fee.toFixed(3)}
                        </td>
                        <td
                          className={`py-2 px-3 text-right font-bold tabular-nums ${
                            hasPnl
                              ? isProfit
                                ? 'text-emerald-400'
                                : 'text-rose-400'
                              : 'text-slate-500'
                          }`}
                        >
                          {hasPnl
                            ? `${isProfit ? '+' : ''}$${t.realizedPnl!.toFixed(2)} (${
                                isProfit ? '+' : ''
                              }${t.realizedPnlPercent!.toFixed(2)}%)`
                            : '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px] max-w-xs truncate" title={t.reason}>
                          {t.reason}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
};
