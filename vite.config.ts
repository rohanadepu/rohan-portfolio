import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

const journalDirectory = resolve(import.meta.dirname, 'atlas-data.local');
const loopback = '127.0.0.1';

export default defineConfig({
  server: {
    host: loopback,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/atlas-data.local/**'] },
  },
  plugins: [{
    name: 'local-travel-journal',
    apply: 'serve',
    configureServer(server) {
      if (server.config.server.host !== loopback) return;
      server.middlewares.use('/__atlas', async (request, response, next) => {
        const path = request.url?.split('?')[0];
        const photo = path?.match(/^\/photos\/([A-Za-z0-9_-]{30,60}\.jpg)$/)?.[1];
        if (request.method !== 'GET' || (path !== '/journal' && !photo)) return next();

        const host = request.headers.host ?? '';
        const site = request.headers['sec-fetch-site'];
        if (request.socket.remoteAddress !== loopback ||
            !/^(?:127\.0\.0\.1|localhost)(?::\d+)?$/.test(host) ||
            (request.headers.origin && request.headers.origin !== `http://${host}`) ||
            (site && site !== 'same-origin' && site !== 'none')) {
          response.writeHead(403).end();
          return;
        }
        try {
          const file = await readFile(resolve(journalDirectory, photo ? `photos/${photo}` : 'journal.json'));
          response.writeHead(200, {
            'Content-Type': photo ? 'image/jpeg' : 'application/json; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'Cross-Origin-Resource-Policy': 'same-origin',
          }).end(file);
        } catch (error) {
          const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
          response.writeHead(missing ? 404 : 500).end();
        }
      });
    },
  }],
});
