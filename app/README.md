# LAYRS NL app

Expo (SDK 58) app for iOS and Android, with a web build for previews. Screens follow `../docs/design/`.

| Tab | What it does |
|---|---|
| Карта | Country, city and building on one map: periods or monuments, city lenses, year slider, guided walk |
| Маршруты | Walk planner: from the map centre or your position, interests, length, loop or one way; routed along streets |
| Мои | Saved buildings and walks, city pack sizes, data sources |
| Поиск | Municipalities, stories of the current city, any Dutch address (PDOK Locatieserver) |

The building card and the lens list are form sheets (`src/app/building.tsx`, `src/app/lenses.tsx`).

## Map

- Native: `@maplibre/maplibre-react-native` 11 (MapLibre Native iOS 6.31 / Android 13.6, `pmtiles://` support).
  Needs a development build: it is not in Expo Go.
- Web: `maplibre-gl` 5.6.0 with `pmtiles`. Version 6 runs its worker as an ES module that Metro does not bundle.
- One style for both: `src/data/style.ts`. Data comes from Cloudflare R2 (`src/data/config.ts`); bump `DATA_REV` after an upload.
- Lenses colour buildings with a `match` on the building id, so the same expression works on both renderers.

## Run

```bash
npm install
npx expo start --web                       # web preview
npx @expo/agent-cli dev --ios --dev-client # iOS development build (needs Xcode)
```
