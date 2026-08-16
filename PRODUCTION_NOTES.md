# Production hardening applied

This revision applies the highest-priority fixes identified in the static audit.

## Applied

- Removed repository `.env` and `.env.production` files containing credentials.
- Added `.env.example` with placeholders only.
- Added environment files to `.gitignore` while keeping `.env.example`.
- Enforced route `requiredRole` and `permission` metadata in the Vue Router guard.
- Removed raw `v-html` rendering from `FeatureInfoPanel.vue`.
- Replaced raw WMS world-BBOX loading with viewport tile BBOX (`EPSG:3857`).
- Added configurable `VITE_GEOSERVER_WORKSPACE`.
- Replaced the fixed 20,000-feature Cesium WFS load with a viewport-scoped request capped by `VITE_WFS_MAX_FEATURES`.
- Added defensive handling for missing WFS height attributes.
- Throttled Mapbox mouse coordinate/projection work with `requestAnimationFrame`.
- Replaced Cesium per-frame scale updates with throttled camera-change updates.
- Revoked KML object URLs after loading.
- Replaced the static Cesium file ID with `crypto.randomUUID()`.
- Added listener/timer teardown support to the security monitoring utility.
- Made the default `npm run dev` start the client only because the supplied archive does not contain the referenced `server/` directory.

## Required before deployment

1. Supply real deployment environment variables through the deployment secret manager.
2. Rotate every credential that was present in the original archive.
3. Restore/verify the backend separately; the supplied archive contains no `server/` directory.
4. Run `npm ci && npm run build` in CI.
5. Verify backend authorization independently of frontend route guards.
6. Test WFS/GeoServer performance with production-scale data.
7. Run browser-based responsive and accessibility tests at 320, 375, 390, 414, 768, 1024, 1280, 1440 and 1920px.
