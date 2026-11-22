/**
 * Garden Party board: ported from the approved prototype
 * (snake-apk/prototypes/snake-themes.html, theme "garden").
 */
import type { SkImage, SkPicture, Skia as SkiaApi } from '@shopify/react-native-skia';
import { Ctx2D } from './ctx2d';

type S = typeof SkiaApi;
type Pt = [number, number];

function rng(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function offscreen(Sk: S, w: number, h: number, draw: (x: Ctx2D) => void): SkImage | null {
  const surface = Sk.Surface.MakeOffscreen(w, h);
  if (!surface) return null;
  draw(new Ctx2D(Sk, surface.getCanvas()));
  surface.flush();
  const img = surface.makeImageSnapshot();
  return img.makeNonTextureImage?.() ?? img;
}

/** The lawn: drawn once per board size, seeded so it never shimmers. */
export function makeGrass(Sk: S, pw: number, ph: number, gridW: number, gridH: number): SkImage | null {
  return offscreen(Sk, pw, ph, (x) => {
    const R = rng(7);
    const cs = pw / gridW;
    const k = cs / 17;
    // Scatter counts grow with the board's shape; blob sizes follow its short side.
    const px = Math.min(pw, ph);
    const area = (pw * ph) / (px * px);
    x.fillStyle = '#4d8a2b';
    x.fillRect(0, 0, pw, ph);
    for (let i = 0; i < 70 * area; i++) {
      const cx = R() * pw, cy = R() * ph, r = px * (0.05 + R() * 0.14);
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      const c = R() < 0.5 ? '96,150,52' : '52,98,30';
      gr.addColorStop(0, `rgba(${c},.35)`);
      gr.addColorStop(1, `rgba(${c},0)`);
      x.fillStyle = gr;
      x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // faint mowing pattern on the grid, so steering stays readable
    for (let yy = 0; yy < gridH; yy++)
      for (let xx = 0; xx < gridW; xx++) {
        x.fillStyle = (xx + yy) % 2 ? 'rgba(240,255,200,.055)' : 'rgba(10,40,5,.06)';
        x.fillRect(xx * cs, yy * cs, cs, cs);
      }
    const cols: string[] = [];
    for (let i = 0; i < 14; i++) cols.push(`hsl(${78 + R() * 34},${38 + R() * 26}%,${20 + R() * 30}%)`);
    const count = Math.min(48000, (pw * ph) / 26) | 0;
    for (let ci = 0; ci < cols.length; ci++) {
      x.strokeStyle = cols[ci];
      x.lineWidth = (0.55 + (ci % 3) * 0.25) * k;
      x.lineCap = 'round';
      x.beginPath();
      for (let i = 0; i < count / cols.length; i++) {
        const bx = R() * pw, by = R() * ph, L = cs * (0.1 + R() * 0.28), a = -Math.PI / 2 + (R() - 0.5) * 0.9, bend = (R() - 0.5) * L * 0.5;
        x.moveTo(bx, by);
        x.quadraticCurveTo(bx + bend, by - L * 0.5, bx + Math.cos(a) * L, by + Math.sin(a) * L);
      }
      x.stroke();
    }
    x.strokeStyle = 'rgba(200,235,140,.55)';
    x.lineWidth = 0.6 * k;
    x.beginPath();
    for (let i = 0; i < count / 9; i++) {
      const bx = R() * pw, by = R() * ph, L = cs * (0.08 + R() * 0.15);
      x.moveTo(bx, by);
      x.lineTo(bx + (R() - 0.5) * L * 0.6, by - L);
    }
    x.stroke();
    // clover
    for (let i = 0; i < 34 * area; i++) {
      const cx = R() * pw, cy = R() * ph;
      for (let j = 0; j < 5; j++) {
        const ox = cx + (R() - 0.5) * cs * 0.8, oy = cy + (R() - 0.5) * cs * 0.8, r = cs * 0.07;
        x.fillStyle = R() < 0.5 ? '#3f7f27' : '#559a33';
        for (let l = 0; l < 3; l++) {
          const a = l * 2.1 + R();
          x.beginPath();
          x.arc(ox + Math.cos(a) * r, oy + Math.sin(a) * r, r, 0, 7);
          x.fill();
        }
      }
    }
    // daisies
    for (let i = 0; i < 9 * area; i++) {
      const cx = R() * pw, cy = R() * ph, r = cs * 0.1;
      x.fillStyle = 'rgba(255,255,255,.92)';
      for (let p = 0; p < 8; p++) {
        const a = (p * Math.PI) / 4;
        x.beginPath();
        x.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, r * 0.55, r * 0.22, a);
        x.fill();
      }
      x.fillStyle = '#f2c12e';
      x.beginPath();
      x.arc(cx, cy, r * 0.38, 0, 7);
      x.fill();
    }
    // dappled sunlight
    for (let i = 0; i < 16 * area; i++) {
      const cx = R() * pw, cy = R() * ph, r = cs * (1.5 + R() * 3);
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      gr.addColorStop(0, 'rgba(255,248,190,.13)');
      gr.addColorStop(1, 'rgba(255,248,190,0)');
      x.fillStyle = gr;
      x.fillRect(cx - r, cy - r, r * 2, r * 2);
    }
    // inner shadow cast by the wooden frame
    const e = cs * 0.9;
    for (const [a, b, c2, d] of [[0, 0, 0, e], [0, ph, 0, ph - e], [0, 0, e, 0], [pw, 0, pw - e, 0]]) {
      const gr = x.createLinearGradient(a, b, c2, d);
      gr.addColorStop(0, 'rgba(10,25,5,.5)');
      gr.addColorStop(1, 'rgba(10,25,5,0)');
      x.fillStyle = gr;
      x.fillRect(0, 0, pw, ph);
    }
  });
}

/** A head looks the same every frame (only its position and angle change), so draw it once per species and size. */
const headCache = new Map<string, { pic: SkPicture; pad: number }>();
function headPicture(ctx: Ctx2D, species: number, r: number, c: number) {
  const key = species + '|' + r.toFixed(2);
  let h = headCache.get(key);
  if (h) return h;
  const pad = r * 2;
  const pic = ctx.record(pad * 2, pad * 2, (x) => {
    x.translate(pad, pad);
    drawHead(x, species, r, c);
  });
  h = { pic, pad };
  if (headCache.size > 64) headCache.clear();
  headCache.set(key, h);
  return h;
}

function drawHead(ctx: Ctx2D, species: number, r: number, c: number) {
  const sp = SPECIES[species % SPECIES.length];
  const head = () => {
    ctx.beginPath();
    ctx.moveTo(-r * 0.7, -r * 0.66);
    ctx.bezierCurveTo(r * 0.15, -r * 1.02, r * 1.0, -r * 0.72, r * 1.18, 0);
    ctx.bezierCurveTo(r * 1.0, r * 0.72, r * 0.15, r * 1.02, -r * 0.7, r * 0.66);
    ctx.closePath();
  };
  ctx.fillStyle = 'rgba(8,30,4,.25)';
  ctx.save(); ctx.translate(c * 0.08, c * 0.14); head(); ctx.fill(); ctx.restore();
  ctx.fillStyle = sp.dark;
  ctx.save(); ctx.scale(1.06, 1.06); head(); ctx.fill(); ctx.restore();
  const hc = sp.pat === 'milk' ? '#1d1d1d' : sp.base;
  const hg = ctx.createRadialGradient(r * 0.1, -r * 0.35, r * 0.1, r * 0.2, 0, r * 1.2);
  hg.addColorStop(0, sp.pat === 'milk' ? '#555555' : sp.light); hg.addColorStop(0.55, hc); hg.addColorStop(1, sp.dark);
  ctx.fillStyle = hg; head(); ctx.fill();
  if (sp.pat === 'milk') {
    ctx.save(); head(); ctx.clip();
    ctx.fillStyle = '#f1e3c0'; ctx.fillRect(r * 0.7, -r, r, r * 2);
    ctx.fillStyle = '#d9333c'; ctx.fillRect(r * 0.95, -r, r, r * 2);
    ctx.restore();
  }
  if (sp.pat === 'diamond') {
    ctx.strokeStyle = 'rgba(60,35,15,.7)'; ctx.lineWidth = c * 0.05; ctx.lineCap = 'round';
    for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.75, k * r * 0.3); ctx.lineTo(-r * 0.3, k * r * 0.62); ctx.stroke(); }
  }
  if (sp.pat === 'garter') {
    ctx.fillStyle = '#f2d35b';
    ctx.beginPath(); ctx.ellipse(-r * 0.55, 0, r * 0.18, r * 0.08, 0); ctx.fill();
  }
  if (sp.pat === 'corn') {
    ctx.fillStyle = '#b23516';
    ctx.beginPath(); ctx.moveTo(r * 0.85, 0); ctx.lineTo(-r * 0.3, -r * 0.32); ctx.lineTo(-r * 0.1, 0); ctx.lineTo(-r * 0.3, r * 0.32); ctx.closePath(); ctx.fill();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = c * 0.02; ctx.lineCap = 'butt';
  ctx.beginPath(); ctx.moveTo(r * 0.1, -r * 0.25); ctx.lineTo(r * 0.55, 0); ctx.lineTo(r * 0.1, r * 0.25); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,.22)';
  ctx.beginPath(); ctx.ellipse(r * 0.15, -r * 0.25, r * 0.55, r * 0.22, 0); ctx.fill();
  for (const k of [-1, 1]) {
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.arc(r * 1.0, k * r * 0.18, r * 0.05, 0, 7); ctx.fill();
  }
  for (const k of [-1, 1]) {
    const ex = r * 0.42, ey = k * r * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(ex, ey - k * r * 0.06, r * 0.3, r * 0.18, 0); ctx.fill();
    ctx.fillStyle = sp.dark;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.22, 0, 7); ctx.fill();
    const eg = ctx.createRadialGradient(ex - r * 0.05, ey - r * 0.05, r * 0.02, ex, ey, r * 0.19);
    eg.addColorStop(0, '#ffe27a'); eg.addColorStop(0.7, '#c98a10'); eg.addColorStop(1, '#5a3a00');
    ctx.fillStyle = eg;
    ctx.beginPath(); ctx.arc(ex, ey, r * 0.18, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b0b0b';
    ctx.beginPath(); ctx.arc(ex + r * 0.02, ey, r * 0.095, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.95)';
    ctx.beginPath(); ctx.arc(ex - r * 0.05, ey - r * 0.07, r * 0.045, 0, 7); ctx.fill();
  }
}

