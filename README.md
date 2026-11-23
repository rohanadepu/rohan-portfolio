# Rohan Adepu · Portfolio and Travel Atlas

The site opens with a COBE travel atlas and MapLibre field journals, followed by a short profile and selected projects. The example visits and journeys are illustrative. The Kyoto image is generated for the preview.

## Run locally

Use Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

The page is at `/`. Field journals use query links such as `/?city=kyoto`. Use `pnpm build` to check TypeScript and produce the static site in `dist/`.

The atlas loads OpenFreeMap street tiles when you open a city or a road trip. The journal entries remain usable with the map unavailable. The `atlas-redesign` branch is excluded from Vercel’s automatic deployments.

The loopback development server can load an optional `atlas-data.local/journal.json` and its `photos/` directory. This directory is Git-ignored. Production builds use the sample records.
