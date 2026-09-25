import React from 'react';
import { Play, Pause, FastForward, ShieldAlert } from 'lucide-react';

export type ActiveTab = 'TERMINAL' | 'BACKTEST' | 'STRATEGY' | 'RISK' | 'LOGS';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isBotRunning: boolean;
  onToggleBot: () => void;
  simulationSpeed: number;
  onChangeSpeed: (speed: number) => void;
  cashBalance: number;
  totalEquity: number;
  circuitBreakerTripped: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  onSelectTab,
  isBotRunning,
  onToggleBot,
  simulationSpeed,
  onChangeSpeed,
  cashBalance,
  totalEquity,
  circuitBreakerTripped,
}) => {
  const pnlFromInitial = totalEquity - 10000;
  const pnlPercent = (pnlFromInitial / 10000) * 100;

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-slate-800/80 bg-[#0b0e14] sticky top-0 z-30 select-none">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3">
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('TERMINAL');
          }}
          className="text-base font-extrabold tracking-wider text-slate-100 uppercase"
        >
          AXIOM<span className="text-emerald-400">QUANT</span>
        </a>

        {/* Live Bot Execution Status Indicator */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-800 text-xs">
          <span
            className={`w-2 h-2 rounded-full ${
              circuitBreakerTripped
                ? 'bg-rose-500 animate-ping'
                : isBotRunning
                ? 'bg-emerald-400 animate-pulse'
                : 'bg-slate-600'
            }`}
          />
          <span className="text-slate-400 font-mono text-[11px]">
            {circuitBreakerTripped
              ? 'CIRCUIT TRIPPED'
              : isBotRunning
              ? 'BOT ACTIVE'
              : 'BOT IDLE'}
          </span>
        </div>
      </div>

      {/* Zone 2: Clean 4–6 text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-400">
        <button
          onClick={() => onSelectTab('TERMINAL')}
          className={`transition-colors hover:text-slate-200 ${
            activeTab === 'TERMINAL' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-1 -mb-1' : ''
          }`}
        >
          Terminal
        </button>
        <button
          onClick={() => onSelectTab('BACKTEST')}
          className={`transition-colors hover:text-slate-200 ${
            activeTab === 'BACKTEST' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-1 -mb-1' : ''
          }`}
        >
          Backtesting
        </button>
        <button
          onClick={() => onSelectTab('STRATEGY')}
          className={`transition-colors hover:text-slate-200 ${
            activeTab === 'STRATEGY' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-1 -mb-1' : ''
          }`}
        >
          Strategy
        </button>
        <button
          onClick={() => onSelectTab('RISK')}
          className={`transition-colors hover:text-slate-200 ${
            activeTab === 'RISK' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-1 -mb-1' : ''
          }`}
        >
          Risk Controls
        </button>
        <button
          onClick={() => onSelectTab('LOGS')}
          className={`transition-colors hover:text-slate-200 ${
            activeTab === 'LOGS' ? 'text-emerald-400 font-semibold border-b-2 border-emerald-400 pb-1 -mb-1' : ''
          }`}
        >
          Audit Logs
        </button>
      </nav>

      {/* Zone 3: 1-2 primary actions */}
      <div className="flex items-center gap-3">
        {/* Account Balance Snapshot */}
        <div className="hidden sm:flex flex-col text-right font-mono pr-2">
          <span className="text-[10px] text-slate-500 uppercase">Virtual Equity</span>
          <div className="flex items-center gap-1.5 text-xs font-semibold tabular-nums">
            <span className="text-slate-100">${totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={`text-[11px] ${pnlFromInitial >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({pnlPercent >= 0 ? '+' : ''}{pnlPercent.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs font-mono">
          {[1, 2, 5, 10].map((s) => (
            <button
              key={s}
              onClick={() => onChangeSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                simulationSpeed === s
                  ? 'bg-slate-800 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Bot Activation Button */}
        <button
          onClick={onToggleBot}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
            circuitBreakerTripped
              ? 'bg-rose-950 text-rose-300 border border-rose-800/80 cursor-not-allowed'
              : isBotRunning
              ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-900/20'
              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-lg shadow-emerald-900/20'
          }`}
          disabled={circuitBreakerTripped}
        >
          {circuitBreakerTripped ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>Halted</span>
            </>
          ) : isBotRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              <span>Pause Bot</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Deploy Bot</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};