/** Leafy hedge tile for the screen background (tiles seamlessly). */
export function makeHedge(Sk: S): SkImage | null {
  const S2 = 360;
  return offscreen(Sk, S2, S2, (x) => {
    const R = rng(3);
    x.fillStyle = '#1b3514';
    x.fillRect(0, 0, S2, S2);
    for (let i = 0; i < 1500; i++) {
      const cx = R() * S2, cy = R() * S2, L = 7 + R() * 11, a = R() * 7, hue = 95 + R() * 30, l = 13 + R() * 22;
      for (const ox of [-S2, 0, S2])
        for (const oy of [-S2, 0, S2]) {
          if (cx + ox < -20 || cx + ox > S2 + 20 || cy + oy < -20 || cy + oy > S2 + 20) continue;
          x.save();
          x.translate(cx + ox, cy + oy);
          x.rotate(a);
          x.fillStyle = `hsl(${hue},45%,${l}%)`;
          x.beginPath();
          x.ellipse(0, 0, L, L * 0.45, 0);
          x.fill();
          x.fillStyle = `hsla(${hue - 10},55%,${l + 14}%,.45)`;
          x.beginPath();
          x.ellipse(-L * 0.15, -L * 0.12, L * 0.7, L * 0.22, 0);
          x.fill();
          x.strokeStyle = `hsla(${hue},40%,${l - 6}%,.6)`;
          x.lineWidth = 0.7;
          x.beginPath();
          x.moveTo(-L, 0);
          x.lineTo(L, 0);
          x.stroke();
          x.restore();
        }
    }
  });
}

