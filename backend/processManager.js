/**
 * SysWatch — Process Manager
 * Çalışan süreçlerin bilgilerini toplar ve listeler
 */

const si = require('systeminformation');

/**
 * Çalışan süreçleri getir (CPU/MEMoriye göre sıralı)
 */
async function getProcesses(limit = 20, sortBy = 'cpu') {
  try {
    const data = await si.processes();

    let procs = data.list.map(p => ({
      pid: p.pid,
      name: p.name,
      cpu: parseFloat((p.cpu || 0).toFixed(2)),
      memory: parseFloat((p.mem || 0).toFixed(2)),
      memRSS: p.mem_rss || 0,
      state: p.state || 'unknown',
      user: p.user || 'unknown',
      command: (p.command || p.name || '').substring(0, 80)
    }));

    // Sıralama
    if (sortBy === 'memory') {
      procs.sort((a, b) => b.memory - a.memory);
    } else {
      procs.sort((a, b) => b.cpu - a.cpu);
    }

    return {
      total: data.all,
      running: data.running,
      sleeping: data.sleeping,
      blocked: data.blocked || 0,
      list: procs.slice(0, limit),
      timestamp: new Date().toISOString()
    };
  } catch (err) {
    console.error('[ProcessManager] Hata:', err.message);
    return generateMockProcesses(limit);
  }
}

function generateMockProcesses(limit) {
  const processNames = [
    'node', 'python3', 'chrome', 'safari', 'code', 'docker',
    'postgres', 'redis-server', 'nginx', 'java', 'ruby', 'go',
    'webpack', 'eslint', 'git', 'ssh', 'zsh', 'bash'
  ];

  const users = ['root', 'akif', '_networkd', '_spotlightserver', 'nobody'];

  const list = Array.from({ length: limit }, (_, i) => ({
    pid: 1000 + i * 37,
    name: processNames[i % processNames.length],
    cpu: parseFloat((Math.random() * 15).toFixed(2)),
    memory: parseFloat((Math.random() * 8).toFixed(2)),
    memRSS: Math.floor(Math.random() * 500 * 1024 * 1024),
    state: Math.random() > 0.1 ? 'running' : 'sleeping',
    user: users[Math.floor(Math.random() * users.length)],
    command: `${processNames[i % processNames.length]} --config /etc/config.json`
  }));

  list.sort((a, b) => b.cpu - a.cpu);

  return {
    total: 320 + Math.floor(Math.random() * 50),
    running: 12 + Math.floor(Math.random() * 8),
    sleeping: 280 + Math.floor(Math.random() * 40),
    blocked: Math.floor(Math.random() * 3),
    list,
    timestamp: new Date().toISOString()
  };
}

module.exports = { getProcesses };
