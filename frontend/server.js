// Serveur de développement minimaliste — port 1420
// Lance avec : node server.js
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = 1420;
const SRC  = join(__dirname, 'src');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css',
  '.js':   'application/javascript',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
};

createServer(async (req, res) => {
  let path = req.url === '/' ? '/index.html' : req.url;
  const filePath = join(SRC, path);

  try {
    const data = await readFile(filePath);
    const ext  = extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
    res.end(data);
  } catch {
    // SPA fallback → index.html
    try {
      const data = await readFile(join(SRC, 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }
}).listen(PORT, () => {
  console.log(`\x1b[32m[dev]\x1b[0m Serveur démarré → http://localhost:${PORT}`);
  console.log('\x1b[33m[info]\x1b[0m Lance "npm run tauri dev" dans un autre terminal');
});
