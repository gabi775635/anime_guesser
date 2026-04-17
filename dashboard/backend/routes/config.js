// dashboard/backend/routes/config.js
// Expose les variables publiques du .env au frontend (sans les secrets)
// Chargé via <script src="/api/config.js"></script> dans chaque page HTML
const express = require('express');
const router  = express.Router();

router.get('/', (req, res) => {
  // Uniquement les variables non-sensibles destinées au frontend
  const cfg = {
    LEGAL_NAME:       process.env.LEGAL_NAME       || '',
    LEGAL_ADDRESS:    process.env.LEGAL_ADDRESS     || '',
    LEGAL_SIRET:      process.env.LEGAL_SIRET       || '',
    CONTACT_EMAIL:    process.env.CONTACT_EMAIL     || '',
    HOSTING_PROVIDER: process.env.HOSTING_PROVIDER  || '',
    HOSTING_ADDRESS:  process.env.HOSTING_ADDRESS   || '',
    DISCORD_INVITE:   process.env.DISCORD_INVITE    || '',
    TWITTER_HANDLE:   process.env.TWITTER_HANDLE    || '',
    YOUTUBE_CHANNEL:  process.env.YOUTUBE_CHANNEL   || '',
    TIKTOK_HANDLE:    process.env.TIKTOK_HANDLE     || '',
    INSTAGRAM_HANDLE: process.env.INSTAGRAM_HANDLE  || '',
    APP_URL:          process.env.APP_URL            || '',
  };

  // Retourné comme un script JS qui injecte les valeurs dans window.*
  const js = Object.entries(cfg)
    .map(([k, v]) => `window.${k} = ${JSON.stringify(v)};`)
    .join('\n');

  res.setHeader('Content-Type', 'application/javascript');
  res.send(`// Config publique AnimeGuesser — généré automatiquement\n${js}\n`);
});

module.exports = router;