/** Wood grain strip for the board frame. */
export function makeWood(Sk: S): SkImage | null {
  const W = 480, H = 120;
  return offscreen(Sk, W, H, (x) => {
    const R = rng(11);
    const gr = x.createLinearGradient(0, 0, 0, H);
    gr.addColorStop(0, '#7b4e2a');
    gr.addColorStop(0.5, '#6a4122');
    gr.addColorStop(1, '#7d522c');
    x.fillStyle = gr;
    x.fillRect(0, 0, W, H);
    for (let i = 0; i < 90; i++) {
      const y0 = R() * H, amp = 1 + R() * 4, ph = R() * 7, per = [1, 2, 3][i % 3];
      x.strokeStyle = R() < 0.6 ? `rgba(40,20,8,${0.12 + R() * 0.2})` : `rgba(220,170,110,${0.08 + R() * 0.12})`;
      x.lineWidth = 0.6 + R() * 1.4;
      x.beginPath();
      for (let xx = 0; xx <= W; xx += 6) {
        const y = y0 + Math.sin((xx / W) * Math.PI * 2 * per + ph) * amp;
        if (xx) x.lineTo(xx, y);
        else x.moveTo(xx, y);
      }
      x.stroke();
    }
    for (let i = 0; i < 2; i++) {
      const cx = 80 + i * 260, cy = 30 + i * 50;
      x.fillStyle = 'rgba(45,22,8,.55)';
      x.beginPath();
      x.ellipse(cx, cy, 9, 5, 0);
      x.fill();
      x.strokeStyle = 'rgba(45,22,8,.3)';
      x.lineWidth = 1;
      for (let r = 1; r < 4; r++) {
        x.beginPath();
        x.ellipse(cx, cy, 9 + r * 5, 5 + r * 2.5, 0);
        x.stroke();
      }
    }
  });
}

/** Apples look the same everywhere, so each is drawn once per cell size and stamped. */
let appleCache: { c: number; half: number; shadow: SkPicture; body: SkPicture } | null = null;
function applePictures(ctx: Ctx2D, c: number) {
  if (appleCache && appleCache.c === c) return appleCache;
  const half = c;
  const r = c * 0.36;
  appleCache = {
    c,
    half,
    shadow: ctx.record(half * 2, half * 2, (x) => appleShadow(x, half, half, r)),
    body: ctx.record(half * 2, half * 2, (x) => apple(x, half, half, r, 0, false)),
  };
  return appleCache;
}

function appleShadow(ctx: Ctx2D, x: number, y: number, r: number) {
  ctx.fillStyle = 'rgba(10,30,5,.22)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.15, y + r * 0.92, r * 1.05, r * 0.34, 0); ctx.fill();
  ctx.fillStyle = 'rgba(10,30,5,.3)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.1, y + r * 0.88, r * 0.7, r * 0.2, 0); ctx.fill();
}

