// Draws every Mr.Brands mock-up illustration as flat vector SVG.
// Run: node scripts/illustrations/generate.mjs   → writes public/illus/{p,hero,story}/*.svg
//
// One visual language for the whole catalogue: flat garment colour, a darker tone for folds and
// seams, dashed stitching, rib knit, original prints, and the Mr.Brands hangtag. Lettering is
// converted to paths with opentype.js so the files render identically everywhere.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as opentype from "../../node_modules/opentype.js/dist/opentype.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(here, "../../public/illus");

function loadFont(file) {
  const b = fs.readFileSync(path.join(here, "fonts", file));
  return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
const BLACK = loadFont("Epilogue-Black.ttf");
const MEDIUM = loadFont("Epilogue-Medium.ttf");
const SCRIPT = loadFont("MrDafoe-Regular.ttf");

/* ---------------- helpers ---------------- */

// opentype.js 2.0's toPathData can print NaN while rounding; serialize the raw commands instead.
function pathData(p) {
  const n = (v) => (Math.round(v * 10) / 10).toString();
  let d = "";
  for (const c of p.commands) {
    if (c.type === "M" || c.type === "L") d += `${c.type}${n(c.x)} ${n(c.y)}`;
    else if (c.type === "Q") d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === "C") d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`;
    else if (c.type === "Z") d += "Z";
  }
  return d;
}

// Some fonts answer NaN for pairs without kerning data; treat that as zero.
function kern(font, a, b) {
  const v = font.getKerningValue(a, b);
  return Number.isFinite(v) ? v : 0;
}

/** Text as a single path. anchor: start | middle | end. track: letter-spacing in em. */
function text(font, str, size, x, y, { anchor = "middle", track = 0 } = {}) {
  const glyphs = font.stringToGlyphs(str);
  const scale = size / font.unitsPerEm;
  let width = 0;
  glyphs.forEach((g, i) => {
    width += g.advanceWidth * scale + (i < glyphs.length - 1 ? track * size : 0);
    if (i < glyphs.length - 1) width += kern(font, g, glyphs[i + 1]) * scale;
  });
  let cx = anchor === "middle" ? x - width / 2 : anchor === "end" ? x - width : x;
  let d = "";
  glyphs.forEach((g, i) => {
    d += pathData(g.getPath(cx, y, size));
    cx += g.advanceWidth * scale + track * size;
    if (i < glyphs.length - 1) cx += kern(font, g, glyphs[i + 1]) * scale;
  });
  return { d, width };
}

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
function hex(c) {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(a, b, t) {
  const [r1, g1, b1] = hex(a);
  const [r2, g2, b2] = hex(b);
  const m = (x, y) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${m(r1, r2)}${m(g1, g2)}${m(b1, b2)}`;
}
const darken = (c, t = 0.14) => mix(c, "#000000", t);
const lighten = (c, t = 0.14) => mix(c, "#ffffff", t);

/** A smooth closed blob through n points around (cx, cy). */
function blob(r, cx, cy, radius, n = 7, wobble = 0.35) {
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = radius * (1 - wobble / 2 + r() * wobble);
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  });
  let d = "";
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    if (i === 0) d += `M${p1[0].toFixed(1)},${p1[1].toFixed(1)}`;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d + "Z";
}

/** Topographic contour lines: nested wobbly loops. */
function topo(r, cx, cy, rings, step, color, width = 3) {
  const ph = [r() * 6, r() * 6, r() * 6];
  let out = "";
  for (let k = 1; k <= rings; k++) {
    let d = "";
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      const rad = k * step * (1 + 0.16 * Math.sin(3 * a + ph[0]) + 0.08 * Math.sin(5 * a + ph[1] + k * 0.3) + 0.05 * Math.sin(7 * a + ph[2]));
      d += `${i ? "L" : "M"}${(cx + Math.cos(a) * rad * 1.15).toFixed(1)},${(cy + Math.sin(a) * rad).toFixed(1)}`;
    }
    out += `<path d="${d}Z" fill="none" stroke="${color}" stroke-width="${width}"/>`;
  }
  return out;
}

