export default () => ({
  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY,
    websocketUrl: process.env.FINNHUB_WS_URL || 'wss://ws.finnhub.io',
  },
  websocket: {
    reconnectInterval: 5000,
    heartbeatInterval: 30000,
    maxReconnectAttempts: 10,
  },
  mock: {
    dataTimeInterval: parseInt(process.env.MOCK_DATA_INTERVAL || '2000'),
  },
});
