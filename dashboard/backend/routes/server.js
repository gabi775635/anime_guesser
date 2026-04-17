// routes/server.js — Performances serveur globales
const express = require('express');
const router  = express.Router();
const { requireAuth }     = require('../middleware/auth');
const { getAllContainers, getContainerStats, parseCpu, parseMem } = require('../services/docker');

// ── GET /api/server/perf ───────────────────────────────────────────────────────
router.get('/perf', requireAuth, async (req, res) => {
  try {
    const containers = await getAllContainers();
    const running    = containers.filter(c => c.State === 'running');

    const allStats = await Promise.all(running.map(async (c) => {
      const s   = await getContainerStats(c.Id);
      const mem = parseMem(s);
      return {
        name:    c.Names[0].replace('/', ''),
        service: c.Labels?.['animeguesser.service'] ?? 'unknown',
        cpu:     parseCpu(s),
        memMB:   mem.used,
        memPct:  mem.pct,
      };
    }));

    const totalCpu = allStats.reduce((s, c) => s + c.cpu, 0);
    const totalMem = allStats.reduce((s, c) => s + c.memMB, 0);

    res.json({
      containers: allStats,
      totalCpu:   parseFloat(totalCpu.toFixed(1)),
      totalMemMB: totalMem,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
