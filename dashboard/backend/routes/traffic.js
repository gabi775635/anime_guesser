// routes/traffic.js — Statistiques de trafic depuis les logs nginx LB
const express = require('express');
const router  = express.Router();
const { requireAuth }     = require('../middleware/auth');
const { docker, getAllContainers } = require('../services/docker');

const LB_CONTAINER = process.env.LB_CONTAINER || 'animeguesser_lb';

router.get('/', requireAuth, async (req, res) => {
  try {
    const lbLogs = await docker.getContainer(LB_CONTAINER).logs({
      stdout: true, stderr: true, tail: 500, timestamps: false,
    });
    const lines = lbLogs.toString('utf8').split('\n').filter(Boolean);

    const containerHits = {};
    const statusCount   = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    const minutesBuckets = {};
    let totalRequests = 0;

    for (const line of lines) {
      const clean = line.length > 8 ? line.slice(8) : line;

      const upstreamMatch = clean.match(/upstream="([^"]+)"/);
      if (upstreamMatch) {
        const ip = upstreamMatch[1];
        containerHits[ip] = (containerHits[ip] || 0) + 1;
      }

      const statusMatch = clean.match(/" (\d{3}) /);
      if (statusMatch) {
        totalRequests++;
        const code = parseInt(statusMatch[1]);
        if      (code < 300) statusCount['2xx']++;
        else if (code < 400) statusCount['3xx']++;
        else if (code < 500) statusCount['4xx']++;
        else                 statusCount['5xx']++;
      }

      const timeMatch = clean.match(/\[(\d{2}\/\w+\/\d{4}):(\d{2}:\d{2}):\d{2}/);
      if (timeMatch) {
        const key = timeMatch[2];
        minutesBuckets[key] = (minutesBuckets[key] || 0) + 1;
      }
    }

    // Résout les IPs en noms de conteneurs
    const namedHits = {};
    const containers = await getAllContainers();
    for (const [ip, count] of Object.entries(containerHits)) {
      const ipOnly = ip.split(':')[0];
      const match  = containers.find(c => {
        const networks = c.NetworkSettings?.Networks || {};
        return Object.values(networks).some(n => n.IPAddress === ipOnly);
      });
      const label = match ? match.Names[0].replace('/', '') : ip;
      namedHits[label] = (namedHits[label] || 0) + count;
    }

    res.json({
      totalRequests,
      statusCount,
      containerHits: namedHits,
      requestsOverTime: Object.entries(minutesBuckets)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([time, count]) => ({ time, count })),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
