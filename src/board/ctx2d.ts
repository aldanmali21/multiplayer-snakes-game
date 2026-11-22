/**
 * A small Canvas-2D-style wrapper over a Skia canvas. The Garden Party look was
 * designed as HTML canvas code; this lets the drawing code stay close to it.
 * Only `import type` from Skia here, so the same code also runs in Node with CanvasKit.
 */
import type { SkCanvas, SkColor, SkImage, SkPaint, SkPathBuilder, SkShader, Skia as SkiaApi } from '@shopify/react-native-skia';

// Numeric values of Skia enums (kept local so this file has no runtime Skia import).
const FILL = 0;
const STROKE = 1;
const CAP_BUTT = 0;
const CAP_ROUND = 1;
const CLAMP = 0;
const CLIP_INTERSECT = 1;

export type Style = string | Gradient;

/** Converts hsl()/hsla() to rgba(), which every Skia colour parser accepts. */
export function cssColor(c: string): string {
  const m = c.match(/^hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (!m) return c;
  const h = (((+m[1] % 360) + 360) % 360) / 360;
  const s = +m[2] / 100;
  const l = +m[3] / 100;
  const a = m[4] === undefined ? 1 : +m[4];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    t = (t + 1) % 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const to = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 255);
  return `rgba(${to(f(h + 1 / 3))},${to(f(h))},${to(f(h - 1 / 3))},${a})`;
}

export class Gradient {
  private stops: [number, string][] = [];
  constructor(
    private kind: 'linear' | 'radial',
    private a: number[],
  ) {}
  addColorStop(pos: number, color: string) {
    this.stops.push([pos, color]);
  }
  shader(S: typeof SkiaApi): SkShader {
    const colors = this.stops.map(([, c]) => S.Color(cssColor(c)) as SkColor);
    const pos = this.stops.map(([p]) => p);
    if (this.kind === 'linear') {
      const [x0, y0, x1, y1] = this.a;
      return S.Shader.MakeLinearGradient(S.Point(x0, y0), S.Point(x1, y1), colors, pos, CLAMP as never);
    }
    const [x0, y0, r0, x1, y1, r1] = this.a;
    return S.Shader.MakeTwoPointConicalGradient(S.Point(x0, y0), r0, S.Point(x1, y1), r1, colors, pos, CLAMP as never);
  }
}

export class Ctx2D {
  fillStyle: Style = '#000';
  strokeStyle: Style = '#000';
  lineWidth = 1;
  lineCap: 'butt' | 'round' = 'butt';
  globalAlpha = 1;
  private path: SkPathBuilder;
  private stack: { fillStyle: Style; strokeStyle: Style; lineWidth: number; lineCap: 'butt' | 'round'; globalAlpha: number }[] = [];
  private paint: SkPaint;
  private colorCache = new Map<string, SkColor>();

  constructor(
    private S: typeof SkiaApi,
    readonly canvas: SkCanvas,
  ) {
    this.path = S.PathBuilder.Make();
    this.paint = S.Paint();
    this.paint.setAntiAlias(true);
  }

