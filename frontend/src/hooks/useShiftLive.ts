import { useCallback, useEffect, useRef, useState } from 'react';
import { apiClient } from '../api/client';
import { ShiftLiveEventItem, ShiftLiveSnapshot } from '../types';

const FALLBACK_POLL_MS = 15000;
const WS_RECONNECT_MS = 3000;
const MAX_FEED_EVENTS = 30;

function wsUrl(token: string): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/v1/ws/shift-live?token=${encodeURIComponent(token)}`;
}

function mergeEvents(
  cache: Map<string, ShiftLiveEventItem>,
  incoming: ShiftLiveEventItem[],
): ShiftLiveEventItem[] {
  for (const event of incoming) {
    if (event.id) {
      cache.set(event.id, event);
    }
  }
  return Array.from(cache.values())
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, MAX_FEED_EVENTS);
}

export function useShiftLive() {
  const [data, setData] = useState<ShiftLiveSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  const pollTimer = useRef<number | null>(null);
  const eventsCache = useRef<Map<string, ShiftLiveEventItem>>(new Map());

  const applySnapshot = useCallback((payload: ShiftLiveSnapshot) => {
    const mergedEvents = mergeEvents(eventsCache.current, payload.recent_events ?? []);
    setData({ ...payload, recent_events: mergedEvents });
  }, []);

  const fetchSnapshot = useCallback(async () => {
    try {
      const response = await apiClient.get<ShiftLiveSnapshot>('/dashboard/shift-live');
      applySnapshot(response.data);
    } catch {
      /* keep last snapshot */
    }
  }, [applySnapshot]);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    fetchSnapshot();

    const startPolling = () => {
      if (pollTimer.current) return;
      pollTimer.current = window.setInterval(fetchSnapshot, FALLBACK_POLL_MS);
    };

    const stopPolling = () => {
      if (pollTimer.current) {
        clearInterval(pollTimer.current);
        pollTimer.current = null;
      }
    };

    const connect = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const ws = new WebSocket(wsUrl(token));
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        stopPolling();
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'shift_live' && message.payload) {
            applySnapshot(message.payload);
          }
        } catch {
          /* ignore malformed messages */
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;
        startPolling();
        reconnectTimer.current = window.setTimeout(connect, WS_RECONNECT_MS);
      };

      ws.onerror = () => {
        ws.close();
      };
    };

    connect();

    const ping = window.setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping');
      }
    }, 30000);

    return () => {
      stopPolling();
      clearInterval(ping);
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [fetchSnapshot, applySnapshot]);

  return { data, connected, refresh: fetchSnapshot };
}