export function apple(ctx: Ctx2D, x: number, y: number, r: number, b: number, shadow = true) {
  if (shadow) appleShadow(ctx, x, y, r);
  y -= b;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.62);
  ctx.bezierCurveTo(x + r * 0.45, y - r * 1.05, x + r * 1.15, y - r * 0.7, x + r * 1.02, y + r * 0.05);
  ctx.bezierCurveTo(x + r * 0.95, y + r * 0.75, x + r * 0.45, y + r * 1.02, x, y + r * 0.88);
  ctx.bezierCurveTo(x - r * 0.45, y + r * 1.02, x - r * 0.95, y + r * 0.75, x - r * 1.02, y + r * 0.05);
  ctx.bezierCurveTo(x - r * 1.15, y - r * 0.7, x - r * 0.45, y - r * 1.05, x, y - r * 0.62);
  ctx.closePath();
  const g = ctx.createRadialGradient(x - r * 0.38, y - r * 0.35, r * 0.05, x, y, r * 1.15);
  g.addColorStop(0, '#ff8f72'); g.addColorStop(0.35, '#e2262d'); g.addColorStop(0.8, '#a3121e'); g.addColorStop(1, '#6e0913');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  const y2 = ctx.createRadialGradient(x - r * 0.5, y + r * 0.6, 0, x - r * 0.5, y + r * 0.6, r * 0.9);
  y2.addColorStop(0, 'rgba(255,205,80,.45)'); y2.addColorStop(1, 'rgba(255,205,80,0)');
  ctx.fillStyle = y2;
  ctx.fillRect(x - r * 2, y - r * 2, r * 4, r * 4);
  ctx.lineWidth = r * 0.05;
  for (let i = -3; i <= 3; i++) {
    ctx.strokeStyle = i % 2 ? 'rgba(255,214,120,.18)' : 'rgba(90,4,12,.22)';
    ctx.beginPath();
    ctx.moveTo(x + i * r * 0.08, y - r * 0.6);
    ctx.quadraticCurveTo(x + i * r * 0.42, y, x + i * r * 0.18, y + r * 0.9);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = 'rgba(70,8,10,.45)';
  ctx.beginPath(); ctx.ellipse(x, y - r * 0.6, r * 0.2, r * 0.07, 0); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.48, y - r * 0.32, r * 0.13, r * 0.24, 0.55); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.18)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.2, r * 0.38, r * 0.5, 0.55); ctx.fill();
  ctx.strokeStyle = '#4a2a12';
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.6);
  ctx.quadraticCurveTo(x + r * 0.05, y - r * 0.95, x + r * 0.2, y - r * 1.15);
  ctx.stroke();
  ctx.save();
  ctx.translate(x + r * 0.2, y - r * 1.0);
  ctx.rotate(-0.45);
  const lg = ctx.createLinearGradient(0, -r * 0.25, 0, r * 0.25);
  lg.addColorStop(0, '#7ccf4a'); lg.addColorStop(1, '#2f7a1f');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(r * 0.35, -r * 0.32, r * 0.8, 0);
  ctx.quadraticCurveTo(r * 0.35, r * 0.3, 0, 0);
  ctx.fill();
  ctx.strokeStyle = 'rgba(220,255,180,.6)';
  ctx.lineWidth = r * 0.035;
  ctx.beginPath(); ctx.moveTo(r * 0.05, 0); ctx.lineTo(r * 0.72, 0); ctx.stroke();
  ctx.restore();
}

export const SPECIES = [
  { name: 'Green python', base: '#3fa83a', dark: '#173f14', light: '#b8f08a', pat: 'python' },
  { name: 'Corn snake', base: '#ec7a35', dark: '#5a200b', light: '#ffd0a0', pat: 'corn' },
  { name: 'Blue racer', base: '#3d7be0', dark: '#0f2250', light: '#bcd6ff', pat: 'racer' },
  { name: 'Milk snake', base: '#d9333c', dark: '#2a0a0c', light: '#ffb3a8', pat: 'milk' },
  { name: 'Rattlesnake', base: '#b58d5c', dark: '#3b2814', light: '#ecd6ad', pat: 'diamond' },
  { name: 'Albino python', base: '#f1e7cf', dark: '#8a6d3b', light: '#ffffff', pat: 'albino' },
  { name: 'Black mamba', base: '#61666b', dark: '#16181a', light: '#b4b9be', pat: 'plain' },
  { name: 'Garter snake', base: '#2f3d2a', dark: '#0e140c', light: '#93a67c', pat: 'garter' },
] as const;

function chaikin(p: Pt[], n: number): Pt[] {
  for (let k = 0; k < n; k++) {
    const q: Pt[] = [p[0]];
    for (let i = 0; i < p.length - 1; i++) {
      q.push(
        [p[i][0] * 0.75 + p[i + 1][0] * 0.25, p[i][1] * 0.75 + p[i + 1][1] * 0.25],
        [p[i][0] * 0.25 + p[i + 1][0] * 0.75, p[i][1] * 0.25 + p[i + 1][1] * 0.75],
      );
    }
    q.push(p[p.length - 1]);
    p = q;
  }
  return p;
}

/**
 * Draws one snake. `pts` are cell centres (in cells, head first), already
 * interpolated between ticks. `species` is the player's index; `time` is seconds.
 */