  // ---- state ----
  save() {
    this.stack.push({ fillStyle: this.fillStyle, strokeStyle: this.strokeStyle, lineWidth: this.lineWidth, lineCap: this.lineCap, globalAlpha: this.globalAlpha });
    this.canvas.save();
  }
  restore() {
    const s = this.stack.pop();
    if (s) Object.assign(this, s);
    this.canvas.restore();
  }
  translate(x: number, y: number) { this.canvas.translate(x, y); }
  rotate(rad: number) { this.canvas.rotate((rad * 180) / Math.PI, 0, 0); }
  scale(x: number, y: number) { this.canvas.scale(x, y); }

  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new Gradient('linear', [x0, y0, x1, y1]);
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new Gradient('radial', [x0, y0, r0, x1, y1, r1]);
  }

  // ---- paths ----
  beginPath() { this.path = this.S.PathBuilder.Make(); }
  moveTo(x: number, y: number) { this.path.moveTo(x, y); }
  lineTo(x: number, y: number) { this.path.lineTo(x, y); }
  quadraticCurveTo(cx: number, cy: number, x: number, y: number) { this.path.quadTo(cx, cy, x, y); }
  bezierCurveTo(a: number, b: number, c: number, d: number, x: number, y: number) { this.path.cubicTo(a, b, c, d, x, y); }
  closePath() { this.path.close(); }
  arc(x: number, y: number, r: number, start: number, end: number) {
    if (r <= 0) return;
    if (end - start >= Math.PI * 2 - 1e-3) {
      this.path.addCircle(x, y, r);
      return;
    }
    const rect = this.S.XYWHRect(x - r, y - r, r * 2, r * 2);
    this.path.arcToOval(rect, (start * 180) / Math.PI, ((end - start) * 180) / Math.PI, false);
  }
  /** Full ellipses only (that's all the designs use), drawn as a smooth polygon. */
  ellipse(cx: number, cy: number, rx: number, ry: number, rot: number) {
    if (rx <= 0 || ry <= 0) return;
    const n = 28;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      const ex = Math.cos(t) * rx;
      const ey = Math.sin(t) * ry;
      const px = cx + ex * cr - ey * sr;
      const py = cy + ex * sr + ey * cr;
      if (i === 0) this.path.moveTo(px, py);
      else this.path.lineTo(px, py);
    }
    this.path.close();
  }

  // ---- drawing ----
  private color(c: string): SkColor {
    let v = this.colorCache.get(c);
    if (!v) {
      v = this.S.Color(cssColor(c));
      this.colorCache.set(c, v);
    }
    return v;
  }
  private setup(style: Style, mode: number) {
    const p = this.paint;
    p.setStyle(mode as never);
    if (typeof style === 'string') {
      p.setShader(null);
      p.setColor(this.color(style));
    } else {
      p.setColor(this.color('#000'));
      p.setShader(style.shader(this.S));
    }
    p.setAlphaf(this.globalAlpha * (typeof style === 'string' ? colorAlpha(style) : 1));
    if (mode === STROKE) {
      p.setStrokeWidth(this.lineWidth);
      p.setStrokeCap((this.lineCap === 'round' ? CAP_ROUND : CAP_BUTT) as never);
    }
    return p;
  }
  fill() { this.canvas.drawPath(this.path.build(), this.setup(this.fillStyle, FILL)); }
  stroke() { this.canvas.drawPath(this.path.build(), this.setup(this.strokeStyle, STROKE)); }
  clip() { this.canvas.clipPath(this.path.build(), CLIP_INTERSECT as never, true); }
  fillRect(x: number, y: number, w: number, h: number) {
    this.canvas.drawRect(this.S.XYWHRect(x, y, w, h), this.setup(this.fillStyle, FILL));
  }
  drawImage(img: SkImage, x: number, y: number, w: number, h: number) {
    const p = this.S.Paint();
    p.setAlphaf(this.globalAlpha);
    this.canvas.drawImageRect(img, this.S.XYWHRect(0, 0, img.width(), img.height()), this.S.XYWHRect(x, y, w, h), p);
  }
}

/** Skia's setAlphaf overrides a colour's own alpha, so read it back out of rgba()/#rrggbbaa. */
const alphaCache = new Map<string, number>();
function colorAlpha(c: string): number {
  let a = alphaCache.get(c);
  if (a !== undefined) return a;
  a = 1;
  const css = cssColor(c);
  const m = css.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/);
  if (m) a = +m[1];
  else if (/^#[0-9a-f]{8}$/i.test(css)) a = parseInt(css.slice(7), 16) / 255;
  else if (/^#[0-9a-f]{4}$/i.test(css)) a = parseInt(css[4] + css[4], 16) / 255;
  alphaCache.set(c, a);
  return a;
}
