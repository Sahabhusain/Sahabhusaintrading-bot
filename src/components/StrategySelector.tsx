import React from 'react';
import { StrategyConfig, StrategyType } from '../types/trading';
import { STRATEGY_PRESETS } from '../services/strategyDefaults';
import { Cpu, CheckCircle2 } from 'lucide-react';

interface StrategySelectorProps {
  currentConfig: StrategyConfig;
  onUpdateConfig: (newConfig: StrategyConfig) => void;
}

export const StrategySelector: React.FC<StrategySelectorProps> = ({
  currentConfig,
  onUpdateConfig,
}) => {
  const handleSelectType = (type: StrategyType) => {
    onUpdateConfig(STRATEGY_PRESETS[type]);
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto select-none">
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800/80">
          <Cpu className="w-5 h-5 text-emerald-400" />
          <div>
            <h2 className="text-lg font-bold text-slate-100">
              Algorithmic Strategy Architecture
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Select and calibrate quantitative mathematical triggers governing the automated bot execution loop.
            </p>
          </div>
        </div>

        {/* Strategy Selection Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {(Object.keys(STRATEGY_PRESETS) as StrategyType[]).map((type) => {
            const preset = STRATEGY_PRESETS[type];
            const isSelected = currentConfig.type === type;

            return (
              <div
                key={type}
                onClick={() => handleSelectType(type)}
                className={`relative flex flex-col justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-[#121b2d] border-emerald-500/80 shadow-lg shadow-emerald-950/30 ring-1 ring-emerald-500/40'
                    : 'bg-[#0f1420] border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-100">{preset.name}</h3>
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                    {preset.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] font-mono">
                  <span className="text-slate-500">ENGINE</span>
                  <span className="text-slate-300 font-semibold">{type}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Parameter Calibration Panel */}
      <div className="bg-[#0d121c] border border-slate-800/80 rounded-xl p-5 shadow-lg">
        <h3 className="text-sm font-bold text-slate-100 pb-3 border-b border-slate-800/80">
          Parameter Fine-Tuning: {currentConfig.name}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4 text-xs font-mono">
          {currentConfig.type === 'EMA_CROSSOVER' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 uppercase">Fast EMA Period</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="3"
                    max="25"
                    value={currentConfig.ema.fastPeriod}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        ema: { ...currentConfig.ema, fastPeriod: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-emerald-400 tabular-nums">
                    {currentConfig.ema.fastPeriod}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Short-term trend detector (standard: 9)</p>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase">Slow EMA Period</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="15"
                    max="60"
                    value={currentConfig.ema.slowPeriod}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        ema: { ...currentConfig.ema, slowPeriod: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-cyan-400 tabular-nums">
                    {currentConfig.ema.slowPeriod}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Baseline regime trend filter (standard: 21)</p>
              </div>
            </>
          )}

          {currentConfig.type === 'RSI_MEAN_REVERSION' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 uppercase">RSI Period</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={currentConfig.rsi.period}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        rsi: { ...currentConfig.rsi, period: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-slate-200 tabular-nums">
                    {currentConfig.rsi.period}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase">Oversold Trigger (Buy)</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="15"
                    max="45"
                    value={currentConfig.rsi.oversoldThreshold}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        rsi: { ...currentConfig.rsi, oversoldThreshold: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-emerald-400 tabular-nums">
                    {currentConfig.rsi.oversoldThreshold}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase">Overbought Trigger (Sell)</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="55"
                    max="85"
                    value={currentConfig.rsi.overboughtThreshold}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        rsi: { ...currentConfig.rsi, overboughtThreshold: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-rose-400 tabular-nums">
                    {currentConfig.rsi.overboughtThreshold}
                  </span>
                </div>
              </div>
            </>
          )}

          {currentConfig.type === 'BOLLINGER_BREAKOUT' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 uppercase">SMA Lookback Period</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="10"
                    max="50"
                    value={currentConfig.bollinger.period}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        bollinger: { ...currentConfig.bollinger, period: Number(e.target.value) },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-slate-200 tabular-nums">
                    {currentConfig.bollinger.period}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase">Std Deviation Multiplier</label>
                <div className="flex items-center gap-3 mt-1.5">
                  <input
                    type="range"
                    min="1.0"
                    max="3.5"
                    step="0.1"
                    value={currentConfig.bollinger.stdDevMultiplier}
                    onChange={(e) =>
                      onUpdateConfig({
                        ...currentConfig,
                        bollinger: {
                          ...currentConfig.bollinger,
                          stdDevMultiplier: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full accent-emerald-500"
                  />
                  <span className="w-8 text-right font-bold text-sky-400 tabular-nums">
                    {currentConfig.bollinger.stdDevMultiplier}x
                  </span>
                </div>
              </div>
            </>
          )}

          {currentConfig.type === 'GRID_TRADING' && (
            <>
              <div>
                <label className="text-[11px] text-slate-400 uppercase">Upper Boundary Price</label>
                <input
                  type="number"
                  value={currentConfig.grid.upperPrice}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...currentConfig,
                      grid: { ...currentConfig.grid, upperPrice: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 mt-1 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase">Lower Boundary Price</label>
                <input
                  type="number"
                  value={currentConfig.grid.lowerPrice}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...currentConfig,
                      grid: { ...currentConfig.grid, lowerPrice: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 mt-1 text-slate-100 outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 uppercase">Grid Step Count</label>
                <input
                  type="number"
                  min="4"
                  max="20"
                  value={currentConfig.grid.grids}
                  onChange={(e) =>
                    onUpdateConfig({
                      ...currentConfig,
                      grid: { ...currentConfig.grid, grids: Number(e.target.value) },
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 mt-1 text-slate-100 outline-none"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
