import { Candle, MarketPair, MarketRegime, OrderBook, OrderBookLevel, Timeframe } from '../types/trading';

export interface AssetMeta {
  symbol: MarketPair;
  name: string;
  basePrice: number;
  decimals: number;
  minOrderSize: number;
  tickSize: number;
  description: string;
}

export const ASSET_CATALOG: Record<MarketPair, AssetMeta> = {
  'BTC/USD': {
    symbol: 'BTC/USD',
    name: 'Bitcoin / US Dollar',
    basePrice: 64200.0,
    decimals: 2,
    minOrderSize: 0.001,
    tickSize: 0.5,
    description: 'Premier digital store of value with deep spot liquidity',
  },
  'ETH/USD': {
    symbol: 'ETH/USD',
    name: 'Ethereum / US Dollar',
    basePrice: 3450.0,
    decimals: 2,
    minOrderSize: 0.01,
    tickSize: 0.1,
    description: 'Decentralized smart contract compute network',
  },
  'SOL/USD': {
    symbol: 'SOL/USD',
    name: 'Solana / US Dollar',
    basePrice: 152.0,
    decimals: 2,
    minOrderSize: 0.1,
    tickSize: 0.05,
    description: 'High-throughput sub-second settlement blockchain',
  },
  'NVDA/USD': {
    symbol: 'NVDA/USD',
    name: 'NVIDIA Corp / US Dollar',
    basePrice: 128.5,
    decimals: 2,
    minOrderSize: 1,
    tickSize: 0.01,
    description: 'Accelerated computing and AI hardware infrastructure',
  },
  'EUR/USD': {
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    basePrice: 1.085,
    decimals: 4,
    minOrderSize: 100,
    tickSize: 0.0001,
    description: 'World benchmark forex currency exchange pair',
  },
};

/**
 * Returns timeframe duration in milliseconds
 */
export function getTimeframeMs(tf: Timeframe): number {
  switch (tf) {
    case '1m': return 60 * 1000;
    case '5m': return 5 * 60 * 1000;
    case '15m': return 15 * 60 * 1000;
    case '1h': return 60 * 60 * 1000;
    case '1D': return 24 * 60 * 60 * 1000;
    default: return 60 * 1000;
  }
}

/**
 * Deterministic pseudo-random number generator for reproducible backtesting datasets
 */
function createSeededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

/**
 * Generates synthetic realistic historical candlestick dataset with regime dynamics
 */
export function generateHistoricalCandles(
  symbol: MarketPair,
  regime: MarketRegime = 'BULL_TREND',
  count: number = 240,
  timeframe: Timeframe = '5m'
): Candle[] {
  const meta = ASSET_CATALOG[symbol];
  const rand = createSeededRandom(
    symbol.split('').reduce((acc, c) => acc + c.charCodeAt(0), 42) + regime.length * 100
  );

  const tfMs = getTimeframeMs(timeframe);
  const now = Date.now();
  const startTime = now - count * tfMs;

  let currentPrice = meta.basePrice;
  const candles: Candle[] = [];

  // Regime parameters: [drift per candle, base volatility, jump probability, jump magnitude]
  let drift = 0.0002;
  let volatility = 0.005;

  if (regime === 'BULL_TREND') {
    drift = 0.0012;
    volatility = 0.006;
  } else if (regime === 'BEAR_TREND') {
    drift = -0.0011;
    volatility = 0.007;
  } else if (regime === 'RANGING') {
    drift = 0.0;
    volatility = 0.0035;
  } else if (regime === 'HIGH_VOLATILITY') {
    drift = 0.0001;
    volatility = 0.015;
  } else if (regime === 'FLASH_CRASH_RECOVERY') {
    drift = 0.0001;
    volatility = 0.008;
  }

  for (let i = 0; i < count; i++) {
    const time = startTime + i * tfMs;
    const open = currentPrice;

    // Simulate intra-candle movement
    let effDrift = drift;
    let effVol = volatility;

    // Flash crash special regime dynamics around 60% mark
    if (regime === 'FLASH_CRASH_RECOVERY') {
      const progress = i / count;
      if (progress > 0.50 && progress < 0.65) {
        effDrift = -0.012; // sharp cascade
        effVol = 0.025;
      } else if (progress >= 0.65 && progress < 0.85) {
        effDrift = 0.010; // aggressive V-recovery
        effVol = 0.020;
      }
    } else if (regime === 'RANGING') {
      // Mean reversion pull toward basePrice
      const deviation = (currentPrice - meta.basePrice) / meta.basePrice;
      effDrift = -deviation * 0.02;
    }

    // Box-Muller standard normal
    const u1 = Math.max(rand(), 0.0001);
    const u2 = rand();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

    const percentChange = effDrift + effVol * z;
    const close = Math.max(open * (1 + percentChange), meta.tickSize);

    // High and low wicks
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const wickHigh = maxOC * (1 + Math.abs(rand() * effVol * 1.5));
    const wickLow = Math.max(minOC * (1 - Math.abs(rand() * effVol * 1.5)), meta.tickSize);

    const high = Math.max(maxOC, wickHigh);
    const low = Math.min(minOC, wickLow);

    // Volume generation correlated with volatility & absolute price change
    const baseVolume = (meta.basePrice * 1000) / currentPrice;
    const volMultiplier = 1 + Math.abs(percentChange) * 40 + rand() * 0.8;
    const volume = Math.round(baseVolume * volMultiplier);

    const roundedCandle: Candle = {
      time,
      open: Number(open.toFixed(meta.decimals)),
      high: Number(high.toFixed(meta.decimals)),
      low: Number(low.toFixed(meta.decimals)),
      close: Number(close.toFixed(meta.decimals)),
      volume,
    };

    candles.push(roundedCandle);
    currentPrice = close;
  }

  return candles;
}

