import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { atlasPreview } from './src/atlas/journal';

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
      server.middlewares.use('/__atlas', async (request, response) => {
        const path = request.url?.split('?')[0];
        if (request.method !== 'GET' || path !== '/journal') {
          response.writeHead(404).end();
          return;
        }

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
          const file = await readFile(resolve(journalDirectory, 'journal.json'), 'utf8');
          const preview = JSON.stringify(atlasPreview(JSON.parse(file)));
          response.writeHead(200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'Cross-Origin-Resource-Policy': 'same-origin',
          }).end(preview);
        } catch (error) {
          const missing = error instanceof Error && 'code' in error && error.code === 'ENOENT';
          response.writeHead(missing ? 404 : 500).end();
        }
      });
    },
  }],
});
