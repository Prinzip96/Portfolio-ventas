/**
 * Convierte capturas y la J cromada a WebP para Lighthouse.
 * Conserva los JPG/PNG originales como respaldo.
 */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const jobs = [
  { src: 'assets/shots/mona.jpg', out: 'assets/shots/mona.webp', q: 78 },
  { src: 'assets/shots/kw.jpg', out: 'assets/shots/kw.webp', q: 78 },
  { src: 'assets/shots/desbloque.jpg', out: 'assets/shots/desbloque.webp', q: 78 },
  { src: 'assets/shots/phobia.jpg', out: 'assets/shots/phobia.webp', q: 78 },
  { src: 'assets/shots/distrito4.jpg', out: 'assets/shots/distrito4.webp', q: 68, width: 1280 },
  { src: 'assets/j06.png', out: 'assets/j06.webp', q: 82 },
  // og.jpg se deja en JPEG: Facebook/LinkedIn lo leen mejor que WebP
];

(async () => {
  for (const job of jobs) {
    const input = path.join(root, job.src);
    const output = path.join(root, job.out);
    if (!fs.existsSync(input)) {
      console.warn('skip (missing):', job.src);
      continue;
    }
    let pipeline = sharp(input);
    if (job.width) pipeline = pipeline.resize({ width: job.width, withoutEnlargement: true });
    await pipeline.webp({ quality: job.q }).toFile(output);
    const a = fs.statSync(input).size;
    const b = fs.statSync(output).size;
    console.log(`${job.out}  ${(a / 1024).toFixed(0)}→${(b / 1024).toFixed(0)} KB`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
