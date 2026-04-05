/**
 * SysWatch — Alert Engine
 * Eşik tabanlı kural motoru: CPU, RAM, Disk, Network uyarıları
 */

const ALERT_LEVELS = {
  INFO: 'INFO',
  WARNING: 'WARNING',
  CRITICAL: 'CRITICAL'
};

// Varsayılan eşik değerleri
const DEFAULT_THRESHOLDS = {
  cpu: {
    warning: 70,
    critical: 90
  },
  memory: {
    warning: 75,
    critical: 90
  },
  disk: {
    warning: 80,
    critical: 95
  },
  network: {
    warning: 80 * 1024 * 1024, // 80 MB/s (bytes)
    critical: 100 * 1024 * 1024
  }
};

class AlertEngine {
  constructor() {
    this.thresholds = { ...DEFAULT_THRESHOLDS };
    this.activeAlerts = new Map();
    this.alertHistory = [];
    this.maxHistory = 100;
  }

  /**
   * Metrikleri analiz et ve uyarıları üret
   */
  evaluate(metrics) {
    const newAlerts = [];

    // CPU kontrolü
    const cpuAlert = this._checkThreshold(
      'cpu_usage',
      metrics.cpu.usage,
      this.thresholds.cpu,
      'CPU Kullanımı',
      '%'
    );
    if (cpuAlert) newAlerts.push(cpuAlert);

    // RAM kontrolü
    const memAlert = this._checkThreshold(
      'memory_usage',
      metrics.memory.usedPercent,
      this.thresholds.memory,
      'RAM Kullanımı',
      '%'
    );
    if (memAlert) newAlerts.push(memAlert);

    // Disk kontrolü (her disk için)
    if (metrics.disk && metrics.disk.filesystems) {
      metrics.disk.filesystems.forEach((fs, idx) => {
        const diskAlert = this._checkThreshold(
          `disk_${idx}`,
          fs.use,
          this.thresholds.disk,
          `Disk (${fs.fs})`,
          '%'
        );
        if (diskAlert) newAlerts.push(diskAlert);
      });
    }

    // Birleştirilmiş aktif uyarıları döndür
    return this._mergeAlerts(newAlerts);
  }

  /**
   * Eşik kontrolü — seviye belirleme
   */
  _checkThreshold(id, value, thresholds, label, unit) {
    let level = null;
    let message = '';

    if (value >= thresholds.critical) {
      level = ALERT_LEVELS.CRITICAL;
      message = `${label} kritik seviyede: ${value.toFixed(1)}${unit} (eşik: ${thresholds.critical}${unit})`;
    } else if (value >= thresholds.warning) {
      level = ALERT_LEVELS.WARNING;
      message = `${label} yüksek: ${value.toFixed(1)}${unit} (eşik: ${thresholds.warning}${unit})`;
    } else {
      // Aktif uyarıyı temizle
      if (this.activeAlerts.has(id)) {
        this.activeAlerts.delete(id);
      }
      return null;
    }

    const alert = {
      id,
      level,
      message,
      value: parseFloat(value.toFixed(2)),
      timestamp: new Date().toISOString()
    };

    this.activeAlerts.set(id, alert);
    return alert;
  }

  /**
   * Uyarıları birleştir ve geçmişe ekle
   */
  _mergeAlerts(newAlerts) {
    newAlerts.forEach(alert => {
      if (this.alertHistory.length >= this.maxHistory) {
        this.alertHistory.shift();
      }
      this.alertHistory.push(alert);
    });

    return Array.from(this.activeAlerts.values());
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory() {
    return [...this.alertHistory].reverse();
  }

  updateThresholds(newThresholds) {
    this.thresholds = { ...this.thresholds, ...newThresholds };
  }

  getThresholds() {
    return { ...this.thresholds };
  }
}

module.exports = new AlertEngine();
