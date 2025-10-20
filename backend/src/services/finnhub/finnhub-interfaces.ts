/**
 * Base interface for all Finnhub WebSocket messages
 */
export interface FinnhubMessage {
  type: string;
  data?: any;
}

/**
 * Trade message from Finnhub
 */
export interface FinnhubTradeMessage extends FinnhubMessage {
  type: 'trade';
  data: FinnhubTradeData[];
}

/**
 * Individual trade data
 */
export interface FinnhubTradeData {
  s: string; // Symbol
  p: number; // Price
  t: number; // Timestamp in milliseconds
  v: number; // Volume
  c?: string[]; // Trade conditions (optional)
}

/**
 * Subscription message to Finnhub
 */
export interface FinnhubSubscribeMessage {
  type: 'subscribe';
  symbol: string;
}

/**
 * Unsubscription message to Finnhub
 */
export interface FinnhubUnsubscribeMessage {
  type: 'unsubscribe';
  symbol: string;
}