export function snake(ctx: Ctx2D, pts: Pt[], species: number, c: number, time: number) {
  if (pts.length < 2) return;
  const sp = SPECIES[species % SPECIES.length];
  const sm = chaikin(pts, 3);
  const smp: Pt[] = [sm[0]];
  const STEP = 0.08;
  let carry = 0;
  for (let i = 1; i < sm.length; i++) {
    const dx = sm[i][0] - sm[i - 1][0], dy = sm[i][1] - sm[i - 1][1], L = Math.hypot(dx, dy);
    if (!L) continue;
    let d = STEP - carry;
    while (d <= L) {
      smp.push([sm[i - 1][0] + (dx * d) / L, sm[i - 1][1] + (dy * d) / L]);
      d += STEP;
    }
    carry = L - (d - STEP);
  }
  const n = smp.length;
  const rad = (i: number) => 0.39 * (1 - 0.62 * Math.pow(i / n, 1.5)) * c;
  const ang = (i: number) => {
    const a = smp[Math.max(0, i - 1)], b = smp[Math.min(n - 1, i + 1)];
    return Math.atan2(a[1] - b[1], a[0] - b[0]);
  };
  const P = (i: number): Pt => [smp[i][0] * c, smp[i][1] * c];
  // Point at local (along, across) from sample i, rotated with the body.
  const L = (x: number, y: number, a: number, u: number, v: number): Pt => [x + Math.cos(a) * u - Math.sin(a) * v, y + Math.sin(a) * u + Math.cos(a) * v];

  // The body is a chain of overlapping discs, spaced just closely enough for a
  // smooth edge to keep the work per frame low. Each outline is built once and
  // drawn as many times as needed.
  // Thin parts need closer discs to keep a smooth edge, so spacing follows the radius.
  const idx: number[] = [n - 1];
  let since = 0;
  for (let i = n - 2; i > 0; i--) {
    since += STEP;
    const r = rad(i) / c;
    if (since >= 2 * Math.sqrt(0.02 * r)) { idx.push(i); since = 0; }
  }
  idx.push(0);
  const discs = (fn: (i: number) => [number, number, number]) => {
    ctx.beginPath();
    for (const i of idx) {
      const [px, py, r] = fn(i);
      ctx.circle(px, py, r);
    }
    return ctx.takePath();
  };

  const outer = discs((i) => { const [x, y] = P(i); return [x, y, rad(i) + c * 0.025]; });
  const inner = discs((i) => { const [x, y] = P(i); return [x, y, rad(i) * 0.9]; });
  // soft shadows on the grass
  ctx.save(); ctx.translate(c * 0.12, c * 0.2); ctx.fillStyle = 'rgba(8,30,4,.16)'; ctx.fillPath(outer); ctx.restore();
  ctx.save(); ctx.translate(c * 0.08, c * 0.13); ctx.fillStyle = 'rgba(8,30,4,.22)'; ctx.fillPath(inner); ctx.restore();
  ctx.fillStyle = sp.dark; ctx.fillPath(outer);
  ctx.fillStyle = sp.base; ctx.fillPath(inner);
  if (sp.pat === 'milk') {
    // bands: black, cream, black every 1.44 cells, as short strokes across the body
    ctx.save();
    ctx.clipTo(inner);
    ctx.lineCap = 'butt';
    for (const [lo, hi, col] of [[9, 11, '#1a1a1a'], [11, 14, '#f1e3c0'], [14, 16, '#1a1a1a']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = (hi - lo) * 0.08 * c;
      ctx.beginPath();
      for (let i = lo; i < n; i += 18) {
        const j = Math.min(n - 1, i + Math.floor((hi - lo) / 2));
        const [x, y] = P(j), a = ang(j), r = rad(j) * 1.2;
        const [x0, y0] = L(x, y, a, 0, -r), [x1, y1] = L(x, y, a, 0, r);
        ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  // Shading along the body: strokes kept inside the body outline.
  const along = (k: number, from: number, to: number, side: number, lift: [number, number] = [0, 0]) => {
    ctx.beginPath();
    let first = true;
    for (let i = from; i < to; i += k) {
      const [x, y] = P(i), a = ang(i), r = rad(i);
      const px = x + Math.cos(a + 1.57) * side * r + lift[0] * r, py = y + Math.sin(a + 1.57) * side * r + lift[1] * r;
      if (first) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      first = false;
    }
  };
  ctx.save();
  ctx.clipTo(inner);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,.14)';
  ctx.lineWidth = rad(Math.floor(n / 3)) * 0.9;
  along(3, 0, n, 0.5);
  ctx.stroke();
  ctx.restore();

  // markings, batched into one path per colour
  const every = (period: number, fn: (i: number) => void) => { for (let i = 10; i < n - 3; i++) if (i % period === 0) fn(i); };
  const diamond = (x: number, y: number, a: number, w: number, h: number, off = 0) => {
    const p0 = L(x, y, a, -w, off), p1 = L(x, y, a, 0, off - h), p2 = L(x, y, a, w, off), p3 = L(x, y, a, 0, off + h);
    ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
  };
  if (sp.pat === 'python') {
    ctx.beginPath();
    every(11, (i) => { const [x, y] = P(i), r = rad(i); diamond(x, y, ang(i), r * 0.28, r * 0.16, ((i / 11) % 2 ? 1 : -1) * r * 0.28); });
    ctx.fillStyle = 'rgba(240,255,220,.85)'; ctx.fill();
  }
  if (sp.pat === 'corn') {
    ctx.beginPath();
    every(12, (i) => { const [x, y] = P(i), r = rad(i); ctx.ellipse(x, y, r * 0.42, r * 0.7, ang(i), 12); });
    const blotches = ctx.takePath();
    ctx.fillStyle = '#b23516'; ctx.fillPath(blotches);
    ctx.strokeStyle = '#2a0c04'; ctx.lineWidth = c * 0.035; ctx.strokePath(blotches);
  }
  if (sp.pat === 'diamond') {
    for (const [k, col] of [[1, '#f3e3c0'], [0.8, '#4a2f17'], [0.45, '#7a5530']] as const) {
      ctx.beginPath();
      every(10, (i) => { const [x, y] = P(i), r = rad(i); diamond(x, y, ang(i), r * k, r * 0.82 * k); });
      ctx.fillStyle = col; ctx.fill();
    }
  }
  if (sp.pat === 'albino') {
    ctx.beginPath();
    every(8, (i) => {
      const h = ((i * 7919 + 104729) % 1000) / 1000;
      const [x, y] = P(i), a = ang(i) + (h - 0.5) * 0.8, r = rad(i);
      const [ex, ey] = L(x, y, a, (h - 0.5) * r * 0.5, 0);
      ctx.ellipse(ex, ey, r * (0.35 + h * 0.2), r * 0.55, a, 12);
    });
    ctx.fillStyle = 'rgba(242,190,60,.85)'; ctx.fill();
  }
  if (sp.pat === 'racer') {
    ctx.beginPath();
    every(5, (i) => {
      const h = ((i * 9301 + 49297) % 233280) / 233280;
      const [x, y] = P(i), a = ang(i), r = rad(i);
      ctx.circle(x + Math.cos(a + 1.57) * (h - 0.5) * r, y + Math.sin(a + 1.57) * (h - 0.5) * r, r * 0.09);
    });
    ctx.fillStyle = 'rgba(10,25,70,.35)'; ctx.fill();
  }
  if (sp.pat === 'garter') {
    ctx.lineCap = 'round';
    for (const [off, w, col] of [[0, 0.09, '#f2d35b'], [-0.58, 0.05, 'rgba(225,205,110,.75)'], [0.58, 0.05, 'rgba(225,205,110,.75)']] as const) {
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(0.8, c * w);
      ctx.beginPath();
      let first = true;
      for (let i = 3; i < n - 1; i += 3) {
        const [x, y] = P(i), a = ang(i), r = rad(i);
        const px = x + Math.cos(a + 1.57) * off * r, py = y + Math.sin(a + 1.57) * off * r;
        if (first) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        first = false;
      }
      ctx.stroke();
    }
  }
  if (sp.pat === 'diamond' && n > 6) {
    // rattle on the tail tip
    const [tx, ty] = P(n - 1), ta = ang(n - 1);
    for (let k = 0; k < 3; k++) {
      const [ex, ey] = L(tx, ty, ta, -c * (0.08 + k * 0.1), 0);
      ctx.fillStyle = k % 2 ? '#d8c39a' : '#b9a173';
      ctx.beginPath(); ctx.ellipse(ex, ey, c * 0.07, c * 0.11 - k * c * 0.015, ta, 12); ctx.fill();
    }
  }
  ctx.save();
  ctx.clipTo(inner);
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,255,255,.17)';
  ctx.lineWidth = rad(Math.floor(n / 3)) * 0.95;
  along(3, 0, n, 0, [-0.18, -0.24]);
  ctx.stroke();
  ctx.restore();

  // scale texture: small curved ticks across the back
  ctx.lineWidth = Math.max(0.6, c * 0.018);
  ctx.strokeStyle = 'rgba(0,0,0,.2)';
  ctx.lineCap = 'butt';
  ctx.beginPath();
  for (let i = 6; i < n - 2; i += 5) {
    const [x, y] = P(i), a = ang(i), r = rad(i), ofs = ((i / 5) % 2) * 0.22;
    for (const kk0 of [-0.55, 0, 0.55]) {
      const kk = kk0 + ofs * (kk0 < 0.5 ? 1 : -1);
      const px = x + Math.cos(a + 1.57) * kk * r, py = y + Math.sin(a + 1.57) * kk * r, sr = r * 0.2;
      const [sx, sy] = [px + Math.cos(a + 2.4) * sr, py + Math.sin(a + 2.4) * sr];
      const [mx, my] = [px + Math.cos(a + 3.15) * sr * 1.3, py + Math.sin(a + 3.15) * sr * 1.3];
      const [fx, fy] = [px + Math.cos(a + 3.9) * sr, py + Math.sin(a + 3.9) * sr];
      ctx.moveTo(sx, sy);
      ctx.quadraticCurveTo(mx, my, fx, fy);
    }
  }
  ctx.stroke();

  // glossy spine
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.lineCap = 'round';
  ctx.lineWidth = c * 0.06;
  ctx.beginPath();
  for (let i = 4; i < n * 0.85; i += 3) {
    const [x, y] = P(i), r = rad(i);
    if (i > 4) ctx.lineTo(x - r * 0.2, y - r * 0.3);
    else ctx.moveTo(x - r * 0.2, y - r * 0.3);
  }
  ctx.stroke();

  // head
  const [hx, hy] = P(0), h2 = smp[Math.min(n - 1, 7)];
  const a = Math.atan2(smp[0][1] - h2[1], smp[0][0] - h2[0]);
  const r = 0.46 * c;
  ctx.save();
  ctx.translate(hx, hy);
  ctx.rotate(a);
  const tw = Math.sin(time * 6 + species * 1.9);
  if (tw > 0.55) {
    const ext = (tw - 0.55) / 0.45;
    ctx.strokeStyle = '#c4142b'; ctx.lineWidth = c * 0.045; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 1.05, 0); ctx.lineTo(r * (1.1 + 0.55 * ext), 0); ctx.lineTo(r * (1.3 + 0.6 * ext), -r * 0.16);
    ctx.moveTo(r * (1.1 + 0.55 * ext), 0); ctx.lineTo(r * (1.3 + 0.6 * ext), r * 0.16);
    ctx.stroke();
  }
  const pic = headPicture(ctx, species, r, c);
  ctx.translate(-pic.pad, -pic.pad);
  ctx.drawPicture(pic.pic);
  ctx.restore();
}

export type BoardTextures = { grass: SkImage | null; wood: SkImage | null };

/**
 * Draws a whole frame: wooden frame, lawn, apples and snakes.
 * `frac` is how far we are into the current tick (0..1) for smooth movement.
 */
export function drawGardenBoard(
  ctx: Ctx2D,
  tex: BoardTextures,
  opts: {
    cell: number; // one grid cell in px
    frame: number; // wood border in px
    cols: number;
    rows: number;
    fruits: { x: number; y: number }[];
    snakes: { body: { x: number; y: number }[]; prev?: { x: number; y: number }[]; species: number; alive: boolean }[];
    /** Snakes that just crashed, with seconds since the crash. */
    crashes?: Crash[];
    frac: number;
    time: number;
  },
) {
  const { cell: c, frame, cols, rows, frac, time } = opts;
  const lw = c * cols, lh = c * rows;
  const tw = lw + frame * 2, th = lh + frame * 2;
  // wooden frame
  ctx.save();
  ctx.beginPath();
  roundRect(ctx, 0, 0, tw, th, frame * 1.6);
  ctx.clip();
  if (tex.wood) ctx.drawImage(tex.wood, 0, 0, Math.max(tw, th) * 1.6, Math.max(tw, th));
  else { ctx.fillStyle = '#6b4423'; ctx.fillRect(0, 0, tw, th); }
  const bevel = ctx.createLinearGradient(0, 0, 0, th);
  bevel.addColorStop(0, 'rgba(255,255,255,.18)'); bevel.addColorStop(0.5, 'rgba(255,255,255,0)'); bevel.addColorStop(1, 'rgba(0,0,0,.28)');
  ctx.fillStyle = bevel; ctx.fillRect(0, 0, tw, th);
  ctx.restore();

  ctx.save();
  ctx.translate(frame, frame);
  ctx.beginPath();
  roundRect(ctx, 0, 0, lw, lh, frame * 0.8);
  ctx.clip();
  if (tex.grass) ctx.drawImage(tex.grass, 0, 0, lw, lh);
  else { ctx.fillStyle = '#4d8a2b'; ctx.fillRect(0, 0, lw, lh); }
  const ap = applePictures(ctx, c);
  for (const f of opts.fruits) {
    const x = (f.x + 0.5) * c - ap.half, y = (f.y + 0.52) * c - ap.half;
    ctx.save(); ctx.translate(x, y); ctx.drawPicture(ap.shadow); ctx.restore();
    const bob = Math.sin(time * 3 + f.x * 1.7) * c * 0.02;
    ctx.save(); ctx.translate(x, y - bob); ctx.drawPicture(ap.body); ctx.restore();
  }
  for (const s of opts.snakes) {
    if (!s.alive || s.body.length < 1) continue;
    const pts = snakePoints(s.body, s.prev, frac, cols, rows);
    // A snake crossing an open edge is drawn on both sides, so it slides out one side and in the other.
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of pts) { minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const dxs = [0, ...(minX < 1 ? [cols] : []), ...(maxX > cols - 1 ? [-cols] : [])];
    const dys = [0, ...(minY < 1 ? [rows] : []), ...(maxY > rows - 1 ? [-rows] : [])];
    for (const dx of dxs)
      for (const dy of dys) {
        snake(ctx, dx || dy ? pts.map(([x, y]) => [x + dx, y + dy] as Pt) : pts, s.species, c, time);
      }
  }
  for (const k of opts.crashes ?? []) crash(ctx, k, cols, rows, c, time);
  ctx.restore();
  // Bursts go on top of the frame too, so a wall hit shows in full.
  ctx.save();
  ctx.translate(frame, frame);
  for (const k of opts.crashes ?? []) crashBurst(ctx, k, c);
  ctx.restore();
}

export type Crash = { body: { x: number; y: number }[]; species: number; dir: 'up' | 'down' | 'left' | 'right'; age: number };

/** How long a crash plays before the snake is gone, in seconds. */
export const CRASH_SECONDS = 1.1;

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] } as const;

