// services/ws.js — Broadcast WebSocket partagé
const wsClients = new Set();

function register(ws) {
  wsClients.add(ws);
  ws.on('close', () => wsClients.delete(ws));
}

function broadcast(data) {
  const msg = JSON.stringify(data);
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg);
  }
}

function size() {
  return wsClients.size;
}

module.exports = { register, broadcast, size };
