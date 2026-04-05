# SysWatch — Real-Time Infrastructure Monitoring Dashboard

<div align="center">

![SysWatch Banner](https://img.shields.io/badge/SysWatch-v1.0.0-blue?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyem0tMiAxNXYtNEg2bDYtOHY0aDRsLTYgOHoiLz48L3N2Zz4=)
![Node.js](https://img.shields.io/badge/Node.js-v18+-green?style=for-the-badge&logo=node.js)
![WebSocket](https://img.shields.io/badge/WebSocket-Real--time-cyan?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)

**Gerçek zamanlı altyapı izleme ve gözlemlenebilirlik platformu**

[🚀 Hızlı Başlangıç](#-hızlı-başlangıç) · [📊 Özellikler](#-özellikler) · [🏗️ Mimari](#️-mimari) · [🛠️ Teknolojiler](#️-teknoloji-stack)

</div>

---

## 📋 Proje Hakkında

**SysWatch**, sistem mühendisliğinin temel kavramlarını pratik bir uygulamayla gösteren, gerçek zamanlı altyapı izleme ve gözlemlenebilirlik platformudur.

Bu proje; **Observability (gözlemlenebilirlik)** üçlüsü olan **Metrics + Logs + Alerting** prensiplerine dayanarak tasarlanmıştır. Gerçek dünya sistemlerinde karşılaşılan operasyonel zorluklara — yüksek kaynak kullanımı, anomali tespiti, kapasite planlaması — pratik çözümler sunar.

### 🎯 Neden Bu Proje?

Sistem mühendisliği mülakatlarında adaylardan beklenen yetkinlikleri kapsar:

| Yetkinlik | Nasıl Gösterildi |
|-----------|-----------------|
| **Observability** | Gerçek zamanlı metrics toplama + log stream + alert sistemi |
| **Sistem Kaynakları** | CPU, RAM, Disk, Network'ü gerçek OS'dan toplama |
| **Alerting & Incident Response** | Kural tabanlı, eşik değerli uyarı motoru |
| **Kapasite Planlaması** | Lineer regresyon ile "time-to-full" tahmini |
| **Gerçek Zamanlı Sistemler** | WebSocket tabanlı 2 saniyelik güncelleme döngüsü |

---

## 🚀 Hızlı Başlangıç

### Gereksinimler

- Node.js v18+
- npm v9+

### Kurulum

```bash
# 1. Repoyu klonla
git clone https://github.com/username/syswatch.git
cd syswatch

# 2. Backend bağımlılıklarını kur
cd backend
npm install

# 3. Sunucuyu başlat
npm start
```

### Erişim

Tarayıcıda açın: **http://localhost:3000**

```
╔══════════════════════════════════════════════╗
║           SysWatch Monitoring System          ║
╠══════════════════════════════════════════════╣
║  🌐 Dashboard : http://localhost:3000         ║
║  📡 WebSocket : ws://localhost:3000           ║
║  🔗 API       : http://localhost:3000/api     ║
╚══════════════════════════════════════════════╝
```

---

## 📊 Özellikler

### 1. ⚡ Gerçek Zamanlı Sistem Metrikleri

- **CPU**: Genel kullanım, kullanıcı/sistem ayrımı, çekirdek bazında kullanım, sıcaklık
- **RAM**: Toplam/kullanılan/boş bellek, swap kullanımı
- **Disk**: Dosya sistemi bazında kullanım yüzdesi, I/O metrikleri
- **Network**: Download/Upload hızı (byte/sn), arayüz istatistikleri
- Son 2 dakikalık **geçmiş grafikler** (60 veri noktası)

### 2. 🔔 Akıllı Alert Motoru

- **Özelleştirilebilir eşikler**: CPU, RAM, Disk için WARNING/CRITICAL seviyeleri
- Alert seviyeleri: `INFO | WARNING | CRITICAL`
- **Gerçek zamanlı bildirimler**: Toast popup'ları
- Alert geçmişi (son 100 uyarı)
- WebSocket üzerinden dinamik eşik güncelleme

### 3. 📋 Süreç Yönetimi

- Çalışan tüm süreçlerin listesi
- CPU ve RAM bazlı **sıralama**
- **İsim/PID/kullanıcı** ile arama ve filtreleme
- Süreç durumu (running/sleeping/blocked)
- 8 saniyede bir otomatik güncelleme

### 4. 📜 Canlı Log Akışı

- Gerçek zamanlı sistem log simülasyonu
- Renk kodlamalı log seviyeleri (`INFO / WARN / ERROR`)
- Servis bazlı log etiketleme
- Son 200 log girişi hafızada tutulur

### 5. 🗺️ Kapasite Planlaması

- Disk kullanım **trend analizi**
- **Lineer regresyon** ile "Disk ne zaman dolacak?" tahmini
- Artan/azalan/stabil trend göstergesi

---

## 🏗️ Mimari

```
┌────────────────────────────────────────────────────────────┐
│                    SysWatch Dashboard                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │ CPU/RAM  │ │  Network │ │ Process  │ │   Alerts +   │  │
│  │  Charts  │ │  Chart   │ │  Table   │ │  Log Stream  │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │
└────────────────────────────────────────────────────────────┘
        ↑ WebSocket (ws://) — 2 saniyede bir broadcast
┌────────────────────────────────────────────────────────────┐
│                    Node.js Backend                          │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Express    │  │  WebSocket   │  │  Metrics Loop    │  │
│  │  REST API   │  │  Server (ws) │  │  (setInterval)   │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  Alert      │  │  Process     │  │  Capacity        │  │
│  │  Engine     │  │  Manager     │  │  Forecaster      │  │
│  └─────────────┘  └──────────────┘  └──────────────────┘  │
└────────────────────────────────────────────────────────────┘
        ↑ systeminformation npm package
┌────────────────────────────────────────────────────────────┐
│                    Host Operating System                    │
│         macOS / Linux (Cross-platform)                      │
└────────────────────────────────────────────────────────────┘
```

### Veri Akışı

```
OS (systeminformation)
    → metrics.js (Veri Toplama)
        → alertEngine.js (Kural Değerlendirme)
        → capacityForecast (Lineer Regresyon)
    → server.js broadcast()
        → WebSocket (ws://)
            → charts.js (Grafik Güncelleme)
            → app.js (UI State)
```

---

## 🛠️ Teknoloji Stack

| Katman | Teknoloji | Versiyon | Gerekçe |
|--------|-----------|----------|---------|
| **Backend Runtime** | Node.js | v18+ | Yüksek eşzamanlılık, event-driven |
| **Web Framework** | Express.js | v4.18 | Hızlı REST API, statik dosya sunumu |
| **Real-time** | ws (WebSocket) | v8.16 | Native WS, düşük gecikme |
| **System Metrics** | systeminformation | v5.21 | Cross-platform OS metrikleri |
| **Frontend** | HTML5 + Vanilla JS | - | Framework bağımsız, saf performans |
| **Charts** | Chart.js | v4.4 | Hafif, gerçek zamanlı grafik kütüphanesi |
| **Styling** | Vanilla CSS | - | Glassmorphism dark theme |

---

## 📡 API Referansı

| Endpoint | Method | Açıklama |
|----------|--------|----------|
| `/api/status` | GET | Sunucu durumu ve uptime |
| `/api/sysinfo` | GET | Sistem bilgileri (CPU, OS, hostname) |
| `/api/metrics` | GET | Anlık sistem metrikleri |
| `/api/processes` | GET | Süreç listesi (`?limit=20&sort=cpu`) |
| `/api/alerts` | GET | Aktif uyarılar ve geçmiş |
| `/api/alerts/thresholds` | GET/PUT | Eşik değerleri yönetimi |

### WebSocket Mesaj Tipleri

```json
// Server → Client
{ "type": "metrics", "data": {...}, "alerts": [...], "capacity": {...} }
{ "type": "processes", "data": {...} }
{ "type": "log", "data": { "level": "INFO", "message": "...", "service": "..." } }

// Client → Server
{ "type": "update_thresholds", "data": { "cpu": { "warning": 70, "critical": 90 } } }
{ "type": "ping" }
```

---

## 📁 Proje Yapısı

```
syswatch/
├── backend/
│   ├── server.js          # Express + WebSocket sunucusu
│   ├── metrics.js         # Sistem metrikleri toplama (systeminformation)
│   ├── alertEngine.js     # Kural tabanlı uyarı motoru
│   ├── processManager.js  # Süreç bilgileri yönetimi
│   └── package.json
├── frontend/
│   ├── index.html         # Ana dashboard (tek sayfa)
│   ├── css/
│   │   └── style.css      # Modern dark-mode CSS (Glassmorphism)
│   └── js/
│       ├── app.js         # Ana uygulama katmanı + state yönetimi
│       ├── charts.js      # Chart.js gerçek zamanlı grafik modülü
│       └── websocket.js   # WS istemcisi + otomatik yeniden bağlanma
└── README.md
```

---

## 🔍 Sistem Mühendisliği Konseptleri

### Observability (Gözlemlenebilirlik)
Bu proje, modern sistemlerin üç temel gözlemlenebilirlik prensibini uygular:
- **Metrics**: Sayısal, zaman serisi verileri (CPU %, RAM GB, Network B/s)
- **Logs**: Olayların metin kaydı, seviye bazlı sınıflandırma
- **Alerting**: Otomatik anomali tespiti ve bildirim

### Alert Engine Design
```
Kural Motoru: IF metric.value >= threshold.critical → Alert(CRITICAL)
              IF metric.value >= threshold.warning  → Alert(WARNING)
              ELSE                                  → clearAlert()
```

### Capacity Planning
Disk dolma tahmini için Lineer Regresyon (En Küçük Kareler Yöntemi):
```
f(x) = slope * x + intercept
timeToFull = (100 - currentUsage) / slope * sampleInterval
```

### WebSocket vs REST API
- **REST API**: Tek seferlik sorgular (sistem bilgisi, threshold yönetimi)
- **WebSocket**: Sürekli veri akışı (metrikler, loglar, alertlar)

---

## 🧪 Test

```bash
# API testi
curl http://localhost:3000/api/status
curl http://localhost:3000/api/metrics
curl http://localhost:3000/api/processes?limit=5&sort=cpu

# Threshold güncellemesi
curl -X PUT http://localhost:3000/api/alerts/thresholds \
  -H "Content-Type: application/json" \
  -d '{"cpu": {"warning": 60, "critical": 85}}'
```

---

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/yeni-ozellik`)
3. Commit edin (`git commit -m 'feat: Yeni özellik eklendi'`)
4. Push edin (`git push origin feature/yeni-ozellik`)
5. Pull Request açın

---

## 📄 Lisans

MIT License — Özgürce kullanın, dağıtın ve değiştirin.

---

<div align="center">

Sistem Mühendisliği Portfolyo Projesi olarak geliştirilmiştir.

**SysWatch** — *"You can't manage what you can't measure."*

</div>
