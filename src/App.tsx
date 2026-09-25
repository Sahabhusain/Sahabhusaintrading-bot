import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BotLogEntry,
  Candle,
  MarketPair,
  MarketRegime,
  OrderSide,
  OrderType,
  Position,
  RiskSettings,
  StrategyConfig,
  Trade,
} from './types/trading';
import {
  ASSET_CATALOG,
  generateHistoricalCandles,
  generateLiveTick,
  generateOrderBook,
} from './services/marketData';
import { STRATEGY_PRESETS, DEFAULT_RISK_SETTINGS } from './services/strategyDefaults';
import {
  evaluateStrategySignal,
  precalculateIndicators,
} from './services/tradingEngine';
import { TopBar, ActiveTab } from './components/TopBar';
import { CandlestickChart } from './components/CandlestickChart';
import { OrderBookView } from './components/OrderBook';
import { ManualOrderForm } from './components/ManualOrderForm';
import { PositionsAndOrders } from './components/PositionsAndOrders';
import { BacktestDashboard } from './components/BacktestDashboard';
import { StrategySelector } from './components/StrategySelector';
import { RiskManagementPanel } from './components/RiskManagementPanel';
import { ExecutionConsole } from './components/ExecutionConsole';

export default function App() {
  // Navigation & General App State
  const [activeTab, setActiveTab] = useState<ActiveTab>('TERMINAL');
  const [symbol, setSymbol] = useState<MarketPair>('BTC/USD');
  const [marketRegime, setMarketRegime] = useState<MarketRegime>('BULL_TREND');

  // Strategy & Risk Configuration
  const [strategyConfig, setStrategyConfig] = useState<StrategyConfig>(
    STRATEGY_PRESETS.EMA_CROSSOVER
  );
  const [riskSettings, setRiskSettings] = useState<RiskSettings>(DEFAULT_RISK_SETTINGS);

  // Market & Candlestick Data
  const [candles, setCandles] = useState<Candle[]>(() =>
    generateHistoricalCandles('BTC/USD', 'BULL_TREND', 200, '5m')
  );

  // Bot & Execution State
  const [isBotRunning, setIsBotRunning] = useState<boolean>(true);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(2); // default 2x speed
  const [circuitBreakerTripped, setCircuitBreakerTripped] = useState<boolean>(false);
  const [prefilledPrice, setPrefilledPrice] = useState<number | null>(null);

  // Virtual Brokerage Account State
  const [cash, setCash] = useState<number>(10000.0);
  const [positions, setPositions] = useState<Position[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [logs, setLogs] = useState<BotLogEntry[]>([
    {
      id: 'log-init-1',
      timestamp: Date.now() - 5000,
      level: 'INFO',
      message: 'Axiom Quantitative Engine initialized with $10,000.00 capital allocation.',
    },
    {
      id: 'log-init-2',
      timestamp: Date.now() - 2000,
      level: 'INFO',
      message: `Active asset: BTC/USD. Strategy loaded: ${STRATEGY_PRESETS.EMA_CROSSOVER.name}.`,
    },
  ]);

  // High water mark for portfolio drawdown calculation
  const peakEquityRef = useRef<number>(10000.0);
  const tickCounterRef = useRef<number>(0);

  // Chart preferences
  const [chartIndicator, setChartIndicator] = useState<'RSI' | 'MACD' | 'NONE'>('RSI');
  const [showBollinger, setShowBollinger] = useState<boolean>(false);

  // Current active asset metadata
  const meta = ASSET_CATALOG[symbol];
  const currentPrice = candles[candles.length - 1]?.close || meta.basePrice;

  // Real-time Order Book generated around current mid-market price
  const orderBook = useMemo(
    () => generateOrderBook(currentPrice, meta, 8),
    [currentPrice, meta]
  );

  // Compute portfolio total equity
  const totalEquity = useMemo(() => {
    const positionsValue = positions.reduce((acc, pos) => acc + pos.currentValue, 0);
    return cash + positionsValue;
  }, [cash, positions]);

  // Current base currency holdings for active symbol
  const activeHoldings = useMemo(() => {
    return positions
      .filter((p) => p.symbol === symbol)
      .reduce((acc, p) => acc + p.size, 0);
  }, [positions, symbol]);

  // Reset candles when changing symbol or regime
  const handleSelectSymbol = (newSymbol: MarketPair) => {
    setSymbol(newSymbol);
    const newCandles = generateHistoricalCandles(newSymbol, marketRegime, 200, '5m');
    setCandles(newCandles);
    addLog('INFO', `Switched trading instrument to ${newSymbol}. Base reference: $${ASSET_CATALOG[newSymbol].basePrice.toLocaleString()}`);
  };

  const handleSelectRegime = (newRegime: MarketRegime) => {
    setMarketRegime(newRegime);
    const newCandles = generateHistoricalCandles(symbol, newRegime, 200, '5m');
    setCandles(newCandles);
    addLog('INFO', `Market condition adjusted to ${newRegime.replace(/_/g, ' ')}.`);
  };

  const addLog = useCallback(
    (level: BotLogEntry['level'], message: string, metadata?: Record<string, string | number>) => {
      setLogs((prev) => [
        ...prev.slice(-200), // maintain maximum 200 entries for high performance
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: Date.now(),
          level,
          message,
          metadata,
        },
      ]);
    },
    []
  );

  // Execute manual or bot order
  const handleExecuteOrder = useCallback(
    (params: {
      symbol: MarketPair;
      side: OrderSide;
      orderType: OrderType;
      price: number;
      size: number;
      reason?: string;
    }) => {
      const { symbol: tradeSymbol, side, orderType, price, size, reason = 'Manual Order' } = params;
      const tradeMeta = ASSET_CATALOG[tradeSymbol];
      const tradeValue = price * size;
      const fee = tradeValue * (riskSettings.takerFeeBps / 10000);

      if (side === 'BUY') {
        if (tradeValue + fee > cash) {
          addLog('RISK', `Order rejected: Insufficient cash ($${cash.toFixed(2)}) for order ($${(tradeValue + fee).toFixed(2)})`);
          return;
        }

        const stopLossPrice = price * (1 - riskSettings.stopLossPercent / 100);
        const takeProfitPrice = price * (1 + riskSettings.takeProfitPercent / 100);

        setCash((prev) => prev - tradeValue - fee);

        const newPos: Position = {
          id: `pos-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          symbol: tradeSymbol,
          type: 'LONG',
          entryPrice: price,
          currentPrice: price,
          size,
          entryValue: tradeValue,
          currentValue: tradeValue,
          entryTime: Date.now(),
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice,
          trailingHighPrice: price,
          unrealizedPnl: -fee,
          unrealizedPnlPercent: -((fee / tradeValue) * 100),
        };

        setPositions((prev) => [...prev, newPos]);

        const tradeRecord: Trade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          symbol: tradeSymbol,
          side: 'BUY',
          action: 'ENTRY',
          orderType,
          price,
          size,
          value: tradeValue,
          fee,
          timestamp: Date.now(),
          reason,
        };

        setTrades((prev) => [...prev, tradeRecord]);
        addLog('ORDER', `FILLED: ${side} ${size.toFixed(4)} ${tradeSymbol.split('/')[0]} @ $${price.toFixed(tradeMeta.decimals)} ($${tradeValue.toFixed(2)}) · Fee: $${fee.toFixed(2)}`);
      } else {
        // SELL
        const existingPos = positions.find((p) => p.symbol === tradeSymbol);
        if (!existingPos) {
          addLog('WARNING', `No open position in ${tradeSymbol} to sell.`);
          return;
        }

        const sellSize = Math.min(size, existingPos.size);
        const realizedPnl = (price - existingPos.entryPrice) * sellSize - fee;
        const realizedPnlPercent = ((price - existingPos.entryPrice) / existingPos.entryPrice) * 100;

        setCash((prev) => prev + price * sellSize - fee);

        if (sellSize >= existingPos.size) {
          setPositions((prev) => prev.filter((p) => p.id !== existingPos.id));
        } else {
          setPositions((prev) =>
            prev.map((p) =>
              p.id === existingPos.id
                ? {
                    ...p,
                    size: p.size - sellSize,
                    entryValue: (p.size - sellSize) * p.entryPrice,
                    currentValue: (p.size - sellSize) * price,
                  }
                : p
            )
          );
        }

        const tradeRecord: Trade = {
          id: `trade-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          symbol: tradeSymbol,
          side: 'SELL',
          action: 'EXIT',
          orderType,
          price,
          size: sellSize,
          value: price * sellSize,
          fee,
          timestamp: Date.now(),
          reason,
          realizedPnl: Number(realizedPnl.toFixed(2)),
          realizedPnlPercent: Number(realizedPnlPercent.toFixed(2)),
        };

        setTrades((prev) => [...prev, tradeRecord]);
        addLog('ORDER', `CLOSED: SELL ${sellSize.toFixed(4)} ${tradeSymbol.split('/')[0]} @ $${price.toFixed(tradeMeta.decimals)} · Realized PnL: ${realizedPnl >= 0 ? '+' : ''}$${realizedPnl.toFixed(2)} (${realizedPnlPercent >= 0 ? '+' : ''}${realizedPnlPercent.toFixed(2)}%)`);
      }
    },
    [cash, positions, riskSettings, addLog]
  );

  // Close position by ID
  const handleClosePosition = (positionId: string) => {
    const pos = positions.find((p) => p.id === positionId);
    if (!pos) return;

    handleExecuteOrder({
      symbol: pos.symbol,
      side: 'SELL',
      orderType: 'MARKET',
      price: currentPrice,
      size: pos.size,
      reason: 'Manual Position Close',
    });
  };

  // Master Live Simulation Loop
  useEffect(() => {
    const intervalMs = Math.max(200, Math.floor(1000 / simulationSpeed));

    const timer = setInterval(() => {
      tickCounterRef.current += 1;
      const count = tickCounterRef.current;

      setCandles((prevCandles) => {
        if (prevCandles.length === 0) return prevCandles;
        const last = prevCandles[prevCandles.length - 1];
        const { updatedCandle, isNewCandle, tradePrice } = generateLiveTick(
          last,
          meta,
          marketRegime,
          '5m',
          count
        );

        let nextCandles: Candle[];
        if (isNewCandle) {
          nextCandles = [...prevCandles.slice(-240), updatedCandle];
        } else {
          nextCandles = [...prevCandles.slice(0, prevCandles.length - 1), updatedCandle];
        }

        // Update active open positions marked-to-market
        setPositions((prevPositions) => {
          if (prevPositions.length === 0) return prevPositions;

          const updated = prevPositions.map((pos) => {
            if (pos.symbol !== symbol) return pos;

            const curVal = pos.size * tradePrice;
            const uPnl = (tradePrice - pos.entryPrice) * pos.size;
            const uPnlPct = ((tradePrice - pos.entryPrice) / pos.entryPrice) * 100;

            let highest = pos.trailingHighPrice || pos.entryPrice;
            let stopLoss = pos.stopLoss;

            if (tradePrice > highest) {
              highest = tradePrice;
              if (riskSettings.trailingStopPercent > 0) {
                const trailStop = highest * (1 - riskSettings.trailingStopPercent / 100);
                if (stopLoss === undefined || trailStop > stopLoss) {
                  stopLoss = trailStop;
                }
              }
            }

            return {
              ...pos,
              currentPrice: tradePrice,
              currentValue: curVal,
              highestPriceSinceEntry: highest,
              stopLoss,
              unrealizedPnl: Number(uPnl.toFixed(2)),
              unrealizedPnlPercent: Number(uPnlPct.toFixed(2)),
            };
          });

          // Check if any position hits Stop Loss or Take Profit
          updated.forEach((pos) => {
            if (pos.stopLoss && tradePrice <= pos.stopLoss) {
              handleExecuteOrder({
                symbol: pos.symbol,
                side: 'SELL',
                orderType: 'STOP_LOSS',
                price: pos.stopLoss,
                size: pos.size,
                reason: `Automated Stop-Loss Executed at $${pos.stopLoss.toFixed(meta.decimals)}`,
              });
            } else if (pos.takeProfit && tradePrice >= pos.takeProfit) {
              handleExecuteOrder({
                symbol: pos.symbol,
                side: 'SELL',
                orderType: 'TAKE_PROFIT',
                price: pos.takeProfit,
                size: pos.size,
                reason: `Automated Take-Profit Hit at $${pos.takeProfit.toFixed(meta.decimals)}`,
              });
            }
          });

          return updated;
        });

        // Algorithmic Strategy Evaluation
        if (isBotRunning && !circuitBreakerTripped && count % 3 === 0) {
          const indicators = precalculateIndicators(nextCandles, strategyConfig);
          const lastIdx = nextCandles.length - 1;
          const signal = evaluateStrategySignal(nextCandles, lastIdx, strategyConfig, indicators);

          const hasOpenPosition = positions.some((p) => p.symbol === symbol);

          if (signal.action === 'BUY' && !hasOpenPosition) {
            const allocCash = cash * (riskSettings.maxPositionSizePercent / 100);
            const slippage = tradePrice * (riskSettings.slippageBps / 10000);
            const execPrice = Number((tradePrice + slippage).toFixed(meta.decimals));
            const size = Number((allocCash / execPrice).toFixed(4));

            if (size >= meta.minOrderSize && allocCash > 20) {
              addLog('SIGNAL', `[STRATEGY BUY] ${signal.reason}`);
              handleExecuteOrder({
                symbol,
                side: 'BUY',
                orderType: 'MARKET',
                price: execPrice,
                size,
                reason: signal.reason,
              });
            }
          } else if (signal.action === 'SELL' && hasOpenPosition) {
            const openPos = positions.find((p) => p.symbol === symbol);
            if (openPos) {
              const slippage = tradePrice * (riskSettings.slippageBps / 10000);
              const execPrice = Number((tradePrice - slippage).toFixed(meta.decimals));
              addLog('SIGNAL', `[STRATEGY SELL] ${signal.reason}`);
              handleExecuteOrder({
                symbol,
                side: 'SELL',
                orderType: 'MARKET',
                price: execPrice,
                size: openPos.size,
                reason: signal.reason,
              });
            }
          }
        }

        // Circuit Breaker Tracking
        const currentTotalEq = cash + positions.reduce((acc, p) => acc + p.currentValue, 0);
        if (currentTotalEq > peakEquityRef.current) {
          peakEquityRef.current = currentTotalEq;
        }

        const drawdown = ((peakEquityRef.current - currentTotalEq) / peakEquityRef.current) * 100;
        if (drawdown >= riskSettings.maxDrawdownCircuitBreaker && !circuitBreakerTripped) {
          setCircuitBreakerTripped(true);
          setIsBotRunning(false);
          addLog(
            'RISK',
            `CIRCUIT BREAKER TRIGGERED: Portfolio drawdown reached ${drawdown.toFixed(2)}% (Limit: ${riskSettings.maxDrawdownCircuitBreaker}%). Bot halted.`
          );
        }

        return nextCandles;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [
    isBotRunning,
    circuitBreakerTripped,
    simulationSpeed,
    meta,
    marketRegime,
    symbol,
    strategyConfig,
    riskSettings,
    cash,
    positions,
    handleExecuteOrder,
    addLog,
  ]);

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0e14] text-slate-100 font-sans">
      {/* Top Bar following Top Bar Contract */}
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isBotRunning={isBotRunning}
        onToggleBot={() => {
          setIsBotRunning((prev) => !prev);
          addLog('INFO', isBotRunning ? 'Trading bot paused by operator.' : 'Trading bot deployed to active simulation.');
        }}
        simulationSpeed={simulationSpeed}
        onChangeSpeed={setSimulationSpeed}
        cashBalance={cash}
        totalEquity={totalEquity}
        circuitBreakerTripped={circuitBreakerTripped}
      />

      {/* Main View Area */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 flex flex-col gap-4">
        {/* VIEW 1: TERMINAL (Interactive Trading Desk) */}
        {activeTab === 'TERMINAL' && (
          <div className="flex flex-col gap-4">
            {/* Asset Strip & Market Environment Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0d121c] border border-slate-800/80 rounded-xl">
              {/* Asset Selectors */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-mono">
                {Object.keys(ASSET_CATALOG).map((p) => {
                  const isCurrent = symbol === p;
                  return (
                    <button
                      key={p}
                      onClick={() => handleSelectSymbol(p as MarketPair)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                        isCurrent
                          ? 'bg-slate-800 text-emerald-400 border border-emerald-500/40 shadow-sm'
                          : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              {/* Market Condition / Regime Selector */}
              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="text-slate-500 text-[11px] uppercase">Market Regime:</span>
                <select
                  value={marketRegime}
                  onChange={(e) => handleSelectRegime(e.target.value as MarketRegime)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1 text-xs outline-none cursor-pointer"
                >
                  <option value="BULL_TREND">Bull Trend (Momentum)</option>
                  <option value="BEAR_TREND">Bear Trend (Distribution)</option>
                  <option value="RANGING">Ranging (Oscillations)</option>
                  <option value="HIGH_VOLATILITY">High Volatility (Whipsaws)</option>
                  <option value="FLASH_CRASH_RECOVERY">Flash Crash Recovery</option>
                </select>
              </div>

              {/* Active Strategy Badge & Indicators toggle */}
              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-[11px] text-slate-500">BOT STRATEGY:</span>
                  <span className="text-emerald-400 font-semibold">{strategyConfig.name}</span>
                </div>

                <button
                  onClick={() => setShowBollinger((prev) => !prev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                    showBollinger
                      ? 'bg-sky-950 text-sky-400 border-sky-800'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  Bollinger Bands
                </button>
              </div>
            </div>

            {/* Trading Grid: Main Candlestick Chart (Left 70%) & Order Book + Order Form (Right 30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[620px]">
              {/* Left Column: Interactive Candlestick Chart */}
              <div className="lg:col-span-8 h-full">
                <CandlestickChart
                  candles={candles}
                  trades={trades}
                  symbol={symbol}
                  decimals={meta.decimals}
                  fastEmaPeriod={strategyConfig.ema.fastPeriod}
                  slowEmaPeriod={strategyConfig.ema.slowPeriod}
                  showEma={true}
                  showBollinger={showBollinger}
                  activeIndicator={chartIndicator}
                  onToggleIndicator={setChartIndicator}
                />
              </div>

              {/* Right Column: Order Book (Top) & Manual Paper Order Ticket (Bottom) */}
              <div className="lg:col-span-4 flex flex-col gap-4 h-full">
                <div className="h-[55%]">
                  <OrderBookView
                    orderBook={orderBook}
                    decimals={meta.decimals}
                    onSelectPrice={(price) => setPrefilledPrice(price)}
                  />
                </div>
                <div className="h-[45%]">
                  <ManualOrderForm
                    symbol={symbol}
                    currentPrice={currentPrice}
                    cashBalance={cash}
                    holdings={activeHoldings}
                    prefilledPrice={prefilledPrice}
                    onExecuteOrder={handleExecuteOrder}
                  />
                </div>
              </div>
            </div>

            {/* Bottom Row: Positions & Orders Table (Left 65%) & Execution Console (Right 35%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[320px]">
              <div className="lg:col-span-7 h-full">
                <PositionsAndOrders
                  positions={positions}
                  trades={trades}
                  onClosePosition={handleClosePosition}
                  decimals={meta.decimals}
                />
              </div>
              <div className="lg:col-span-5 h-full">
                <ExecutionConsole
                  logs={logs}
                  onClearLogs={() => setLogs([])}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: BACKTESTING DASHBOARD */}
        {activeTab === 'BACKTEST' && (
          <BacktestDashboard
            initialConfig={strategyConfig}
            initialRisk={riskSettings}
            activeSymbol={symbol}
          />
        )}

        {/* VIEW 3: STRATEGY ARCHITECTURE */}
        {activeTab === 'STRATEGY' && (
          <StrategySelector
            currentConfig={strategyConfig}
            onUpdateConfig={setStrategyConfig}
          />
        )}

        {/* VIEW 4: RISK MANAGEMENT & CONTROLS */}
        {activeTab === 'RISK' && (
          <RiskManagementPanel
            riskSettings={riskSettings}
            onUpdateRisk={setRiskSettings}
            circuitBreakerTripped={circuitBreakerTripped}
            onResetCircuitBreaker={() => {
              setCircuitBreakerTripped(false);
              peakEquityRef.current = totalEquity;
              addLog('RISK', 'Circuit breaker manually reset by operator. Trading bot re-armed.');
            }}
          />
        )}

        {/* VIEW 5: AUDIT LOGS */}
        {activeTab === 'LOGS' && (
          <div className="h-[750px]">
            <ExecutionConsole
              logs={logs}
              onClearLogs={() => setLogs([])}
            />
          </div>
        )}
      </main>
    </div>
  );
}