/**
 * The knock: the snake lurches into what it hit, recoils with a shudder and
 * a red flash, an impact burst pops at the point of contact, then it fades.
 */
export function crash(ctx: Ctx2D, k: Crash, cols: number, rows: number, c: number, time: number) {
  if (k.body.length < 1 || k.age >= CRASH_SECONDS) return;
  const t = k.age;
  const [vx, vy] = DIRS[k.dir];
  // Lurch forward for 0.08 s, bounce back, then a decaying shudder.
  const lurch = t < 0.08 ? (t / 0.08) * 0.35 : Math.max(0, 0.35 - (t - 0.08) * 3) - 0.08 * Math.exp(-(t - 0.08) * 8);
  const shake = Math.sin(t * 70) * 0.09 * Math.exp(-t * 4);
  const pts = snakePoints(k.body, undefined, 1, cols, rows).map(([x, y], i) => {
    const w = Math.max(0, 1 - i / 6); // the head end moves most
    return [x + vx * lurch * w + -vy * shake, y + vy * lurch * w + vx * shake] as Pt;
  });
  const fade = t < 0.65 ? 1 : Math.max(0, 1 - (t - 0.65) / (CRASH_SECONDS - 0.65));
  ctx.layer(fade, () => {
    snake(ctx, pts, k.species, c, time);
    // red flash over the body
    const flash = Math.max(0, Math.sin(Math.min(1, t / 0.5) * Math.PI)) * 0.55;
    if (flash > 0.01) {
      ctx.strokeStyle = `rgba(255,40,30,${flash.toFixed(3)})`;
      ctx.lineWidth = c * 0.62;
      ctx.lineCap = 'round';
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * c, y * c) : ctx.moveTo(x * c, y * c)));
      ctx.stroke();
    }
  });
}

