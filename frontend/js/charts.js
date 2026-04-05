/**
 * SysWatch — Charts Module
 * Chart.js ile gerçek zamanlı metrik grafikleri
 */

const CHART_MAX_POINTS = 60; // 60 veri noktası = ~2 dakika geçmiş

const CHART_DEFAULTS = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 300 },
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(15, 22, 41, 0.95)',
      borderColor: 'rgba(59, 130, 246, 0.3)',
      borderWidth: 1,
      titleColor: '#94a3b8',
      bodyColor: '#e2e8f0',
      padding: 10,
      cornerRadius: 8
    }
  },
  scales: {
    x: {
      display: false,
      grid: { display: false }
    },
    y: {
      grid: {
        color: 'rgba(255,255,255,0.04)',
        drawBorder: false
      },
      ticks: {
        color: '#475569',
        font: { family: "'JetBrains Mono'", size: 10 },
        maxTicksLimit: 5
      }
    }
  }
};

function createGradient(ctx, color1, color2) {
  const gradient = ctx.createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0, color1);
  gradient.addColorStop(1, color2);
  return gradient;
}

function initTimeLabels() {
  return Array.from({ length: CHART_MAX_POINTS }, (_, i) => `${CHART_MAX_POINTS - i}s`);
}

function pushData(arr, value) {
  arr.push(value);
  if (arr.length > CHART_MAX_POINTS) arr.shift();
}

// ─── CPU Chart ────────────────────────────────────────────────────────────────
let cpuChart;
const cpuData = {
  labels: initTimeLabels(),
  user: new Array(CHART_MAX_POINTS).fill(0),
  system: new Array(CHART_MAX_POINTS).fill(0)
};

function initCpuChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const userGrad = createGradient(ctx, 'rgba(59, 130, 246, 0.6)', 'rgba(59, 130, 246, 0.05)');
  const sysGrad = createGradient(ctx, 'rgba(6, 182, 212, 0.4)', 'rgba(6, 182, 212, 0.02)');

  cpuChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: cpuData.labels,
      datasets: [
        {
          label: 'User CPU',
          data: [...cpuData.user],
          borderColor: '#3b82f6',
          backgroundColor: userGrad,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        },
        {
          label: 'System CPU',
          data: [...cpuData.system],
          borderColor: '#06b6d4',
          backgroundColor: sysGrad,
          borderWidth: 1.5,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 4
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          min: 0,
          max: 100,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: v => `${v}%`
          }
        }
      }
    }
  });
}

function updateCpuChart(metrics) {
  if (!cpuChart) return;
  pushData(cpuData.user, metrics.cpu.userLoad);
  pushData(cpuData.system, metrics.cpu.systemLoad);
  cpuChart.data.datasets[0].data = [...cpuData.user];
  cpuChart.data.datasets[1].data = [...cpuData.system];
  cpuChart.update('none');
}

// ─── Memory Chart ─────────────────────────────────────────────────────────────
let memChart;
const memData = { values: new Array(CHART_MAX_POINTS).fill(0) };

function initMemChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const grad = createGradient(ctx, 'rgba(139, 92, 246, 0.6)', 'rgba(139, 92, 246, 0.03)');

  memChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: initTimeLabels(),
      datasets: [{
        label: 'Memory %',
        data: [...memData.values],
        borderColor: '#8b5cf6',
        backgroundColor: grad,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4
      }]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          min: 0,
          max: 100,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: v => `${v}%`
          }
        }
      }
    }
  });
}

function updateMemChart(metrics) {
  if (!memChart) return;
  pushData(memData.values, metrics.memory.usedPercent);
  memChart.data.datasets[0].data = [...memData.values];
  memChart.update('none');
}

// ─── Network Chart ────────────────────────────────────────────────────────────
let netChart;
const netData = {
  rx: new Array(CHART_MAX_POINTS).fill(0),
  tx: new Array(CHART_MAX_POINTS).fill(0)
};

function initNetChart(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const rxGrad = createGradient(ctx, 'rgba(16, 185, 129, 0.5)', 'rgba(16, 185, 129, 0.02)');
  const txGrad = createGradient(ctx, 'rgba(245, 158, 11, 0.4)', 'rgba(245, 158, 11, 0.02)');

  netChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: initTimeLabels(),
      datasets: [
        {
          label: 'RX (İndirme)',
          data: [...netData.rx],
          borderColor: '#10b981',
          backgroundColor: rxGrad,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        },
        {
          label: 'TX (Yükleme)',
          data: [...netData.tx],
          borderColor: '#f59e0b',
          backgroundColor: txGrad,
          borderWidth: 1.5,
          fill: true,
          tension: 0.4,
          pointRadius: 0
        }
      ]
    },
    options: {
      ...CHART_DEFAULTS,
      scales: {
        ...CHART_DEFAULTS.scales,
        y: {
          ...CHART_DEFAULTS.scales.y,
          ticks: {
            ...CHART_DEFAULTS.scales.y.ticks,
            callback: v => formatBytes(v, 1) + '/s'
          }
        }
      },
      plugins: {
        ...CHART_DEFAULTS.plugins,
        tooltip: {
          ...CHART_DEFAULTS.plugins.tooltip,
          callbacks: {
            label: ctx => `${ctx.dataset.label}: ${formatBytes(ctx.parsed.y)}/s`
          }
        }
      }
    }
  });
}

function updateNetChart(metrics) {
  if (!netChart) return;
  pushData(netData.rx, metrics.network.rx_sec);
  pushData(netData.tx, metrics.network.tx_sec);
  netChart.data.datasets[0].data = [...netData.rx];
  netChart.data.datasets[1].data = [...netData.tx];
  netChart.update('none');
}

// ─── CPU Core Bars ─────────────────────────────────────────────────────────
function updateCpuCores(cores) {
  const container = document.getElementById('cpu-cores-container');
  if (!container || !cores) return;

  if (container.children.length === 0) {
    // İlk oluşturma
    cores.forEach((val, i) => {
      const item = document.createElement('div');
      item.className = 'cpu-core-item';
      item.innerHTML = `
        <div class="cpu-core-label">C${i}</div>
        <div class="cpu-core-bar">
          <div class="cpu-core-fill" id="core-fill-${i}" style="height: ${val}%"></div>
        </div>
        <div class="cpu-core-value" id="core-val-${i}">${val.toFixed(0)}%</div>
      `;
      container.appendChild(item);
    });
  } else {
    cores.forEach((val, i) => {
      const fill = document.getElementById(`core-fill-${i}`);
      const valEl = document.getElementById(`core-val-${i}`);
      if (fill) fill.style.height = `${val}%`;
      if (valEl) valEl.textContent = `${val.toFixed(0)}%`;
    });
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

// Global erişim
window.initCpuChart = initCpuChart;
window.updateCpuChart = updateCpuChart;
window.initMemChart = initMemChart;
window.updateMemChart = updateMemChart;
window.initNetChart = initNetChart;
window.updateNetChart = updateNetChart;
window.updateCpuCores = updateCpuCores;
window.formatBytes = formatBytes;
