// Servidor estático mínimo para probar el portal localmente (sin dependencias)
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname);
const PORT = process.env.PORT || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ico': 'image/x-icon',
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  // Carpeta sin "/" final → redirigir (igual que GitHub Pages)
  if (!p.endsWith('/') && !path.extname(p)) {
    const dir = path.join(ROOT, p);
    if (dir.startsWith(ROOT) && fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
      res.writeHead(301, { Location: p + '/' }); return res.end();
    }
  }
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(ROOT, p);
  if (!file.startsWith(ROOT) || path.basename(file).startsWith('.') || file.endsWith('server.js')) {
    res.writeHead(403); return res.end('Prohibido');
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('No encontrado'); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}).listen(PORT, () => console.log(`Portal en http://localhost:${PORT}/`));