/**
 * Increments live market price on each simulation tick
 */
export function generateLiveTick(
  lastCandle: Candle,
  meta: AssetMeta,
  regime: MarketRegime,
  timeframe: Timeframe,
  tickCount: number
): { updatedCandle: Candle; isNewCandle: boolean; tradePrice: number; tradeSize: number } {
  const tfMs = getTimeframeMs(timeframe);
  const now = Date.now();
  const isNewCandle = now - lastCandle.time >= tfMs;

  const volatility = 0.0012;
  const drift = regime === 'BULL_TREND' ? 0.0002 : regime === 'BEAR_TREND' ? -0.0002 : 0;
  const delta = (Math.random() - 0.495 + drift) * volatility * lastCandle.close;

  const newPrice = Number(Math.max(lastCandle.close + delta, meta.tickSize).toFixed(meta.decimals));
  const tickVolume = Math.round(meta.minOrderSize * (1 + Math.random() * 5));

  if (isNewCandle) {
    const freshCandle: Candle = {
      time: Math.floor(now / tfMs) * tfMs,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, newPrice),
      low: Math.min(lastCandle.close, newPrice),
      close: newPrice,
      volume: tickVolume,
    };
    return { updatedCandle: freshCandle, isNewCandle: true, tradePrice: newPrice, tradeSize: tickVolume };
  } else {
    const updatedCandle: Candle = {
      ...lastCandle,
      high: Math.max(lastCandle.high, newPrice),
      low: Math.min(lastCandle.low, newPrice),
      close: newPrice,
      volume: lastCandle.volume + tickVolume,
    };
    return { updatedCandle, isNewCandle: false, tradePrice: newPrice, tradeSize: tickVolume };
  }
}

/**
 * Synthesizes dynamic realistic Order Book around mid-market price
 */
export function generateOrderBook(midPrice: number, meta: AssetMeta, depth: number = 8): OrderBook {
  const spreadBps = 0.0004; // 4 bps spread
  const halfSpread = midPrice * (spreadBps / 2);
  const bestBid = midPrice - halfSpread;
  const bestAsk = midPrice + halfSpread;

  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];

  let cumBid = 0;
  let cumAsk = 0;

  for (let i = 0; i < depth; i++) {
    const bidPrice = Number((bestBid - i * meta.tickSize * (1 + i * 0.2)).toFixed(meta.decimals));
    const askPrice = Number((bestAsk + i * meta.tickSize * (1 + i * 0.2)).toFixed(meta.decimals));

    const bidAmt = Number((meta.minOrderSize * (5 + Math.random() * 20 * (1 + i * 0.4))).toFixed(4));
    const askAmt = Number((meta.minOrderSize * (5 + Math.random() * 20 * (1 + i * 0.4))).toFixed(4));

    cumBid += bidAmt;
    cumAsk += askAmt;

    bids.push({
      price: bidPrice,
      amount: bidAmt,
      total: Number(cumBid.toFixed(4)),
    });

    asks.push({
      price: askPrice,
      amount: askAmt,
      total: Number(cumAsk.toFixed(4)),
    });
  }

  const spread = Number((bestAsk - bestBid).toFixed(meta.decimals));
  const spreadPercent = Number(((spread / midPrice) * 100).toFixed(4));

  return {
    bids,
    asks,
    spread,
    spreadPercent,
    midPrice,
  };
}
