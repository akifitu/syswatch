/**
 * SysWatch — Metrics Collector
 * systeminformation paketi ile gerçek sistem metriklerini toplar
 */

const si = require('systeminformation');

// Önceki network okuma değerleri (delta hesabı için)
let prevNetworkStats = null;
let prevNetworkTime = Date.now();

/**
 * Tüm sistem metriklerini topla
 */
async function collectMetrics() {
  try {
    const [cpuLoad, mem, fsSize, networkStats, cpuTemp] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.cpuTemperature().catch(() => ({ main: null }))
    ]);

    // CPU
    const cpu = {
      usage: parseFloat(cpuLoad.currentLoad.toFixed(2)),
      userLoad: parseFloat(cpuLoad.currentLoadUser.toFixed(2)),
      systemLoad: parseFloat(cpuLoad.currentLoadSystem.toFixed(2)),
      idleLoad: parseFloat(cpuLoad.currentLoadIdle.toFixed(2)),
      cores: cpuLoad.cpus.map(c => parseFloat(c.load.toFixed(2))),
      temperature: cpuTemp.main || null
    };

    // Memory
    const totalGB = (mem.total / 1024 / 1024 / 1024).toFixed(2);
    const usedGB = ((mem.total - mem.available) / 1024 / 1024 / 1024).toFixed(2);
    const usedPercent = parseFloat(((mem.total - mem.available) / mem.total * 100).toFixed(2));

    const memory = {
      total: mem.total,
      used: mem.total - mem.available,
      available: mem.available,
      usedPercent,
      totalGB: parseFloat(totalGB),
      usedGB: parseFloat(usedGB),
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    };

    // Disk
    const filesystems = fsSize
      .filter(fs => fs.size > 0)
      .slice(0, 5)
      .map(fs => ({
        fs: fs.fs,
        type: fs.type,
        size: fs.size,
        used: fs.used,
        available: fs.available,
        use: parseFloat(fs.use.toFixed(2)),
        mount: fs.mount
      }));

    const disk = { filesystems };

    // Network (bytes/sec delta hesabı)
    const now = Date.now();
    const elapsed = (now - prevNetworkTime) / 1000;

    let network = { rx_sec: 0, tx_sec: 0, rx_total: 0, tx_total: 0, interfaces: [] };

    if (networkStats && networkStats.length > 0) {
      const totalRx = networkStats.reduce((sum, s) => sum + (s.rx_bytes || 0), 0);
      const totalTx = networkStats.reduce((sum, s) => sum + (s.tx_bytes || 0), 0);

      if (prevNetworkStats) {
        const rxDelta = Math.max(0, totalRx - prevNetworkStats.rx);
        const txDelta = Math.max(0, totalTx - prevNetworkStats.tx);
        network.rx_sec = parseFloat((rxDelta / elapsed).toFixed(0));
        network.tx_sec = parseFloat((txDelta / elapsed).toFixed(0));
      }

      network.rx_total = totalRx;
      network.tx_total = totalTx;
      network.interfaces = networkStats.slice(0, 3).map(s => ({
        iface: s.iface,
        rx_bytes: s.rx_bytes,
        tx_bytes: s.tx_bytes
      }));

      prevNetworkStats = { rx: totalRx, tx: totalTx };
      prevNetworkTime = now;
    }

    return {
      timestamp: new Date().toISOString(),
      cpu,
      memory,
      disk,
      network
    };
  } catch (err) {
    console.error('[Metrics] Hata:', err.message);
    return generateMockMetrics();
  }
}

/**
 * Geliştirme/test için simüle edilmiş metrikler
 */
function generateMockMetrics() {
  const cpuUsage = 30 + Math.random() * 50;
  const memUsed = 55 + Math.random() * 20;

  return {
    timestamp: new Date().toISOString(),
    cpu: {
      usage: parseFloat(cpuUsage.toFixed(2)),
      userLoad: parseFloat((cpuUsage * 0.7).toFixed(2)),
      systemLoad: parseFloat((cpuUsage * 0.3).toFixed(2)),
      idleLoad: parseFloat((100 - cpuUsage).toFixed(2)),
      cores: Array.from({ length: 8 }, () => parseFloat((Math.random() * 80).toFixed(2))),
      temperature: 45 + Math.random() * 20
    },
    memory: {
      total: 16 * 1024 * 1024 * 1024,
      used: (memUsed / 100) * 16 * 1024 * 1024 * 1024,
      available: ((100 - memUsed) / 100) * 16 * 1024 * 1024 * 1024,
      usedPercent: parseFloat(memUsed.toFixed(2)),
      totalGB: 16,
      usedGB: parseFloat((memUsed / 100 * 16).toFixed(2)),
      swapTotal: 4 * 1024 * 1024 * 1024,
      swapUsed: 0.5 * 1024 * 1024 * 1024
    },
    disk: {
      filesystems: [
        {
          fs: '/dev/disk1s1',
          type: 'apfs',
          size: 500 * 1024 * 1024 * 1024,
          used: 200 * 1024 * 1024 * 1024,
          available: 300 * 1024 * 1024 * 1024,
          use: 40,
          mount: '/'
        }
      ]
    },
    network: {
      rx_sec: Math.floor(Math.random() * 5000000),
      tx_sec: Math.floor(Math.random() * 2000000),
      rx_total: 1024 * 1024 * 1024,
      tx_total: 512 * 1024 * 1024,
      interfaces: []
    }
  };
}

/**
 * Sistem bilgilerini topla (bir kez)
 */
async function getSystemInfo() {
  try {
    const [cpu, os, system] = await Promise.all([
      si.cpu(),
      si.osInfo(),
      si.system()
    ]);

    return {
      cpu: {
        brand: cpu.brand,
        manufacturer: cpu.manufacturer,
        cores: cpu.cores,
        physicalCores: cpu.physicalCores,
        speed: cpu.speed,
        speedMax: cpu.speedMax
      },
      os: {
        platform: os.platform,
        distro: os.distro,
        release: os.release,
        arch: os.arch,
        hostname: os.hostname
      },
      system: {
        manufacturer: system.manufacturer,
        model: system.model
      },
      uptime: process.uptime()
    };
  } catch (err) {
    return { error: 'Sistem bilgisi alınamadı' };
  }
}

module.exports = { collectMetrics, getSystemInfo };
