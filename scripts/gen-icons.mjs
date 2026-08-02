// ParentProof PWA icon generator — zero dependencies.
//
// Chrome's installability check wants raster icons at 192x192 and 512x512;
// an SVG-only manifest does not reliably trigger the install prompt. Rather
// than pull in sharp / canvas (and a native toolchain) just for three files,
// this script rasterises the brand mark by hand and writes valid PNGs using
// only Node's built-in `zlib` and `fs`.
//
//   node scripts/gen-icons.mjs
//
// Output (into public/):
//   icon-192.png            192x192  app icon
//   icon-512.png            512x512  app icon
//   icon-maskable-512.png   512x512  app icon with Android safe-zone padding
//
// The mark mirrors public/icon.svg and the <Diamond> component in
// src/components/ui.tsx: a rounded square rotated 45 degrees, in cobalt, with
// a smaller rounded-square outline knocked out of its centre in paper.

import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const publicDir = join(here, '..', 'public')

// ---------------------------------------------------------------- brand ----
// Kept in sync by hand with src/theme.ts (c.paper / c.blue).
const PAPER = [0xe7, 0xe0, 0xd4] // #E7E0D4
const BLUE = [0x23, 0x54, 0xc7] // #2354C7

// Mark geometry, expressed in the same 512-unit space as public/icon.svg.
// Everything is centred on (256, 256) and drawn in a frame rotated by 45deg.
const GEO = {
  outerHalf: 132, // <rect x=124 width=264>  -> half-extent 132
  outerR: 48, // rx=48
  ringOuterHalf: 70, // <rect x=196 width=120> + stroke-width 20 / 2
  ringOuterR: 26, // rx=16 + 10
  ringInnerHalf: 50, // 60 - 10
  ringInnerR: 6, // rx=16 - 10 (clamped at 0)
}

// ------------------------------------------------------------------ crc ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let cc = n
    for (let k = 0; k < 8; k++) cc = cc & 1 ? 0xedb88320 ^ (cc >>> 1) : cc >>> 1
    t[n] = cc >>> 0
  }
  return t
})()

function crc32(buf) {
  let cc = 0xffffffff
  for (let i = 0; i < buf.length; i++) cc = CRC_TABLE[(cc ^ buf[i]) & 0xff] ^ (cc >>> 8)
  return (cc ^ 0xffffffff) >>> 0
}

// ------------------------------------------------------------------ png ----
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

/** Encode an 8-bit truecolour (RGB, no alpha) PNG from a raw pixel buffer. */
function encodePng(width, height, rgb) {
  const stride = width * 3
  // Each scanline is prefixed with its filter-type byte (0 = None).
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // colour type: truecolour
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ------------------------------------------------------------ rasteriser ----
/**
 * Signed distance from a point to a centred rounded square.
 * Negative inside, positive outside — so `0.5 - d` gives us cheap analytic
 * antialiasing without supersampling.
 */
function roundedSquareSdf(x, y, half, r) {
  const qx = Math.abs(x) - (half - r)
  const qy = Math.abs(y) - (half - r)
  const mx = Math.max(qx, 0)
  const my = Math.max(qy, 0)
  return Math.hypot(mx, my) + Math.min(Math.max(qx, qy), 0) - r
}

const coverage = (d) => Math.min(1, Math.max(0, 0.5 - d))
const mix = (a, b, t) => a + (b - a) * t

/**
 * Render the ParentProof mark.
 *
 * @param size    output edge length in pixels
 * @param spanPct fraction of the canvas the diamond's diagonal should span.
 *                ~0.73 matches icon.svg; ~0.60 keeps the mark inside Android's
 *                maskable safe zone so no mask shape can crop it.
 */
function renderMark(size, spanPct) {
  const rgb = Buffer.alloc(size * size * 3)
  const unit = size / 512 // 512-unit design space -> pixels
  // icon.svg's diamond spans outerHalf * sqrt(2) * 2 = 73% of the canvas.
  const k = spanPct / ((GEO.outerHalf * Math.SQRT2 * 2) / 512)

  const outerHalf = GEO.outerHalf * k * unit
  const outerR = GEO.outerR * k * unit
  const ringOuterHalf = GEO.ringOuterHalf * k * unit
  const ringOuterR = GEO.ringOuterR * k * unit
  const ringInnerHalf = GEO.ringInnerHalf * k * unit
  const ringInnerR = GEO.ringInnerR * k * unit

  const centre = size / 2
  const cos45 = Math.SQRT1_2

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Pixel centre, relative to the icon centre.
      const px = x + 0.5 - centre
      const py = y + 0.5 - centre
      // Rotate by -45deg into the mark's own frame (cos = sin = 1/sqrt(2)).
      const rx = (px + py) * cos45
      const ry = (py - px) * cos45

      const body = coverage(roundedSquareSdf(rx, ry, outerHalf, outerR))
      const ringOut = coverage(roundedSquareSdf(rx, ry, ringOuterHalf, ringOuterR))
      const ringIn = coverage(roundedSquareSdf(rx, ry, ringInnerHalf, ringInnerR))
      const ring = ringOut * (1 - ringIn)

      const i = (y * size + x) * 3
      for (let ch = 0; ch < 3; ch++) {
        // paper background -> cobalt body -> paper ring knocked back out
        let v = mix(PAPER[ch], BLUE[ch], body)
        v = mix(v, PAPER[ch], ring)
        rgb[i + ch] = Math.round(Math.min(255, Math.max(0, v)))
      }
    }
  }
  return encodePng(size, size, rgb)
}

// ----------------------------------------------------------------- main ----
mkdirSync(publicDir, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, span: 0.73 },
  { file: 'icon-512.png', size: 512, span: 0.73 },
  { file: 'icon-maskable-512.png', size: 512, span: 0.6 },
]

for (const t of targets) {
  const png = renderMark(t.size, t.span)
  const out = join(publicDir, t.file)
  writeFileSync(out, png)
  console.log(`wrote ${t.file}  ${t.size}x${t.size}  ${png.length} bytes`)
}
