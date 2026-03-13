'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { WsMessage, WsConnectionStatus } from '@/types/api';

interface UseWebSocketOptions {
    topics: string[];           // e.g. ['event:uuid', 'auction:uuid']
    enabled?: boolean;          // default true — pass false to disconnect
    onMessage?: (msg: WsMessage) => void;  // optional callback per message
}

interface UseWebSocketReturn {
    connectionStatus: WsConnectionStatus;
    lastMessage: WsMessage | null;
    send: (data: unknown) => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
    const { topics, enabled = true, onMessage } = options;
    const [connectionStatus, setConnectionStatus] = useState<WsConnectionStatus>('disconnected');
    const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptRef = useRef(0);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const topicsRef = useRef(topics);
    topicsRef.current = topics;

    // ── Ref for onMessage to avoid stale closures ──
    // Without this, ws.onmessage captures the onMessage from when
    // connect() was called. If the caller passes an inline function,
    // any state it closes over becomes stale. Using a ref means the
    // WebSocket handler always calls the LATEST version of onMessage.
    const onMessageRef = useRef(onMessage);
    onMessageRef.current = onMessage;

    // ── Check if WebSocket is available ──
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;

    // ── Derived value for dependency array ──
    const hasTopics = topics.length > 0;

    // ── Send helper ──
    const send = useCallback((data: unknown) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(data));
        }
    }, []);

    // ── Connect function ──
    const connect = useCallback(async () => {
        // Guard: disabled or no URL configured
        if (!enabled || !wsUrl) {
            setConnectionStatus('disabled');
            return;
        }

        // Guard: already connected or connecting
        if (wsRef.current?.readyState === WebSocket.OPEN ||
            wsRef.current?.readyState === WebSocket.CONNECTING) {
            return;
        }

        // Get JWT for auth handshake
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
            setConnectionStatus('disconnected');
            return;
        }

        setConnectionStatus(
            reconnectAttemptRef.current > 0 ? 'reconnecting' : 'connecting'
        );

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
            // Step 1: Authenticate
            ws.send(JSON.stringify({
                type: 'auth',
                token: session.access_token,
            }));
        };

        ws.onmessage = (event) => {
            try {
                const msg: WsMessage = JSON.parse(event.data);

                // Handle auth response
                if (msg.type === 'auth_ok') {
                    setConnectionStatus('connected');
                    reconnectAttemptRef.current = 0;

                    // Step 2: Subscribe to all topics
                    topicsRef.current.forEach(topic => {
                        ws.send(JSON.stringify({
                            type: 'subscribe',
                            channel: topic,
                        }));
                    });
                    return;
                }

                if (msg.type === 'auth_error') {
                    ws.close();
                    setConnectionStatus('disconnected');
                    return;
                }

                // Handle all other messages — use ref to avoid stale closure
                setLastMessage(msg);
                onMessageRef.current?.(msg);
            } catch {
                // Invalid JSON — ignore
            }
        };

        ws.onclose = () => {
            wsRef.current = null;

            // Don't reconnect if disabled
            if (!enabled) {
                setConnectionStatus('disconnected');
                return;
            }

            // Exponential backoff: 1s, 2s, 4s, 8s, 16s, max 30s
            const attempt = reconnectAttemptRef.current;
            const delay = Math.min(1000 * Math.pow(2, attempt), 30_000);
            reconnectAttemptRef.current = attempt + 1;

            setConnectionStatus('reconnecting');

            reconnectTimeoutRef.current = setTimeout(() => {
                connect();
            }, delay);
        };

        ws.onerror = () => {
            // onerror is always followed by onclose — let onclose handle reconnect
        };
    }, [enabled, wsUrl]);

    // ── Effect: connect/disconnect based on enabled + topics ──
    useEffect(() => {
        if (enabled && hasTopics) {
            connect();
        }

        return () => {
            // Cleanup: close connection, clear timeout
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.onclose = null; // prevent reconnect on intentional close
                wsRef.current.close();
                wsRef.current = null;
            }
            setConnectionStatus('disconnected');
        };
    }, [enabled, hasTopics, connect]);

    // ── Effect: resubscribe when topics change ──
    useEffect(() => {
        if (connectionStatus === 'connected' && wsRef.current?.readyState === WebSocket.OPEN) {
            // TODO: ideally unsubscribe from old topics first.
            // For MVP, the Go server handles duplicate subscriptions gracefully.
            topics.forEach(topic => {
                wsRef.current?.send(JSON.stringify({
                    type: 'subscribe',
                    channel: topic,
                }));
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [topics.join(','), connectionStatus]);

    // ── Return disabled if no WS URL ──
    if (!wsUrl) {
        return { connectionStatus: 'disabled', lastMessage: null, send: () => {} };
    }

    return { connectionStatus, lastMessage, send };
}
