import React, { useState, useMemo } from 'react';
import {
  BacktestResult,
  Candle,
  MarketPair,
  MarketRegime,
  RiskSettings,
  StrategyConfig,
  StrategyType,
} from '../types/trading';
import { runBacktest } from '../services/tradingEngine';
import { generateHistoricalCandles, ASSET_CATALOG } from '../services/marketData';
import { STRATEGY_PRESETS } from '../services/strategyDefaults';
import { Play, TrendingUp, BarChart2, ShieldCheck, Award } from 'lucide-react';

interface BacktestDashboardProps {
  initialConfig: StrategyConfig;
  initialRisk: RiskSettings;
  activeSymbol: MarketPair;
}

export const BacktestDashboard: React.FC<BacktestDashboardProps> = ({
  initialConfig,
  initialRisk,
  activeSymbol,
}) => {
  const [selectedStrategy, setSelectedStrategy] = useState<StrategyType>(initialConfig.type);
  const [symbol, setSymbol] = useState<MarketPair>(activeSymbol);
  const [regime, setRegime] = useState<MarketRegime>('BULL_TREND');
  const [candleCount, setCandleCount] = useState<number>(300);
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [config, setConfig] = useState<StrategyConfig>(STRATEGY_PRESETS[initialConfig.type]);
  const [risk, setRisk] = useState<RiskSettings>(initialRisk);

  // When strategy type switches, update active config preset
  const handleStrategyChange = (st: StrategyType) => {
    setSelectedStrategy(st);
    setConfig(STRATEGY_PRESETS[st]);
  };

  // Run backtest for selected settings
  const { result, candles } = useMemo(() => {
    const historical = generateHistoricalCandles(symbol, regime, candleCount, '5m');
    const res = runBacktest(historical, symbol, config, risk, initialCapital);
    return { result: res, candles: historical };
  }, [symbol, regime, candleCount, config, risk, initialCapital]);

  // Strategy Comparison Matrix (Runs all strategies on current dataset)
  const comparisonMatrix = useMemo(() => {
    const list: {
      type: StrategyType;
      name: string;
      totalReturnPercent: number;
      sharpeRatio: number;
      maxDrawdownPercent: number;
      winRate: number;
      profitFactor: number;
    }[] = [];

    const types: StrategyType[] = [
      'EMA_CROSSOVER',
      'RSI_MEAN_REVERSION',
      'MACD_MOMENTUM',
      'BOLLINGER_BREAKOUT',
      'GRID_TRADING',
    ];

    types.forEach((t) => {
      const preset = STRATEGY_PRESETS[t];
      const res = runBacktest(candles, symbol, preset, risk, initialCapital);
      list.push({
        type: t,
        name: preset.name,
        totalReturnPercent: res.totalReturnPercent,
        sharpeRatio: res.sharpeRatio,
        maxDrawdownPercent: res.maxDrawdownPercent,
        winRate: res.winRate,
        profitFactor: res.profitFactor,
      });
    });

    // Rank by Sharpe Ratio
    return list.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  }, [candles, symbol, risk, initialCapital]);

  // Equity Curve Chart Dimensions
  const curveWidth = 800;
  const curveHeight = 220;
  const padLeft = 10;
  const padRight = 60;
  const padTop = 15;
  const padBottom = 25;
  const usableWidth = curveWidth - padLeft - padRight;
  const usableHeight = curveHeight - padTop - padBottom;

  const { minEq, maxEq } = useMemo(() => {
    let min = Infinity;
    let max = -Infinity;
    result.equityCurve.forEach((pt) => {
      if (pt.equity < min) min = pt.equity;
      if (pt.equity > max) max = pt.equity;
      if (pt.benchmark < min) min = pt.benchmark;
      if (pt.benchmark > max) max = pt.benchmark;
    });
    const margin = (max - min) * 0.1 || 10;
    return { minEq: min - margin, maxEq: max + margin };
  }, [result]);

  const eqRange = maxEq - minEq || 1;

  const getCurveX = (idx: number, total: number) => {
    return padLeft + (idx / Math.max(total - 1, 1)) * usableWidth;
  };

  const getCurveY = (val: number) => {
    return padTop + (1 - (val - minEq) / eqRange) * usableHeight;
  };

  const botCurvePoints = result.equityCurve
    .map((pt, i) => `${getCurveX(i, result.equityCurve.length).toFixed(1)},${getCurveY(pt.equity).toFixed(1)}`)
    .join(' ');

  const benchCurvePoints = result.equityCurve
    .map((pt, i) => `${getCurveX(i, result.equityCurve.length).toFixed(1)},${getCurveY(pt.benchmark).toFixed(1)}`)
    .join(' ');

  return (
    <div className="flex flex-col gap-5 p-6 max-w-7xl mx-auto select-none">
      {/* Top Banner / Strategy Control Card */}
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-lg font-bold text-slate-100 tracking-tight">
              Quantitative Backtest Engine
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate algorithmic order execution, tick slippage, taker fees, and stop-loss triggers.
            </p>
          </div>

          {/* Quick Preset Asset & Regime Selectors */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            {/* Asset Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">PAIR:</span>
              <select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value as MarketPair)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer"
              >
                {Object.keys(ASSET_CATALOG).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Regime Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">REGIME:</span>
              <select
                value={regime}
                onChange={(e) => setRegime(e.target.value as MarketRegime)}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer"
              >
                <option value="BULL_TREND">Bull Trend (Momentum)</option>
                <option value="BEAR_TREND">Bear Trend (Selloff)</option>
                <option value="RANGING">Ranging (Mean Reversion)</option>
                <option value="HIGH_VOLATILITY">High Volatility (Whipsaw)</option>
                <option value="FLASH_CRASH_RECOVERY">Flash Crash & V-Recovery</option>
              </select>
            </div>

            {/* Initial Capital */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">CAPITAL:</span>
              <select
                value={initialCapital}
                onChange={(e) => setInitialCapital(Number(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none cursor-pointer"
              >
                <option value={5000}>$5,000</option>
                <option value={10000}>$10,000</option>
                <option value={25000}>$25,000</option>
                <option value={100000}>$100,000</option>
              </select>
            </div>
          </div>
        </div>

        {/* Strategy Selector Pills */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          {(
            [
              ['EMA_CROSSOVER', 'Dual EMA Crossover'],
              ['RSI_MEAN_REVERSION', 'RSI Mean Reversion'],
              ['MACD_MOMENTUM', 'MACD Momentum'],
              ['BOLLINGER_BREAKOUT', 'Bollinger Bounce'],
              ['GRID_TRADING', 'Grid Laddering'],
            ] as const
          ).map(([type, label]) => (
            <button
              key={type}
              onClick={() => handleStrategyChange(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStrategy === type
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-900/30'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Selected Strategy Description */}
        <p className="text-xs text-slate-400 mt-3 italic border-l-2 border-emerald-500/50 pl-3">
          {config.description}
        </p>
      </div>

      {/* Key Performance Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Return */}
        <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Strategy Return</span>
          <div className="mt-2">
            <span
              className={`text-xl font-extrabold font-mono tabular-nums ${
                result.totalReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {result.totalReturn >= 0 ? '+' : ''}${result.totalReturn.toLocaleString()}
            </span>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              {result.totalReturnPercent >= 0 ? '+' : ''}
              {result.totalReturnPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Buy & Hold Benchmark */}
        <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Buy & Hold Return</span>
          <div className="mt-2">
            <span
              className={`text-xl font-extrabold font-mono tabular-nums ${
                result.benchmarkReturn >= 0 ? 'text-slate-200' : 'text-rose-400'
              }`}
            >
              {result.benchmarkReturn >= 0 ? '+' : ''}${result.benchmarkReturn.toLocaleString()}
            </span>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              {result.benchmarkReturnPercent >= 0 ? '+' : ''}
              {result.benchmarkReturnPercent.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider">Sharpe Ratio</span>
            <span className="text-[9px] text-slate-500 font-mono">Rf: 4%</span>
          </div>
          <div className="mt-2">
            <span
              className={`text-xl font-extrabold font-mono tabular-nums ${
                result.sharpeRatio >= 1.5
                  ? 'text-emerald-400'
                  : result.sharpeRatio >= 1.0
                  ? 'text-amber-400'
                  : 'text-slate-200'
              }`}
            >
              {result.sharpeRatio.toFixed(2)}
            </span>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Sortino: {result.sortinoRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Max Drawdown */}
        <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Max Drawdown</span>
          <div className="mt-2">
            <span className="text-xl font-extrabold font-mono text-rose-400 tabular-nums">
              -{result.maxDrawdownPercent.toFixed(2)}%
            </span>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Circuit: {risk.maxDrawdownCircuitBreaker}%
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Win Rate</span>
          <div className="mt-2">
            <span className="text-xl font-extrabold font-mono text-slate-100 tabular-nums">
              {result.winRate.toFixed(1)}%
            </span>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              {result.winningTrades}W / {result.losingTrades}L ({result.totalTrades} total)
            </div>
          </div>
        </div>

        {/* Profit Factor */}
        <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 uppercase tracking-wider">Profit Factor</span>
          <div className="mt-2">
            <span
              className={`text-xl font-extrabold font-mono tabular-nums ${
                result.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-slate-200'
              }`}
            >
              {result.profitFactor.toFixed(2)}
            </span>
            <div className="text-[11px] font-mono text-slate-400 mt-0.5">
              Fees: ${result.totalFeesPaid.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Equity Curve Comparison Chart */}
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Equity Curve: Axiom Strategy vs Buy & Hold Benchmark
            </h3>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-400 rounded-full" />
              <span className="text-emerald-400">Bot Equity (${result.finalBalance.toLocaleString()})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-500 rounded-full" />
              <span className="text-slate-400">Buy & Hold (${result.benchmarkReturn + initialCapital})</span>
            </div>
          </div>
        </div>

        {/* SVG Curve */}
        <div className="relative w-full h-[220px] mt-2">
          <svg
            viewBox={`0 0 ${curveWidth} ${curveHeight}`}
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            {/* Horizontal Grid */}
            {[0.2, 0.5, 0.8].map((pct, i) => {
              const y = padTop + pct * usableHeight;
              const priceVal = maxEq - pct * eqRange;
              return (
                <g key={`eq-grid-${i}`}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={curveWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={curveWidth - padRight + 6}
                    y={y + 3}
                    fill="#64748b"
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                  >
                    ${priceVal.toFixed(0)}
                  </text>
                </g>
              );
            })}

            {/* Benchmark Curve */}
            <polyline
              fill="none"
              stroke="#64748b"
              strokeWidth="1.5"
              strokeDasharray="4 2"
              points={benchCurvePoints}
            />

            {/* Bot Equity Curve */}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={botCurvePoints}
            />
          </svg>
        </div>
      </div>

      {/* Side-by-Side Strategy Optimization Matrix */}
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Strategy Optimization Leaderboard ({symbol} · {regime.replace('_', ' ')})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">Ranked by Risk-Adjusted Sharpe</span>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="text-[10px] text-slate-400 bg-slate-900/60 uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Rank</th>
                <th className="py-2.5 px-3">Strategy Name</th>
                <th className="py-2.5 px-3 text-right">Total Return</th>
                <th className="py-2.5 px-3 text-right">Sharpe Ratio</th>
                <th className="py-2.5 px-3 text-right">Max Drawdown</th>
                <th className="py-2.5 px-3 text-right">Win Rate</th>
                <th className="py-2.5 px-3 text-right">Profit Factor</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {comparisonMatrix.map((item, idx) => {
                const isCurrent = selectedStrategy === item.type;
                return (
                  <tr
                    key={item.type}
                    className={`transition-colors ${
                      isCurrent ? 'bg-emerald-500/10' : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-2 px-3 font-bold text-amber-400">
                      #{idx + 1}
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-200">
                      {item.name}
                      {isCurrent && (
                        <span className="ml-2 text-[10px] text-emerald-400 font-normal">
                          (Active)
                        </span>
                      )}
                    </td>
                    <td
                      className={`py-2 px-3 text-right font-bold tabular-nums ${
                        item.totalReturnPercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {item.totalReturnPercent >= 0 ? '+' : ''}
                      {item.totalReturnPercent.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right text-slate-200 font-semibold tabular-nums">
                      {item.sharpeRatio.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-right text-rose-400 tabular-nums">
                      -{item.maxDrawdownPercent.toFixed(2)}%
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                      {item.winRate.toFixed(1)}%
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300 tabular-nums">
                      {item.profitFactor.toFixed(2)}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleStrategyChange(item.type)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                          isCurrent
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800'
                        }`}
                      >
                        {isCurrent ? 'Selected' : 'Apply'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
