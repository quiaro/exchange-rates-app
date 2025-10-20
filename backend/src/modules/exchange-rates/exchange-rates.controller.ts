import { Controller, Get, Sse, MessageEvent } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FinnhubService } from '../../services/finnhub/finnhub.service';
import { SSEExchangeRatePriceEvent } from '@shared/interfaces';
import { SYMBOL_MAPPING } from '@shared/constants';
import { Observable, interval } from 'rxjs';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(
    private readonly finnhubService: FinnhubService,
    private readonly configService: ConfigService,
  ) {}

  @Sse('stream')
  streamExchangeRates(): Observable<MessageEvent> {
    const heartbeatInterval = this.configService.get<number>(
      'websocket.heartbeatInterval',
      30000,
    );
    return new Observable<MessageEvent>((observer) => {
      // Send initial state with all prices
      const allPrices = this.finnhubService.getAllPrices();
      const rates = Object.entries(allPrices).map(([symbol, price]) => ({
        symbol: SYMBOL_MAPPING[symbol] || symbol,
        price: price,
        timestamp: new Date().toISOString(),
      }));

      observer.next({
        data: {
          rates,
          source: 'Finnhub',
          status: rates.length > 0 ? 'live' : 'waiting',
        },
      } as MessageEvent);

      // Subscribe to real-time updates
      const unsubscribe = this.finnhubService.subscribeToUpdates(
        (data: SSEExchangeRatePriceEvent[]) => {
          observer.next({
            data: {
              rates: data,
              source: 'Finnhub',
              status: 'live',
              type: 'update',
            },
          } as MessageEvent);
        },
      );

      // Keep connection alive with periodic heartbeat
      const heartbeat = interval(heartbeatInterval).subscribe(() => {
        const currentPrices = this.finnhubService.getAllPrices();
        const currentRates = Object.entries(currentPrices).map(
          ([symbol, price]) => ({
            symbol: SYMBOL_MAPPING[symbol] || symbol,
            price: price,
            timestamp: new Date().toISOString(),
          }),
        );

        observer.next({
          data: {
            rates: currentRates,
            source: 'Finnhub',
            status: this.finnhubService.isConnected() ? 'live' : 'disconnected',
            type: 'heartbeat',
          },
        } as MessageEvent);
      });

      // Cleanup function
      return () => {
        unsubscribe();
        heartbeat.unsubscribe();
      };
    });
  }

  @Get('health')
  getHealth() {
    const allPrices = this.finnhubService.getAllPrices();
    const priceCount = Object.keys(allPrices).length;

    return {
      status: this.finnhubService.isConnected() ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'Finnhub WebSocket',
      hasPriceData: priceCount > 0,
      priceDataCount: priceCount,
      connectedSymbols: Object.keys(allPrices).map(
        (symbol) => SYMBOL_MAPPING[symbol] || symbol,
      ),
    };
  }
}
