import { useState, useEffect } from 'react';
import ExchangeRateLinearChart from './components/ExchangeRateLinearChart';
import useSSEWithReconnect from './hooks/useSSEwithReconnect';
import { SYMBOL_MAPPING } from '../../shared/constants';
import type {
  DataPoint,
  SSEExchangeRatePayload,
} from '../../shared/interfaces';
import './App.css';

function App() {
  const SSE_HOST = import.meta.env.VITE_SSE_HOST;
  const SSE_PATH = import.meta.env.VITE_SSE_PATH;
  if (!SSE_HOST || !SSE_PATH) {
    throw new Error(
      'VITE_SSE_HOST and VITE_SSE_PATH environment variables must be set'
    );
  }
  const { data: SSEExchangeRatePayload, isConnected } = useSSEWithReconnect(
    `${SSE_HOST}${SSE_PATH}`
  );
  const [exchangeRates, setExchangeRates] = useState<{
    [key: string]: DataPoint[];
  }>(
    Object.fromEntries(
      Object.values(SYMBOL_MAPPING).map((symbol) => [symbol, [] as DataPoint[]])
    )
  );

  useEffect(() => {
    if (SSEExchangeRatePayload) {
      const data: SSEExchangeRatePayload = SSEExchangeRatePayload;

      if (data.rates.length > 0) {
        // Initial data or heartbeat with all rates
        setExchangeRates((prev) => {
          const newState = { ...prev };
          data.rates.forEach((rate) => {
            newState[rate.symbol].push({
              y: rate.price,
              x: rate.timestamp,
            });
          });
          return newState;
        });
      }
    }
  }, [SSEExchangeRatePayload]);

  const ethUsdcData = exchangeRates['ETH/USDC'];
  const ethUsdtData = exchangeRates['ETH/USDT'];
  const ethBtcData = exchangeRates['ETH/BTC'];

  return (
    <div className="dashboard">
      <h1 className="dashboard-title">Dashboard</h1>
      <div className="dashboard-container">
        <div className="panel eth-usdc">
          <h3 className="title">ETH → USDC</h3>
          {ethUsdcData.length > 0 && (
            <>
              <ExchangeRateLinearChart data={ethUsdcData} color="#3b82f6" />
              <div className="last-update">
                Last update:{' '}
                {new Date(
                  ethUsdcData[ethUsdcData.length - 1].x as string
                ).toLocaleString()}
              </div>
            </>
          )}
        </div>
        <div className="panel eth-usdt">
          <h3 className="title">ETH → USDT</h3>
          {ethUsdtData.length > 0 && (
            <>
              <ExchangeRateLinearChart data={ethUsdtData} color="#3b82f6" />
              <div className="last-update">
                Last update:{' '}
                {new Date(
                  ethUsdtData[ethUsdtData.length - 1].x as string
                ).toLocaleString()}
              </div>
            </>
          )}
        </div>
        <div className="panel eth-btc">
          <h3 className="title">ETH → BTC</h3>
          {ethBtcData.length > 0 && (
            <>
              <ExchangeRateLinearChart data={ethBtcData} color="#3b82f6" />
              <div className="last-update">
                Last update:{' '}
                {new Date(
                  ethBtcData[ethBtcData.length - 1].x as string
                ).toLocaleString()}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="connection-status">
        <span>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</span>
      </div>
    </div>
  );
}

export default App;
