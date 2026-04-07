/**
 * SysWatch — Main Server
 * Express REST API + WebSocket gerçek zamanlı veri akışı
 */

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const path = require('path');

const { collectMetrics, getSystemInfo } = require('./metrics');
const { getProcesses } = require('./processManager');
const alertEngine = require('./alertEngine');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const HOST = process.env.HOST || '127.0.0.1';
const PORT = process.env.PORT || 3000;
const METRICS_INTERVAL = 2000; // 2 saniyede bir güncelle

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ─── REST API Endpoint'leri ────────────────────────────────────────────────────

/**
 * GET /api/status — Sunucu durumu
 */
app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    version: '1.0.0',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/sysinfo — Sistem bilgileri (static)
 */
app.get('/api/sysinfo', async (req, res) => {
  try {
    const info = await getSystemInfo();
    res.json(info);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/metrics — Anlık metrikler
 */
app.get('/api/metrics', async (req, res) => {
  try {
    const metrics = await collectMetrics();
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/processes — Süreç listesi
 */
app.get('/api/processes', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const sortBy = req.query.sort || 'cpu';
    const processes = await getProcesses(limit, sortBy);
    res.json(processes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/alerts — Aktif uyarılar
 */
app.get('/api/alerts', (req, res) => {
  res.json({
    active: alertEngine.getActiveAlerts(),
    history: alertEngine.getAlertHistory().slice(0, 50)
  });
});

/**
 * GET /api/alerts/thresholds — Mevcut eşik değerleri
 */
app.get('/api/alerts/thresholds', (req, res) => {
  res.json(alertEngine.getThresholds());
});

/**
 * PUT /api/alerts/thresholds — Eşik değerlerini güncelle
 */
app.put('/api/alerts/thresholds', (req, res) => {
  alertEngine.updateThresholds(req.body);
  res.json({ success: true, thresholds: alertEngine.getThresholds() });
});

// ─── WebSocket — Gerçek Zamanlı Veri Akışı ─────────────────────────────────────
const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);
  console.log(`[WS] Yeni bağlantı. Toplam: ${clients.size}`);

  // Bağlantı mesajı gönder
  ws.send(JSON.stringify({
    type: 'connected',
    message: 'SysWatch gerçek zamanlı bağlantı kuruldu',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (rawMsg) => {
    try {
      const msg = JSON.parse(rawMsg.toString());
      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
      if (msg.type === 'update_thresholds') {
        alertEngine.updateThresholds(msg.data);
        ws.send(JSON.stringify({ type: 'thresholds_updated', data: alertEngine.getThresholds() }));
      }
    } catch (e) {
      // JSON parse hatası — yoksay
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Bağlantı kapandı. Kalan: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Hata:', err.message);
    clients.delete(ws);
  });
});

/**
 * Broadcast — Tüm bağlı istemcilere mesaj gönder
 */
function broadcast(data) {
  const payload = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// ─── Metrik Döngüsü ───────────────────────────────────────────────────────────
let metricsBuffer = []; // Son N ölçümü sakla (kapasite planlaması için)
const MAX_BUFFER = 60; // 2 saniye × 60 = 2 dakikalık geçmiş

async function metricsLoop() {
  try {
    const metrics = await collectMetrics();
    const alerts = alertEngine.evaluate(metrics);

    // Buffer'a ekle
    metricsBuffer.push(metrics);
    if (metricsBuffer.length > MAX_BUFFER) metricsBuffer.shift();

    // Kapasite tahmini ekle
    const capacity = calculateCapacityForecast(metricsBuffer);

    broadcast({
      type: 'metrics',
      data: metrics,
      alerts,
      capacity,
      timestamp: metrics.timestamp
    });
  } catch (err) {
    console.error('[Loop] Metrik hatası:', err.message);
  }
}

/**
 * Kapasite Planlaması — Lineer Regresyon ile "Time-to-Full" tahmini
 */
function calculateCapacityForecast(buffer) {
  if (buffer.length < 10) return null;

  const n = buffer.length;
  const diskValues = buffer
    .map((m, i) => ({ x: i, y: m.disk?.filesystems?.[0]?.use || 0 }))
    .filter(p => p.y > 0);

  if (diskValues.length < 5) return null;

  // Lineer regresyon (En Küçük Kareler)
  const sumX = diskValues.reduce((s, p) => s + p.x, 0);
  const sumY = diskValues.reduce((s, p) => s + p.y, 0);
  const sumXY = diskValues.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = diskValues.reduce((s, p) => s + p.x * p.x, 0);
  const count = diskValues.length;

  const slope = (count * sumXY - sumX * sumY) / (count * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / count;

  // Disk dolma tahmini (slope steps * 2 saniye = gerçek süre)
  const currentUsage = diskValues[diskValues.length - 1].y;
  let timeToFullMinutes = null;

  if (slope > 0) {
    const stepsToFull = (100 - currentUsage) / slope;
    timeToFullMinutes = Math.round((stepsToFull * 2) / 60); // saniye → dakika
  }

  return {
    disk: {
      currentPercent: parseFloat(currentUsage.toFixed(2)),
      trendSlope: parseFloat(slope.toFixed(4)),
      timeToFullMinutes,
      trend: slope > 0.01 ? 'increasing' : slope < -0.01 ? 'decreasing' : 'stable'
    }
  };
}

// ─── Süreç Döngüsü (daha az sıklıkta) ───────────────────────────────────────
async function processLoop() {
  try {
    const processes = await getProcesses(20, 'cpu');
    broadcast({
      type: 'processes',
      data: processes
    });
  } catch (err) {
    console.error('[ProcessLoop] Hata:', err.message);
  }
}

// ─── Log Simülatörü ───────────────────────────────────────────────────────────
const LOG_MESSAGES = [
  { level: 'INFO',  msg: 'Sistem metrikleri başarıyla toplandı' },
  { level: 'INFO',  msg: 'WebSocket bağlantısı aktif' },
  { level: 'INFO',  msg: 'Bellek kullanımı normal aralıkta' },
  { level: 'INFO',  msg: 'Disk I/O operasyonu tamamlandı' },
  { level: 'INFO',  msg: 'Ağ trafiği izleniyor' },
  { level: 'INFO',  msg: 'Süreç listesi güncellendi' },
  { level: 'WARN',  msg: 'CPU kullanımı %70 üzerinde' },
  { level: 'WARN',  msg: 'Bellek kullanımı artış trendinde' },
  { level: 'WARN',  msg: 'Disk yazma hızı yavaşlıyor' },
  { level: 'ERROR', msg: 'Servis bağlantı denemesi başarısız' },
  { level: 'INFO',  msg: 'Scheduler görevi başarıyla çalıştırıldı' },
  { level: 'INFO',  msg: 'Sağlık kontrolü başarılı' },
  { level: 'WARN',  msg: 'Yüksek bant genişliği kullanımı tespit edildi' },
  { level: 'INFO',  msg: 'Otomatik ölçekleme parametreleri kontrol edildi' },
  { level: 'ERROR', msg: 'Bağlantı zaman aşımına uğradı - yeniden deneniyor' },
];

function logSimulatorLoop() {
  const entry = LOG_MESSAGES[Math.floor(Math.random() * LOG_MESSAGES.length)];
  broadcast({
    type: 'log',
    data: {
      level: entry.level,
      message: entry.msg,
      service: ['metrics-collector', 'alert-engine', 'api-server', 'ws-server'][Math.floor(Math.random() * 4)],
      timestamp: new Date().toISOString()
    }
  });
}

// ─── Döngüleri Başlat ─────────────────────────────────────────────────────────
setInterval(metricsLoop, METRICS_INTERVAL);
setInterval(processLoop, 8000);       // Süreçleri 8 saniyede bir güncelle
setInterval(logSimulatorLoop, 3000);  // Log'ları 3 saniyede bir üret

// İlk çalıştırma
metricsLoop();
processLoop();

// ─── Sunucuyu Başlat ──────────────────────────────────────────────────────────
server.listen(PORT, HOST, () => {
  console.log(`
╔══════════════════════════════════════════════╗
║           SysWatch Monitoring System          ║
╠══════════════════════════════════════════════╣
║  🌐 Dashboard : http://${HOST}:${PORT}          ║
║  📡 WebSocket : ws://${HOST}:${PORT}            ║
║  🔗 API       : http://${HOST}:${PORT}/api      ║
╚══════════════════════════════════════════════╝
  `);
});

module.exports = { app, server };
