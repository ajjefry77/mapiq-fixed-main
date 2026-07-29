// ثبت‌کننده لایه‌های ترسیم/پین‌ها تا همیشه بالای لایه‌های نقشه پایه (بیس‌مپ) و WMS باقی بمانند.
// هر جا لایه‌ای برای ترسیم یا پین ساخته می‌شود، شناسه آن را با registerDrawLayer ثبت کنید.
// بعد از هر تغییر بیس‌مپ / اضافه‌شدن لایه جدید، bringDrawingsToFront(map) را صدا بزنید.

const registry = new Set();

export function registerDrawLayer(id) {
  if (id) registry.add(id);
}

export function registerDrawLayers(ids = []) {
  ids.forEach((id) => registerDrawLayer(id));
}

export function unregisterDrawLayer(id) {
  registry.delete(id);
}

export function bringDrawingsToFront(map) {
  if (!map || typeof map.getLayer !== "function") return;
  // ترتیب ثبت حفظ می‌شود؛ هر moveLayer بدون beforeId، لایه را به بالاترین سطح می‌برد
  registry.forEach((id) => {
    if (map.getLayer(id)) {
      try {
        map.moveLayer(id);
      } catch (e) {
        /* layer may not exist yet, ignore */
      }
    } else {
      registry.delete(id);
    }
  });
}

export function clearDrawLayerRegistry() {
  registry.clear();
}

// همه لایه‌های ساخته‌شده روی یک source مشخص را پیدا و ثبت می‌کند
// (لازم نیست هر suffix لایه -fill/-line/-point و... را دستی وارد کنید)
export function registerLayersForSource(map, sourceId) {
  if (!map || !sourceId || typeof map.getStyle !== "function") return;
  const style = map.getStyle();
  if (!style || !style.layers) return;
  style.layers.forEach((layer) => {
    if (layer.source === sourceId) registerDrawLayer(layer.id);
  });
}

// همه لایه‌های چند source را یکجا ثبت می‌کند
export function registerLayersForSources(map, sourceIds = []) {
  sourceIds.forEach((sourceId) => registerLayersForSource(map, sourceId));
}
