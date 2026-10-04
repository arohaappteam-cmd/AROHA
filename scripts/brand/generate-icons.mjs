/**
 * Renders AROHA's raster icons from the vector mark in src/app/icon.svg:
 * favicon.ico (16/32/48), the Apple touch icon, PWA icons and the social
 * preview image. Re-run after changing the mark:
 *
 *   node scripts/brand/generate-icons.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = fileURLToPath(new URL("../../", import.meta.url));
const mark = readFileSync(`${root}src/app/icon.svg`, "utf8");

/** The mark without its rounded corners: platforms that mask icons want full bleed. */
const fullBleed = mark.replace('rx="16"', 'rx="0"');

/** The mark shrunk into the maskable safe zone (inner 80%) over its tile colour. */
const maskable = fullBleed.replace(
  /(<path d="M16\.5[\s\S]*?<\/svg>)/,
  (art) => `<g transform="translate(6.4 6.4) scale(0.8)">${art.replace("</svg>", "")}</g></svg>`,
);

const png = (svg, size) => sharp(Buffer.from(svg), { density: 384 }).resize(size, size).png().toBuffer();

/** An .ico holding PNG frames (supported by every current browser). */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const entries = [];
  let offset = 6 + frames.length * 16;
  for (const { size, data } of frames) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...frames.map((frame) => frame.data)]);
}

const sizes = [16, 32, 48];
const frames = await Promise.all(sizes.map(async (size) => ({ size, data: await png(mark, size) })));
writeFileSync(`${root}src/app/favicon.ico`, ico(frames));
writeFileSync(`${root}src/app/apple-icon.png`, await png(fullBleed, 180));
writeFileSync(`${root}public/icon-192.png`, await png(mark, 192));
writeFileSync(`${root}public/icon-512.png`, await png(mark, 512));
writeFileSync(`${root}public/icon-maskable-512.png`, await png(maskable, 512));

// Social preview (link unfurls in WhatsApp, iMessage, Slack…): 1200×630.
const art = mark.replace(/<svg[^>]*>/, "").replace("</svg>", "");
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <radialGradient id="glow" cx="0.15" cy="0.1" r="0.75">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.08"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="#0a0a0a"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g transform="translate(96 150) scale(3.4)">${art}</g>
  <text x="96" y="470" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="96" font-weight="700" letter-spacing="18" fill="#fafafa">AROHA</text>
  <text x="100" y="535" font-family="Segoe UI, Helvetica, Arial, sans-serif" font-size="36" fill="#d4d4d8">Turn everyday life into an evolving RPG.</text>
</svg>`;
writeFileSync(`${root}src/app/opengraph-image.png`, await sharp(Buffer.from(og)).png().toBuffer());

console.log("Icons written.");
