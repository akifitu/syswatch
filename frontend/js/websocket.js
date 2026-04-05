/**
 * SysWatch — WebSocket Client
 * Gerçek zamanlı veri bağlantısı yönetimi
 */

class SysWatchWebSocket {
  constructor(url, handlers) {
    this.url = url;
    this.handlers = handlers;
    this.ws = null;
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.reconnectAttempts = 0;
    this.connected = false;
    this.pingInterval = null;

    this.connect();
  }

  connect() {
    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.connected = true;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 2000;

        if (this.handlers.onConnect) this.handlers.onConnect();

        // Ping döngüsü başlat (bağlantıyı canlı tut)
        this.pingInterval = setInterval(() => {
          if (this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000);
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (this.handlers.onMessage) this.handlers.onMessage(data);
        } catch (e) {
          console.warn('[WS] Geçersiz JSON:', e);
        }
      };

      this.ws.onclose = () => {
        this.connected = false;
        clearInterval(this.pingInterval);
        if (this.handlers.onDisconnect) this.handlers.onDisconnect();
        this._scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('[WS] Hata:', err);
      };

    } catch (err) {
      console.error('[WS] Bağlantı kurulamadı:', err);
      this._scheduleReconnect();
    }
  }

  send(data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  _scheduleReconnect() {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, this.maxReconnectDelay);
    console.log(`[WS] ${delay / 1000}s sonra yeniden bağlanılıyor... (Deneme: ${this.reconnectAttempts})`);
    setTimeout(() => this.connect(), delay);
  }

  disconnect() {
    clearInterval(this.pingInterval);
    if (this.ws) this.ws.close();
  }
}

window.SysWatchWebSocket = SysWatchWebSocket;
