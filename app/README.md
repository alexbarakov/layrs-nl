# LAYRS NL app

Expo (SDK 58) app for iOS and Android, with a web build for previews. Screens follow `../docs/design/`.

| Tab | What it does |
|---|---|
| Карта | Country, city and building on one map; a layers button and the «Слой» row open the layers sheet; year slider, guided walk |
| Маршруты | Walk planner: from the map centre or your position, interests, length, loop or one way; routed along streets |
| Печати | Stamp journal: a page per city with progress |
| Поиск | Municipalities, stories of the current city, any Dutch address (PDOK Locatieserver) |

The building card, the layers sheet and the stamp are form sheets (`src/app/building.tsx`, `layers.tsx`, `stamp.tsx`). The layers sheet holds three ways to colour buildings (period, monuments, height), the stamps toggle and the city's themed layers (lenses); the building card lists every layer the building is in, and a tap shows that layer on the map. Saved walks live in the Walks tab.

## Stamps

Stamps of the municipality under the map centre show as ink rings (filled once collected). Within 60 m of one, with GPS
accuracy of 50 m or better, the map shows «Вы у … — поставить печать»; the stamp sheet's button works only then.
Collected stamps live on the device (`src/data/stamps.ts`, expo-sqlite kv). In development a long press on the map
(right click on web) sets a simulated position, so stamps and walks can be tested without walking.

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
