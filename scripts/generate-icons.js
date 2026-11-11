import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crisp modern SVG icon: Camera lens with photo/video badge & report arrow
const standardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="lens" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0.8" />
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="16" flood-color="#0f172a" flood-opacity="0.3"/>
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="128" fill="url(#bg)" />

  <!-- Camera Body -->
  <g filter="url(#shadow)">
    <!-- Main Body -->
    <rect x="96" y="160" width="320" height="236" rx="44" fill="#ffffff" />
    <!-- Top prism -->
    <path d="M192 160 L216 116 L296 116 L320 160 Z" fill="#ffffff" />
    <!-- Flash dot -->
    <circle cx="360" cy="204" r="14" fill="#ef4444" />
    <!-- Lens outer ring -->
    <circle cx="256" cy="278" r="76" fill="#0284c7" />
    <!-- Lens middle ring -->
    <circle cx="256" cy="278" r="62" fill="#0f172a" />
    <!-- Lens reflection -->
    <circle cx="256" cy="278" r="46" fill="url(#lens)" />
    <!-- Aperture pupil -->
    <circle cx="256" cy="278" r="26" fill="#0284c7" />
    <!-- Glint -->
    <circle cx="244" cy="266" r="8" fill="#ffffff" />
  </g>

  <!-- Send/Report Arrow Badge -->
  <g transform="translate(320, 310)" filter="url(#shadow)">
    <circle cx="48" cy="48" r="44" fill="#10b981" />
    <path d="M34 48 L44 58 L62 38" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

// Maskable icon with 15% safe padding
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#2563eb" />
      <stop offset="50%" stop-color="#0284c7" />
      <stop offset="100%" stop-color="#0d9488" />
    </linearGradient>
    <linearGradient id="lensMask" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#e0f2fe" stop-opacity="0.8" />
    </linearGradient>
  </defs>

  <!-- Full-bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgMask)" />

  <!-- Centered scaled content (safe-zone: 80% circle) -->
  <g transform="translate(56, 56) scale(0.78)">
    <rect x="96" y="160" width="320" height="236" rx="44" fill="#ffffff" />
    <path d="M192 160 L216 116 L296 116 L320 160 Z" fill="#ffffff" />
    <circle cx="360" cy="204" r="14" fill="#ef4444" />
    <circle cx="256" cy="278" r="76" fill="#0284c7" />
    <circle cx="256" cy="278" r="62" fill="#0f172a" />
    <circle cx="256" cy="278" r="46" fill="url(#lensMask)" />
    <circle cx="256" cy="278" r="26" fill="#0284c7" />
    <circle cx="244" cy="266" r="8" fill="#ffffff" />

    <circle cx="368" cy="358" r="44" fill="#10b981" />
    <path d="M354 358 L364 368 L382 348" fill="none" stroke="#ffffff" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
  </g>
</svg>`;

async function generate() {
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), standardSvg);

  await sharp(Buffer.from(standardSvg))
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));

  await sharp(Buffer.from(standardSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));

  await sharp(Buffer.from(standardSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(Buffer.from(standardSvg))
    .resize(64, 64)
    .toFile(path.join(publicDir, 'favicon.ico'));

  await sharp(Buffer.from(maskableSvg))
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));

  console.log('Successfully generated all PWA icons.');
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});