function svg(w, h, ground, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="${ground}"/>${body}</svg>\n`;
}

/** The Mr.Brands hangtag: hangs from (x, y) on a string, slightly rotated. */
function hangtag(x, y, rot = -8, ground = "#f4f3f1") {
  const mr = text(SCRIPT, "Mr.", 30, 0, 0, { anchor: "start" });
  const brands = text(BLACK, "BRANDS", 14, 0, 0, { anchor: "start", track: -0.02 });
  const total = mr.width + 2 + brands.width;
  const sx = -total / 2;
  return `<g transform="translate(${x} ${y}) rotate(${rot})">
    <path d="M0,0 C-6,18 -2,30 0,42" fill="none" stroke="#161314" stroke-width="2"/>
    <rect x="-44" y="40" width="88" height="128" rx="6" fill="${ground}"/>
    <rect x="-44" y="128" width="88" height="40" rx="0" fill="#9c1823"/>
    <rect x="-44" y="162" width="88" height="6" rx="0" fill="#9c1823"/>
    <circle cx="0" cy="54" r="5" fill="#d3cec7"/>
    <g transform="translate(${sx} 104)"><path d="${text(SCRIPT, "Mr.", 30, 0, 0, { anchor: "start" }).d}" fill="#161314" stroke="#161314" stroke-width="0.8"/><path d="${text(BLACK, "BRANDS", 14, mr.width + 2, 0, { anchor: "start", track: -0.02 }).d}" fill="#161314"/></g>
    <path d="${text(MEDIUM, "CASA DEL FLOW", 8.5, 0, 152, { track: 0.08 }).d}" fill="#f4f3f1"/>
  </g>`;
}

const stitch = (d, color, width = 2.4, dash = "9 7") => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-dasharray="${dash}" stroke-linecap="round"/>`;
const line = (d, color, width = 2.5, opacity = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
const shadowOf = (d, dx = 16, dy = 20) => `<path d="${d}" transform="translate(${dx} ${dy})" fill="#000" opacity="0.10"/>`;

/* ---------------- garments ---------------- */

const TEE = "M330,150 L205,190 L92,352 L165,418 L232,350 L228,860 Q400,874 572,860 L568,350 L635,418 L708,352 L595,190 L470,150 C452,188 428,204 400,204 C372,204 348,188 330,150 Z";
const TEE_V = "M330,150 L205,190 L92,352 L165,418 L232,350 L228,860 Q400,874 572,860 L568,350 L635,418 L708,352 L595,190 L470,150 L400,262 Z";

/** Oversized tee or jersey, front or back. `print` draws inside the body clip. */
function tee({ id, base, rib, neck = "crew", back = false, print = "", sleevePrint = "", tag = true }) {
  const shade = darken(base, 0.16);
  const body = neck === "v" && !back ? TEE_V : TEE;
  const neckInner = back
    ? `<path d="M330,150 C350,170 375,176 400,176 C425,176 450,170 470,150 C450,160 425,164 400,164 C375,164 350,160 330,150 Z" fill="${shade}"/>`
    : neck === "v"
      ? `<path d="M330,150 C352,164 376,170 400,170 C424,170 448,164 470,150 L400,262 Z" fill="${darken(base, 0.3)}"/>`
      : `<path d="M330,150 C350,166 375,172 400,172 C425,172 450,166 470,150 C452,188 428,204 400,204 C372,204 348,188 330,150 Z" fill="${darken(base, 0.3)}"/>`;
  const ribLine = back
    ? `<path d="M330,150 C350,166 375,170 400,170 C425,170 450,166 470,150" fill="none" stroke="${rib}" stroke-width="14" stroke-linecap="round"/>`
    : neck === "v"
      ? `<path d="M332,152 L400,256 L468,152" fill="none" stroke="${rib}" stroke-width="16" stroke-linejoin="round" stroke-linecap="round"/>`
      : `<path d="M330,150 C348,188 372,204 400,204 C428,204 452,188 470,150" fill="none" stroke="${rib}" stroke-width="16" stroke-linecap="round"/>`;
  return `
    ${shadowOf(body)}
    <clipPath id="${id}-c"><path d="${body}"/></clipPath>
    <path d="${body}" fill="${base}"/>
    <g clip-path="url(#${id}-c)">
      ${sleevePrint}
      ${print}
      <path d="M232,350 C246,520 240,700 228,860 L264,864 C270,700 272,520 252,360 Z" fill="#000" opacity="0.08"/>
      <path d="M568,350 C554,520 560,700 572,860 L536,864 C530,700 528,520 548,360 Z" fill="#000" opacity="0.08"/>
      <path d="M382,430 C394,600 386,740 398,870 L408,870 C400,740 406,600 394,430 Z" fill="#000" opacity="0.05"/>
      <path d="M165,418 L232,350 L246,380 L190,436 Z" fill="#000" opacity="0.07"/>
      <path d="M635,418 L568,350 L554,380 L610,436 Z" fill="#000" opacity="0.07"/>
      <path d="M205,190 L330,150 C350,180 370,196 400,198 C430,196 450,180 470,150 L595,190 L560,226 C470,206 330,206 240,226 Z" fill="#fff" opacity="0.07"/>
    </g>
    ${neckInner}
    ${ribLine}
    ${line("M212,196 Q226,270 234,352", shade, 2.5, 0.8)}
    ${line("M588,196 Q574,270 566,352", shade, 2.5, 0.8)}
    ${stitch("M102,338 L175,404", shade)}
    ${stitch("M698,338 L625,404", shade)}
    ${stitch("M232,840 Q400,853 568,840", shade)}
    ${tag && !back ? hangtag(598, 196, -10) : ""}`;
}

function hoodie({ id, base, print = "" }) {
  const shade = darken(base, 0.18);
  const rib = darken(base, 0.1);
  const body = "M318,178 L208,206 C166,330 128,560 106,770 L182,794 C200,600 222,470 238,374 L236,800 L564,800 L562,374 C578,470 600,600 618,794 L694,770 C672,560 634,330 592,206 L482,178 Z";
  const ribs = Array.from({ length: 32 }, (_, i) => line(`M${246 + i * 10},806 L${246 + i * 10},846`, "#000", 2, 0.12)).join("");
  return `
    ${shadowOf("M290,205 C280,95 335,55 400,55 C465,55 520,95 510,205 Z")}
    ${shadowOf(body)}
    <path d="M290,205 C280,95 335,55 400,55 C465,55 520,95 510,205 Z" fill="${base}"/>
    <path d="M336,200 C336,122 362,100 400,100 C438,100 464,122 464,200 Z" fill="${darken(base, 0.35)}"/>
    <clipPath id="${id}-c"><path d="${body}"/></clipPath>
    <path d="${body}" fill="${base}"/>
    <g clip-path="url(#${id}-c)">
      ${print}
      <path d="M238,374 C250,560 246,700 236,800 L270,800 C276,700 276,560 256,384 Z" fill="#000" opacity="0.08"/>
      <path d="M562,374 C550,560 554,700 564,800 L530,800 C524,700 524,560 544,384 Z" fill="#000" opacity="0.08"/>
      <path d="M208,206 L318,178 L482,178 L592,206 L560,240 C470,218 330,218 240,240 Z" fill="#fff" opacity="0.06"/>
    </g>
    <path d="M292,582 L508,582 L540,744 L260,744 Z" fill="${darken(base, 0.06)}"/>
    ${line("M292,582 L260,744", shade, 4)}
    ${line("M508,582 L540,744", shade, 4)}
    ${stitch("M298,596 L502,596", shade)}
    <path d="M238,800 L562,800 L560,852 Q400,862 240,852 Z" fill="${rib}"/>
    ${ribs}
    <path d="M106,770 L182,794 L176,846 L98,824 Z" fill="${rib}"/>
    <path d="M694,770 L618,794 L624,846 L702,824 Z" fill="${rib}"/>
    <path d="M318,178 C345,240 455,240 482,178" fill="none" stroke="${rib}" stroke-width="14" stroke-linecap="round"/>
    ${line("M380,226 C377,262 374,290 372,320", "#ece3d3", 7)}
    ${line("M420,226 C423,262 426,290 428,322", "#ece3d3", 7)}
    <rect x="365" y="318" width="14" height="22" rx="3" fill="#b8ac98"/>
    <rect x="421" y="320" width="14" height="22" rx="3" fill="#b8ac98"/>
    ${line("M214,212 C230,280 236,330 240,376", shade, 2.5, 0.8)}
    ${line("M586,212 C570,280 564,330 560,376", shade, 2.5, 0.8)}
    ${hangtag(600, 214, -10)}`;
}

function pants({ id, base, cargo = false, drawcord = "#efe9dd" }) {
  const shade = darken(base, 0.16);
  const legs = "M255,176 C235,420 215,700 200,905 L392,918 L400,482 L408,918 L600,905 C585,700 565,420 545,176 Z";
  const gathers = Array.from({ length: 30 }, (_, i) => line(`M${262 + i * 9.4},126 L${262 + i * 9.4},174`, "#000", 2, 0.12)).join("");
  const pocket = (x, flip) => {
    const s = flip ? -1 : 1;
    const x0 = x, x1 = x + s * 78;
    return `<path d="M${x0},500 L${x1},500 L${x1 + s * 4},640 L${x0 + s * 6},646 Z" fill="${darken(base, 0.05)}"/>
      <path d="M${x0 - s * 4},486 L${x1 + s * 4},486 L${x1 + s * 4},528 L${x0 - s * 4},528 Z" fill="${darken(base, 0.1)}"/>
      ${stitch(`M${x0},540 L${x1},540`, shade, 2)}
      <circle cx="${(x0 + x1) / 2}" cy="508" r="5" fill="${shade}"/>`;
  };
  return `
    ${shadowOf(legs)}
    ${shadowOf("M252,118 L548,118 L550,182 L250,182 Z")}
    <clipPath id="${id}-c"><path d="${legs}"/></clipPath>
    <path d="${legs}" fill="${base}"/>
    <g clip-path="url(#${id}-c)">
      <path d="M392,918 L400,482 L408,918 Z" fill="#000" opacity="0.08"/>
      <path d="M330,190 C318,500 306,700 300,920 L318,920 C322,700 334,500 344,190 Z" fill="#000" opacity="0.06"/>
      <path d="M470,190 C482,500 494,700 500,920 L482,920 C478,700 466,500 456,190 Z" fill="#000" opacity="0.06"/>
      ${line("M205,862 Q296,836 392,872", "#000", 3, 0.12)}
      ${line("M210,822 Q300,800 386,826", "#000", 3, 0.08)}
      ${line("M408,872 Q504,836 595,862", "#000", 3, 0.12)}
      ${line("M414,826 Q500,800 590,822", "#000", 3, 0.08)}
      <path d="M255,176 C245,300 238,360 232,420 L262,420 C266,340 270,280 280,176 Z" fill="#fff" opacity="0.06"/>
      ${cargo ? pocket(236, false) + pocket(564, true) : ""}
    </g>
    ${line("M266,190 C282,250 292,300 302,344", shade, 3)}
    ${line("M534,190 C518,250 508,300 498,344", shade, 3)}
    ${line("M400,182 L400,470", shade, 2.5, 0.7)}
    <path d="M252,118 L548,118 L550,182 L250,182 Z" fill="${darken(base, 0.06)}"/>
    ${gathers}
    ${line("M392,150 C372,190 366,230 376,268", drawcord, 6)}
    ${line("M408,150 C428,190 436,226 428,262", drawcord, 6)}
    <circle cx="400" cy="150" r="9" fill="${shade}"/>
    ${hangtag(536, 128, 8)}`;
}

function jorts({ id, base, stitchColor = "#c8893b", ink = false, seed = 3 }) {
  const shade = darken(base, 0.16);
  const legs = "M250,166 C236,330 220,470 205,640 L392,656 L400,420 L408,656 L595,640 C580,470 564,330 550,166 Z";
  const r = rng(seed);
  let fringe = "";
  for (let i = 0; i <= 34; i++) {
    const t = i / 34;
    const x = 205 + t * 187, y = 640 + t * 16;
    fringe += line(`M${x.toFixed(1)},${y.toFixed(1)} l${(r() * 4 - 2).toFixed(1)},${(8 + r() * 16).toFixed(1)}`, lighten(base, 0.25), 2.5);
    const x2 = 408 + t * 187, y2 = 656 - t * 16;
    fringe += line(`M${x2.toFixed(1)},${y2.toFixed(1)} l${(r() * 4 - 2).toFixed(1)},${(8 + r() * 16).toFixed(1)}`, lighten(base, 0.25), 2.5);
  }
  let splashes = "";
  if (ink) {
    for (let i = 0; i < 16; i++) {
      const x = 230 + r() * 340, y = 200 + r() * 420;
      const len = 40 + r() * 90, ang = r() * Math.PI;
      const dx = Math.cos(ang) * len, dy = Math.sin(ang) * len;
      splashes += line(`M${x.toFixed(0)},${y.toFixed(0)} q${(dx / 2 + r() * 30 - 15).toFixed(0)},${(dy / 2 + r() * 30 - 15).toFixed(0)} ${dx.toFixed(0)},${dy.toFixed(0)}`, "#2b2f36", 2 + r() * 5, 0.75);
      if (r() > 0.55) splashes += `<path d="${blob(r, x + dx, y + dy, 6 + r() * 12, 6, 0.6)}" fill="#2b2f36" opacity="0.7"/>`;
    }
  }
  return `
    <defs><pattern id="${id}-twill" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><rect width="7" height="7" fill="none"/><path d="M0,0 L0,7" stroke="#000" stroke-width="1.6" opacity="0.07"/></pattern></defs>
    ${shadowOf(legs)}
    ${shadowOf("M248,118 L552,118 L552,172 L248,172 Z")}
    <clipPath id="${id}-c"><path d="${legs}"/></clipPath>
    <path d="${legs}" fill="${base}"/>
    <g clip-path="url(#${id}-c)">
      <rect width="800" height="1000" fill="url(#${id}-twill)"/>
      ${splashes}
      <path d="M392,656 L400,420 L408,656 Z" fill="#000" opacity="0.1"/>
      <path d="M250,166 C242,260 236,330 230,400 L258,400 C262,320 266,250 276,166 Z" fill="#fff" opacity="0.1"/>
      ${stitch("M214,614 L392,630", stitchColor, 2.4)}
      ${stitch("M408,630 L586,614", stitchColor, 2.4)}
    </g>
    ${fringe}
    <path d="M248,118 L552,118 L552,172 L248,172 Z" fill="${darken(base, 0.04)}"/>
    ${stitch("M252,128 L548,128", stitchColor, 2.2)}
    ${stitch("M252,162 L548,162", stitchColor, 2.2)}
    ${[272, 336, 464, 528].map((x) => `<rect x="${x - 7}" y="112" width="14" height="44" rx="3" fill="${darken(base, 0.1)}"/>`).join("")}
    <circle cx="400" cy="145" r="11" fill="#9a7b4f"/><circle cx="400" cy="145" r="5" fill="#6e5636"/>
    ${stitch("M424,176 L424,318 Q424,352 400,362", stitchColor, 2.4)}
    ${line("M400,172 L400,410", shade, 2.5, 0.7)}
    ${line("M256,176 Q306,196 322,262", shade, 3)}
    ${line("M544,176 Q494,196 478,262", shade, 3)}
    ${stitch("M262,190 Q300,206 312,254", stitchColor, 2)}
    ${stitch("M538,190 Q500,206 488,254", stitchColor, 2)}
    ${hangtag(530, 124, 9)}`;
}

/** Five-panel (flat brim) or six-panel (curved brim) cap, three-quarter profile facing right. */
function cap({ id, base, style = "five", brim, panelMark = "", camo = false, seed = 9 }) {
  const shade = darken(base, 0.18);
  const brimColor = brim ?? darken(base, 0.06);
  const crown = style === "five"
    ? "M170,640 C160,470 252,356 404,348 C548,342 616,440 614,640 Z"
    : "M176,642 C160,452 258,340 408,334 C556,330 622,440 616,642 Z";
  const brimPath = style === "five"
    ? "M452,640 C562,628 694,640 792,678 C786,700 766,710 744,708 C640,702 540,692 446,670 Z"
    : "M452,636 C584,626 708,654 784,714 C768,742 734,748 702,738 C622,708 540,688 446,666 Z";
  let pattern = "";
  if (camo) {
    const r = rng(seed);
    const cols = ["#3c4a2f", "#7b6b4b", "#262b20", "#a2976f"];
    for (let i = 0; i < 60; i++) pattern += `<path d="${blob(r, 150 + r() * 660, 320 + r() * 420, 22 + r() * 44, 7, 0.55)}" fill="${cols[i % 4]}"/>`;
  }
  const top = style === "five" ? [404, 346] : [408, 332];
  const seams = style === "five"
    ? `${line(`M${top[0]},${top[1]} C330,420 282,520 270,640`, shade, 3)}${line(`M${top[0]},${top[1]} C476,410 526,520 534,640`, shade, 3)}`
    : `${line(`M${top[0]},${top[1]} C300,410 236,520 224,642`, shade, 3)}${line(`M${top[0]},${top[1]} C400,430 388,540 380,642`, shade, 3)}${line(`M${top[0]},${top[1]} C500,420 546,530 556,642`, shade, 3)}`;
  return `
    ${shadowOf(crown)}
    ${shadowOf(brimPath, 12, 20)}
    <clipPath id="${id}-c"><path d="${crown}"/></clipPath>
    <clipPath id="${id}-b"><path d="${brimPath}"/></clipPath>
    <path d="${crown}" fill="${base}"/>
    <g clip-path="url(#${id}-c)">
      ${pattern}
      <path d="M160,660 C150,470 250,356 404,346 C330,420 282,520 270,660 Z" fill="#000" opacity="0.14"/>
      <path d="M430,366 C510,372 570,424 592,494 C552,440 492,402 430,386 Z" fill="#fff" opacity="0.14"/>
      <rect x="150" y="626" width="480" height="16" fill="#000" opacity="0.22"/>
    </g>
    ${seams}
    <circle cx="${top[0]}" cy="${top[1] - 2}" r="13" fill="${shade}"/>
    <circle cx="330" cy="462" r="6" fill="${shade}"/><circle cx="476" cy="444" r="6" fill="${shade}"/>
    <path d="M168,592 L204,592 L202,636 L166,636 Z" fill="${darken(base, 0.28)}"/>
    <rect x="176" y="604" width="20" height="12" rx="2" fill="#b8b2a8"/>
    ${panelMark}
    <path d="${brimPath}" fill="${camo ? "#3c4a2f" : brimColor}"/>
    <g clip-path="url(#${id}-b)">
      ${camo ? pattern : ""}
      <path d="M440,664 C560,684 680,700 800,700 L800,720 L440,720 Z" fill="#000" opacity="0.2"/>
    </g>
    ${style === "five" ? stitch("M470,650 C574,642 690,654 772,684", shade, 2.4) + stitch("M468,662 C572,658 684,670 756,696", shade, 2.4) : stitch("M470,648 C590,642 696,668 760,712", shade, 2.4) + stitch("M468,660 C584,660 680,686 736,724", shade, 2.4)}
    ${hangtag(724, style === "five" ? 702 : 728, 6)}`;
}

/* ---------------- prints ---------------- */

const stars = (cx, cy, size, color, gap = 1.5) =>
  [-1, 0, 1]
    .map((k) => {
      const x = cx + k * size * gap, y = cy + (k === 0 ? -size * 0.25 : 0);
      const pts = Array.from({ length: 10 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? size * 0.42 : size;
        return `${(x + Math.cos(a) * rr).toFixed(1)},${(y + Math.sin(a) * rr).toFixed(1)}`;
      });
      return `<polygon points="${pts.join(" ")}" fill="${color}"/>`;
    })
    .join("");

/** A number set in three parallel strokes, like a retro jersey. */
function stripedSeven(x, y, s, color) {
  const d = `M${x},${y} L${x + s},${y} L${x + s * 0.45},${y + s * 1.3}`;
  return [0, 1, 2].map((k) => `<path d="${d}" transform="translate(${k * s * 0.12} ${k * s * 0.12})" fill="none" stroke="${color}" stroke-width="${s * 0.075}" stroke-linejoin="miter"/>`).join("");
}

/** Outlined multi-line lettering (inline stripes) for jersey wordmarks. */
function inlineWord(str, size, x, y, color, base) {
  const { d } = text(BLACK, str, size, x, y, { track: 0.02 });
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${size * 0.16}" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${base}" stroke-width="${size * 0.06}" stroke-linejoin="round"/><path d="${d}" fill="${base}"/>`;
}

function skyline(x, y, w, color, r = rng(4)) {
  let d = `M${x},${y}`;
  let cx = x;
  while (cx < x + w) {
    const bw = 18 + r() * 34, bh = 30 + r() * 110;
    d += ` L${cx.toFixed(0)},${(y - bh).toFixed(0)} L${(cx + bw).toFixed(0)},${(y - bh).toFixed(0)}`;
    cx += bw;
  }
  d += ` L${x + w},${y} Z`;
  return `<path d="${d}" fill="${color}"/>`;
}

/* ---------------- catalogue ---------------- */

const GROUNDS = ["#e4e0da", "#dedad3", "#e7e1db", "#dcdcd6", "#e3ddd4", "#e0dcd8"];

const products = {
  "jersey-topo-rojo": () => {
    const base = "#b3121f";
    const r = rng(11);
    return tee({
      id: "jtr",
      base,
      rib: "#f4f3f1",
      neck: "v",
      print: `${topo(r, 420, 520, 16, 34, darken(base, 0.22), 3)}
        ${inlineWord("MARACAY", 50, 400, 452, "#f4f3f1", base)}
        ${stripedSeven(276, 300, 44, "#f4f3f1")}
        <circle cx="512" cy="326" r="30" fill="none" stroke="#f4f3f1" stroke-width="5"/>${stars(512, 284, 7, "#f4f3f1")}
        <path d="${text(BLACK, "MB", 22, 512, 334).d}" fill="#f4f3f1"/>
        <path d="${text(BLACK, "07", 110, 400, 640, { track: -0.04 }).d}" fill="none" stroke="#f4f3f1" stroke-width="5"/>`,
      sleevePrint: `<path d="M92,352 L205,190 L222,200 L112,364 Z" fill="#f4f3f1"/><path d="M708,352 L595,190 L578,200 L688,364 Z" fill="#f4f3f1"/>`,
    });
  },
  "jersey-siete-blanco": () =>
    tee({
      id: "jsb",
      base: "#f2f0eb",
      rib: "#161314",
      back: true,
      tag: false,
      print: `${[0, 1, 2].map((k) => `<path d="M290,${330 + k * 22} L520,${330 + k * 22} L${430 - k * 6},${640 + k * 4}" fill="none" stroke="#161314" stroke-width="13"/>`).join("")}
        ${inlineWord("CASA DEL FLOW", 38, 400, 300, "#9c1823", "#f2f0eb")}
        ${stars(400, 720, 14, "#9c1823", 1.6)}`,
      sleevePrint: `${line("M140,330 L196,390", "#9c1823", 10)}${line("M660,330 L604,390", "#9c1823", 10)}`,
    }),
  "franela-blank-azul": () =>
    tee({
      id: "fba",
      base: "#f6f5f2",
      rib: "#ebe9e4",
      print: `<path d="${text(BLACK, "blank:page", 62, 400, 520, { track: -0.03 }).d}" fill="#1f3a8a"/>
        <circle cx="505" cy="300" r="40" fill="#1f3a8a"/><circle cx="505" cy="300" r="31" fill="#f6f5f2"/><path d="${text(BLACK, "BP", 26, 505, 310).d}" fill="#1f3a8a"/>
        <path d="${text(BLACK, "BP", 40, 288, 316).d}" fill="#1f3a8a"/>`,
    }),
  "franela-jungla-negra": () =>
    tee({
      id: "fjn",
      base: "#1d1c1f",
      rib: "#2b2a2e",
      back: true,
      tag: false,
      print: `<rect x="250" y="250" width="300" height="300" fill="#9c1823"/>
        ${skyline(250, 550, 300, "#1d1c1f", rng(21))}
        <circle cx="470" cy="330" r="34" fill="#f4f3f1"/>
        <path d="${text(BLACK, "JUNGLA DE", 50, 400, 630, { track: -0.02 }).d}" fill="#f4f3f1"/>
        <path d="${text(BLACK, "CONCRETO", 64, 400, 696, { track: -0.03 }).d}" fill="#f4f3f1"/>
        <path d="${text(MEDIUM, "MARACAY · ESTADO ARAGUA", 16, 400, 740, { track: 0.14 }).d}" fill="#a39d97"/>`,
    }),
  "franela-jungla-negra-frente": () =>
    tee({
      id: "fjf",
      base: "#1d1c1f",
      rib: "#2b2a2e",
      print: `<g transform="translate(470 330)"><path d="${text(SCRIPT, "Mr.", 64, 0, 0, { anchor: "end" }).d}" fill="#f4f3f1"/><path d="${text(BLACK, "B", 64, 4, 0, { anchor: "start" }).d}" fill="#9c1823"/></g>
        <path d="${text(MEDIUM, "CASA DEL FLOW", 14, 440, 362, { track: 0.16 }).d}" fill="#8e8a85"/>`,
    }),
  "hoodie-carpe-marron": () =>
    hoodie({
      id: "hcm",
      base: "#5a3a2b",
      print: `<path d="${text(BLACK, "CARPE", 74, 400, 420, { track: -0.02 }).d}" fill="#e9dcc4"/><path d="${text(BLACK, "DIEM", 74, 400, 492, { track: -0.02 }).d}" fill="#e9dcc4"/><path d="${text(MEDIUM, "SEIZE THE DAY · EST. MARACAY", 15, 400, 530, { track: 0.12 }).d}" fill="#c9b99f"/>`,
    }),
  "mono-odyssea-crema": () =>
    pants({ id: "moc", base: "#e8e1d3", drawcord: "#f6f2ea" }) +
    `<path d="${text(SCRIPT, "Odyssea", 30, 300, 800, { anchor: "middle" }).d}" fill="${darken("#e8e1d3", 0.25)}"/>`,
  "mono-odyssea-negro": () =>
    pants({ id: "mon", base: "#232226", drawcord: "#d9d4cb" }) +
    `<path d="${text(SCRIPT, "Odyssea", 30, 300, 800, { anchor: "middle" }).d}" fill="#4a484f"/>`,
  "cargo-baggy-arena": () => pants({ id: "cba", base: "#c6b08a", cargo: true, drawcord: "#3a3127" }),
  "jort-tinta": () => jorts({ id: "jt", base: "#c3ced6", ink: true, seed: 5 }),
  "jort-indigo": () => jorts({ id: "ji", base: "#2d3f69", seed: 8 }),
  "gorra-camo": () => cap({ id: "gc", base: "#55613f", camo: true, seed: 12, panelMark: `<path d="M490,500 C490,476 554,524 554,500 C554,476 490,524 490,500 Z" fill="none" stroke="#f4f3f1" stroke-width="9"/>` }),
  "gorra-beige": () => cap({ id: "gb", base: "#dac8a4", panelMark: `<path d="M486,500 C486,470 562,530 562,500 C562,470 486,530 486,500 Z" fill="none" stroke="#161314" stroke-width="10"/>` }),
  "gorra-flow-roja": () => cap({ id: "gf", base: "#b3121f", style: "six", panelMark: `<g transform="rotate(-8 480 520)"><path d="${text(SCRIPT, "Flow", 104, 470, 545, { anchor: "middle" }).d}" fill="#f4f3f1"/></g>` }),
  "gorra-firma-negra": () =>
    cap({
      id: "gn",
      base: "#1c1b1e",
      panelMark: `<g transform="translate(120 0)">${line("M330,500 C350,440 362,440 360,486 C358,520 380,450 398,452 C414,454 392,506 410,500 C430,494 440,446 456,456 C470,464 448,500 470,496", "#f4f3f1", 6)}${line("M330,520 L476,508", "#f4f3f1", 4)}</g>`,
    }),
};

/* ---------------- story scenes ---------------- */

function sceneSerigrafia() {
  const r = rng(31);
  const arms = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + 0.3;
    const x = 400 + Math.cos(a) * 270, y = 500 + Math.sin(a) * 270;
    const deg = (a * 180) / Math.PI + 90;
    const ink = ["#9c1823", "#f4f3f1", "#e5b53a", "#2d3f69", "#f4f3f1", "#9c1823"][i];
    return `${line(`M400,500 L${x.toFixed(0)},${y.toFixed(0)}`, "#5f6a70", 24)}
      <g transform="translate(${x.toFixed(0)} ${y.toFixed(0)}) rotate(${deg.toFixed(0)})">
        <rect x="-78" y="-96" width="156" height="192" rx="6" fill="#d9d6d0"/>
        <path d="M-46,-62 L-20,-72 C-10,-60 10,-60 20,-72 L46,-62 L56,-30 L36,-24 L36,70 L-36,70 L-36,-24 L-56,-30 Z" fill="#232226"/>
        <rect x="-24" y="-30" width="48" height="40" fill="${ink}"/>
        <rect x="-86" y="-104" width="172" height="208" rx="4" fill="none" stroke="#8c979c" stroke-width="10" opacity="${i % 2 ? 0.9 : 0}"/>
      </g>`;
  }).join("");
  let drips = "";
  for (let i = 0; i < 12; i++) drips += `<path d="${blob(r, 120 + r() * 560, 120 + r() * 760, 6 + r() * 14, 6, 0.6)}" fill="${["#9c1823", "#e5b53a", "#2d3f69"][i % 3]}" opacity="0.8"/>`;
  return svg(800, 1000, "#2a2728", `${drips}${arms}<circle cx="400" cy="500" r="74" fill="#4b555a"/><circle cx="400" cy="500" r="40" fill="#8c979c"/><circle cx="400" cy="500" r="14" fill="#2a2728"/>`);
}

