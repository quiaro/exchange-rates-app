import { useState, useEffect, useRef } from 'react';

interface SSEOptions {
  maxRetries?: number;
  retryDelay?: number;
  onReconnect?: () => void;
}

function useSSEWithReconnect(url: string, options: SSEOptions = {}) {
  const { maxRetries = 5, retryDelay = 1000, onReconnect } = options;

  const [data, setData] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined
  );

  useEffect(() => {
    let eventSource: EventSource | null = null;

    const connect = () => {
      eventSource = new EventSource(url);

      eventSource.onopen = () => {
        setIsConnected(true);
        retriesRef.current = 0;
        onReconnect?.();
      };

      eventSource.onmessage = (event) => {
        console.log('event.data', event.data);
        setData(JSON.parse(event.data));
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();

        if (retriesRef.current < maxRetries) {
          retriesRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, retryDelay * retriesRef.current);
        }
      };
    };

    connect();

    return () => {
      eventSource?.close();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [url, maxRetries, retryDelay, onReconnect]);

  return { data, isConnected, retries: retriesRef.current };
}

export default useSSEWithReconnect;
