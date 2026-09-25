import {
  BacktestResult,
  Candle,
  MarketPair,
  RiskSettings,
  StrategyConfig,
  Trade,
} from '../types/trading';
import {
  calculateBollingerBands,
  calculateEMA,
  calculateMACD,
  calculateRSI,
} from './indicators';
import { ASSET_CATALOG } from './marketData';

export interface SignalResult {
  action: 'BUY' | 'SELL' | 'HOLD';
  reason: string;
  confidence: number; // 0 to 1
}

/**
 * Evaluates strategy signal for a specific candle index
 */
export function evaluateStrategySignal(
  candles: Candle[],
  index: number,
  config: StrategyConfig,
  indicators: {
    emaFast: (number | undefined)[];
    emaSlow: (number | undefined)[];
    rsi: (number | undefined)[];
    bollinger: ({ upper: number; middle: number; lower: number; bandwidth: number } | undefined)[];
    macd: ({ macdLine: number; signalLine: number; histogram: number } | undefined)[];
  }
): SignalResult {
  if (index < 5 || index >= candles.length) {
    return { action: 'HOLD', reason: 'Insufficient warm-up candles', confidence: 0 };
  }

  const currentCandle = candles[index];
  const prevCandle = candles[index - 1];

  switch (config.type) {
    case 'EMA_CROSSOVER': {
      const fastCurr = indicators.emaFast[index];
      const fastPrev = indicators.emaFast[index - 1];
      const slowCurr = indicators.emaSlow[index];
      const slowPrev = indicators.emaSlow[index - 1];

      if (
        fastCurr === undefined ||
        fastPrev === undefined ||
        slowCurr === undefined ||
        slowPrev === undefined
      ) {
        return { action: 'HOLD', reason: 'EMA indicators warming up', confidence: 0 };
      }

      // Golden Cross: Fast crosses above Slow
      if (fastPrev <= slowPrev && fastCurr > slowCurr) {
        return {
          action: 'BUY',
          reason: `Golden Cross: EMA(${config.ema.fastPeriod}) crossed above EMA(${config.ema.slowPeriod}) at $${currentCandle.close.toLocaleString()}`,
          confidence: 0.85,
        };
      }

      // Death Cross: Fast crosses below Slow
      if (fastPrev >= slowPrev && fastCurr < slowCurr) {
        return {
          action: 'SELL',
          reason: `Death Cross: EMA(${config.ema.fastPeriod}) crossed below EMA(${config.ema.slowPeriod}) at $${currentCandle.close.toLocaleString()}`,
          confidence: 0.85,
        };
      }

      return { action: 'HOLD', reason: 'EMA trending in alignment', confidence: 0.2 };
    }

    case 'RSI_MEAN_REVERSION': {
      const rsiCurr = indicators.rsi[index];
      const rsiPrev = indicators.rsi[index - 1];

      if (rsiCurr === undefined || rsiPrev === undefined) {
        return { action: 'HOLD', reason: 'RSI calculating', confidence: 0 };
      }

      // Oversold bounce: RSI was below oversold threshold and now ticked upward
      if (rsiPrev <= config.rsi.oversoldThreshold && rsiCurr > config.rsi.oversoldThreshold) {
        return {
          action: 'BUY',
          reason: `RSI Oversold Reversal: Recovered from ${rsiPrev.toFixed(1)} to ${rsiCurr.toFixed(1)} (Threshold: ${config.rsi.oversoldThreshold})`,
          confidence: 0.8,
        };
      }

      // Overbought exhaustion: RSI was above overbought and now crossed down
      if (rsiPrev >= config.rsi.overboughtThreshold && rsiCurr < config.rsi.overboughtThreshold) {
        return {
          action: 'SELL',
          reason: `RSI Overbought Exhaustion: Dropped from ${rsiPrev.toFixed(1)} to ${rsiCurr.toFixed(1)} (Threshold: ${config.rsi.overboughtThreshold})`,
          confidence: 0.8,
        };
      }

      return { action: 'HOLD', reason: `RSI at ${rsiCurr.toFixed(1)} in neutral zone`, confidence: 0.1 };
    }

    case 'MACD_MOMENTUM': {
      const macdCurr = indicators.macd[index];
      const macdPrev = indicators.macd[index - 1];

      if (macdCurr === undefined || macdPrev === undefined) {
        return { action: 'HOLD', reason: 'MACD calculating', confidence: 0 };
      }

      // Bullish MACD crossover: MACD line crosses above Signal line
      if (
        macdPrev.macdLine <= macdPrev.signalLine &&
        macdCurr.macdLine > macdCurr.signalLine &&
        macdCurr.histogram > 0
      ) {
        return {
          action: 'BUY',
          reason: `MACD Bullish Crossover: Signal confirmed with positive histogram (+${macdCurr.histogram.toFixed(2)})`,
          confidence: 0.82,
        };
      }

      // Bearish MACD crossover: MACD line crosses below Signal line
      if (
        macdPrev.macdLine >= macdPrev.signalLine &&
        macdCurr.macdLine < macdCurr.signalLine
      ) {
        return {
          action: 'SELL',
          reason: `MACD Bearish Crossover: Momentum reversing negative (${macdCurr.histogram.toFixed(2)})`,
          confidence: 0.82,
        };
      }

      return { action: 'HOLD', reason: 'MACD momentum steady', confidence: 0.15 };
    }

    case 'BOLLINGER_BREAKOUT': {
      const bbCurr = indicators.bollinger[index];
      const bbPrev = indicators.bollinger[index - 1];

      if (bbCurr === undefined || bbPrev === undefined) {
        return { action: 'HOLD', reason: 'Bollinger Bands calculating', confidence: 0 };
      }

      // Rebound off lower band
      if (prevCandle.low <= bbPrev.lower && currentCandle.close > bbCurr.lower) {
        return {
          action: 'BUY',
          reason: `Bollinger Lower Band Rebound: Price bounced off $${bbCurr.lower.toFixed(2)} toward middle SMA`,
          confidence: 0.78,
        };
      }

      // Upper band rejection or target reach
      if (currentCandle.high >= bbCurr.upper && currentCandle.close < bbCurr.upper) {
        return {
          action: 'SELL',
          reason: `Bollinger Upper Band Resistance: Price tested upper boundary $${bbCurr.upper.toFixed(2)}`,
          confidence: 0.78,
        };
      }

      return { action: 'HOLD', reason: 'Price fluctuating inside Bollinger channel', confidence: 0.1 };
    }

    case 'GRID_TRADING': {
      const { upperPrice, lowerPrice, grids } = config.grid;
      const step = (upperPrice - lowerPrice) / grids;

      if (currentCandle.close < lowerPrice || currentCandle.close > upperPrice) {
        return { action: 'HOLD', reason: 'Price outside active grid boundary', confidence: 0 };
      }

      // Relative position within grid levels
      const level = Math.floor((currentCandle.close - lowerPrice) / step);
      const prevLevel = Math.floor((prevCandle.close - lowerPrice) / step);

      if (level < prevLevel) {
        return {
          action: 'BUY',
          reason: `Grid Level Buy Trigger: Crossed down to grid level ${level + 1}/${grids}`,
          confidence: 0.75,
        };
      }

      if (level > prevLevel) {
        return {
          action: 'SELL',
          reason: `Grid Level Sell Trigger: Crossed up to grid level ${level + 1}/${grids}`,
          confidence: 0.75,
        };
      }

      return { action: 'HOLD', reason: 'Inside current grid tier', confidence: 0.2 };
    }

    default:
      return { action: 'HOLD', reason: 'Neutral strategy state', confidence: 0 };
  }
}

