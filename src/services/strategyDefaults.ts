import { RiskSettings, StrategyConfig, StrategyType } from '../types/trading';

export const DEFAULT_RISK_SETTINGS: RiskSettings = {
  maxPositionSizePercent: 40, // 40% of cash per trade
  stopLossPercent: 2.5, // 2.5% stop-loss
  takeProfitPercent: 6.0, // 6% take-profit
  trailingStopPercent: 1.5, // 1.5% trailing stop
  maxDrawdownCircuitBreaker: 12.0, // 12% portfolio drawdown limit halts new buys
  makerFeeBps: 2, // 0.02% maker fee
  takerFeeBps: 5, // 0.05% taker fee
  slippageBps: 3, // 0.03% realistic slippage
};

export const STRATEGY_PRESETS: Record<StrategyType, StrategyConfig> = {
  EMA_CROSSOVER: {
    type: 'EMA_CROSSOVER',
    name: 'Dual EMA Trend Crossover',
    description:
      'Capitalizes on directional momentum by identifying trend initiation when the fast EMA crosses the slow EMA. Filters out market noise while capturing large continuation runs.',
    ema: {
      fastPeriod: 9,
      slowPeriod: 21,
    },
    rsi: {
      period: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    },
    macd: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    bollinger: {
      period: 20,
      stdDevMultiplier: 2.0,
    },
    grid: {
      upperPrice: 68000,
      lowerPrice: 60000,
      grids: 8,
    },
  },
  RSI_MEAN_REVERSION: {
    type: 'RSI_MEAN_REVERSION',
    name: 'RSI Mean Reversion Oscillator',
    description:
      'Exploits statistical price extremes by purchasing oversold assets as selling momentum exhausts, and taking profit into overbought surges.',
    ema: {
      fastPeriod: 9,
      slowPeriod: 21,
    },
    rsi: {
      period: 14,
      oversoldThreshold: 32,
      overboughtThreshold: 68,
    },
    macd: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    bollinger: {
      period: 20,
      stdDevMultiplier: 2.0,
    },
    grid: {
      upperPrice: 68000,
      lowerPrice: 60000,
      grids: 8,
    },
  },
  MACD_MOMENTUM: {
    type: 'MACD_MOMENTUM',
    name: 'MACD Zero-Lag Momentum',
    description:
      'Monitors the divergence between short and medium term moving averages. Triggers entries when the MACD signal line confirms positive impulse momentum.',
    ema: {
      fastPeriod: 9,
      slowPeriod: 21,
    },
    rsi: {
      period: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    },
    macd: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    bollinger: {
      period: 20,
      stdDevMultiplier: 2.0,
    },
    grid: {
      upperPrice: 68000,
      lowerPrice: 60000,
      grids: 8,
    },
  },
  BOLLINGER_BREAKOUT: {
    type: 'BOLLINGER_BREAKOUT',
    name: 'Bollinger Band Volatility Bounce',
    description:
      'Measures volatility expansion and contraction. Enters long when price pierces below the lower standard deviation boundary and closes back inside the volatility channel.',
    ema: {
      fastPeriod: 9,
      slowPeriod: 21,
    },
    rsi: {
      period: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    },
    macd: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    bollinger: {
      period: 20,
      stdDevMultiplier: 2.0,
    },
    grid: {
      upperPrice: 68000,
      lowerPrice: 60000,
      grids: 8,
    },
  },
  GRID_TRADING: {
    type: 'GRID_TRADING',
    name: 'Dynamic Grid Laddering Bot',
    description:
      'Places automated laddered buy and sell orders across defined price intervals. Systematically harvests volatility in sideways, ranging, or consolidating markets.',
    ema: {
      fastPeriod: 9,
      slowPeriod: 21,
    },
    rsi: {
      period: 14,
      oversoldThreshold: 30,
      overboughtThreshold: 70,
    },
    macd: {
      fastPeriod: 12,
      slowPeriod: 26,
      signalPeriod: 9,
    },
    bollinger: {
      period: 20,
      stdDevMultiplier: 2.0,
    },
    grid: {
      upperPrice: 68000,
      lowerPrice: 60000,
      grids: 8,
    },
  },
};
