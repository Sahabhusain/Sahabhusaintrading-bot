import React, { useState, useRef, useMemo } from 'react';
import { Candle, Trade } from '../types/trading';
import { calculateBollingerBands, calculateEMA, calculateMACD, calculateRSI } from '../services/indicators';
import { ZoomIn, ZoomOut, RotateCcw, Activity, Layers } from 'lucide-react';

interface CandlestickChartProps {
  candles: Candle[];
  trades?: Trade[];
  symbol: string;
  decimals?: number;
  fastEmaPeriod?: number;
  slowEmaPeriod?: number;
  showEma?: boolean;
  showBollinger?: boolean;
  activeIndicator?: 'RSI' | 'MACD' | 'NONE';
  onToggleIndicator?: (type: 'RSI' | 'MACD' | 'NONE') => void;
}

export const CandlestickChart: React.FC<CandlestickChartProps> = ({
  candles,
  trades = [],
  symbol,
  decimals = 2,
  fastEmaPeriod = 9,
  slowEmaPeriod = 21,
  showEma = true,
  showBollinger = false,
  activeIndicator = 'RSI',
  onToggleIndicator,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(75); // number of visible candles
  const [scrollOffset, setScrollOffset] = useState<number>(0); // offset from latest

  // Calculations for visible candles slice
  const totalCandles = candles.length;
  const visibleCount = Math.min(zoomLevel, totalCandles);
  const startIndex = Math.max(0, totalCandles - visibleCount - scrollOffset);
  const endIndex = Math.min(totalCandles, startIndex + visibleCount);
  const visibleCandles = useMemo(
    () => candles.slice(startIndex, endIndex),
    [candles, startIndex, endIndex]
  );

  // Indicators calculated over full series then sliced
  const emaFastFull = useMemo(() => calculateEMA(candles, fastEmaPeriod), [candles, fastEmaPeriod]);
  const emaSlowFull = useMemo(() => calculateEMA(candles, slowEmaPeriod), [candles, slowEmaPeriod]);
  const bbFull = useMemo(() => calculateBollingerBands(candles, 20, 2), [candles]);
  const rsiFull = useMemo(() => calculateRSI(candles, 14), [candles]);
  const macdFull = useMemo(() => calculateMACD(candles, 12, 26, 9), [candles]);

  const emaFast = useMemo(() => emaFastFull.slice(startIndex, endIndex), [emaFastFull, startIndex, endIndex]);
  const emaSlow = useMemo(() => emaSlowFull.slice(startIndex, endIndex), [emaSlowFull, startIndex, endIndex]);
  const bb = useMemo(() => bbFull.slice(startIndex, endIndex), [bbFull, startIndex, endIndex]);
  const rsi = useMemo(() => rsiFull.slice(startIndex, endIndex), [rsiFull, startIndex, endIndex]);
  const macd = useMemo(() => macdFull.slice(startIndex, endIndex), [macdFull, startIndex, endIndex]);

  // Chart dimensions
  const width = 1000;
  const mainHeight = activeIndicator === 'NONE' ? 440 : 320;
  const subHeight = activeIndicator === 'NONE' ? 0 : 120;
  const totalHeight = mainHeight + subHeight;
  const paddingRight = 70;
  const paddingLeft = 10;
  const paddingTop = 20;
  const paddingBottom = 24;

  const chartWidth = width - paddingLeft - paddingRight;

  // Price range calculation for main pane
  const { minPrice, maxPrice, maxVolume } = useMemo(() => {
    if (visibleCandles.length === 0) {
      return { minPrice: 0, maxPrice: 100, maxVolume: 100 };
    }
    let min = Infinity;
    let max = -Infinity;
    let maxVol = 0;

    visibleCandles.forEach((c, i) => {
      if (c.low < min) min = c.low;
      if (c.high > max) max = c.high;
      if (c.volume > maxVol) maxVol = c.volume;

      if (showBollinger && bb[i]) {
        if (bb[i]!.lower < min) min = bb[i]!.lower;
        if (bb[i]!.upper > max) max = bb[i]!.upper;
      }
    });

    const margin = (max - min) * 0.08 || 1;
    return {
      minPrice: min - margin,
      maxPrice: max + margin,
      maxVolume: maxVol || 1,
    };
  }, [visibleCandles, bb, showBollinger]);

  const priceRange = maxPrice - minPrice || 1;
  const candleSlotWidth = chartWidth / Math.max(visibleCandles.length, 1);
  const candleBodyWidth = Math.max(1, Math.min(candleSlotWidth * 0.72, 14));

  const getYForPrice = (price: number) => {
    return paddingTop + (1 - (price - minPrice) / priceRange) * (mainHeight - paddingTop - paddingBottom);
  };

  const getXForIndex = (index: number) => {
    return paddingLeft + index * candleSlotWidth + candleSlotWidth / 2;
  };

  // Hover candle
  const hoveredCandle = hoverIndex !== null && visibleCandles[hoverIndex] ? visibleCandles[hoverIndex] : null;
  const hoveredGlobalIndex = hoverIndex !== null ? startIndex + hoverIndex : null;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const relativeX = (mouseX / rect.width) * width;
    const chartX = relativeX - paddingLeft;

    if (chartX >= 0 && chartX <= chartWidth) {
      const idx = Math.floor(chartX / candleSlotWidth);
      if (idx >= 0 && idx < visibleCandles.length) {
        setHoverIndex(idx);
      }
    } else {
      setHoverIndex(null);
    }
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  // Helper for generating smooth SVG polyline points
  const generateLinePoints = (values: (number | undefined)[], getY: (val: number) => number) => {
    return values
      .map((val, idx) => {
        if (val === undefined) return null;
        return `${getXForIndex(idx).toFixed(1)},${getY(val).toFixed(1)}`;
      })
      .filter(Boolean)
      .join(' ');
  };

  // Grid horizontal price ticks
  const priceTicks = useMemo(() => {
    const ticks = 5;
    const arr: number[] = [];
    const step = priceRange / ticks;
    for (let i = 0; i <= ticks; i++) {
      arr.push(minPrice + i * step);
    }
    return arr;
  }, [minPrice, priceRange]);

  // Trades inside visible range
  const visibleTrades = useMemo(() => {
    if (visibleCandles.length === 0) return [];
    const minTime = visibleCandles[0].time;
    const maxTime = visibleCandles[visibleCandles.length - 1].time;

    return trades.filter((t) => t.timestamp >= minTime && t.timestamp <= maxTime);
  }, [trades, visibleCandles]);

  // Find candle index for a given timestamp
  const getIndexForTimestamp = (time: number) => {
    let closestIdx = 0;
    let minDiff = Infinity;
    visibleCandles.forEach((c, i) => {
      const diff = Math.abs(c.time - time);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });
    return closestIdx;
  };

  return (
    <div className="flex flex-col h-full bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden select-none">
      {/* Chart Header Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-2.5 border-b border-slate-800/80 bg-[#0f1624]">
        {/* Left: Active asset stats & interactive hover stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-100 text-sm tracking-wide">{symbol}</span>
            <span className="text-slate-400">5M</span>
          </div>

          {hoveredCandle ? (
            <div className="hidden sm:flex items-center gap-3 text-slate-300">
              <span>
                <span className="text-slate-500 mr-1">O</span>
                <span className="text-slate-200 tabular-nums">${hoveredCandle.open.toFixed(decimals)}</span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">H</span>
                <span className="text-slate-200 tabular-nums">${hoveredCandle.high.toFixed(decimals)}</span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">L</span>
                <span className="text-slate-200 tabular-nums">${hoveredCandle.low.toFixed(decimals)}</span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">C</span>
                <span
                  className={`tabular-nums font-semibold ${
                    hoveredCandle.close >= hoveredCandle.open ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  ${hoveredCandle.close.toFixed(decimals)}
                </span>
              </span>
              <span>
                <span className="text-slate-500 mr-1">VOL</span>
                <span className="text-slate-300 tabular-nums">{hoveredCandle.volume.toLocaleString()}</span>
              </span>
            </div>
          ) : visibleCandles.length > 0 ? (
            <div className="hidden sm:flex items-center gap-3 text-slate-400">
              <span>
                LAST:{' '}
                <span className="text-emerald-400 font-bold tabular-nums">
                  ${visibleCandles[visibleCandles.length - 1].close.toFixed(decimals)}
                </span>
              </span>
              {showEma && (
                <>
                  <span className="text-amber-400/90 text-[11px]">
                    EMA({fastEmaPeriod}):{' '}
                    {emaFastFull[candles.length - 1]?.toFixed(decimals) || '—'}
                  </span>
                  <span className="text-cyan-400/90 text-[11px]">
                    EMA({slowEmaPeriod}):{' '}
                    {emaSlowFull[candles.length - 1]?.toFixed(decimals) || '—'}
                  </span>
                </>
              )}
            </div>
          ) : null}
        </div>

        {/* Right: Chart Controls & Indicator toggles */}
        <div className="flex items-center gap-2">
          {/* Sub-chart Indicator Tabs */}
          <div className="flex items-center bg-slate-900/90 rounded-lg p-0.5 border border-slate-800 text-[11px]">
            <button
              onClick={() => onToggleIndicator?.('RSI')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                activeIndicator === 'RSI'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              RSI (14)
            </button>
            <button
              onClick={() => onToggleIndicator?.('MACD')}
              className={`px-2.5 py-1 rounded transition-colors font-medium ${
                activeIndicator === 'MACD'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              MACD
            </button>
            <button
              onClick={() => onToggleIndicator?.('NONE')}
              className={`px-2 py-1 rounded transition-colors ${
                activeIndicator === 'NONE'
                  ? 'bg-slate-800 text-slate-100 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Off
            </button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 text-slate-400">
            <button
              title="Zoom In"
              onClick={() => setZoomLevel((prev) => Math.max(30, prev - 15))}
              className="p-1.5 hover:text-slate-200 hover:bg-slate-800/80 rounded transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              title="Zoom Out"
              onClick={() => setZoomLevel((prev) => Math.min(180, prev + 15))}
              className="p-1.5 hover:text-slate-200 hover:bg-slate-800/80 rounded transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              title="Reset View"
              onClick={() => {
                setZoomLevel(75);
                setScrollOffset(0);
              }}
              className="p-1.5 hover:text-slate-200 hover:bg-slate-800/80 rounded transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div ref={containerRef} className="relative flex-1 w-full min-h-[360px] overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${totalHeight}`}
          className="w-full h-full cursor-crosshair"
          preserveAspectRatio="none"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="bullVolumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="bearVolumeGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="bbBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.07" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Background Grid Lines (Horizontal Price Levels) */}
          {priceTicks.map((price, idx) => {
            const y = getYForPrice(price);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                {/* Price Label on Right Axis */}
                <text
                  x={width - paddingRight + 8}
                  y={y + 3}
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                  className="tabular-nums select-none"
                >
                  ${price.toFixed(decimals)}
                </text>
              </g>
            );
          })}

          {/* Bollinger Bands Ribbons */}
          {showBollinger && (
            <g className="opacity-80">
              {/* Upper band */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={generateLinePoints(
                  bb.map((b) => b?.upper),
                  getYForPrice
                )}
              />
              {/* Middle band */}
              <polyline
                fill="none"
                stroke="#0284c7"
                strokeWidth="1"
                points={generateLinePoints(
                  bb.map((b) => b?.middle),
                  getYForPrice
                )}
              />
              {/* Lower band */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
                points={generateLinePoints(
                  bb.map((b) => b?.lower),
                  getYForPrice
                )}
              />
            </g>
          )}

          {/* EMA Overlays */}
          {showEma && (
            <>
              {/* Fast EMA line */}
              <polyline
                fill="none"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={generateLinePoints(emaFast, getYForPrice)}
              />
              {/* Slow EMA line */}
              <polyline
                fill="none"
                stroke="#06b6d4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={generateLinePoints(emaSlow, getYForPrice)}
              />
            </>
          )}

          {/* Volume Bars at bottom of main chart */}
          {visibleCandles.map((c, i) => {
            const x = getXForIndex(i);
            const isBull = c.close >= c.open;
            const volHeight = (c.volume / maxVolume) * (mainHeight * 0.22);
            const y = mainHeight - paddingBottom - volHeight;

            return (
              <rect
                key={`vol-${i}`}
                x={x - candleBodyWidth / 2}
                y={y}
                width={candleBodyWidth}
                height={Math.max(1, volHeight)}
                fill={isBull ? 'url(#bullVolumeGrad)' : 'url(#bearVolumeGrad)'}
                stroke={isBull ? '#059669' : '#e11d48'}
                strokeWidth="0.5"
                strokeOpacity="0.5"
              />
            );
          })}

          {/* Candlesticks (Wicks and Bodies) */}
          {visibleCandles.map((c, i) => {
            const x = getXForIndex(i);
            const isBull = c.close >= c.open;
            const candleColor = isBull ? '#10b981' : '#f43f5e';

            const yHigh = getYForPrice(c.high);
            const yLow = getYForPrice(c.low);
            const yOpen = getYForPrice(c.open);
            const yClose = getYForPrice(c.close);

            const bodyTop = Math.min(yOpen, yClose);
            const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));

            return (
              <g key={`candle-${i}`}>
                {/* Upper and lower wick */}
                <line
                  x1={x}
                  y1={yHigh}
                  x2={x}
                  y2={yLow}
                  stroke={candleColor}
                  strokeWidth="1.2"
                />
                {/* Candle body */}
                <rect
                  x={x - candleBodyWidth / 2}
                  y={bodyTop}
                  width={candleBodyWidth}
                  height={bodyHeight}
                  fill={candleColor}
                  rx="1"
                />
              </g>
            );
          })}

          {/* Trade Execution Markers */}
          {visibleTrades.map((t) => {
            const idx = getIndexForTimestamp(t.timestamp);
            const x = getXForIndex(idx);
            const isBuy = t.side === 'BUY';
            const y = getYForPrice(t.price);

            return (
              <g key={t.id} className="cursor-pointer">
                {isBuy ? (
                  // Upward Green Arrow Marker for Buy
                  <polygon
                    points={`${x},${y + 12} ${x - 5},${y + 20} ${x + 5},${y + 20}`}
                    fill="#10b981"
                    stroke="#047857"
                    strokeWidth="1"
                  />
                ) : (
                  // Downward Red Arrow Marker for Sell
                  <polygon
                    points={`${x},${y - 12} ${x - 5},${y - 20} ${x + 5},${y - 20}`}
                    fill="#f43f5e"
                    stroke="#be123c"
                    strokeWidth="1"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r="3.5"
                  fill={isBuy ? '#10b981' : '#f43f5e'}
                  stroke="#ffffff"
                  strokeWidth="1"
                />
              </g>
            );
          })}

          {/* Sub-chart Divider Line */}
          {activeIndicator !== 'NONE' && (
            <line
              x1={paddingLeft}
              y1={mainHeight}
              x2={width - paddingRight}
              y2={mainHeight}
              stroke="#1e293b"
              strokeWidth="1.5"
            />
          )}

          {/* SUB-CHART 1: RSI */}
          {activeIndicator === 'RSI' && (
            <g transform={`translate(0, ${mainHeight})`}>
              {/* Overbought 70 reference */}
              <line
                x1={paddingLeft}
                y1={subHeight * 0.3}
                x2={width - paddingRight}
                y2={subHeight * 0.3}
                stroke="#ef4444"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text
                x={width - paddingRight + 8}
                y={subHeight * 0.3 + 3}
                fill="#ef4444"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                70 OB
              </text>

              {/* Center 50 line */}
              <line
                x1={paddingLeft}
                y1={subHeight * 0.5}
                x2={width - paddingRight}
                y2={subHeight * 0.5}
                stroke="#334155"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Oversold 30 reference */}
              <line
                x1={paddingLeft}
                y1={subHeight * 0.7}
                x2={width - paddingRight}
                y2={subHeight * 0.7}
                stroke="#10b981"
                strokeWidth="1"
                strokeDasharray="3 3"
                opacity="0.6"
              />
              <text
                x={width - paddingRight + 8}
                y={subHeight * 0.7 + 3}
                fill="#10b981"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                30 OS
              </text>

              {/* RSI Curve */}
              <polyline
                fill="none"
                stroke="#a855f7"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={generateLinePoints(rsi, (val) => {
                  // val ranges 0..100 -> invert for Y coordinate
                  const clamped = Math.max(0, Math.min(100, val));
                  return (1 - clamped / 100) * (subHeight - 20) + 10;
                })}
              />
            </g>
          )}

          {/* SUB-CHART 2: MACD */}
          {activeIndicator === 'MACD' && (
            <g transform={`translate(0, ${mainHeight})`}>
              {/* Zero baseline */}
              <line
                x1={paddingLeft}
                y1={subHeight * 0.5}
                x2={width - paddingRight}
                y2={subHeight * 0.5}
                stroke="#334155"
                strokeWidth="1"
              />

              {/* Histogram bars */}
              {macd.map((m, i) => {
                if (!m) return null;
                const x = getXForIndex(i);
                const zeroY = subHeight * 0.5;
                const scale = subHeight * 0.35;
                // Normalize histogram
                const barHeight = Math.min(Math.abs(m.histogram) * 2, scale);
                const isPositive = m.histogram >= 0;
                const y = isPositive ? zeroY - barHeight : zeroY;

                return (
                  <rect
                    key={`hist-${i}`}
                    x={x - candleBodyWidth / 2}
                    y={y}
                    width={candleBodyWidth}
                    height={Math.max(1, barHeight)}
                    fill={isPositive ? '#10b981' : '#f43f5e'}
                    opacity="0.75"
                  />
                );
              })}

              {/* MACD Line */}
              <polyline
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.5"
                points={generateLinePoints(
                  macd.map((m) => m?.macdLine),
                  (val) => subHeight * 0.5 - val * 1.5
                )}
              />

              {/* Signal Line */}
              <polyline
                fill="none"
                stroke="#f97316"
                strokeWidth="1.5"
                points={generateLinePoints(
                  macd.map((m) => m?.signalLine),
                  (val) => subHeight * 0.5 - val * 1.5
                )}
              />
            </g>
          )}

          {/* Crosshair Cursor & Highlight */}
          {hoverIndex !== null && hoveredCandle && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={getXForIndex(hoverIndex)}
                y1={paddingTop}
                x2={getXForIndex(hoverIndex)}
                y2={totalHeight - 15}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Horizontal Crosshair Line */}
              <line
                x1={paddingLeft}
                y1={getYForPrice(hoveredCandle.close)}
                x2={width - paddingRight}
                y2={getYForPrice(hoveredCandle.close)}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Active Price Box on right axis */}
              <g transform={`translate(${width - paddingRight + 4}, ${getYForPrice(hoveredCandle.close) - 9})`}>
                <rect width="64" height="18" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                <text
                  x="32"
                  y="12"
                  textAnchor="middle"
                  fill="#f1f5f9"
                  fontSize="9.5"
                  fontFamily="JetBrains Mono"
                  fontWeight="600"
                >
                  ${hoveredCandle.close.toFixed(decimals)}
                </text>
              </g>

              {/* Timestamp label at bottom */}
              <g transform={`translate(${getXForIndex(hoverIndex) - 45}, ${totalHeight - 16})`}>
                <rect width="90" height="16" rx="3" fill="#1e293b" stroke="#475569" strokeWidth="1" />
                <text
                  x="45"
                  y="11"
                  textAnchor="middle"
                  fill="#cbd5e1"
                  fontSize="9"
                  fontFamily="JetBrains Mono"
                >
                  {new Date(hoveredCandle.time).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </text>
              </g>
            </g>
          )}
        </svg>

        {/* Floating Indicator Legend */}
        <div className="absolute top-2 left-3 pointer-events-none flex items-center gap-3 text-[11px] font-mono">
          {showEma && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                <span className="w-2.5 h-0.5 bg-amber-400 rounded-full" />
                <span className="text-amber-400">EMA {fastEmaPeriod}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                <span className="w-2.5 h-0.5 bg-cyan-400 rounded-full" />
                <span className="text-cyan-400">EMA {slowEmaPeriod}</span>
              </div>
            </>
          )}

          {showBollinger && (
            <div className="flex items-center gap-1.5 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
              <span className="w-2.5 h-0.5 bg-sky-400 rounded-full" />
              <span className="text-sky-400">BB (20, 2)</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