/** Impact burst where the head met the obstacle. */
export function crashBurst(ctx: Ctx2D, k: Crash, c: number) {
  if (k.body.length < 1) return;
  const t = k.age;
  const [vx, vy] = DIRS[k.dir];
  const hx = (k.body[0].x + 0.5 + vx * 0.5) * c, hy = (k.body[0].y + 0.5 + vy * 0.5) * c;
  const p = Math.min(1, t / 0.45);
  const burst = Math.max(0, 1 - t / 0.6);
  if (burst > 0) {
    ctx.strokeStyle = `rgba(255,245,200,${(0.9 * burst).toFixed(3)})`;
    ctx.lineWidth = c * 0.09 * burst + 0.5;
    ctx.beginPath();
    ctx.circle(hx, hy, c * (0.25 + p * 1.1));
    ctx.stroke();
    // sparks
    ctx.lineCap = 'round';
    ctx.strokeStyle = `rgba(255,200,60,${burst.toFixed(3)})`;
    ctx.lineWidth = c * 0.08;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3;
      const r0 = c * (0.3 + p * 0.6), r1 = c * (0.55 + p * 1.15);
      ctx.moveTo(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
      ctx.lineTo(hx + Math.cos(a) * r1, hy + Math.sin(a) * r1);
    }
    ctx.stroke();
    // star flash
    const sr = c * (0.55 + 0.25 * Math.sin(t * 30)) * burst;
    ctx.fillStyle = `rgba(255,255,235,${burst.toFixed(3)})`;
    ctx.beginPath();
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, r = i % 2 ? sr * 0.4 : sr;
      if (i) ctx.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r);
      else ctx.moveTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  }
}

