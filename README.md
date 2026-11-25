# Rohan Adepu · Portfolio and Travel Atlas

The homepage puts a short profile above a COBE travel atlas, with links to other projects below. Cities and journeys open their own MapLibre journal views.

## Run locally

Use Node.js 22.12+ and pnpm.

```sh
pnpm install
pnpm dev
```

The page is at `/`. Field journals use query links with a city ID, such as `/?city=your-city-id`. Use `pnpm build` to check TypeScript and produce the static site in `dist/`, and `pnpm preview` to view the public build locally.

The atlas loads OpenFreeMap street tiles when you open a city or a road trip. The journal entries remain usable with the map unavailable. The `atlas-redesign` branch is excluded from Vercel’s automatic deployments.

The dotted globe uses a land mask derived from [Natural Earth 1:10m land polygons, version 5.1.2](https://github.com/nvkelso/natural-earth-vector/blob/v5.1.2/geojson/ne_10m_land.geojson).

## Publish atlas entries

Add the cities, visits, and journeys you want to share to `src/atlas/public-data.ts`. To attach photos to a visit, copy the individual images you have selected into `public/atlas-images/` and list them in that visit’s `photos` array. Each photo uses a filename such as `city-overlook.jpg` and descriptive `alt` text. You can also include a caption and the image dimensions. Files in `public/` are served directly.

The Git-ignored `atlas-data.local/journal.json` can supplement the loopback development preview with private visits. For photo review, put selected JPEG copies and a `selection.json` file in the Git-ignored `atlas-photos.local/` directory. Each selection pairs a filename and alt text with the visit’s `cityId`, `placeId`, and `startDate`. The loopback server delivers only the selected copies. Production builds load only the entries in `src/atlas/public-data.ts`.

To preview new visits alongside the imported journal, add visit records to `atlas-photos.local/visits.json` using the same visit fields as `journal.json`.
