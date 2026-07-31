/**
 * Gera os PNGs do app a partir da marca vetorial.
 * Rode com: node scripts/generate-icons.mjs  (precisa de: npm i --no-save sharp)
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const OUT = fileURLToPath(new URL('../public/icons/', import.meta.url));

/* Um creme mais claro que o da folha, senão a folha de trás some no fundo. */
const BACKDROP = '#FFF7EE';

/** O caderno tem viewBox 100x116; aqui ele é centralizado num quadrado. */
function squareSvg(size, markHeight, background) {
  const scale = markHeight / 116;
  const w = 100 * scale;
  const x = (size - w) / 2;
  const y = (size - markHeight) / 2;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${background}"/>
  <g transform="translate(${x} ${y}) scale(${scale})">
    <rect x="10" y="10" width="82" height="104" rx="10" fill="#FCE3C8"/>
    <rect x="2" y="4" width="82" height="104" rx="10" fill="#F97316"/>
    <rect x="17" y="10" width="2.5" height="92" rx="1.2" fill="#D45A0C"/>
    <rect x="48" y="46" width="48" height="22" rx="5" fill="#D45A0C"/>
    <circle cx="58" cy="57" r="7" fill="#FFF3E4"/>
    <circle cx="58" cy="57" r="2.6" fill="#D45A0C"/>
  </g>
</svg>`);
}

const targets = [
  // Ícones normais: a marca ocupa ~74% do quadrado.
  { file: 'icon-192.png', size: 192, mark: 142 },
  { file: 'icon-512.png', size: 512, mark: 380 },
  { file: 'apple-touch-icon.png', size: 180, mark: 132 },
  // Maskable: o Android recorta as bordas, então a marca fica dentro da zona segura (~60%).
  { file: 'icon-maskable-192.png', size: 192, mark: 112 },
  { file: 'icon-maskable-512.png', size: 512, mark: 300 },
];

await mkdir(OUT, { recursive: true });

for (const { file, size, mark } of targets) {
  await sharp(squareSvg(size, mark, BACKDROP)).png().toFile(join(OUT, file));
  console.log(`gerado ${file} (${size}x${size})`);
}
