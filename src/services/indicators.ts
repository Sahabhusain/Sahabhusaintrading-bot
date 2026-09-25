import { Candle, IndicatorValues } from '../types/trading';

/**
 * Calculates Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    sum += candles[i].close;
    if (i >= period) {
      sum -= candles[i - period].close;
    }
    if (i >= period - 1) {
      result.push(sum / period);
    } else {
      result.push(undefined);
    }
  }

  return result;
}

/**
 * Calculates Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  const multiplier = 2 / (period + 1);
  let previousEma: number | undefined;

  for (let i = 0; i < candles.length; i++) {
    const close = candles[i].close;

    if (i < period - 1) {
      result.push(undefined);
      continue;
    }

    if (i === period - 1) {
      // First EMA is simple average of first period
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[j].close;
      }
      previousEma = sum / period;
      result.push(previousEma);
      continue;
    }

    if (previousEma !== undefined) {
      const currentEma = (close - previousEma) * multiplier + previousEma;
      result.push(currentEma);
      previousEma = currentEma;
    } else {
      result.push(undefined);
    }
  }

  return result;
}

/**
 * Calculates Relative Strength Index (RSI) using Wilder's smoothing
 */
export function calculateRSI(candles: Candle[], period: number = 14): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  if (candles.length <= period) {
    return candles.map(() => undefined);
  }

  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(undefined);
      continue;
    }

    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;

    if (i <= period) {
      avgGain += gain;
      avgLoss += loss;
      if (i === period) {
        avgGain /= period;
        avgLoss /= period;
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        result.push(Number(rsi.toFixed(2)));
      } else {
        result.push(undefined);
      }
    } else {
      // Wilder's smoothing
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      if (avgLoss === 0) {
        result.push(100);
      } else {
        const rs = avgGain / avgLoss;
        const rsi = 100 - 100 / (1 + rs);
        result.push(Number(rsi.toFixed(2)));
      }
    }
  }

  return result;
}

/**
 * Calculates Bollinger Bands (Upper, Middle, Lower)
 */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): ({ upper: number; middle: number; lower: number; bandwidth: number } | undefined)[] {
  const smaValues = calculateSMA(candles, period);
  const result: ({ upper: number; middle: number; lower: number; bandwidth: number } | undefined)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const middle = smaValues[i];
    if (middle === undefined || i < period - 1) {
      result.push(undefined);
      continue;
    }

    // Calculate variance
    let varianceSum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      varianceSum += Math.pow(candles[j].close - middle, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);

    const upper = middle + stdDevMultiplier * stdDev;
    const lower = middle - stdDevMultiplier * stdDev;
    const bandwidth = middle > 0 ? ((upper - lower) / middle) * 100 : 0;

    result.push({
      upper: Number(upper.toFixed(2)),
      middle: Number(middle.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      bandwidth: Number(bandwidth.toFixed(2)),
    });
  }

  return result;
}

/**
 * Calculates MACD (MACD line, Signal line, Histogram)
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): ({ macdLine: number; signalLine: number; histogram: number } | undefined)[] {
  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  // Compute MACD Line = Fast EMA - Slow EMA
  const macdLineValues: (number | undefined)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const fast = fastEma[i];
    const slow = slowEma[i];
    if (fast !== undefined && slow !== undefined) {
      macdLineValues.push(fast - slow);
    } else {
      macdLineValues.push(undefined);
    }
  }

  // Compute Signal Line = EMA of MACD Line
  // Filter valid macdLine elements to compute EMA
  const signalMultiplier = 2 / (signalPeriod + 1);
  const result: ({ macdLine: number; signalLine: number; histogram: number } | undefined)[] = [];
  let previousSignal: number | undefined;
  let validMacdCount = 0;

  for (let i = 0; i < candles.length; i++) {
    const macd = macdLineValues[i];
    if (macd === undefined) {
      result.push(undefined);
      continue;
    }

    validMacdCount++;
    if (validMacdCount < signalPeriod) {
      result.push(undefined);
      continue;
    }

    if (validMacdCount === signalPeriod) {
      // First signal line is simple average of first signalPeriod valid MACDs
      let sum = 0;
      let count = 0;
      for (let j = 0; j <= i; j++) {
        if (macdLineValues[j] !== undefined) {
          sum += macdLineValues[j]!;
          count++;
          if (count === signalPeriod) break;
        }
      }
      previousSignal = sum / signalPeriod;
      const hist = macd - previousSignal;
      result.push({
        macdLine: Number(macd.toFixed(3)),
        signalLine: Number(previousSignal.toFixed(3)),
        histogram: Number(hist.toFixed(3)),
      });
      continue;
    }

    if (previousSignal !== undefined) {
      const currentSignal = (macd - previousSignal) * signalMultiplier + previousSignal;
      const hist = macd - currentSignal;
      result.push({
        macdLine: Number(macd.toFixed(3)),
        signalLine: Number(currentSignal.toFixed(3)),
        histogram: Number(hist.toFixed(3)),
      });
      previousSignal = currentSignal;
    } else {
      result.push(undefined);
    }
  }

  return result;
}

/**
 * Calculates Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period: number = 14): (number | undefined)[] {
  const result: (number | undefined)[] = [];
  if (candles.length < 2) return candles.map(() => undefined);

  let atr = 0;
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      result.push(undefined);
      continue;
    }

    const current = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      current.high - current.low,
      Math.abs(current.high - prev.close),
      Math.abs(current.low - prev.close)
    );

    if (i <= period) {
      atr += tr;
      if (i === period) {
        atr /= period;
        result.push(Number(atr.toFixed(2)));
      } else {
        result.push(undefined);
      }
    } else {
      atr = (atr * (period - 1) + tr) / period;
      result.push(Number(atr.toFixed(2)));
    }
  }

  return result;
}

/**
 * Calculates all current indicator values for the latest candle
 */
export function getLatestIndicators(
  candles: Candle[],
  fastEmaPeriod: number = 9,
  slowEmaPeriod: number = 21,
  rsiPeriod: number = 14,
  bollingerPeriod: number = 20
): IndicatorValues {
  if (candles.length === 0) return {};

  const emaFast = calculateEMA(candles, fastEmaPeriod);
  const emaSlow = calculateEMA(candles, slowEmaPeriod);
  const rsi = calculateRSI(candles, rsiPeriod);
  const bollinger = calculateBollingerBands(candles, bollingerPeriod);
  const macd = calculateMACD(candles);
  const atr = calculateATR(candles);

  const lastIdx = candles.length - 1;

  return {
    emaFast: emaFast[lastIdx],
    emaSlow: emaSlow[lastIdx],
    rsi: rsi[lastIdx],
    bollinger: bollinger[lastIdx],
    macd: macd[lastIdx],
    atr: atr[lastIdx],
  };
}
