import { readFileSync } from 'fs';
import { join } from 'path';

const html404 = readFileSync(join(process.cwd(), '404.html'), 'utf8');

export default function handler(req, res) {
  res.status(404);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html404);
}
