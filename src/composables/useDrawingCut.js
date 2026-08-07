import * as turf from "@turf/turf";
import { registerDrawLayer } from "../utils/layerOrder";

export function createCutHandler(ctx) {
  const cutPieceColors = [
    "#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899", "#eab308",
  ];

  function splitPolyline(pin, cutLine) {
    const coords = pin.shape.positions.map((p) => [p.lon, p.lat]);
    const lineFeature = turf.lineString(coords, { originalId: pin.id });
    const split = turf.lineSplit(lineFeature, cutLine);
    if (split.features.length > 1) {
      return split.features.map((feat, index) => {
        const newPositions = feat.geometry.coordinates.map(([lon, lat]) => ({
          lon, lat, height: 0,
        }));
        return {
          ...pin,
          id: crypto.randomUUID(),
          name: `${pin.name} (بخش ${index + 1})`,
          shape: { ...pin.shape, type: "polyline", positions: newPositions },
          save: -1,
        };
      });
    }
    return [pin];
  }

  function splitPolygon(pin, cutLine) {
    const coords = [pin.shape.positions.map((p) => [p.lon, p.lat])];
    const firstPt = coords[0][0];
    const lastPt = coords[0][coords[0].length - 1];
    if (firstPt[0] !== lastPt[0] || firstPt[1] !== lastPt[1]) {
      coords[0].push([...firstPt]);
    }
    const polygonFeature = turf.polygon(coords, { originalId: pin.id });
    const cutBuffer = turf.buffer(cutLine, 0.03, { units: "meters" });
    const diff = turf.difference(
      turf.featureCollection([polygonFeature, cutBuffer]),
    );
    if (!diff) return [pin];
    const pieces =
      diff.geometry.type === "Polygon"
        ? [diff.geometry.coordinates]
        : diff.geometry.coordinates;
    if (pieces.length < 2) return [pin];
    return pieces.map((piece, index) => {
      const ring = piece[0];
      const newPositions = ring.map(([lon, lat]) => ({ lon, lat, height: 0 }));
      const newColor = cutPieceColors[index % cutPieceColors.length];
      return {
        ...pin,
        id: crypto.randomUUID(),
        name: `${pin.name} cut ${index + 1}`,
        color: newColor,
        shape: {
          ...pin.shape,
          type: "polygon",
          positions: newPositions,
          color: newColor,
          outlineColor: newColor,
        },
        save: -1,
      };
    });
  }

  function renderCutPiece(pin) {
    if (!pin.shape || !ctx.map) return;
    const sourceId = "draw-pin-" + pin.id;
    if (ctx.map.getSource(sourceId)) return;
    const visibility = pin.shape.show ? "visible" : "none";
    if (pin.shape.type === "polygon") {
      const coords = pin.shape.positions.map((p) => [p.lon, p.lat]);
      ctx.map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [coords] },
            properties: { name: pin.name },
          }],
        },
      });
      ctx.map.addLayer({
        id: sourceId + "-fill",
        type: "fill",
        source: sourceId,
        paint: { "fill-color": pin.shape.color || "#ff0000", "fill-opacity": 0.5 },
        layout: { visibility },
      });
      ctx.map.addLayer({
        id: sourceId + "-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": pin.shape.outlineColor || pin.shape.color || "#ff0000",
          "line-width": pin.shape.outlineWidth || 2,
        },
        layout: { visibility },
      });
      pin.shape._sourceIds = [sourceId];
    } else if (pin.shape.type === "polyline") {
      const coords = pin.shape.positions.map((p) => [p.lon, p.lat]);
      ctx.map.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [{
            type: "Feature",
            geometry: { type: "LineString", coordinates: coords },
            properties: { name: pin.name },
          }],
        },
      });
      ctx.map.addLayer({
        id: sourceId + "-line",
        type: "line",
        source: sourceId,
        paint: {
          "line-color": pin.shape.color || "#ff0000",
          "line-width": pin.shape.width || 3,
        },
        layout: { visibility },
      });
      pin.shape._sourceIds = [sourceId];
    }
    registerDrawLayer(sourceId + "-fill");
    registerDrawLayer(sourceId + "-line");
  }

  function removeCutOriginalLayers(pin) {
    if (!ctx.map) return;
    const sourceId = "draw-pin-" + pin.id;
    const style = ctx.map.getStyle();
    if (!style || !style.layers) return;
    style.layers
      .filter((l) => l.id.startsWith(sourceId))
      .forEach((l) => { if (ctx.map.getLayer(l.id)) ctx.map.removeLayer(l.id); });
    if (ctx.map.getSource(sourceId)) ctx.map.removeSource(sourceId);
  }

  function processCut(cutPositions) {
    const cutCoords = cutPositions.map((p) => [p.lng, p.lat]);
    const cutLine = turf.lineString(cutCoords);
    let hasCut = false;
    const newPins = [];
    const pinsList = Array.isArray(ctx.pins) ? ctx.pins : ctx.pins.value || [];
    pinsList.forEach((pin) => {
      if (pin.shape && (pin.shape.type === "polyline" || pin.shape.type === "polygon")) {
        const coords = pin.shape.type === "polygon"
          ? [pin.shape.positions.map((p) => [p.lon, p.lat])]
          : pin.shape.positions.map((p) => [p.lon, p.lat]);
        const feature = pin.shape.type === "polygon"
          ? turf.polygon(coords)
          : turf.lineString(coords);
        if (turf.booleanIntersects(feature, cutLine)) {
          hasCut = true;
          removeCutOriginalLayers(pin);
          if (pin.shape.type === "polyline") {
            const pieces = splitPolyline(pin, cutLine);
            pieces.forEach(renderCutPiece);
            newPins.push(...pieces);
          } else {
            const pieces = splitPolygon(pin, cutLine);
            if (pieces.length === 1 && pieces[0] === pin) {
              renderCutPiece(pin);
              newPins.push(pin);
            } else {
              renderCutPiece(pin);
              pieces.forEach(renderCutPiece);
              newPins.push(pin, ...pieces);
            }
          }
        } else {
          newPins.push(pin);
        }
      } else {
        newPins.push(pin);
      }
    });
    if (hasCut) {
      if (Array.isArray(ctx.pins)) {
        ctx.pins.splice(0, ctx.pins.length, ...newPins);
      } else if (ctx.pins.value) {
        ctx.pins.value = newPins;
      }
      ctx.emit("pinsUpdated", newPins);
      ctx.$toast.success("شکل با موفقیت برش داده شد");
    } else {
      ctx.$toast.warning("خط برش با هیچ شکلی تقاطع نداشت");
    }
    ctx.inactiveDrawing();
  }

  function startDrawingCutLine() {
    const m = ctx.map;
    m.getCanvas().style.cursor = "crosshair";
    ctx.ts.sourceId = "temp-cut-" + crypto.randomUUID();
    m.addSource(ctx.ts.sourceId, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
    const lineLayerId = ctx.ts.sourceId + "-line";
    const pointsLayerId = ctx.ts.sourceId + "-points";
    m.addLayer({
      id: lineLayerId, type: "line", source: ctx.ts.sourceId,
      paint: { "line-color": "#ef4444", "line-width": 4, "line-dasharray": [6, 4], "line-opacity": 0.9 },
    });
    m.addLayer({
      id: pointsLayerId, type: "circle", source: ctx.ts.sourceId,
      filter: ["==", "$type", "Point"],
      paint: { "circle-radius": 6, "circle-color": "#ffffff", "circle-stroke-color": "#ef4444", "circle-stroke-width": 3 },
    });
    ctx.ts.layerIds.push(lineLayerId, pointsLayerId);
    const updateCutGeoJSON = () => {
      const src = m.getSource(ctx.ts.sourceId);
      if (!src) return;
      const lineCoords = ctx.positions.map((p) => [p.lng, p.lat]);
      const features = ctx.positions.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {},
      }));
      if (lineCoords.length >= 2) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: lineCoords },
          properties: {},
        });
      }
      src.setData({ type: "FeatureCollection", features });
    };
    ctx.hs.click = (e) => {
      ctx.positions.push({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      updateCutGeoJSON();
    };
    ctx.hs.mouseMove = (e) => {
      if (ctx.positions.length === 0) return;
      const src = m.getSource(ctx.ts.sourceId);
      if (!src) return;
      const pts = [...ctx.positions, { lng: e.lngLat.lng, lat: e.lngLat.lat }];
      const lineCoords = pts.map((p) => [p.lng, p.lat]);
      const features = pts.map((p) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {},
      }));
      if (lineCoords.length >= 2) {
        features.push({
          type: "Feature",
          geometry: { type: "LineString", coordinates: lineCoords },
          properties: {},
        });
      }
      src.setData({ type: "FeatureCollection", features });
    };
    const finishCut = () => {
      if (ctx.positions.length < 2) {
        ctx.cleanupHandlers();
        ctx.clearTempLayers();
        ctx.drawMode.value = "";
        ctx.showForm.value = false;
        return;
      }
      ctx.cleanupHandlers();
      m.getCanvas().style.cursor = "default";
      processCut([...ctx.positions]);
    };
    ctx.hs.rightClick = (e) => {
      e.preventDefault();
      finishCut();
    };
    ctx.hs.dblClick = () => { finishCut(); };
    ctx.hs.key = (event) => {
      if (event.key === "Escape") {
        ctx.cleanupHandlers();
        ctx.clearTempLayers();
        ctx.drawMode.value = "";
        ctx.showForm.value = false;
        ctx.positions.length = 0;
      }
    };
    window.addEventListener("keydown", ctx.hs.key);
    m.on("click", ctx.hs.click);
    m.on("mousemove", ctx.hs.mouseMove);
    m.on("contextmenu", ctx.hs.rightClick);
    m.on("dblclick", ctx.hs.dblClick);
  }

  function startCutMode() {
    if (ctx.editingPin.value) {
      ctx.renderUpdatedShape(ctx.editingPin.value);
      ctx.disableVertexEditing();
    }
    ctx.editingPin.value = null;
    ctx.cleanupHandlers();
    ctx.clearTempLayers();
    ctx.drawMode.value = "cut";
    ctx.activeTab.value = "measurements";
    ctx.positions.length = 0;
    ctx.shape.value = null;
    ctx.showForm.value = false;
    setTimeout(() => { startDrawingCutLine(); }, 100);
  }

  return { startCutMode };
}
