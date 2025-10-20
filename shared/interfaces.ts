export interface SSEExchangeRatePriceEvent {
  symbol: string;
  price: number;
  timestamp: number;
}

export interface SSEExchangeRatePayload {
  rates: SSEExchangeRatePriceEvent[];
  source: string;
  status: string;
  type?: string;
}

export interface DataPoint {
  x: number | string | Date; // timestamp
  y: number; // price in USD
}
