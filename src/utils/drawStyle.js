/**
 * استایل‌های خط (نوع خط) و نمادهای نقطه برای ترسیم‌ها
 */

export const DASH_STYLES = [
  { id: "solid", label: "پیوسته", value: [1, 0] },
  { id: "dashed", label: "خط چین", value: [8, 4] },
  { id: "dotted", label: "نقطه‌چین", value: [1, 3] },
  { id: "dashdot", label: "نقطه-خط", value: [8, 3, 1, 3] },
];

export function getDashArray(style) {
  const found = DASH_STYLES.find((s) => s.id === style);
  return found ? found.value : [1, 0];
}

export function dashStyleLabel(style) {
  const found = DASH_STYLES.find((s) => s.id === style);
  return found ? found.label : "";
}

export const POINT_SYMBOLS = [
  { id: "circle", label: "دایره" },
  { id: "square", label: "مربع" },
  { id: "triangle", label: "مثلث" },
  { id: "diamond", label: "لوزی" },
  { id: "star", label: "ستاره" },
  { id: "pin", label: "نشان" },
];

export const ICON_PREFIX = "mapiq-pt-";

export function pointIcon(symbol) {
  const found = POINT_SYMBOLS.find((s) => s.id === symbol);
  return ICON_PREFIX + (found ? found.id : "circle");
}

const ICON_SIZE = 64;

function drawPointIcon(kind, ctx, size) {
  const c = size / 2;
  ctx.fillStyle = "#fff";
  switch (kind) {
    case "circle":
      ctx.beginPath();
      ctx.arc(c, c, size / 2 - 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case "square":
      ctx.fillRect(3, 3, size - 6, size - 6);
      break;
    case "triangle":
      ctx.beginPath();
      ctx.moveTo(c, 3);
      ctx.lineTo(size - 3, size - 3);
      ctx.lineTo(3, size - 3);
      ctx.closePath();
      ctx.fill();
      break;
    case "diamond":
      ctx.beginPath();
      ctx.moveTo(c, 2);
      ctx.lineTo(size - 2, c);
      ctx.lineTo(c, size - 2);
      ctx.lineTo(2, c);
      ctx.closePath();
      ctx.fill();
      break;
    case "star": {
      const outer = size / 2 - 3;
      const inner = outer * 0.5;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? outer : inner;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const x = c + Math.cos(a) * r;
        const y = c + Math.sin(a) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "pin": {
      const r = size * 0.32;
      ctx.beginPath();
      ctx.moveTo(c, size - 2);
      ctx.lineTo(c - r, c);
      ctx.arc(c, c, r, Math.PI, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
      break;
    }
  }
}

/**
 * اگر تصاویر نمادها در استایل نباشند، آن‌ها را به‌صورت SDF اضافه می‌کند
 * تا رنگ هر نقطه بتواند به‌صورت data-driven تعیین شود.
 */
export function ensurePointSymbolImages(map) {
  if (!map || typeof map.addImage !== "function") return;
  try {
    for (const sym of POINT_SYMBOLS) {
      const name = ICON_PREFIX + sym.id;
      if (map.hasImage(name)) continue;
      const canvas = document.createElement("canvas");
      canvas.width = ICON_SIZE;
      canvas.height = ICON_SIZE;
      const ctx = canvas.getContext("2d");
      drawPointIcon(sym.id, ctx, ICON_SIZE);
      map.addImage(name, ctx.getImageData(0, 0, canvas.width, canvas.height), { sdf: true });
    }
  } catch (e) {
    console.warn("خطا در ساخت نماد نقطه:", e);
  }
}