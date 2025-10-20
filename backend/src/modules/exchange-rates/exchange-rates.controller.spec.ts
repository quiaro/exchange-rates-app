import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExchangeRatesController } from './exchange-rates.controller';
import { FinnhubService } from '../../services/finnhub/finnhub.service';
import { Observable } from 'rxjs';
import * as rxjs from 'rxjs';

describe('ExchangeRatesController', () => {
  let controller: ExchangeRatesController;
  let finnhubService: FinnhubService;

  const mockFinnhubService = {
    isConnected: jest.fn(),
    getAllPrices: jest.fn(),
    subscribeToUpdates: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExchangeRatesController],
      providers: [
        {
          provide: FinnhubService,
          useValue: mockFinnhubService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    controller = module.get<ExchangeRatesController>(ExchangeRatesController);
    finnhubService = module.get<FinnhubService>(FinnhubService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getHealth', () => {
    it('should return healthy status when service is connected and has price data', () => {
      // Arrange
      mockFinnhubService.isConnected.mockReturnValue(true);
      mockFinnhubService.getAllPrices.mockReturnValue({
        'BINANCE:ETHUSDC': 2500.5,
        'BINANCE:ETHUSDT': 2501.0,
        'BINANCE:ETHBTC': 0.054,
      });

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toMatchObject({
        status: 'healthy',
        service: 'Finnhub WebSocket',
        hasPriceData: true,
        priceDataCount: 3,
        connectedSymbols: ['ETH/USDC', 'ETH/USDT', 'ETH/BTC'],
      });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      expect(Object.keys(result).length).toBe(6);
      expect(finnhubService.isConnected).toHaveBeenCalledTimes(1);
      expect(finnhubService.getAllPrices).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status when service is not connected', () => {
      // Arrange
      mockFinnhubService.isConnected.mockReturnValue(false);
      mockFinnhubService.getAllPrices.mockReturnValue({
        'BINANCE:ETHUSDC': 2500.5,
        'BINANCE:ETHUSDT': 2501.0,
      });

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toMatchObject({
        status: 'unhealthy',
        service: 'Finnhub WebSocket',
        hasPriceData: true,
        priceDataCount: 2,
        connectedSymbols: ['ETH/USDC', 'ETH/USDT'],
      });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      expect(Object.keys(result).length).toBe(6);
      expect(finnhubService.isConnected).toHaveBeenCalledTimes(1);
      expect(finnhubService.getAllPrices).toHaveBeenCalledTimes(1);
    });

    it('should return healthy status with no price data when connected but no prices available', () => {
      // Arrange
      mockFinnhubService.isConnected.mockReturnValue(true);
      mockFinnhubService.getAllPrices.mockReturnValue({});

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toMatchObject({
        status: 'healthy',
        service: 'Finnhub WebSocket',
        hasPriceData: false,
        priceDataCount: 0,
        connectedSymbols: [],
      });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      expect(finnhubService.isConnected).toHaveBeenCalledTimes(1);
      expect(finnhubService.getAllPrices).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status when not connected and no price data', () => {
      // Arrange
      mockFinnhubService.isConnected.mockReturnValue(false);
      mockFinnhubService.getAllPrices.mockReturnValue({});

      // Act
      const result = controller.getHealth();

      // Assert
      expect(result).toMatchObject({
        status: 'unhealthy',
        service: 'Finnhub WebSocket',
        hasPriceData: false,
        priceDataCount: 0,
        connectedSymbols: [],
      });
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
      expect(Object.keys(result).length).toBe(6);
      expect(finnhubService.isConnected).toHaveBeenCalledTimes(1);
      expect(finnhubService.getAllPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('streamExchangeRates', () => {
    let mockObserver: any;
    let mockUnsubscribe: jest.Mock;
    let mockHeartbeatSubscription: any;
    let mockIntervalSpy: jest.SpyInstance;
    let mockHeartbeatCallback: jest.Mock;

    beforeEach(() => {
      mockUnsubscribe = jest.fn();
      mockHeartbeatCallback = jest.fn();
      mockHeartbeatSubscription = {
        unsubscribe: jest.fn(),
        subscribe: jest.fn().mockImplementation((callback) => {
          mockHeartbeatCallback = callback;
          return { unsubscribe: jest.fn() };
        }),
      };

      mockObserver = {
        next: jest.fn(),
        error: jest.fn(),
        complete: jest.fn(),
      };

      // Mock interval to return a mock observable with subscribe method
      mockIntervalSpy = jest
        .spyOn(rxjs, 'interval')
        .mockReturnValue(mockHeartbeatSubscription as any);

      mockFinnhubService.subscribeToUpdates.mockReturnValue(mockUnsubscribe);
      mockConfigService.get.mockReturnValue(30000);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return an Observable', () => {
      // Act
      const result = controller.streamExchangeRates();

      // Assert
      expect(result).toBeInstanceOf(Observable);
    });

    it('should send initial state with all prices when subscribed', (done) => {
      // Arrange
      mockFinnhubService.getAllPrices.mockReturnValue({
        'BINANCE:ETHUSDC': 2500.5,
        'BINANCE:ETHUSDT': 2501.0,
      });

      // Act
      const stream$ = controller.streamExchangeRates();
      stream$.subscribe(mockObserver);

      // Assert
      setTimeout(() => {
        expect(mockObserver.next).toHaveBeenCalledWith({
          data: {
            rates: [
              {
                symbol: 'ETH/USDC',
                price: 2500.5,
                timestamp: expect.any(String),
              },
              {
                symbol: 'ETH/USDT',
                price: 2501.0,
                timestamp: expect.any(String),
              },
            ],
            source: 'Finnhub',
            status: 'live',
          },
        });
        done();
      }, 10);
    });

    it('should send waiting status when no prices available initially', (done) => {
      // Arrange
      mockFinnhubService.getAllPrices.mockReturnValue({});

      // Act
      const stream$ = controller.streamExchangeRates();
      stream$.subscribe(mockObserver);

      // Assert
      setTimeout(() => {
        expect(mockObserver.next).toHaveBeenCalledWith({
          data: {
            rates: [],
            source: 'Finnhub',
            status: 'waiting',
          },
        });
        done();
      }, 10);
    });

    it('should subscribe to real-time updates', () => {
      // Arrange
      mockFinnhubService.getAllPrices.mockReturnValue({});

      // Act
      const stream$ = controller.streamExchangeRates();
      stream$.subscribe(mockObserver);

      // Assert
      expect(mockFinnhubService.subscribeToUpdates).toHaveBeenCalledWith(
        expect.any(Function),
      );
    });

    it('should send update messages when real-time data is received', () => {
      // Arrange
      mockFinnhubService.getAllPrices.mockReturnValue({});
      const stream$ = controller.streamExchangeRates();
      stream$.subscribe(mockObserver);

      // Clear the initial call
      mockObserver.next.mockClear();

      // Get the callback passed to subscribeToUpdates
      const updateCallback =
        mockFinnhubService.subscribeToUpdates.mock.calls[0][0];
      const mockUpdateData = [
        {
          symbol: 'ETH/USDC',
          price: 2500.5,
          timestamp: '2024-01-01T00:00:00.000Z',
        },
      ];

      // Act
      updateCallback(mockUpdateData);

      // Assert
      expect(mockObserver.next).toHaveBeenCalledWith({
        data: {
          rates: mockUpdateData,
          source: 'Finnhub',
          status: 'live',
          type: 'update',
        },
      });
    });

    it('should send heartbeat messages with current prices', () => {
      // Arrange
      mockFinnhubService.getAllPrices.mockReturnValue({
        'BINANCE:ETHUSDC': 2500.5,
      });
      mockFinnhubService.isConnected.mockReturnValue(true);

      const stream$ = controller.streamExchangeRates();
      stream$.subscribe(mockObserver);

      // Clear the initial call
      mockObserver.next.mockClear();

      // Act - call the heartbeat callback that was captured during subscription
      mockHeartbeatCallback();

      // Assert
      expect(mockObserver.next).toHaveBeenCalledWith({
        data: {
          rates: [
            {
              symbol: 'ETH/USDC',
              price: 2500.5,
              timestamp: expect.any(String),
            },
          ],
          source: 'Finnhub',
          status: 'live',
          type: 'heartbeat',
        },
      });
    });

    it('should send disconnected status in heartbeat when not connected', () => {
      // Arrange
      mockFinnhubService.getAllPrices.mockReturnValue({
        'BINANCE:ETHUSDC': 2500.5,
      });
      mockFinnhubService.isConnected.mockReturnValue(false);

      const stream$ = controller.streamExchangeRates();
      stream$.subscribe(mockObserver);

      // Clear the initial call
      mockObserver.next.mockClear();

      // Act - call the heartbeat callback that was captured during subscription
      mockHeartbeatCallback();

      // Assert
      expect(mockObserver.next).toHaveBeenCalledWith({
        data: {
          rates: [
            {
              symbol: 'ETH/USDC',
              price: 2500.5,
              timestamp: expect.any(String),
            },
          ],
          source: 'Finnhub',
          status: 'disconnected',
          type: 'heartbeat',
        },
      });
    });

    it('should cleanup subscriptions when unsubscribed', () => {
      // Arrange
      const mockHeartbeatUnsubscribe = jest.fn();
      mockHeartbeatSubscription.subscribe.mockReturnValue({
        unsubscribe: mockHeartbeatUnsubscribe,
      });
      mockFinnhubService.getAllPrices.mockReturnValue({});

      const stream$ = controller.streamExchangeRates();
      const subscription = stream$.subscribe(mockObserver);

      // Act
      subscription.unsubscribe();

      // Assert
      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockHeartbeatUnsubscribe).toHaveBeenCalled();
    });
  });
});
