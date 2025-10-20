import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FinnhubService } from './finnhub.service';
import WebSocket from 'ws';
import { FinnhubTradeMessage, FinnhubTradeData } from './finnhub-interfaces';
import { SSEExchangeRatePriceEvent } from '@shared/interfaces';
import { TRADING_PAIRS, SYMBOL_MAPPING, TradingPair } from '@shared/constants';

// Mock WebSocket
jest.mock('ws');

describe('FinnhubService', () => {
  let service: FinnhubService;
  let configService: ConfigService;
  let mockWebSocket: jest.Mocked<WebSocket>;

  const mockApiKey = 'test-api-key';
  const mockWsUrl = 'wss://test.finnhub.io';

  beforeEach(async () => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create mock WebSocket instance
    mockWebSocket = {
      on: jest.fn(),
      send: jest.fn(),
      close: jest.fn(),
      readyState: WebSocket.OPEN,
    } as any;

    // Mock WebSocket constructor
    (WebSocket as jest.MockedClass<typeof WebSocket>).mockImplementation(
      () => mockWebSocket,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinnhubService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                'finnhub.apiKey': mockApiKey,
                'finnhub.websocketUrl': mockWsUrl,
                'websocket.reconnectInterval': 5000,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<FinnhubService>(FinnhubService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should initialize with config values', () => {
      expect(configService.get).toHaveBeenCalledWith('finnhub.apiKey', '');
      expect(configService.get).toHaveBeenCalledWith(
        'finnhub.websocketUrl',
        'wss://ws.finnhub.io',
      );
    });
  });

  describe('onModuleInit', () => {
    it('should connect to WebSocket when API key is present', async () => {
      await service.onModuleInit();

      expect(WebSocket).toHaveBeenCalledWith(
        `${mockWsUrl}?token=${mockApiKey}`,
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'open',
        expect.any(Function),
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'message',
        expect.any(Function),
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'close',
        expect.any(Function),
      );
      expect(mockWebSocket.on).toHaveBeenCalledWith(
        'error',
        expect.any(Function),
      );
    });

    it('should not connect when API key is missing', async () => {
      jest.spyOn(configService, 'get').mockImplementation((key: string) => {
        if (key === 'finnhub.apiKey') return '';
        return mockWsUrl;
      });

      const newService = new FinnhubService(configService);
      await newService.onModuleInit();

      expect(WebSocket).not.toHaveBeenCalled();
    });

    it('should subscribe to trading pairs on WebSocket open', async () => {
      await service.onModuleInit();

      // Get the 'open' event handler and call it
      const openHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'open',
      )?.[1];
      expect(openHandler).toBeDefined();

      // Trigger the open event with explicit WebSocket context binding
      openHandler?.call(mockWebSocket);

      // Verify that subscribe messages were sent for each trading pair
      expect(mockWebSocket.send).toHaveBeenCalledTimes(TRADING_PAIRS.length);
      TRADING_PAIRS.forEach((symbol: TradingPair) => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'subscribe', symbol }),
        );
      });
    });
  });

  describe('onModuleDestroy', () => {
    it('should unsubscribe from symbols and close WebSocket connection', async () => {
      await service.onModuleInit();
      await service.onModuleDestroy();

      // Should unsubscribe from symbols
      expect(mockWebSocket.send).toHaveBeenCalledTimes(TRADING_PAIRS.length);
      TRADING_PAIRS.forEach((symbol: TradingPair) => {
        expect(mockWebSocket.send).toHaveBeenCalledWith(
          JSON.stringify({ type: 'unsubscribe', symbol }),
        );
      });

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('WebSocket Message Handling', () => {
    it('should handle valid trade messages', async () => {
      await service.onModuleInit();

      const tradeData: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      // Get the 'message' event handler
      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      // Trigger the message event with explicit WebSocket context binding
      messageHandler?.call(mockWebSocket, JSON.stringify(message) as any);

      // Verify price was stored
      const prices = service.getCurrentPrices();
      expect(prices.get(TRADING_PAIRS[0])).toBe(2000.5);
    });

    it('should ignore trade messages for unknown symbols', async () => {
      await service.onModuleInit();

      const tradeData: FinnhubTradeData = {
        s: 'UNKNOWN:SYMBOL',
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      // Trigger the message event with explicit WebSocket context binding
      messageHandler?.call(mockWebSocket, JSON.stringify(message) as any);

      const prices = service.getCurrentPrices();
      expect(prices.has('UNKNOWN:SYMBOL')).toBe(false);
    });

    it('should handle malformed messages gracefully', async () => {
      await service.onModuleInit();

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      // Should not throw
      expect(() => {
        messageHandler?.call(mockWebSocket, 'invalid json' as any);
      }).not.toThrow();
    });

    it('should ignore messages without trade type', async () => {
      await service.onModuleInit();

      const message = {
        type: 'ping',
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      messageHandler?.call(mockWebSocket, JSON.stringify(message) as any);

      const prices = service.getCurrentPrices();
      expect(prices.size).toBe(0);
    });
  });

  describe('WebSocket Connection Handling', () => {
    it('should handle WebSocket close event and attempt reconnect', async () => {
      jest.useFakeTimers();

      await service.onModuleInit();

      const closeHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'close',
      )?.[1];

      // Clear previous WebSocket constructor calls
      (WebSocket as jest.MockedClass<typeof WebSocket>).mockClear();

      // Trigger close event
      closeHandler?.call(mockWebSocket);

      // Fast-forward time
      jest.advanceTimersByTime(5000);

      // Should attempt to reconnect
      expect(WebSocket).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    it('should handle WebSocket error event', async () => {
      await service.onModuleInit();

      const errorHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'error',
      )?.[1];

      const mockError = new Error('Connection error');

      // Should not throw
      expect(() => {
        errorHandler?.call(mockWebSocket, mockError);
      }).not.toThrow();
    });
  });

  describe('getCurrentPrices', () => {
    it('should return a copy of current prices', async () => {
      await service.onModuleInit();

      const tradeData: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      messageHandler?.call(mockWebSocket, JSON.stringify(message) as any);

      const prices = service.getCurrentPrices();
      expect(prices).toBeInstanceOf(Map);
      expect(prices.get(TRADING_PAIRS[0])).toBe(2000.5);

      // Verify it's a copy, not the original
      prices.set(TRADING_PAIRS[0], 9999);
      const newPrices = service.getCurrentPrices();
      expect(newPrices.get(TRADING_PAIRS[0])).toBe(2000.5);
    });

    it('should return empty map when no prices are set', () => {
      const prices = service.getCurrentPrices();
      expect(prices).toBeInstanceOf(Map);
      expect(prices.size).toBe(0);
    });
  });

  describe('getAllPrices', () => {
    it('should return prices as a record object', async () => {
      await service.onModuleInit();

      const tradeData1: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const tradeData2: FinnhubTradeData = {
        s: TRADING_PAIRS[1],
        p: 2001.5,
        t: Date.now(),
        v: 150,
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      messageHandler?.call(
        mockWebSocket,
        JSON.stringify({ type: 'trade', data: [tradeData1] }) as any,
      );
      messageHandler?.call(
        mockWebSocket,
        JSON.stringify({ type: 'trade', data: [tradeData2] }) as any,
      );

      const allPrices = service.getAllPrices();
      expect(allPrices).toEqual({
        [TRADING_PAIRS[0]]: 2000.5,
        [TRADING_PAIRS[1]]: 2001.5,
      });
    });

    it('should return empty object when no prices are set', () => {
      const allPrices = service.getAllPrices();
      expect(allPrices).toEqual({});
    });
  });

  describe('subscribeToUpdates', () => {
    it('should notify subscribers when new price data arrives', async () => {
      await service.onModuleInit();

      const mockCallback = jest.fn();
      service.subscribeToUpdates(mockCallback);

      const tradeData: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      messageHandler?.call(mockWebSocket, JSON.stringify(message));

      expect(mockCallback).toHaveBeenCalledWith([
        {
          symbol: SYMBOL_MAPPING[tradeData.s],
          price: tradeData.p,
          timestamp: tradeData.t,
        },
      ]);
    });

    it('should return an unsubscribe function', () => {
      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToUpdates(mockCallback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should stop notifying after unsubscribe', async () => {
      await service.onModuleInit();

      const mockCallback = jest.fn();
      const unsubscribe = service.subscribeToUpdates(mockCallback);

      const tradeData: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      messageHandler?.call(mockWebSocket, JSON.stringify(message));
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Unsubscribe
      unsubscribe();

      // Send another message
      messageHandler?.call(mockWebSocket, JSON.stringify(message));
      expect(mockCallback).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle errors in subscriber callbacks gracefully', async () => {
      await service.onModuleInit();

      const mockCallback1 = jest.fn(() => {
        throw new Error('Callback error');
      });
      const mockCallback2 = jest.fn();

      service.subscribeToUpdates(mockCallback1);
      service.subscribeToUpdates(mockCallback2);

      const tradeData: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      // Should not throw and should still call second callback
      expect(() => {
        messageHandler?.call(mockWebSocket, JSON.stringify(message));
      }).not.toThrow();

      expect(mockCallback1).toHaveBeenCalled();
      expect(mockCallback2).toHaveBeenCalled();
    });

    it('should notify multiple subscribers', async () => {
      await service.onModuleInit();

      const mockCallback1 = jest.fn();
      const mockCallback2 = jest.fn();
      const mockCallback3 = jest.fn();

      service.subscribeToUpdates(mockCallback1);
      service.subscribeToUpdates(mockCallback2);
      service.subscribeToUpdates(mockCallback3);

      const tradeData: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      messageHandler?.call(mockWebSocket, JSON.stringify(message));

      const expectedData: SSEExchangeRatePriceEvent[] = [
        {
          symbol: SYMBOL_MAPPING[tradeData.s],
          price: tradeData.p,
          timestamp: tradeData.t,
        },
      ];

      expect(mockCallback1).toHaveBeenCalledWith(expectedData);
      expect(mockCallback2).toHaveBeenCalledWith(expectedData);
      expect(mockCallback3).toHaveBeenCalledWith(expectedData);
    });
  });

  describe('isConnected', () => {
    it('should return true when WebSocket is open', async () => {
      await service.onModuleInit();
      (mockWebSocket as any).readyState = WebSocket.OPEN;

      expect(service.isConnected()).toBe(true);
    });

    it('should return false when WebSocket is closed', async () => {
      await service.onModuleInit();
      (mockWebSocket as any).readyState = WebSocket.CLOSED;

      expect(service.isConnected()).toBe(false);
    });

    it('should return false when WebSocket is connecting', async () => {
      await service.onModuleInit();
      (mockWebSocket as any).readyState = WebSocket.CONNECTING;

      expect(service.isConnected()).toBe(false);
    });

    it('should return false when WebSocket is not initialized', () => {
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should not subscribe to symbols if WebSocket is not open', async () => {
      (mockWebSocket as any).readyState = WebSocket.CONNECTING;
      await service.onModuleInit();

      const openHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'open',
      )?.[1];

      mockWebSocket.send.mockClear();
      (mockWebSocket as any).readyState = WebSocket.CLOSED;

      openHandler?.call(mockWebSocket);

      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });

    it('should handle updates for the same symbol', async () => {
      await service.onModuleInit();

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      const tradeData1: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const tradeData2: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2100.75,
        t: Date.now() + 1000,
        v: 150,
      };

      messageHandler?.call(
        mockWebSocket,
        JSON.stringify({ type: 'trade', data: [tradeData1] }),
      );
      messageHandler?.call(
        mockWebSocket,
        JSON.stringify({ type: 'trade', data: [tradeData2] }),
      );

      const prices = service.getCurrentPrices();
      expect(prices.get(TRADING_PAIRS[0])).toBe(2100.75);
    });

    it('should deduplicate symbols and use latest price when multiple trades for same symbol', async () => {
      await service.onModuleInit();

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      const tradeData1: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2000.5,
        t: Date.now(),
        v: 100,
      };

      const tradeData2: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2100.75,
        t: Date.now() + 1000,
        v: 150,
      };

      const tradeData3: FinnhubTradeData = {
        s: TRADING_PAIRS[0],
        p: 2200.25,
        t: Date.now() + 2000,
        v: 200,
      };

      // Send multiple trades for the same symbol in one message
      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [tradeData1, tradeData2, tradeData3],
      };

      messageHandler?.call(mockWebSocket, JSON.stringify(message));

      const prices = service.getCurrentPrices();
      // Should use the latest price (first after reversal)
      expect(prices.get(TRADING_PAIRS[0])).toBe(2200.25);
    });

    it('should handle message with empty data array', async () => {
      await service.onModuleInit();

      const message: FinnhubTradeMessage = {
        type: 'trade',
        data: [],
      };

      const messageHandler = mockWebSocket.on.mock.calls.find(
        (call) => call[0] === 'message',
      )?.[1];

      expect(() => {
        messageHandler?.call(mockWebSocket, JSON.stringify(message));
      }).not.toThrow();
    });
  });
});
