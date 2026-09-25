import React from 'react';
import { RiskSettings } from '../types/trading';
import { ShieldCheck, AlertTriangle, Calculator, RefreshCw } from 'lucide-react';

interface RiskManagementPanelProps {
  riskSettings: RiskSettings;
  onUpdateRisk: (newSettings: RiskSettings) => void;
  circuitBreakerTripped: boolean;
  onResetCircuitBreaker: () => void;
}

export const RiskManagementPanel: React.FC<RiskManagementPanelProps> = ({
  riskSettings,
  onUpdateRisk,
  circuitBreakerTripped,
  onResetCircuitBreaker,
}) => {
  // Kelly Criterion formula calculation for educational and sizing reference:
  // f* = (p * (b + 1) - 1) / b, assuming win rate p=0.55, win/loss ratio b=1.8
  const winRate = 0.55;
  const winLossRatio = 1.8;
  const kellyFraction = Math.max(0, ((winRate * (winLossRatio + 1) - 1) / winLossRatio) * 100);
  const halfKelly = kellyFraction / 2;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto select-none">
      {/* Circuit Breaker Banner */}
      {circuitBreakerTripped && (
        <div className="flex items-center justify-between p-4 bg-rose-950/70 border border-rose-800 rounded-xl text-rose-200">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <h4 className="font-bold text-sm">Circuit Breaker Tripped!</h4>
              <p className="text-xs text-rose-300/80">
                Portfolio drawdown reached the maximum safety threshold ({riskSettings.maxDrawdownCircuitBreaker}%). All new automated buy orders are temporarily halted to preserve capital.
              </p>
            </div>
          </div>
          <button
            onClick={onResetCircuitBreaker}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-900 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold transition-colors shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Breaker</span>
          </button>
        </div>
      )}

      {/* Main Risk Architecture */}
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Risk Management & Execution Controls
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Enforce capital preservation, position limits, dynamic stops, and catastrophic drawdown circuit breakers.
            </p>
          </div>
        </div>

        {/* Controls Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-5 font-mono text-xs">
          {/* Max Position Size */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold uppercase text-[11px]">
                Max Position Sizing
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">
                {riskSettings.maxPositionSizePercent}% of Cash
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={riskSettings.maxPositionSizePercent}
              onChange={(e) =>
                onUpdateRisk({
                  ...riskSettings,
                  maxPositionSizePercent: Number(e.target.value),
                })
              }
              className="w-full mt-3 accent-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Maximum cash allocation deployed per single trade order.
            </p>
          </div>

          {/* Hard Stop Loss */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold uppercase text-[11px]">
                Hard Stop-Loss
              </span>
              <span className="text-rose-400 font-bold tabular-nums">
                -{riskSettings.stopLossPercent}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="10"
              step="0.5"
              value={riskSettings.stopLossPercent}
              onChange={(e) =>
                onUpdateRisk({
                  ...riskSettings,
                  stopLossPercent: Number(e.target.value),
                })
              }
              className="w-full mt-3 accent-rose-500"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Automated stop-market sell triggered if position drops below entry.
            </p>
          </div>

          {/* Take Profit Target */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold uppercase text-[11px]">
                Take-Profit Target
              </span>
              <span className="text-emerald-400 font-bold tabular-nums">
                +{riskSettings.takeProfitPercent}%
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="20.0"
              step="0.5"
              value={riskSettings.takeProfitPercent}
              onChange={(e) =>
                onUpdateRisk({
                  ...riskSettings,
                  takeProfitPercent: Number(e.target.value),
                })
              }
              className="w-full mt-3 accent-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Pre-calculated limit exit to secure realized profit upon reaching upside goal.
            </p>
          </div>

          {/* Trailing Stop */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold uppercase text-[11px]">
                Trailing Stop-Loss
              </span>
              <span className="text-amber-400 font-bold tabular-nums">
                {riskSettings.trailingStopPercent}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={riskSettings.trailingStopPercent}
              onChange={(e) =>
                onUpdateRisk({
                  ...riskSettings,
                  trailingStopPercent: Number(e.target.value),
                })
              }
              className="w-full mt-3 accent-amber-500"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Trails behind highest price achieved to lock in running gains.
            </p>
          </div>

          {/* Circuit Breaker Max Drawdown */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold uppercase text-[11px]">
                Circuit Breaker Drawdown
              </span>
              <span className="text-rose-400 font-bold tabular-nums">
                {riskSettings.maxDrawdownCircuitBreaker}%
              </span>
            </div>
            <input
              type="range"
              min="5.0"
              max="30.0"
              step="1.0"
              value={riskSettings.maxDrawdownCircuitBreaker}
              onChange={(e) =>
                onUpdateRisk({
                  ...riskSettings,
                  maxDrawdownCircuitBreaker: Number(e.target.value),
                })
              }
              className="w-full mt-3 accent-rose-500"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Immediately halts trading if cumulative portfolio equity falls by this percentage.
            </p>
          </div>

          {/* Slippage & Friction */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center">
              <span className="text-slate-300 font-semibold uppercase text-[11px]">
                Simulated Slippage & Taker Fee
              </span>
              <span className="text-slate-300 font-bold tabular-nums">
                {riskSettings.slippageBps} bps / {riskSettings.takerFeeBps} bps
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div>
                <span className="text-[10px] text-slate-500">Slippage (bps)</span>
                <input
                  type="number"
                  value={riskSettings.slippageBps}
                  onChange={(e) =>
                    onUpdateRisk({
                      ...riskSettings,
                      slippageBps: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 mt-1 text-slate-200 outline-none"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Taker Fee (bps)</span>
                <input
                  type="number"
                  value={riskSettings.takerFeeBps}
                  onChange={(e) =>
                    onUpdateRisk({
                      ...riskSettings,
                      takerFeeBps: Number(e.target.value),
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 mt-1 text-slate-200 outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quantitative Sizing Model (Kelly Criterion) */}
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Quantitative Kelly Criterion Reference
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 font-mono text-xs">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 text-[11px]">Full Kelly Fraction</span>
            <div className="text-lg font-bold text-slate-200 mt-1 tabular-nums">
              {kellyFraction.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Theoretical maximum growth rate</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 text-[11px]">Half Kelly (Recommended)</span>
            <div className="text-lg font-bold text-emerald-400 mt-1 tabular-nums">
              {halfKelly.toFixed(1)}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Institutional standard for drawdown mitigation</p>
          </div>

          <div className="p-3 bg-slate-900/50 rounded-lg border border-slate-800/80">
            <span className="text-slate-400 text-[11px]">Active Allocation Setting</span>
            <div className="text-lg font-bold text-cyan-400 mt-1 tabular-nums">
              {riskSettings.maxPositionSizePercent}%
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Current automated trade sizing</p>
          </div>
        </div>
      </div>
    </div>
  );
};
