import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import type { SSEExchangeRatePriceEvent } from '@shared/interfaces';
import { TRADING_PAIRS, SYMBOL_MAPPING, TradingPair } from '@shared/constants';

@Injectable()
export class FinnhubMockService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinnhubMockService.name);
  private currentPrices: Map<string, number> = new Map();
  private subscribers: Set<(data: SSEExchangeRatePriceEvent[]) => void> =
    new Set();
  private updateInterval: NodeJS.Timeout | null = null;
  private isMockConnected = false;

  // Base prices for realistic mock data generation
  private readonly BASE_PRICES = {
    'BINANCE:ETHUSDC': 3200,
    'BINANCE:ETHUSDT': 3200,
    'BINANCE:ETHBTC': 0.065,
  };

  async onModuleInit() {
    this.logger.log('FinnhubMockService: Initializing mock service');
    this.initializeMockPrices();
    this.isMockConnected = true;
  }

  async onModuleDestroy() {
    this.logger.log('FinnhubMockService: Destroying mock service');
    this.stopUpdates();
    this.isMockConnected = false;
  }

  /**
   * Initialize mock prices with base values
   */
  private initializeMockPrices(): void {
    TRADING_PAIRS.forEach((symbol: TradingPair) => {
      const basePrice =
        this.BASE_PRICES[symbol as keyof typeof this.BASE_PRICES];
      this.currentPrices.set(symbol, basePrice);
    });
    this.logger.log('FinnhubMockService: Initialized mock prices');
  }

  /**
   * Generate a random price within a realistic range around the base price
   */
  private generateRandomPrice(symbol: string): number {
    const basePrice = this.BASE_PRICES[symbol as keyof typeof this.BASE_PRICES];
    // Generate price within ±2% of base price
    const variation = (Math.random() - 0.5) * 0.04; // -2% to +2%
    return basePrice * (1 + variation);
  }

  /**
   * Start generating mock price updates
   */
  private startUpdates(): void {
    if (this.updateInterval) {
      return; // Already running
    }

    this.updateInterval = setInterval(() => {
      if (this.subscribers.size > 0) {
        const exchangeRateData: SSEExchangeRatePriceEvent[] = TRADING_PAIRS.map(
          (symbol: TradingPair) => {
            const newPrice = this.generateRandomPrice(symbol);
            this.currentPrices.set(symbol, newPrice);

            return {
              symbol: SYMBOL_MAPPING[symbol],
              price: newPrice,
              timestamp: Date.now(),
            };
          },
        );

        this.notifySubscribers(exchangeRateData);
        this.logger.debug('FinnhubMockService: Generated mock price updates');
      }
    }, 2000); // Update every second

    this.logger.log('FinnhubMockService: Started mock price updates');
  }

  /**
   * Stop generating mock price updates
   */
  private stopUpdates(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      this.logger.log('FinnhubMockService: Stopped mock price updates');
    }
  }

  /**
   * Notify all subscribers with new data
   */
  private notifySubscribers(data: SSEExchangeRatePriceEvent[]): void {
    this.subscribers.forEach((callback) => {
      try {
        callback(data);
      } catch (error) {
        this.logger.error(
          'FinnhubMockService: Error notifying subscriber:',
          error,
        );
      }
    });
  }

  /**
   * Get all current prices as a record
   */
  public getAllPrices(): Record<string, number> {
    const prices: Record<string, number> = {};
    this.currentPrices.forEach((price, symbol) => {
      prices[symbol] = price;
    });
    return prices;
  }

  /**
   * Subscribe to price updates
   */
  public subscribeToUpdates(
    callback: (data: SSEExchangeRatePriceEvent[]) => void,
  ): () => void {
    this.subscribers.add(callback);

    // Start updates if this is the first subscriber
    if (this.subscribers.size === 1) {
      this.startUpdates();
    }

    this.logger.log(
      `FinnhubMockService: Added subscriber (total: ${this.subscribers.size})`,
    );

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback);
      this.logger.log(
        `FinnhubMockService: Removed subscriber (total: ${this.subscribers.size})`,
      );
    };
  }

  /**
   * Check if the mock service is "connected"
   */
  public isConnected(): boolean {
    return this.isMockConnected;
  }

  /**
   * Get current prices as a Map (for compatibility)
   */
  public getCurrentPrices(): Map<string, number> {
    return new Map(this.currentPrices);
  }

  /**
   * Get the number of active subscribers
   */
  public getSubscriberCount(): number {
    return this.subscribers.size;
  }
}
