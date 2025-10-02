import { io, Socket } from 'socket.io-client';
import type {
  NewSessionEvent,
  MonitoringDataEvent,
  SessionStoppedEvent,
  SessionErrorEvent,
  SessionStatusEvent,
} from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private connectingPromise: Promise<void> | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();
  private sessionRefCounts: Map<string, number> = new Map();

  connect(token: string): Promise<void> {
    if (this.isConnected) return Promise.resolve();
    if (this.connectingPromise) return this.connectingPromise;

    this.connectingPromise = new Promise((resolve, reject) => {
      const wsBase = import.meta.env.VITE_WS_BASE_URL ?? import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';
      const wsUrl = `${wsBase.replace(/^http/, 'ws')}/monitoring`;
      this.socket = io(wsUrl, {
        auth: { token },
        transports: ['websocket']
      });

      this.socket.on('connect', () => {
        this.isConnected = true;
        this.setupEventListeners();
        resolve();
        this.connectingPromise = null;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.connectingPromise = null;
        reject(error);
      });

      this.socket.on('disconnect', () => {
        this.isConnected = false;
      });
    });

    return this.connectingPromise;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionRefCounts.clear();
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('new-session', (data: NewSessionEvent) => {
      this.emit('new-session', data);
    });

    this.socket.on('monitoring-data', (data: MonitoringDataEvent) => {
      this.emit('monitoring-data', data);
    });

    this.socket.on('session-stopped', (data: SessionStoppedEvent) => {
      this.emit('session-stopped', data);
    });

    this.socket.on('session-error', (data: SessionErrorEvent) => {
      this.emit('session-error', data);
    });

    this.socket.on('session-status', (data: SessionStatusEvent) => {
      this.emit('session-status', data);
    });
  }

  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler?: Function): void {
    if (!this.eventHandlers.has(event)) return;

    if (handler) {
      const handlers = this.eventHandlers.get(event)!;
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    } else {
      this.eventHandlers.set(event, []);
    }
  }

  private emit(event: string, data: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  subscribeToSession(sessionId: string): void {
    if (this.socket && this.isConnected) {
      const prev = this.sessionRefCounts.get(sessionId) ?? 0;
      const next = prev + 1;
      this.sessionRefCounts.set(sessionId, next);
      if (prev === 0) {
        this.socket.emit('subscribe-to-session', { sessionId });
      } else {
        console.log(`WebSocket: Already subscribed to session: ${sessionId}`);
      }
    } else {
      console.warn(`WebSocket: Cannot subscribe to session ${sessionId} - not connected`);
    }
  }

  unsubscribeFromSession(sessionId: string): void {
    if (this.socket && this.isConnected) {
      const prev = this.sessionRefCounts.get(sessionId) ?? 0;
      const next = Math.max(0, prev - 1);
      if (next === 0) {
        this.sessionRefCounts.delete(sessionId);
        this.socket.emit('unsubscribe-from-session', { sessionId });
        console.log(`Unsubscribed from session: ${sessionId}`);
      } else {
        this.sessionRefCounts.set(sessionId, next);
        console.log(`WebSocket: Decreased subscription refcount for ${sessionId} -> ${next}`);
      }
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}

export const websocketService = new WebSocketService();
