// services/docker.js — Wrapper Docker partagé entre toutes les routes
const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

// Retourne tous les conteneurs du projet (running + stopped)
async function getAllContainers() {
  const all = await docker.listContainers({ all: true });
  return all.filter(
    c => c.Labels?.['animeguesser.service'] || c.Names?.[0]?.includes('animeguesser')
  );
}

// Stats brutes d'un conteneur (CPU, mémoire)
async function getContainerStats(id) {
  try {
    const container = docker.getContainer(id);
    return await new Promise((resolve, reject) => {
      container.stats({ stream: false }, (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });
  } catch {
    return null;
  }
}

function parseCpu(stats) {
  if (!stats) return 0;
  const cpu = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
  const sys = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
  const n = stats.cpu_stats.online_cpus || 1;
  return sys > 0 ? parseFloat(((cpu / sys) * n * 100).toFixed(1)) : 0;
}

function parseMem(stats) {
  if (!stats) return { used: 0, total: 0, pct: 0 };
  const used = stats.memory_stats.usage || 0;
  const total = stats.memory_stats.limit || 1;
  return {
    used:  Math.round(used / 1024 / 1024),
    total: Math.round(total / 1024 / 1024),
    pct:   parseFloat(((used / total) * 100).toFixed(1)),
  };
}

// Detect image name d'un service depuis les conteneurs existants
async function detectImageName(service) {
  try {
    const containers = await getAllContainers();
    const match = containers.find(c => c.Labels?.['animeguesser.service'] === service);
    return match?.Image || null;
  } catch {
    return null;
  }
}

// Exécute une commande dans un conteneur, retourne stdout sous forme de string
async function execInContainer(containerId, cmd) {
  const container = docker.getContainer(containerId);
  const exec = await container.exec({
    Cmd: cmd,
    AttachStdout: true,
    AttachStderr: true,
  });
  const stream = await exec.start({ hijack: true, stdin: false });
  return new Promise((resolve) => {
    let output = '';
    stream.on('data', chunk => {
      // Docker multiplexe stdout/stderr : les 8 premiers octets sont un header
      const raw = chunk.toString('utf8');
      output += raw.length > 8 ? raw.slice(8) : raw;
    });
    stream.on('end', () => resolve(output));
    stream.on('error', () => resolve(''));
    // Timeout sécurité
    setTimeout(() => resolve(output), 5000);
  });
}

module.exports = {
  docker,
  getAllContainers,
  getContainerStats,
  parseCpu,
  parseMem,
  detectImageName,
  execInContainer,
};
