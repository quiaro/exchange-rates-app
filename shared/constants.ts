/**
 * Shared constants for exchange rate trading pairs and symbol mappings
 * This file is used by both frontend and backend to ensure consistency
 */

// Trading pair symbols as used by the Finnhub API
export const TRADING_PAIRS = [
  'BINANCE:ETHUSDC',
  'BINANCE:ETHUSDT',
  'BINANCE:ETHBTC',
] as const;

// Type for trading pair symbols
export type TradingPair = (typeof TRADING_PAIRS)[number];

// Display names for trading pairs
export const SYMBOL_DISPLAY_NAMES = {
  'BINANCE:ETHUSDC': 'ETH/USDC',
  'BINANCE:ETHUSDT': 'ETH/USDT',
  'BINANCE:ETHBTC': 'ETH/BTC',
} as const;

// Type for display names
export type SymbolDisplayName =
  (typeof SYMBOL_DISPLAY_NAMES)[keyof typeof SYMBOL_DISPLAY_NAMES];

// Legacy export for backward compatibility (deprecated)
export const SYMBOL_MAPPING = SYMBOL_DISPLAY_NAMES as Record<string, string>;

// Helper function to get display name for a trading pair
export function getSymbolDisplayName(symbol: TradingPair): SymbolDisplayName {
  return SYMBOL_DISPLAY_NAMES[symbol];
}

// Helper function to check if a symbol is a valid trading pair
export function isValidTradingPair(symbol: string): symbol is TradingPair {
  return TRADING_PAIRS.includes(symbol as TradingPair);
}

// Helper function to get all display names
export function getAllDisplayNames(): SymbolDisplayName[] {
  return Object.values(SYMBOL_DISPLAY_NAMES);
}

// Helper function to get all trading pairs
export function getAllTradingPairs(): TradingPair[] {
  return [...TRADING_PAIRS];
}