function sceneCorte() {
  const piece = (d, x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><path d="${d}" fill="#c9a574"/>${stitch(d, "#8a6a3e", 2.5, "10 8")}</g>`;
  const front = "M-150,-200 L-40,-230 C-20,-200 20,-200 40,-230 L150,-200 L190,-90 L120,-70 L120,230 L-120,230 L-120,-70 L-190,-90 Z";
  const sleeve = "M-120,-60 C-60,-110 60,-110 120,-60 L100,70 L-100,70 Z";
  const tape = Array.from({ length: 30 }, (_, i) => line(`M${80 + i * 22},${860} L${80 + i * 22},${i % 5 ? 872 : 884}`, "#161314", 2)).join("");
  return svg(
    800,
    1000,
    "#ece8e1",
    `<rect x="0" y="0" width="800" height="1000" fill="#e6e1d8"/>
    ${piece(front, 300, 380, -6)}
    ${piece(front, 560, 470, 8)}
    ${piece(sleeve, 230, 760, 12)}
    ${piece(sleeve, 600, 790, -10)}
    <g transform="translate(560 220) rotate(-28)">
      <circle cx="-60" cy="0" r="30" fill="none" stroke="#9c1823" stroke-width="16"/>
      <circle cx="-60" cy="70" r="30" fill="none" stroke="#9c1823" stroke-width="16"/>
      <path d="M-34,10 L150,60 L-30,40 Z" fill="#9aa3a8"/><path d="M-34,62 L150,30 L-30,30 Z" fill="#c5ccd0"/>
      <circle cx="-20" cy="36" r="7" fill="#161314"/>
    </g>
    <path d="M60,850 L760,836 L762,890 L62,904 Z" fill="#e5b53a"/>${tape}`,
  );
}

function sceneTienda() {
  const tees = ["#b3121f", "#f2f0eb", "#232226", "#5a3a2b", "#c6b08a", "#2d3f69", "#f6f5f2", "#55613f"];
  const rack = (y, offset) =>
    `${line(`M90,${y} L710,${y}`, "#8c979c", 6)}` +
    tees
      .map((c, i) => {
        const x = 110 + i * 76 + offset;
        return `${line(`M${x + 30},${y} L${x + 30},${y + 14}`, "#8c979c", 3)}<path d="M${x},${y + 22} L${x + 18},${y + 14} C${x + 24},${y + 22} ${x + 36},${y + 22} ${x + 42},${y + 14} L${x + 60},${y + 22} L${x + 66},${y + 46} L${x + 56},${y + 48} L${x + 56},${y + 132} L${x + 4},${y + 132} L${x + 4},${y + 48} L${x - 6},${y + 46} Z" fill="${c}"/>`;
      })
      .join("");
  return svg(
    800,
    1000,
    "#1b1a1c",
    `<rect x="0" y="0" width="800" height="300" fill="#121113"/>
    <g opacity="0.95">${line("M220,70 L580,250", "#f4f3f1", 18)}${line("M580,70 L220,250", "#f4f3f1", 18)}</g>
    <ellipse cx="400" cy="160" rx="120" ry="26" fill="none" stroke="#f4f3f1" stroke-width="10" opacity="0.6"/>
    <rect x="0" y="300" width="800" height="560" fill="#5c5e60"/>
    <rect x="0" y="300" width="800" height="560" fill="#000" opacity="0.15"/>
    <rect x="250" y="330" width="300" height="86" fill="#9c1823"/>
    <g transform="translate(400 392)">${(() => {
      const mr = text(SCRIPT, "Mr.", 46, 0, 0, { anchor: "start" });
      const b = text(BLACK, "BRANDS", 40, 0, 0, { anchor: "start", track: -0.03 });
      const w = mr.width + b.width + 4;
      return `<path d="${text(SCRIPT, "Mr.", 46, -w / 2, 0, { anchor: "start" }).d}" fill="#f4f3f1"/><path d="${text(BLACK, "BRANDS", 40, -w / 2 + mr.width + 4, 0, { anchor: "start", track: -0.03 }).d}" fill="#f4f3f1"/>`;
    })()}</g>
    ${rack(470, 0)}
    ${rack(650, 34)}
    <rect x="0" y="860" width="800" height="140" fill="#cfcac3"/>
    <path d="M0,860 L800,860 L800,872 L0,872 Z" fill="#000" opacity="0.12"/>`,
  );
}

function sceneCalle() {
  const arches = Array.from({ length: 5 }, (_, i) => {
    const x = 150 + i * 104;
    return `<path d="M${x},760 L${x},640 C${x},596 ${x + 70},596 ${x + 70},640 L${x + 70},760 Z" fill="#7a4b32"/>`;
  }).join("");
  return svg(
    800,
    1000,
    "#f0c58a",
    `<circle cx="580" cy="250" r="92" fill="#f6e3bf"/>
    <path d="M0,520 C120,380 220,420 300,360 C380,300 470,390 560,330 C650,270 720,360 800,320 L800,620 L0,620 Z" fill="#7d8a5a"/>
    <path d="M0,580 C140,480 250,520 360,470 C470,420 600,500 800,450 L800,680 L0,680 Z" fill="#56643f"/>
    <rect x="110" y="520" width="580" height="260" fill="#efe6d6"/>
    <path d="M90,524 L710,524 L690,490 L110,490 Z" fill="#9c1823"/>
    ${arches}
    <rect x="110" y="580" width="580" height="12" fill="#d8ccb6"/>
    <g transform="translate(70 520)">${line("M20,280 C26,180 18,90 34,0", "#5c4631", 14)}${["M34,0 C70,-20 110,-10 140,20", "M34,0 C0,-30 -40,-30 -60,-6", "M34,0 C60,-50 90,-60 120,-50", "M34,0 C10,-60 -20,-74 -50,-66", "M34,0 C50,30 80,60 90,96", "M34,0 C14,30 -6,60 -10,96"].map((d) => line(d, "#3f5a33", 16)).join("")}</g>
    <rect x="0" y="780" width="800" height="220" fill="#3a3a3d"/>
    ${[0, 1, 2, 3, 4].map((i) => `<rect x="${60 + i * 160}" y="886" width="90" height="12" fill="#e5b53a"/>`).join("")}
    <rect x="0" y="780" width="800" height="24" fill="#bdb6aa"/>`,
  );
}

/* ---------------- write ---------------- */

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  return content.length;
}

let total = 0;
const names = Object.keys(products);
names.forEach((name, i) => {
  const art = products[name]();
  total += write(`p/${name}.svg`, svg(800, 1000, GROUNDS[i % GROUNDS.length], art));
});

// Tall, dark-ground versions for the hero and the brand band: the paper half of BRANDS reads on them.
const HERO = {
  "jersey-topo-rojo": "#161314",
  "mono-odyssea-crema": "#9c1823",
  "hoodie-carpe-marron": "#2c3527",
  "jort-tinta": "#1d2433",
  "jersey-siete-blanco": "#2a2728",
  "gorra-camo": "#1b1a1c",
  "gorra-flow-roja": "#232226",
  "gorra-beige": "#5a3a2b",
  "mono-odyssea-negro": "#c6b08a",
  "franela-blank-azul": "#1f3a8a",
};
for (const [name, ground] of Object.entries(HERO)) {
  total += write(`hero/${name}.svg`, svg(800, 1200, ground, `<g transform="translate(0 150)">${products[name]()}</g>`));
}

total += write("story/serigrafia.svg", sceneSerigrafia());
total += write("story/corte.svg", sceneCorte());
total += write("story/tienda.svg", sceneTienda());
total += write("story/calle.svg", sceneCalle());

// Link preview (WhatsApp, Instagram DMs): wordmark on the logo red, the jersey beside it.
{
  const mr = text(SCRIPT, "Mr.", 150, 0, 0, { anchor: "start" });
  const word = `<g transform="translate(80 330)"><path d="${mr.d}" fill="#f4f3f1"/><path d="${text(BLACK, "BRANDS", 132, mr.width + 6, 0, { anchor: "start", track: -0.04 }).d}" fill="#f4f3f1"/></g>`;
  const sub = `<path d="${text(MEDIUM, "Casa del flow · CC Estación Central, Maracay", 30, 84, 410, { anchor: "start" }).d}" fill="#f4f3f1" opacity="0.85"/>`;
  const jersey = `<g transform="translate(800 70) scale(0.5)">${products["jersey-topo-rojo"]().replace(/hangtag/g, "")}</g>`;
  const og = svg(1200, 630, "#9c1823", `<rect x="820" y="0" width="380" height="630" fill="#161314"/>${jersey}${word}${sub}`);
  write("og.svg", og);
  const sharp = (await import("sharp")).default;
  await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile(path.resolve(here, "../../public/og.png"));
}

console.log(`Wrote ${names.length} products, ${Object.keys(HERO).length} hero versions and 4 scenes (${Math.round(total / 1024)} KB).`);
