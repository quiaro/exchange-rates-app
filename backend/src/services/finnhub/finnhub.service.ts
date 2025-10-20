import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import type {
  FinnhubTradeMessage,
  FinnhubSubscribeMessage,
  FinnhubUnsubscribeMessage,
} from './finnhub-interfaces';
import type { SSEExchangeRatePriceEvent } from '@shared/interfaces';
import {
  SYMBOL_MAPPING,
  TRADING_PAIRS,
  TradingPair,
  isValidTradingPair,
} from '@shared/constants';

@Injectable()
export class FinnhubService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinnhubService.name);
  private ws: WebSocket | null = null;
  private currentPrices: Map<string, number> = new Map();
  private subscribers: Set<(data: SSEExchangeRatePriceEvent[]) => void> =
    new Set();

  private readonly FINNHUB_API_KEY: string;
  private readonly FINNHUB_WS_URL: string;

  constructor(private readonly configService: ConfigService) {
    this.FINNHUB_API_KEY = this.configService.get<string>('finnhub.apiKey', '');
    this.FINNHUB_WS_URL = this.configService.get<string>(
      'finnhub.websocketUrl',
      'wss://ws.finnhub.io',
    );
  }

  async onModuleInit() {
    if (!this.FINNHUB_API_KEY) {
      this.logger.error(
        'FinnhubService: FINNHUB_API_KEY environment variable is required',
      );
      return;
    }

    await this.connect();
  }

  async onModuleDestroy() {
    this.unsubscribeFromSymbols();
    this.disconnect();
  }

  private async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(
        `${this.FINNHUB_WS_URL}?token=${this.FINNHUB_API_KEY}`,
      );

      this.ws.on('open', () => {
        this.logger.log('FinnhubService: Connected to Finnhub WebSocket');
        this.subscribeToSymbols();
      });

      this.ws.on('message', (data: FinnhubTradeMessage) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error(
            'FinnhubService: Error parsing WebSocket message:',
            error,
          );
        }
      });

      this.ws.on('close', () => {
        const reconnectInterval = this.configService.get<number>(
          'websocket.reconnectInterval',
          5000,
        );
        this.logger.warn(
          'WebSocket connection closed, attempting to reconnect...',
        );
        setTimeout(() => this.connect(), reconnectInterval);
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket error:', error);
      });
    } catch (error) {
      this.logger.error(
        'FinnhubService: Failed to connect to Finnhub WebSocket:',
        error,
      );
    }
  }

  private subscribeToSymbols(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    TRADING_PAIRS.forEach((symbol: TradingPair) => {
      const subscribeMessage: FinnhubSubscribeMessage = {
        type: 'subscribe',
        symbol: symbol,
      };

      this.ws?.send(JSON.stringify(subscribeMessage));
      this.logger.log(`FinnhubService: Subscribed to ${symbol}`);
    });
  }

  private unsubscribeFromSymbols(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      TRADING_PAIRS.forEach((symbol: TradingPair) => {
        const unsubscribeMessage: FinnhubUnsubscribeMessage = {
          type: 'unsubscribe',
          symbol: symbol,
        };

        this.ws?.send(JSON.stringify(unsubscribeMessage));
        this.logger.log(`FinnhubService: Unsubscribed from ${symbol}`);
      });
    }
  }

  private handleMessage(message: FinnhubTradeMessage): void {
    if (message.type === 'trade' && message.data) {
      const exchangeRateData: SSEExchangeRatePriceEvent[] = [];
      const includedSymbols = new Set<string>();
      /*
       * We reverse the data to get the latest price for each symbol
       * and avoid duplicates
       */
      message.data.reverse().forEach((data) => {
        if (
          data &&
          isValidTradingPair(data.s) &&
          !includedSymbols.has(data.s)
        ) {
          this.currentPrices.set(data.s, data.p);
          exchangeRateData.push({
            symbol: SYMBOL_MAPPING[data.s],
            price: data.p,
            timestamp: data.t,
          });
          includedSymbols.add(data.s);
        }
      });
      this.notifySubscribers(exchangeRateData);
      this.logger.debug(
        `FinnhubService: Updating ${[...includedSymbols].join(', ')}`,
      );
    }
  }

  private notifySubscribers(data: SSEExchangeRatePriceEvent[]): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        this.logger.error('FinnhubService: Error notifying subscriber:', error);
      }
    });
  }

  public getCurrentPrices(): Map<string, number> {
    return new Map(this.currentPrices);
  }

  public getAllPrices(): Record<string, number> {
    const prices: Record<string, number> = {};
    this.currentPrices.forEach((price, symbol) => {
      prices[symbol] = price;
    });
    return prices;
  }

  public subscribeToUpdates(
    callback: (data: SSEExchangeRatePriceEvent[]) => void,
  ): () => void {
    this.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
