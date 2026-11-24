import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { atlasPreview, type CuratedPhoto, type VisitRecord } from './src/atlas/journal';

const journalDirectory = resolve(import.meta.dirname, 'atlas-data.local');
const photoDirectory = resolve(import.meta.dirname, 'atlas-photos.local');
const loopback = '127.0.0.1';

function isMissing(error: unknown) {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

async function readLocalList<T>(filename: string): Promise<T[]> {
  const contents = await readFile(resolve(photoDirectory, filename), 'utf8').catch(error => {
    if (isMissing(error)) return '[]';
    throw error;
  });
  return JSON.parse(contents);
}

async function readJournalPreview(selection: CuratedPhoto[]) {
  const [contents, additionalVisits] = await Promise.all([
    readFile(resolve(journalDirectory, 'journal.json'), 'utf8'),
    readLocalList<VisitRecord>('visits.json'),
  ]);
  return JSON.stringify(atlasPreview(JSON.parse(contents), selection, additionalVisits));
}

export default defineConfig({
  server: {
    host: loopback,
    fs: { deny: ['.env', '.env.*', '*.{crt,pem}', '**/.git/**', '**/atlas-data.local/**', '**/atlas-photos.local/**'] },
  },
  plugins: [{
    name: 'local-travel-journal',
    apply: 'serve',
    configureServer(server) {
      if (server.config.server.host !== loopback) return;
      server.middlewares.use('/__atlas', async (request, response) => {
        const path = request.url?.split('?')[0];
        const photo = path?.match(/^\/photos\/([\w-]+\.jpg)$/)?.[1];
        if (request.method !== 'GET' || (path !== '/journal' && !photo)) {
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
          const selection = await readLocalList<CuratedPhoto>('selection.json');
          if (photo && !selection.some(item => item.file === photo)) {
            response.writeHead(404).end();
            return;
          }
          const body = photo
            ? await readFile(resolve(photoDirectory, photo))
            : await readJournalPreview(selection);
          response.writeHead(200, {
            'Content-Type': photo ? 'image/jpeg' : 'application/json; charset=utf-8',
            'Cache-Control': 'private, no-store',
            'Cross-Origin-Resource-Policy': 'same-origin',
          }).end(body);
        } catch (error) {
          response.writeHead(isMissing(error) ? 404 : 500).end();
        }
      });
    },
  }],
});
