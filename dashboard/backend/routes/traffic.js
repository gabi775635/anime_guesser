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

    const containerHits  = {};
    const statusCount    = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0 };
    const minutesBuckets = {};
    const requests       = [];
    let totalRequests    = 0;

    // Résout les IPs une seule fois
    const containers = await getAllContainers();
    function resolveIp(ip) {
      const ipOnly = ip.split(':')[0];
      const match  = containers.find(c => {
        const networks = c.NetworkSettings?.Networks || {};
        return Object.values(networks).some(n => n.IPAddress === ipOnly);
      });
      return match ? match.Names[0].replace('/', '') : ip;
    }

    for (const line of lines) {
      const clean = line.length > 8 ? line.slice(8) : line;

      // Upstream container
      const upstreamMatch = clean.match(/upstream="([^"]+)"/);
      if (upstreamMatch) {
        const ip    = upstreamMatch[1];
        const label = resolveIp(ip);
        containerHits[label] = (containerHits[label] || 0) + 1;
      }

      // Status code
      const statusMatch = clean.match(/" (\d{3}) /);
      if (statusMatch) {
        totalRequests++;
        const code = parseInt(statusMatch[1]);
        if      (code < 300) statusCount['2xx']++;
        else if (code < 400) statusCount['3xx']++;
        else if (code < 500) statusCount['4xx']++;
        else                 statusCount['5xx']++;
      }

      // Buckets par minute
      const timeMatch = clean.match(/\[(\d{2}\/\w+\/\d{4}):(\d{2}:\d{2}):\d{2}/);
      if (timeMatch) {
        const key = timeMatch[2];
        minutesBuckets[key] = (minutesBuckets[key] || 0) + 1;
      }

      // Parse ligne nginx combined log format:
      // 1.2.3.4 - - [17/Apr/2026:12:00:00 +0000] "GET /api/v1 HTTP/1.1" 200 512 "-" "Mozilla/5.0"
      const reqMatch = clean.match(
        /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\w+)\s+(\S+)\s+[^"]*"\s+(\d{3})\s+(\d+|-)/
      );
      if (reqMatch) {
        const [, ip, time, method, path, status, size] = reqMatch;
        const upstream = clean.match(/upstream="([^"]+)"/);
        requests.push({
          ip,
          time:      time.split(' ')[0],   // ex: 17/Apr/2026:12:00:00
          method,
          path,
          status:    parseInt(status),
          size:      size === '-' ? '—' : size + ' B',
          container: upstream ? resolveIp(upstream[1]) : ip,
        });
      }
    }

    res.json({
      totalRequests,
      statusCount,
      containerHits,
      requests: requests.slice(-200).reverse(), // 200 dernières, plus récente en premier
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
