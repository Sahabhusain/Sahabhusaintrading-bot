export type MarketPair = 'BTC/USD' | 'ETH/USD' | 'SOL/USD' | 'NVDA/USD' | 'EUR/USD';

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '1D';

export type MarketRegime = 
  | 'BULL_TREND'
  | 'BEAR_TREND'
  | 'RANGING'
  | 'HIGH_VOLATILITY'
  | 'FLASH_CRASH_RECOVERY';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorValues {
  emaFast?: number;
  emaSlow?: number;
  smaFast?: number;
  smaSlow?: number;
  rsi?: number;
  bollinger?: {
    upper: number;
    middle: number;
    lower: number;
    bandwidth: number;
  };
  macd?: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  atr?: number;
}

export type StrategyType = 
  | 'EMA_CROSSOVER'
  | 'RSI_MEAN_REVERSION'
  | 'MACD_MOMENTUM'
  | 'BOLLINGER_BREAKOUT'
  | 'GRID_TRADING';

export interface EmaCrossoverConfig {
  fastPeriod: number;
  slowPeriod: number;
}

export interface RsiMeanReversionConfig {
  period: number;
  oversoldThreshold: number;
  overboughtThreshold: number;
}

export interface MacdMomentumConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
}

export interface BollingerBreakoutConfig {
  period: number;
  stdDevMultiplier: number;
}

export interface GridTradingConfig {
  upperPrice: number;
  lowerPrice: number;
  grids: number;
}

export interface StrategyConfig {
  type: StrategyType;
  name: string;
  description: string;
  ema: EmaCrossoverConfig;
  rsi: RsiMeanReversionConfig;
  macd: MacdMomentumConfig;
  bollinger: BollingerBreakoutConfig;
  grid: GridTradingConfig;
}

export interface RiskSettings {
  maxPositionSizePercent: number; // e.g. 50% of available cash
  stopLossPercent: number; // e.g. 2.5%
  takeProfitPercent: number; // e.g. 5.0%
  trailingStopPercent: number; // e.g. 1.5%
  maxDrawdownCircuitBreaker: number; // e.g. 15% halt bot
  makerFeeBps: number; // basis points (1 bps = 0.01%)
  takerFeeBps: number;
  slippageBps: number;
}

export type OrderSide = 'BUY' | 'SELL';
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'TAKE_PROFIT';

export interface Position {
  id: string;
  symbol: MarketPair;
  type: 'LONG' | 'SHORT';
  entryPrice: number;
  currentPrice: number;
  size: number; // in base currency (e.g. 0.25 BTC)
  entryValue: number; // in quote USD
  currentValue: number;
  entryTime: number;
  stopLoss?: number;
  takeProfit?: number;
  trailingHighPrice?: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface Trade {
  id: string;
  symbol: MarketPair;
  side: OrderSide;
  action: 'ENTRY' | 'EXIT';
  orderType: OrderType;
  price: number;
  size: number;
  value: number;
  fee: number;
  timestamp: number;
  reason: string;
  realizedPnl?: number;
  realizedPnlPercent?: number;
}

export interface BotLogEntry {
  id: string;
  timestamp: number;
  level: 'INFO' | 'SIGNAL' | 'ORDER' | 'RISK' | 'WARNING';
  message: string;
  metadata?: Record<string, string | number>;
}

export interface BacktestResult {
  initialBalance: number;
  finalBalance: number;
  totalReturn: number;
  totalReturnPercent: number;
  benchmarkReturn: number;
  benchmarkReturnPercent: number;
  cagrPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdownPercent: number;
  maxDrawdownDurationDays: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  profitFactor: number;
  avgTradeReturnPercent: number;
  bestTradePercent: number;
  worstTradePercent: number;
  totalFeesPaid: number;
  equityCurve: {
    time: number;
    equity: number;
    cash: number;
    benchmark: number;
    drawdown: number;
  }[];
  trades: Trade[];
}

export interface OrderBookLevel {
  price: number;
  amount: number;
  total: number;
}

export interface OrderBook {
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercent: number;
  midPrice: number;
}