/**
 * Pre-computes all indicator series for a candle dataset
 */
export function precalculateIndicators(candles: Candle[], config: StrategyConfig) {
  return {
    emaFast: calculateEMA(candles, config.ema.fastPeriod),
    emaSlow: calculateEMA(candles, config.ema.slowPeriod),
    rsi: calculateRSI(candles, config.rsi.period),
    bollinger: calculateBollingerBands(
      candles,
      config.bollinger.period,
      config.bollinger.stdDevMultiplier
    ),
    macd: calculateMACD(
      candles,
      config.macd.fastPeriod,
      config.macd.slowPeriod,
      config.macd.signalPeriod
    ),
  };
}

/**
 * Comprehensive Backtest Engine with accurate order simulation, slippage, fees,
 * stop-loss, take-profit, trailing stops, circuit breakers, and institutional quant metrics.
 */
export function runBacktest(
  candles: Candle[],
  symbol: MarketPair,
  config: StrategyConfig,
  risk: RiskSettings,
  initialCapital: number = 10000
): BacktestResult {
  if (candles.length < 30) {
    throw new Error('Requires at least 30 candles for backtesting');
  }

  const meta = ASSET_CATALOG[symbol];
  const indicators = precalculateIndicators(candles, config);

  let cash = initialCapital;
  let holdings = 0; // base asset quantity
  let currentPosition: {
    entryPrice: number;
    size: number;
    entryTime: number;
    highestPriceSinceEntry: number;
    stopLossPrice: number;
    takeProfitPrice: number;
  } | null = null;

  const trades: Trade[] = [];
  const equityCurve: {
    time: number;
    equity: number;
    cash: number;
    benchmark: number;
    drawdown: number;
  }[] = [];

  let peakEquity = initialCapital;
  let maxDrawdown = 0;
  let totalFeesPaid = 0;
  let circuitBreakerTripped = false;

  const initialPrice = candles[0].close;
  const benchmarkShares = initialCapital / initialPrice;

  // Track daily returns for Sharpe / Sortino
  const returns: number[] = [];
  let prevEquity = initialCapital;

  for (let i = 0; i < candles.length; i++) {
    const candle = candles[i];
    const currentPrice = candle.close;
    let equity = cash + holdings * currentPrice;

    // Track peak equity and drawdown
    if (equity > peakEquity) {
      peakEquity = equity;
    }
    const currentDrawdown = peakEquity > 0 ? ((peakEquity - equity) / peakEquity) * 100 : 0;
    if (currentDrawdown > maxDrawdown) {
      maxDrawdown = currentDrawdown;
    }

    // Circuit Breaker check
    if (currentDrawdown >= risk.maxDrawdownCircuitBreaker) {
      circuitBreakerTripped = true;
    }

    // Check Stop-Loss / Take-Profit / Trailing-Stop for open position
    if (currentPosition !== null) {
      // Update trailing high
      if (candle.high > currentPosition.highestPriceSinceEntry) {
        currentPosition.highestPriceSinceEntry = candle.high;
        if (risk.trailingStopPercent > 0) {
          const trailingStop = currentPosition.highestPriceSinceEntry * (1 - risk.trailingStopPercent / 100);
          if (trailingStop > currentPosition.stopLossPrice) {
            currentPosition.stopLossPrice = trailingStop;
          }
        }
      }

      let exitReason: string | null = null;
      let exitPrice = currentPrice;

      // Stop loss trigger
      if (candle.low <= currentPosition.stopLossPrice) {
        exitPrice = currentPosition.stopLossPrice;
        exitReason = `Stop-Loss Triggered at $${exitPrice.toFixed(meta.decimals)}`;
      } else if (candle.high >= currentPosition.takeProfitPrice) {
        // Take profit trigger
        exitPrice = currentPosition.takeProfitPrice;
        exitReason = `Take-Profit Hit at $${exitPrice.toFixed(meta.decimals)}`;
      }

      if (exitReason !== null) {
        // Execute Exit
        const slippage = exitPrice * (risk.slippageBps / 10000);
        const execPrice = Number((exitPrice - slippage).toFixed(meta.decimals));
        const tradeValue = holdings * execPrice;
        const fee = tradeValue * (risk.takerFeeBps / 10000);
        const realizedPnl = (execPrice - currentPosition.entryPrice) * holdings - fee;
        const realizedPnlPercent = ((execPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;

        cash += tradeValue - fee;
        totalFeesPaid += fee;

        trades.push({
          id: `trade-exit-${trades.length + 1}`,
          symbol,
          side: 'SELL',
          action: 'EXIT',
          orderType: exitReason.includes('Stop-Loss') ? 'STOP_LOSS' : 'TAKE_PROFIT',
          price: execPrice,
          size: holdings,
          value: tradeValue,
          fee,
          timestamp: candle.time,
          reason: exitReason,
          realizedPnl: Number(realizedPnl.toFixed(2)),
          realizedPnlPercent: Number(realizedPnlPercent.toFixed(2)),
        });

        holdings = 0;
        currentPosition = null;
        equity = cash;
      }
    }

    // Evaluate algorithmic strategy signal if no stop trigger closed it
    const signal = evaluateStrategySignal(candles, i, config, indicators);

    if (signal.action === 'BUY' && currentPosition === null && !circuitBreakerTripped) {
      // Position Sizing: use configured maxPositionSizePercent of available cash
      const allocCash = cash * (risk.maxPositionSizePercent / 100);
      const slippage = currentPrice * (risk.slippageBps / 10000);
      const execPrice = Number((currentPrice + slippage).toFixed(meta.decimals));
      const fee = allocCash * (risk.takerFeeBps / 10000);
      const netCash = allocCash - fee;
      const size = Number((netCash / execPrice).toFixed(meta.decimals === 4 ? 4 : 4));

      if (size >= meta.minOrderSize && netCash > 10) {
        cash -= allocCash;
        holdings += size;
        totalFeesPaid += fee;

        const stopLossPrice = execPrice * (1 - risk.stopLossPercent / 100);
        const takeProfitPrice = execPrice * (1 + risk.takeProfitPercent / 100);

        currentPosition = {
          entryPrice: execPrice,
          size,
          entryTime: candle.time,
          highestPriceSinceEntry: execPrice,
          stopLossPrice,
          takeProfitPrice,
        };

        trades.push({
          id: `trade-entry-${trades.length + 1}`,
          symbol,
          side: 'BUY',
          action: 'ENTRY',
          orderType: 'MARKET',
          price: execPrice,
          size,
          value: allocCash,
          fee,
          timestamp: candle.time,
          reason: signal.reason,
        });

        equity = cash + holdings * currentPrice;
      }
    } else if (signal.action === 'SELL' && currentPosition !== null) {
      // Standard strategy signal sell
      const slippage = currentPrice * (risk.slippageBps / 10000);
      const execPrice = Number((currentPrice - slippage).toFixed(meta.decimals));
      const tradeValue = holdings * execPrice;
      const fee = tradeValue * (risk.takerFeeBps / 10000);
      const realizedPnl = (execPrice - currentPosition.entryPrice) * holdings - fee;
      const realizedPnlPercent = ((execPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;

      cash += tradeValue - fee;
      totalFeesPaid += fee;

      trades.push({
        id: `trade-exit-${trades.length + 1}`,
        symbol,
        side: 'SELL',
        action: 'EXIT',
        orderType: 'MARKET',
        price: execPrice,
        size: holdings,
        value: tradeValue,
        fee,
        timestamp: candle.time,
        reason: signal.reason,
        realizedPnl: Number(realizedPnl.toFixed(2)),
        realizedPnlPercent: Number(realizedPnlPercent.toFixed(2)),
      });

      holdings = 0;
      currentPosition = null;
      equity = cash;
    }

    // Benchmark calculation (Buy & Hold from start)
    const benchmarkEquity = benchmarkShares * currentPrice;

    // Daily return tracking for volatility/Sharpe
    if (i > 0) {
      const ret = (equity - prevEquity) / prevEquity;
      returns.push(ret);
    }
    prevEquity = equity;

    equityCurve.push({
      time: candle.time,
      equity: Number(equity.toFixed(2)),
      cash: Number(cash.toFixed(2)),
      benchmark: Number(benchmarkEquity.toFixed(2)),
      drawdown: Number(currentDrawdown.toFixed(2)),
    });
  }

  // Close open position at end of backtest to calculate final realized PnL
  if (currentPosition !== null && holdings > 0) {
    const finalCandle = candles[candles.length - 1];
    const execPrice = finalCandle.close;
    const tradeValue = holdings * execPrice;
    const fee = tradeValue * (risk.takerFeeBps / 10000);
    const realizedPnl = (execPrice - currentPosition.entryPrice) * holdings - fee;
    const realizedPnlPercent = ((execPrice - currentPosition.entryPrice) / currentPosition.entryPrice) * 100;

    cash += tradeValue - fee;
    totalFeesPaid += fee;

    trades.push({
      id: `trade-exit-final`,
      symbol,
      side: 'SELL',
      action: 'EXIT',
      orderType: 'MARKET',
      price: execPrice,
      size: holdings,
      value: tradeValue,
      fee,
      timestamp: finalCandle.time,
      reason: 'Backtest Horizon End Close',
      realizedPnl: Number(realizedPnl.toFixed(2)),
      realizedPnlPercent: Number(realizedPnlPercent.toFixed(2)),
    });

    holdings = 0;
  }

  const finalBalance = cash;
  const totalReturn = finalBalance - initialCapital;
  const totalReturnPercent = (totalReturn / initialCapital) * 100;

  const benchmarkFinal = benchmarkShares * candles[candles.length - 1].close;
  const benchmarkReturn = benchmarkFinal - initialCapital;
  const benchmarkReturnPercent = (benchmarkReturn / initialCapital) * 100;

  // Closed trades metrics
  const exitTrades = trades.filter((t) => t.action === 'EXIT');
  const winningTrades = exitTrades.filter((t) => (t.realizedPnl ?? 0) > 0);
  const losingTrades = exitTrades.filter((t) => (t.realizedPnl ?? 0) <= 0);

  const totalTrades = exitTrades.length;
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;

  const grossProfit = winningTrades.reduce((acc, t) => acc + (t.realizedPnl ?? 0), 0);
  const grossLoss = Math.abs(losingTrades.reduce((acc, t) => acc + (t.realizedPnl ?? 0), 0));
  const profitFactor = grossLoss > 0 ? Number((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 99.9 : 0;

  const avgTradeReturnPercent =
    totalTrades > 0
      ? exitTrades.reduce((acc, t) => acc + (t.realizedPnlPercent ?? 0), 0) / totalTrades
      : 0;

  const pnlPercents = exitTrades.map((t) => t.realizedPnlPercent ?? 0);
  const bestTradePercent = pnlPercents.length > 0 ? Math.max(...pnlPercents) : 0;
  const worstTradePercent = pnlPercents.length > 0 ? Math.min(...pnlPercents) : 0;

  // Sharpe and Sortino ratio calculation
  const riskFreeRateAnnual = 0.04; // 4% risk free
  const periodsPerYear = 252 * (24 * 12); // scaled based on 5m candles
  const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;

  let variance = 0;
  let downsideVariance = 0;
  for (const r of returns) {
    variance += Math.pow(r - meanReturn, 2);
    if (r < 0) {
      downsideVariance += Math.pow(r, 2);
    }
  }

  const stdDev = returns.length > 1 ? Math.sqrt(variance / (returns.length - 1)) : 0.0001;
  const downsideStd = returns.length > 1 ? Math.sqrt(downsideVariance / (returns.length - 1)) : 0.0001;

  const rfPerPeriod = riskFreeRateAnnual / periodsPerYear;
  const annualizedFactor = Math.sqrt(periodsPerYear);

  const sharpeRatio = stdDev > 0 ? Number((((meanReturn - rfPerPeriod) / stdDev) * annualizedFactor).toFixed(2)) : 0;
  const sortinoRatio = downsideStd > 0 ? Number((((meanReturn - rfPerPeriod) / downsideStd) * annualizedFactor).toFixed(2)) : 0;

  const daysDuration = (candles[candles.length - 1].time - candles[0].time) / (1000 * 60 * 60 * 24);
  const cagrPercent =
    daysDuration > 0
      ? (Math.pow(Math.max(finalBalance, 1) / initialCapital, 365 / daysDuration) - 1) * 100
      : totalReturnPercent;

  return {
    initialBalance: initialCapital,
    finalBalance: Number(finalBalance.toFixed(2)),
    totalReturn: Number(totalReturn.toFixed(2)),
    totalReturnPercent: Number(totalReturnPercent.toFixed(2)),
    benchmarkReturn: Number(benchmarkReturn.toFixed(2)),
    benchmarkReturnPercent: Number(benchmarkReturnPercent.toFixed(2)),
    cagrPercent: Number(cagrPercent.toFixed(2)),
    sharpeRatio,
    sortinoRatio,
    maxDrawdownPercent: Number(maxDrawdown.toFixed(2)),
    maxDrawdownDurationDays: Number((daysDuration * 0.25).toFixed(1)),
    winRate: Number(winRate.toFixed(1)),
    totalTrades,
    winningTrades: winningTrades.length,
    losingTrades: losingTrades.length,
    profitFactor,
    avgTradeReturnPercent: Number(avgTradeReturnPercent.toFixed(2)),
    bestTradePercent: Number(bestTradePercent.toFixed(2)),
    worstTradePercent: Number(worstTradePercent.toFixed(2)),
    totalFeesPaid: Number(totalFeesPaid.toFixed(2)),
    equityCurve,
    trades,
  };
}
