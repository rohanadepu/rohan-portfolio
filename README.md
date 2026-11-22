# Rohan Adepu · Portfolio and Travel Atlas

The portfolio and atlas share a single Vite build, navigation, and visual style. The atlas has a COBE world view and MapLibre field journals. The example visits and journeys are illustrative. The Kyoto image is generated for the preview.

## Run locally

Use Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

The portfolio is at `/`. The atlas is at `/atlas/`. Use `pnpm build` to check TypeScript and produce the static site in `dist/`.

The header schedule uses Mountain Time (`America/Denver`). The atlas loads OpenFreeMap street tiles when you open a city or a road trip. The journal entries remain usable with the map unavailable. The `atlas-redesign` branch is excluded from Vercel’s automatic deployments.
