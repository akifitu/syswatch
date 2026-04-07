/**
 * SysWatch — Main Application
 * Dashboard state yönetimi ve UI güncellemeleri
 */

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  ws: null,
  connected: false,
  currentSort: 'cpu',
  processFilter: '',
  processes: [],
  logs: [],
  alerts: [],
  maxLogs: 200,
  lastMetrics: null,
  alertHistory: [],
  activeTab: 'alerts'
};

// ─── Init ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initCharts();
  initWebSocket();
  initControls();
  startClock();
  loadSysInfo();
  loadThresholds();
});

// ─── Charts Init ──────────────────────────────────────────────────────────────
function initCharts() {
  initCpuChart('cpu-chart');
  initMemChart('mem-chart');
  initNetChart('net-chart');
}

// ─── WebSocket ────────────────────────────────────────────────────────────────
function initWebSocket() {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${location.host}`;

  state.ws = new SysWatchWebSocket(wsUrl, {
    onConnect: handleConnect,
    onDisconnect: handleDisconnect,
    onMessage: handleMessage
  });
}

function handleConnect() {
  state.connected = true;
  setConnectionStatus(true);
}

function handleDisconnect() {
  state.connected = false;
  setConnectionStatus(false);
}

function handleMessage(data) {
  switch (data.type) {
    case 'metrics':
      state.lastMetrics = data.data;
      updateMetricsUI(data.data);
      updateAlerts(data.alerts || []);
      updateCapacity(data.capacity);
      break;

    case 'processes':
      state.processes = data.data.list || [];
      updateProcessStats(data.data);
      renderProcessTable();
      break;

    case 'log':
      addLogEntry(data.data);
      break;

    case 'thresholds_updated':
      showToast('Eşik değerleri güncellendi', 'info');
      break;
  }
}

// ─── UI: Metrics ──────────────────────────────────────────────────────────────
function updateMetricsUI(metrics) {
  // CPU stat card
  const cpuVal = metrics.cpu.usage;
  setText('stat-cpu-value', cpuVal.toFixed(1));
  setText('stat-cpu-sub', `Kullanıcı: ${metrics.cpu.userLoad.toFixed(1)}% | Sistem: ${metrics.cpu.systemLoad.toFixed(1)}%`);
  setWidth('stat-cpu-progress', cpuVal);
  setColorByValue('stat-cpu-value-el', cpuVal, 70, 90, '#3b82f6', '#f59e0b', '#ef4444');

  if (metrics.cpu.temperature) {
    setText('cpu-temp-badge', `🌡️ ${metrics.cpu.temperature.toFixed(1)}°C`);
  }

  // Memory stat card
  const memVal = metrics.memory.usedPercent;
  setText('stat-mem-value', memVal.toFixed(1));
  setText('stat-mem-sub', `${metrics.memory.usedGB} GB / ${metrics.memory.totalGB} GB`);
  setWidth('stat-mem-progress', memVal);

  // Network stat card
  const rxMB = (metrics.network.rx_sec / 1024 / 1024).toFixed(2);
  const txMB = (metrics.network.tx_sec / 1024 / 1024).toFixed(2);
  setText('stat-net-rx', `↓ ${formatBytes(metrics.network.rx_sec)}/s`);
  setText('stat-net-tx', `↑ ${formatBytes(metrics.network.tx_sec)}/s`);

  // Disk stat card (ilk FS)
  if (metrics.disk.filesystems && metrics.disk.filesystems.length > 0) {
    const fs = metrics.disk.filesystems[0];
    setText('stat-disk-value', fs.use.toFixed(1));
    const usedGB = (fs.used / 1024 / 1024 / 1024).toFixed(1);
    const totalGB = (fs.size / 1024 / 1024 / 1024).toFixed(1);
    setText('stat-disk-sub', `${usedGB} GB / ${totalGB} GB`);
    setWidth('stat-disk-progress', fs.use);
    updateDiskList(metrics.disk.filesystems);
  }

  // Charts
  updateCpuChart(metrics);
  updateMemChart(metrics);
  updateNetChart(metrics);
  updateCpuCores(metrics.cpu.cores);
}

function updateDiskList(filesystems) {
  const container = document.getElementById('disk-list');
  if (!container) return;

  container.innerHTML = filesystems.map(fs => {
    const usedGB = (toFiniteNumber(fs.used) / 1024 / 1024 / 1024).toFixed(1);
    const totalGB = (toFiniteNumber(fs.size) / 1024 / 1024 / 1024).toFixed(1);
    const usage = clampPercent(fs.use);
    const cls = usage >= 95 ? 'critical' : usage >= 80 ? 'warning' : '';
    const mount = escapeHTML(fs.mount || fs.fs || '-');

    return `
      <div class="disk-item">
        <div class="disk-path">
          <span class="disk-mount">${mount}</span>
          <span class="disk-stats">${usedGB}/${totalGB} GB · ${usage.toFixed(1)}%</span>
        </div>
        <div class="disk-progress">
          <div class="disk-progress-fill ${cls}" style="width: ${usage}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── UI: Alerts ────────────────────────────────────────────────────────────────
function updateAlerts(alerts) {
  state.alerts = alerts;
  renderAlertBadge(alerts.length);

  const container = document.getElementById('alert-list');
  if (!container) return;

  if (alerts.length === 0) {
    container.innerHTML = `
      <div class="no-alerts">
        <div class="no-alerts-icon">✅</div>
        <div>Tüm sistemler normal</div>
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map(alert => {
    const level = normalizeAlertLevel(alert.level);
    const message = escapeHTML(alert.message || '-');
    const time = escapeHTML(formatTime(alert.timestamp));
    return `
    <div class="alert-item ${level}">
      <div class="alert-icon">${alertIcon(level)}</div>
      <div class="alert-content">
        <div class="alert-level">${level}</div>
        <div class="alert-msg">${message}</div>
        <div class="alert-time">${time}</div>
      </div>
    </div>
  `;
  }).join('');

  // Kritik uyarılar için toast
  const critical = alerts.filter(a => normalizeAlertLevel(a.level) === 'CRITICAL');
  if (critical.length > 0 && critical.length > (state.prevCriticalCount || 0)) {
    showToast(`🚨 ${critical[0].message}`, 'critical');
  }
  state.prevCriticalCount = critical.length;
}

function renderAlertBadge(count) {
  const badge = document.getElementById('alert-count-badge');
  if (!badge) return;
  badge.textContent = count;
  badge.style.display = count > 0 ? 'inline-flex' : 'none';
  badge.style.background = count > 0 ? 'var(--accent-red-dim)' : 'var(--accent-green-dim)';
  badge.style.color = count > 0 ? 'var(--accent-red)' : 'var(--accent-green)';
}

function alertIcon(level) {
  return { CRITICAL: '🔴', WARNING: '🟡', INFO: '🔵' }[level] || '⚪';
}

// ─── UI: Processes ─────────────────────────────────────────────────────────────
function updateProcessStats(data) {
  setText('proc-total', data.total);
  setText('proc-running', data.running);
  setText('proc-sleeping', data.sleeping);
  setText('proc-blocked', data.blocked);
}

function renderProcessTable() {
  const tbody = document.getElementById('process-tbody');
  if (!tbody) return;

  let procs = [...state.processes];

  // Filtre
  if (state.processFilter) {
    const f = state.processFilter.toLowerCase();
    procs = procs.filter(p =>
      p.name.toLowerCase().includes(f) ||
      String(p.pid).includes(f) ||
      p.user.toLowerCase().includes(f)
    );
  }

  tbody.innerHTML = procs.map(p => {
    const pid = escapeHTML(String(p.pid ?? '-'));
    const command = escapeHTML(p.command || '');
    const name = escapeHTML(p.name || '-');
    const cpu = clampPercent(p.cpu);
    const memory = clampPercent(p.memory);
    const memRSS = formatBytes(toFiniteNumber(p.memRSS));
    const stateText = escapeHTML(String(p.state || 'sleeping'));
    const stateClass = normalizeProcessState(p.state);
    const user = escapeHTML(p.user || '-');
    return `
    <tr>
      <td style="color: var(--text-muted)">${pid}</td>
      <td class="process-name" title="${command}">${name}</td>
      <td>
        <div class="cpu-bar-cell">
          <div class="mini-bar"><div class="mini-bar-fill cpu" style="width: ${cpu}%"></div></div>
          <span>${cpu.toFixed(1)}%</span>
        </div>
      </td>
      <td>
        <div class="cpu-bar-cell">
          <div class="mini-bar"><div class="mini-bar-fill mem" style="width: ${memory}%"></div></div>
          <span>${memory.toFixed(1)}%</span>
        </div>
      </td>
      <td>${memRSS}</td>
      <td><span class="state-badge state-${stateClass}">${stateText}</span></td>
      <td style="color: var(--text-muted)">${user}</td>
    </tr>
  `;
  }).join('');
}

// ─── UI: Logs ──────────────────────────────────────────────────────────────────
function addLogEntry(log) {
  state.logs.unshift(log);
  if (state.logs.length > state.maxLogs) state.logs.pop();

  const container = document.getElementById('log-stream');
  if (!container) return;

  const time = formatTime(log.timestamp);
  const level = normalizeLogLevel(log.level);
  const entry = document.createElement('div');
  entry.className = 'log-entry';
  const timeEl = document.createElement('span');
  timeEl.className = 'log-time';
  timeEl.textContent = time;

  const levelEl = document.createElement('span');
  levelEl.className = `log-level ${level}`;
  levelEl.textContent = level;

  const serviceEl = document.createElement('span');
  serviceEl.className = 'log-service';
  serviceEl.textContent = `[${String(log.service || '-')}]`;

  const msgEl = document.createElement('span');
  msgEl.className = 'log-msg';
  msgEl.textContent = String(log.message || '');

  entry.append(timeEl, levelEl, serviceEl, msgEl);

  container.insertBefore(entry, container.firstChild);

  // Max log sınırı
  while (container.children.length > 100) {
    container.removeChild(container.lastChild);
  }
}

// ─── UI: Capacity ─────────────────────────────────────────────────────────────
function updateCapacity(capacity) {
  if (!capacity || !capacity.disk) return;

  const disk = capacity.disk;
  setText('cap-disk-percent', `${disk.currentPercent.toFixed(1)}%`);

  const trendEl = document.getElementById('cap-disk-trend');
  if (trendEl) {
    const trendMap = {
      increasing: { cls: 'trend-up', icon: '↑', label: 'Artıyor' },
      decreasing: { cls: 'trend-down', icon: '↓', label: 'Azalıyor' },
      stable: { cls: 'trend-stable', icon: '→', label: 'Stabil' }
    };
    const t = trendMap[disk.trend] || trendMap.stable;
    trendEl.className = `trend-indicator ${t.cls}`;
    trendEl.textContent = `${t.icon} ${t.label}`;
  }

  const etaEl = document.getElementById('cap-disk-eta');
  if (etaEl) {
    if (disk.timeToFullMinutes !== null) {
      const hours = Math.floor(disk.timeToFullMinutes / 60);
      const mins = disk.timeToFullMinutes % 60;
      etaEl.textContent = hours > 0 ? `~${hours}s ${mins}dk` : `~${mins} dakika`;
    } else {
      etaEl.textContent = 'Stabil';
    }
  }
}

// ─── Controls ─────────────────────────────────────────────────────────────────
function initControls() {
  // Process search
  const searchInput = document.getElementById('process-search');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      state.processFilter = e.target.value;
      renderProcessTable();
    });
  }

  // Sort buttons
  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.currentSort = btn.dataset.sort;
      state.processes.sort((a, b) =>
        state.currentSort === 'cpu' ? b.cpu - a.cpu : b.memory - a.memory
      );
      renderProcessTable();
    });
  });

  // Tab buttons (Alerts / History)
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Threshold form
  const thresholdForm = document.getElementById('threshold-form');
  if (thresholdForm) {
    thresholdForm.addEventListener('submit', (e) => {
      e.preventDefault();
      applyThresholds();
    });
  }
}

function applyThresholds() {
  const thresholds = {
    cpu: {
      warning: parseInt(document.getElementById('th-cpu-warn').value),
      critical: parseInt(document.getElementById('th-cpu-crit').value)
    },
    memory: {
      warning: parseInt(document.getElementById('th-mem-warn').value),
      critical: parseInt(document.getElementById('th-mem-crit').value)
    },
    disk: {
      warning: parseInt(document.getElementById('th-disk-warn').value),
      critical: parseInt(document.getElementById('th-disk-crit').value)
    }
  };

  if (state.ws) {
    state.ws.send({ type: 'update_thresholds', data: thresholds });
  }

  showToast('Eşik değerleri güncelleniyor...', 'info');
}

// ─── System Info ──────────────────────────────────────────────────────────────
async function loadSysInfo() {
  try {
    const res = await fetch('/api/sysinfo');
    const info = await res.json();

    if (info.os) {
      setText('sysinfo-host', info.os.hostname || '-');
      setText('sysinfo-os', `${info.os.distro} ${info.os.release}`);
      setText('sysinfo-arch', info.os.arch);
    }
    if (info.cpu) {
      setText('sysinfo-cpu', `${info.cpu.brand} (${info.cpu.cores} çekirdek)`);
    }
  } catch (e) {
    console.warn('Sistem bilgisi yüklenemedi');
  }
}

async function loadThresholds() {
  try {
    const res = await fetch('/api/alerts/thresholds');
    const t = await res.json();

    setInputVal('th-cpu-warn', t.cpu?.warning || 70);
    setInputVal('th-cpu-crit', t.cpu?.critical || 90);
    setInputVal('th-mem-warn', t.memory?.warning || 75);
    setInputVal('th-mem-crit', t.memory?.critical || 90);
    setInputVal('th-disk-warn', t.disk?.warning || 80);
    setInputVal('th-disk-crit', t.disk?.critical || 95);
  } catch (e) {
    console.warn('Eşik değerleri yüklenemedi');
  }
}

// ─── Toast Notifications ──────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const iconEl = document.createElement('span');
  iconEl.textContent = icons[type] || icons.info;
  const messageEl = document.createElement('span');
  messageEl.textContent = message;
  toast.append(iconEl, messageEl);
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ─── Connection Status ─────────────────────────────────────────────────────────
function setConnectionStatus(connected) {
  const dot = document.getElementById('status-dot');
  const text = document.getElementById('status-text');
  if (dot) dot.className = `status-dot${connected ? '' : ' disconnected'}`;
  if (text) text.textContent = connected ? 'Bağlı' : 'Bağlantı Kesik';
}

// ─── Clock ───────────────────────────────────────────────────────────────────
function startClock() {
  const tick = () => {
    const el = document.getElementById('header-time');
    if (el) el.textContent = new Date().toLocaleTimeString('tr-TR');
  };
  tick();
  setInterval(tick, 1000);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setWidth(id, percent) {
  const el = document.getElementById(id);
  if (el) el.style.width = `${Math.min(Math.max(percent, 0), 100)}%`;
}

function setInputVal(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function setColorByValue(id, value, warnThresh, critThresh, normal, warn, crit) {
  const el = document.getElementById(id);
  if (!el) return;
  if (value >= critThresh) el.style.color = crit;
  else if (value >= warnThresh) el.style.color = warn;
  else el.style.color = normal;
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clampPercent(value) {
  return Math.min(Math.max(toFiniteNumber(value), 0), 100);
}

function normalizeAlertLevel(value) {
  const level = String(value ?? '').toUpperCase();
  return ['CRITICAL', 'WARNING', 'INFO'].includes(level) ? level : 'INFO';
}

function normalizeLogLevel(value) {
  const level = String(value ?? '').toUpperCase();
  return ['INFO', 'WARN', 'ERROR'].includes(level) ? level : 'INFO';
}

function normalizeProcessState(value) {
  return String(value ?? '').toLowerCase() === 'running' ? 'running' : 'sleeping';
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('tr-TR', {
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  });
}
