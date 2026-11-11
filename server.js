// server.js - Lightweight local static web server for MacroChef PWA
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const ROOT_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  let safePath = decodeURIComponent(req.url.split('?')[0]);
  if (safePath === '/' || safePath === '') {
    safePath = '/index.html';
  }

  const filePath = path.normalize(path.join(ROOT_DIR, safePath));
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = path.basename(filePath) === 'manifest.json'
      ? 'application/manifest+json; charset=utf-8'
      : MIME_TYPES[ext] || 'application/octet-stream';

    const headers = {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Access-Control-Allow-Origin': '*'
    };

    if (path.basename(filePath) === 'sw.js') {
      headers['Service-Worker-Allowed'] = '/';
      headers['Cache-Control'] = 'no-cache';
    }
    if (path.basename(filePath) === 'manifest.json') {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    fs.createReadStream(filePath).pipe(res);
  });
});

let currentPort = PORT;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`Port ${currentPort} is already in use. Retrying on port ${currentPort + 1}...`);
    currentPort += 1;
    server.listen(currentPort);
  } else {
    console.error('Server error:', err);
  }
});

server.on('listening', () => {
  const addr = server.address();
  console.log(`\n==================================================`);
  console.log(`🥗 MacroChef PWA is running!`);
  console.log(`👉 Local: http://localhost:${addr.port}/`);
  console.log(`==================================================\n`);
});

server.listen(currentPort);