/** Bring b next to a on a board whose edges wrap (no-op when they are already adjacent). */
function near(a: number, b: number, size: number) {
  while (b - a > size / 2) b -= size;
  while (a - b > size / 2) b += size;
  return b;
}

/**
 * Cell-centre points of a snake between the last tick and this one. Segments
 * that wrapped around the board are unwrapped so the body stays one piece.
 */
export function snakePoints(
  body: { x: number; y: number }[],
  prev: { x: number; y: number }[] | undefined,
  frac: number,
  cols: number,
  rows: number,
): Pt[] {
  const out: Pt[] = [];
  let px = 0, py = 0;
  for (let i = 0; i < body.length; i++) {
    let x = body[i].x, y = body[i].y;
    if (i > 0) { x = near(px, x, cols); y = near(py, y, rows); }
    px = x; py = y;
    const q = prev && prev.length ? prev[i] ?? prev[prev.length - 1] : body[i];
    const qx = near(x, q.x, cols), qy = near(y, q.y, rows);
    out.push([qx + (x - qx) * frac + 0.5, qy + (y - qy) * frac + 0.5]);
  }
  return out;
}

export function roundRect(ctx: Ctx2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/** A short S-curve, for showing a species on the snake picker. Coordinates are in cells. */
export function previewPoints(): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < 7; i++) pts.push([4.5 - i * 0.62, 1.5 + Math.sin(i * 0.9) * 0.55]);
  return pts;
}
