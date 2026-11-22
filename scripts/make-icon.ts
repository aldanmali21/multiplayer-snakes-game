/**
 * Draws the app icon with the game's own Garden Party art and writes the PNGs
 * that app.json points at. Run from the repo root: npx tsx scripts/make-icon.ts
 */
import fs from 'node:fs';
const CanvasKitInit = require('canvaskit-wasm/bin/full/canvaskit');
const { JsiSkApi } = require('@shopify/react-native-skia/lib/commonjs/skia/web/JsiSkia');
import { apple, makeGrass, snake } from '../src/board/garden';
import { Ctx2D } from '../src/board/ctx2d';

type Pt = [number, number];
const SIZE = 1024;

/** A coiled snake: head in the middle, body spiralling outwards (in cells). */
function coil(cx: number, cy: number, turns: number, gap: number, start: number): Pt[] {
  const pts: Pt[] = [];
  const r0 = 0.62;
  let th = 0.0;
  while (th < turns * Math.PI * 2) {
    const r = r0 + (gap * th) / (Math.PI * 2);
    pts.push([cx + Math.cos(th + start) * r, cy + Math.sin(th + start) * r]);
    th += 0.42 / Math.max(r, 0.6); // about 0.42 cells apart along the curve
  }
  // the snake() drawing wants points about a cell apart; thin them out
  const out: Pt[] = [pts[0]];
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    acc += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (acc >= 1) { out.push(pts[i]); acc = 0; }
  }
  return out;
}

function drawSnakeAndApple(ctx: Ctx2D, scale: number, ox: number, oy: number) {
  const c = 138 * scale;
  ctx.save();
  ctx.translate(ox, oy);
  const pts = coil(3.6, 4.05, 1.62, 1.0, -Math.PI * 0.2);
  snake(ctx, pts, 0, c, 0.2);
  apple(ctx, 5.55 * c, 1.6 * c, c * 0.62, 0);
  ctx.restore();
}

CanvasKitInit().then((CK: any) => {
  const Skia = JsiSkApi(CK);
  const out = (name: string, draw: (ctx: Ctx2D) => void) => {
    const surf = Skia.Surface.MakeOffscreen(SIZE, SIZE);
    const ctx = new Ctx2D(Skia, surf.getCanvas());
    draw(ctx);
    surf.flush();
    fs.writeFileSync(`assets/${name}`, surf.makeImageSnapshot().encodeToBytes());
    console.log('wrote', name);
  };
  const grass = makeGrass(Skia, SIZE, SIZE, 6, 6);
  const lawn = (ctx: Ctx2D) => {
    const base = ctx.createRadialGradient(SIZE * 0.42, SIZE * 0.35, 0, SIZE / 2, SIZE / 2, SIZE * 0.78);
    base.addColorStop(0, '#7cc443');
    base.addColorStop(0.55, '#3f8a26');
    base.addColorStop(1, '#173f0d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (grass) { ctx.globalAlpha = 0.45; ctx.drawImage(grass, 0, 0, SIZE, SIZE); ctx.globalAlpha = 1; }
    const g = ctx.createRadialGradient(SIZE * 0.42, SIZE * 0.35, SIZE * 0.05, SIZE / 2, SIZE / 2, SIZE * 0.75);
    g.addColorStop(0, 'rgba(255,250,200,.22)');
    g.addColorStop(0.55, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(5,25,0,.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SIZE, SIZE);
  };
  // Full icon: lawn plus snake, filling the square.
  out('icon.png', (ctx) => { lawn(ctx); drawSnakeAndApple(ctx, 1, 0, 0); });
  // Adaptive icon layers: the launcher crops to a circle or squircle, so keep the art in the middle 66%.
  out('android-icon-background.png', (ctx) => lawn(ctx));
  out('android-icon-foreground.png', (ctx) => drawSnakeAndApple(ctx, 0.6, SIZE * 0.2, SIZE * 0.21));
  out('splash-icon.png', (ctx) => drawSnakeAndApple(ctx, 1, 0, 0));
  // Themed (monochrome) icon: the foreground's shape in plain white.
  out('android-icon-monochrome.png', (ctx) => {
    const fg = Skia.Image.MakeImageFromEncoded(Skia.Data.fromBytes(fs.readFileSync('assets/android-icon-foreground.png')));
    const paint = Skia.Paint();
    paint.setColorFilter(Skia.ColorFilter.MakeBlend(Skia.Color('white'), 5 /* SrcIn */));
    ctx.canvas.drawImage(fg, 0, 0, paint);
  });
});
