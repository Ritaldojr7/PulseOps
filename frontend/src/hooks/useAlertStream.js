import { useEffect, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * Subscribes to /topic/alerts via STOMP-over-SockJS.
 * Returns { connected, alerts } where alerts is a rolling buffer (newest first).
 */
export function useAlertStream({ max = 50 } = {}) {
  const [connected, setConnected] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [lastAlert, setLastAlert] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    const wsBase = import.meta.env.VITE_WS_BASE_URL || `${window.location.origin}`;
    const client = new Client({
      webSocketFactory: () => new SockJS(`${wsBase}/ws`),
      reconnectDelay: 4000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      onConnect: () => {
        setConnected(true);
        client.subscribe('/topic/alerts', (msg) => {
          try {
            const alert = JSON.parse(msg.body);
            setLastAlert(alert);
            setAlerts((prev) => {
              const next = [alert, ...prev.filter((a) => a.id !== alert.id)];
              return next.slice(0, max);
            });
          } catch (e) {
            // ignore
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => { client.deactivate(); };
  }, [max]);

  return { connected, alerts, lastAlert };
}
